"""Vigilancia de programas nuevos (spec 001, HU-1.10).

Para cada candidatura: busca enlaces a PDF de programa en sus páginas `vigilar` (o su web) y
noticias recientes en Google News. Devuelve novedades; el workflow las convierte en issues
(deduplicadas por URL) y, si se activa, lanza la ingesta en borrador.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus, urljoin, urlparse

import httpx

from .fetch import USER_AGENT
from .models import Candidatura, RegistroFuentes

# Palabras que indican programa electoral (castellano, catalán, gallego, euskera)
_PROGRAMA = re.compile(r"program|egitasmo", re.I)
_ELECCION = re.compile(r"2026|29n|29-n|general|xerais|orokor|hauteskunde|congres|electoral", re.I)
_HREF = re.compile(r"""<a\b[^>]*href=["']([^"'#]+)["'][^>]*>(.*?)</a>""", re.I | re.S)
_TAGS = re.compile(r"<[^>]+>")


@dataclass
class Novedad:
    candidatura: str
    tipo: str  # "pdf-oficial" | "noticia"
    url: str
    titulo: str
    fecha: str | None = None
    dominio_oficial: bool = False

    def dict(self) -> dict:
        return asdict(self)


def _dominio(url: str) -> str:
    host = urlparse(url).hostname or ""
    partes = host.split(".")
    return ".".join(partes[-2:]) if len(partes) >= 2 else host


def _es_pdf(url: str) -> bool:
    """Termina en «.pdf» o tiene un tramo «/pdf/» en la ruta (gestores documentales como el del
    PNV: …/adjuntos-documentos/21765/pdf/programa-electoral-29n)."""
    ruta = urlparse(url).path.lower()
    return ruta.endswith(".pdf") or "/pdf/" in ruta


def _enlaces(html: str, base: str):
    for href, texto in _HREF.findall(html):
        yield urljoin(base, href.strip()), " ".join(_TAGS.sub(" ", texto).split())


def pdfs_de_programa(html: str, base: str) -> list[tuple[str, str]]:
    """Enlaces a PDF cuyo texto o URL sugieren un programa electoral."""
    out = []
    for url, texto in _enlaces(html, base):
        if not _es_pdf(url):
            continue
        pista = f"{url} {texto}"
        if _PROGRAMA.search(pista) and _ELECCION.search(pista):
            out.append((url, texto or url.rsplit("/", 1)[-1]))
    return list(dict.fromkeys(out))


def paginas_de_programa(html: str, base: str, maximo: int = 3) -> list[str]:
    """Páginas del mismo dominio que parecen la del programa electoral (no PDF): el PDF suele
    estar en ellas y no en la portada. Se visitan como mucho `maximo`, un solo nivel."""
    out = []
    for url, texto in _enlaces(html, base):
        pista = f"{url} {texto}"
        if (
            not _es_pdf(url)
            and url.startswith(("http://", "https://"))
            and _dominio(url) == _dominio(base)
            and _PROGRAMA.search(pista)
            and _ELECCION.search(pista)
        ):
            out.append(url.split("#")[0])
    return list(dict.fromkeys(out))[:maximo]


def _siglas_ambiguas(cand: Candidatura) -> bool:
    """Siglas con un dígito y de hasta 3 caracteres («29», «3e», «D21»): coinciden con textos que
    no son de la candidatura («el 29-N»), así que se busca por su nombre completo."""
    return bool(re.search(r"\d", cand.corto)) and len(cand.corto) <= 3


def menciona(cand: Candidatura, titulo: str) -> bool:
    """¿El título nombra a la candidatura, como palabra completa? («PP» no es «apple»)"""
    nombres = [cand.nombre] if _siglas_ambiguas(cand) else [cand.corto, cand.nombre]
    return any(
        re.search(rf"(?<!\w){re.escape(n)}(?!\w)", titulo, re.I) for n in nombres if n.strip()
    )


def noticias(cand: Candidatura, client: httpx.Client, desde: datetime) -> list[Novedad]:
    nombre = cand.nombre if _siglas_ambiguas(cand) else cand.corto
    q = quote_plus(f'"programa electoral" "{nombre}" elecciones generales')
    url = f"https://news.google.com/rss/search?q={q}&hl=es&gl=ES&ceid=ES:es"
    r = client.get(url, timeout=30)
    r.raise_for_status()
    out = []
    for item in ET.fromstring(r.content).iter("item"):
        titulo = (item.findtext("title") or "").strip()
        enlace = (item.findtext("link") or "").strip()
        try:
            fecha = parsedate_to_datetime(item.findtext("pubDate") or "")
        except (TypeError, ValueError):
            continue
        if fecha < desde or not enlace:
            continue
        if not (_PROGRAMA.search(titulo) and menciona(cand, titulo)):
            continue
        out.append(Novedad(cand.id, "noticia", enlace, titulo, fecha.date().isoformat()))
    return out


def vigilar(
    candidaturas: list[Candidatura],
    fuentes: RegistroFuentes,
    convocatoria: str = "generales-2026",
    desde: datetime | None = None,
    client: httpx.Client | None = None,
    con_noticias: bool = True,
) -> tuple[list[Novedad], list[str]]:
    """Devuelve (novedades, errores). No escribe nada: es idempotente."""
    desde = desde or datetime(2026, 10, 6, tzinfo=UTC)
    registradas = (
        {f.url for f in fuentes.convocatorias.get(convocatoria).programas.values()}
        if convocatoria in fuentes.convocatorias
        else set()
    )
    own = client is None
    client = client or httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True)
    novedades: list[Novedad] = []
    errores: list[str] = []
    try:
        for c in candidaturas:
            if (
                c.convocatorias.get(convocatoria)
                and fuentes.convocatorias.get(convocatoria, None)
                and c.id in fuentes.convocatorias[convocatoria].programas
            ):
                continue  # ya tenemos su programa de esta convocatoria
            # Las altas automáticas del BOE no traen web: no hay página que visitar (solo noticias)
            for pagina in c.vigilar or ([c.web] if c.web else []):
                try:
                    r = client.get(pagina, timeout=30)
                    r.raise_for_status()
                except httpx.HTTPError as e:
                    errores.append(f"{c.id}: {pagina} → {e.__class__.__name__}")
                    continue
                oficiales = {_dominio(c.web), *(_dominio(v) for v in c.vigilar)}
                encontrados = pdfs_de_programa(r.text, str(r.url))
                # Un nivel más: la página «programa electoral» de su propia web (caso PNV)
                for sub in paginas_de_programa(r.text, str(r.url)):
                    try:
                        rs = client.get(sub, timeout=30)
                        rs.raise_for_status()
                    except httpx.HTTPError as e:
                        errores.append(f"{c.id}: {sub} → {e.__class__.__name__}")
                        continue
                    encontrados += pdfs_de_programa(rs.text, str(rs.url))
                for url, texto in dict.fromkeys(encontrados):
                    if url in registradas:
                        continue
                    novedades.append(
                        Novedad(
                            c.id,
                            "pdf-oficial",
                            url,
                            texto,
                            dominio_oficial=_dominio(url) in oficiales,
                        )
                    )
            if con_noticias:
                try:
                    novedades += noticias(c, client, desde)
                except (httpx.HTTPError, ET.ParseError) as e:
                    errores.append(f"{c.id}: noticias → {e.__class__.__name__}")
    finally:
        if own:
            client.close()
    unicas = list({n.url: n for n in novedades}.values())
    return unicas, errores


# --- BOE: candidaturas y coaliciones (HU-1.10) --------------------------------------------

_BOE_SUMARIO = "https://www.boe.es/datosabiertos/api/boe/sumario/{fecha}"
_BOE_INTERES = re.compile(r"candidatura|coalici", re.I)


def _lista(x: object) -> list[dict]:
    """Elementos de un nodo del sumario del BOE, venga como lista, como objeto o vacío."""
    if isinstance(x, list):
        return [e for e in x if isinstance(e, dict)]
    return [x] if isinstance(x, dict) else []


def _items_boe(nodo: object):
    if isinstance(nodo, dict):
        if "identificador" in nodo and "titulo" in nodo:
            yield nodo
        for v in nodo.values():
            yield from _items_boe(v)
    elif isinstance(nodo, list):
        for v in nodo:
            yield from _items_boe(v)


def boe_novedades(fechas: list[str], client: httpx.Client) -> tuple[list[Novedad], list[str]]:
    """Disposiciones de las juntas electorales sobre candidaturas o coaliciones en los sumarios
    del BOE de esas fechas (AAAAMMDD). Los días sin BOE (domingos) dan 404 y se ignoran."""
    novedades: list[Novedad] = []
    errores: list[str] = []
    for f in fechas:
        try:
            r = client.get(
                _BOE_SUMARIO.format(fecha=f), headers={"Accept": "application/json"}, timeout=60
            )
            if r.status_code == 404:
                continue
            r.raise_for_status()
            sumario = r.json()["data"]["sumario"]
        except (httpx.HTTPError, KeyError, ValueError) as e:
            errores.append(f"BOE {f}: {e.__class__.__name__}")
            continue
        # El sumario trae una lista si hay varios elementos y un objeto si hay uno solo (el 29 de
        # octubre de 2026 la vigilancia falló por eso): se tratan igual
        for diario in _lista(sumario.get("diario")):
            for seccion in _lista(diario.get("seccion")):
                for dep in _lista(seccion.get("departamento")):
                    if "ELECTORAL" not in str(dep.get("nombre", "")).upper():
                        continue
                    for it in _items_boe(dep):
                        if _BOE_INTERES.search(it["titulo"]):
                            novedades.append(
                                Novedad(
                                    "boe",
                                    "boe",
                                    f"https://www.boe.es/diario_boe/txt.php?id={it['identificador']}",
                                    f"{it['identificador']} · {it['titulo']}",
                                    f"{f[:4]}-{f[4:6]}-{f[6:]}",
                                    dominio_oficial=True,
                                )
                            )
    return novedades, errores
