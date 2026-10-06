from __future__ import annotations

from datetime import UTC, datetime

import httpx

from votoclaro.models import RegistroFuentes
from votoclaro.paths import ROOT, Paths
from votoclaro.registry import load_candidaturas
from votoclaro.vigilancia import pdfs_de_programa, vigilar

HTML = """
<a href="/wp-content/uploads/2026/11/Programa-Electoral-Generales-2026.pdf">Programa electoral</a>
<a href="/docs/estatutos.pdf">Estatutos</a>
<a href="https://otra.es/programa-municipal-2023.pdf">Programa municipal</a>
<a href="/eleccions/programa-generals-29N.pdf"><span>Programa</span></a>
"""

RSS = """<?xml version="1.0"?><rss><channel>
<item><title>El PP presenta su programa electoral para el 29N</title><link>https://ejemplo.es/a</link>
<pubDate>Tue, 10 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>El PP presenta su programa (2023)</title><link>https://ejemplo.es/viejo</link>
<pubDate>Mon, 03 Jul 2023 10:00:00 GMT</pubDate></item>
</channel></rss>"""


def test_detecta_solo_pdfs_de_programa_electoral():
    urls = [u for u, _ in pdfs_de_programa(HTML, "https://www.pp.es/")]
    assert (
        "https://www.pp.es/wp-content/uploads/2026/11/Programa-Electoral-Generales-2026.pdf" in urls
    )
    assert "https://www.pp.es/eleccions/programa-generals-29N.pdf" in urls
    assert not any("estatutos" in u for u in urls)


def test_vigilar_devuelve_pdf_oficial_y_noticias_recientes():
    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.host == "news.google.com":
            return httpx.Response(200, content=RSS.encode())
        return httpx.Response(200, text=HTML)

    cands = [load_candidaturas(Paths(ROOT / "data")).get("pp")]
    fuentes = RegistroFuentes.model_validate(
        {"version": 1, "convocatorias": {"generales-2026": {"fecha": "2026-11-29"}}}
    )
    client = httpx.Client(transport=httpx.MockTransport(handler))
    nov, errores = vigilar(cands, fuentes, desde=datetime(2026, 10, 6, tzinfo=UTC), client=client)
    assert not errores
    pdfs = [n for n in nov if n.tipo == "pdf-oficial"]
    assert pdfs and all(n.dominio_oficial for n in pdfs if "pp.es" in n.url)
    noticias = [n for n in nov if n.tipo == "noticia"]
    assert [n.url for n in noticias] == ["https://ejemplo.es/a"]  # la de 2023 se descarta


def test_no_vigila_candidaturas_con_programa_ya_registrado():
    cands = [load_candidaturas(Paths(ROOT / "data")).get("pp")]
    fuentes = RegistroFuentes.model_validate(
        {
            "version": 1,
            "convocatorias": {
                "generales-2026": {
                    "fecha": "2026-11-29",
                    "programas": {
                        "pp": {
                            "url": "u",
                            "fichero": "f",
                            "sha256": "x" * 64,
                            "descargado": "2026-11-10T00:00:00Z",
                            "paginas": 1,
                        }
                    },
                }
            },
        }
    )
    client = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    nov, errores = vigilar(cands, fuentes, client=client)
    assert nov == [] and errores == []
