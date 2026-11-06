from __future__ import annotations

from datetime import UTC, datetime

import httpx

from votoclaro.models import RegistroFuentes
from votoclaro.paths import ROOT, Paths
from votoclaro.registry import load_candidaturas
from votoclaro.vigilancia import noticias, pdfs_de_programa, vigilar

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


def test_sumario_del_boe_con_objetos_en_vez_de_listas():
    """El 29-oct-2026 el sumario trajo una sola sección como objeto y la vigilancia falló."""
    from votoclaro.vigilancia import boe_novedades

    titulo = "Candidaturas proclamadas para las elecciones al Congreso"
    item = {"identificador": "BOE-A-2026-1", "titulo": titulo}
    departamento = {"nombre": "JUNTAS ELECTORALES PROVINCIALES", "epigrafe": {"item": item}}
    sumario = {"data": {"sumario": {"diario": {"seccion": {"departamento": departamento}}}}}
    client = httpx.Client(
        transport=httpx.MockTransport(lambda r: httpx.Response(200, json=sumario))
    )
    novedades, errores = boe_novedades(["20261029"], client)
    assert errores == []
    assert [n.titulo for n in novedades] == [
        "BOE-A-2026-1 · Candidaturas proclamadas para las elecciones al Congreso"
    ]


def test_no_se_cae_con_candidaturas_sin_web():
    """Las altas automáticas del BOE llevan `web: ''` y `vigilar: []`: no hay nada que visitar
    (antes, `client.get('')` lanzaba ValueError y tumbaba toda la vigilancia)."""
    pedidas: list[str] = []

    def handler(req: httpx.Request) -> httpx.Response:
        pedidas.append(str(req.url))
        if req.url.host == "news.google.com":
            return httpx.Response(200, content=RSS.encode())
        return httpx.Response(200, text=HTML)

    base = load_candidaturas(Paths(ROOT / "data")).get("pp")
    sin_web = base.model_copy(update={"id": "nueva", "web": "", "vigilar": []})
    fuentes = RegistroFuentes.model_validate(
        {"version": 1, "convocatorias": {"generales-2026": {"fecha": "2026-11-29"}}}
    )
    client = httpx.Client(transport=httpx.MockTransport(handler))
    nov, errores = vigilar(
        [sin_web], fuentes, desde=datetime(2026, 10, 6, tzinfo=UTC), client=client
    )
    assert not errores
    assert all(n.tipo == "noticia" for n in nov)  # sin web no hay PDF oficial que mirar
    assert not any(u in ("", "/") or "pp.es" in u for u in pedidas)


def _rss(*titulos: str) -> bytes:
    items = "".join(
        f"<item><title>{t}</title><link>https://ejemplo.es/{i}</link>"
        "<pubDate>Tue, 10 Nov 2026 10:00:00 GMT</pubDate></item>"
        for i, t in enumerate(titulos)
    )
    return f'<?xml version="1.0"?><rss><channel>{items}</channel></rss>'.encode()


def _noticias(cand, *titulos: str) -> list[str]:
    client = httpx.Client(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, content=_rss(*titulos)))
    )
    return [n.titulo for n in noticias(cand, client, datetime(2026, 10, 6, tzinfo=UTC))]


def test_noticias_no_confunde_siglas_con_otros_textos():
    pp = load_candidaturas(Paths(ROOT / "data")).get("pp")
    # «PP» solo cuenta como palabra completa: no dentro de «Apple» o «app»
    assert _noticias(
        pp,
        "El PP presenta su programa electoral",
        "Programa electoral de la app de Apple",
    ) == ["El PP presenta su programa electoral"]


def test_noticias_de_siglas_ambiguas_se_buscan_por_el_nombre_completo():
    pp = load_candidaturas(Paths(ROOT / "data")).get("pp")
    veintinueve = pp.model_copy(update={"id": "29", "corto": "29", "nombre": "Partido Veintinueve"})
    assert _noticias(
        veintinueve,
        "Programa electoral de ERC para el 29-N",
        "Programa electoral de VOX para el 29N: las propuestas",
        "Partido Veintinueve presenta su programa electoral",
    ) == ["Partido Veintinueve presenta su programa electoral"]
