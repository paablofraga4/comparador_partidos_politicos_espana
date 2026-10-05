"""Registro y archivo de un programa (spec 001, HU-1.1)."""

from __future__ import annotations

import hashlib
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pymupdf

from .models import Fuente
from .paths import Paths
from .registry import load_candidaturas, load_sources, save_sources

USER_AGENT = (
    "Mozilla/5.0 (compatible; VotoClaroBot/0.1; "
    "+https://github.com/paablofraga4/comparador_partidos_politicos_espana)"
)


class FetchError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _download(url: str, dest: Path, client: httpx.Client) -> str:
    """Descarga `url` en `dest`. Devuelve 'pdf' o 'html'."""
    with client.stream("GET", url, follow_redirects=True, timeout=120) as r:
        if r.status_code >= 400:
            raise FetchError(f"HTTP {r.status_code} al descargar {url}")
        with dest.open("wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
    head = dest.read_bytes()[:1024].lstrip()
    if head.startswith(b"%PDF"):
        return "pdf"
    if b"<html" in head.lower() or b"<!doctype html" in head.lower():
        return "html"
    raise FetchError(f"{url} no devuelve un PDF ni una página HTML")


def html_to_pdf(url: str, dest: Path) -> None:
    """Archiva una página web como PDF con Playwright (extra opcional `html`)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:  # pragma: no cover - depende del entorno
        raise FetchError(
            "El programa es una página web. Instala el extra: `uv sync --extra html` y "
            "`uv run playwright install chromium`."
        ) from e
    with sync_playwright() as p:  # pragma: no cover - requiere navegador
        browser = p.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        page.goto(url, wait_until="networkidle", timeout=120_000)
        page.pdf(path=str(dest), format="A4", print_background=True)
        browser.close()


def archive_wayback(url: str, client: httpx.Client) -> str | None:
    """Pide a la Wayback Machine que archive la URL. Nunca bloquea la ingesta."""
    try:
        r = client.get(f"https://web.archive.org/save/{url}", timeout=90, follow_redirects=False)
        loc = r.headers.get("content-location") or r.headers.get("location")
        if loc:
            return loc if loc.startswith("http") else f"https://web.archive.org{loc}"
        if r.status_code < 400:
            ts = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
            return f"https://web.archive.org/web/{ts}/{url}"
    except httpx.HTTPError:
        pass
    return None


def fetch(
    paths: Paths,
    cand: str,
    conv: str,
    url: str,
    local_file: Path | None = None,
    force: bool = False,
    wayback: bool = True,
    client: httpx.Client | None = None,
) -> tuple[Fuente, str]:
    """Registra el programa. Devuelve (fuente, resultado) con resultado en
    {'nuevo', 'sin-cambios', 'actualizado'}."""
    load_candidaturas(paths).get(cand)  # valida que la candidatura existe
    reg = load_sources(paths)
    if conv not in reg.convocatorias:
        raise FetchError(f"Convocatoria desconocida: {conv}")

    own_client = client is None
    client = client or httpx.Client(headers={"User-Agent": USER_AGENT})
    try:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp) / "doc"
            if local_file:
                shutil.copyfile(local_file, tmp_path)
                origen = "pdf" if tmp_path.read_bytes()[:5].startswith(b"%PDF") else "html"
                if origen == "html":
                    raise FetchError("--archivo debe ser un PDF")
            else:
                origen = _download(url, tmp_path, client)
                if origen == "html":
                    html_to_pdf(url, tmp_path)

            try:
                with pymupdf.open(tmp_path) as d:
                    n_pages = d.page_count
            except Exception as e:  # noqa: BLE001
                raise FetchError(f"El documento no es un PDF válido: {e}") from e

            digest = sha256_file(tmp_path)
            previous = reg.convocatorias[conv].programas.get(cand)
            if previous and previous.sha256 == digest:
                return previous, "sin-cambios"
            if previous and previous.estado == "aprobado" and not force:
                raise FetchError(
                    f"El programa de {cand} ({conv}) ha cambiado respecto al aprobado "
                    f"({previous.sha256[:12]} → {digest[:12]}). Usa --force para re-registrarlo."
                )

            dest = paths.document(conv, cand)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(tmp_path, dest)

        fuente = Fuente(
            url=url,
            url_archivo=archive_wayback(url, client)
            if (wayback and url.startswith("http"))
            else None,
            fichero=paths.rel(dest),
            sha256=digest,
            descargado=datetime.now(UTC).replace(microsecond=0),
            origen=origen,
            paginas=n_pages,
            estado="publicado",
        )
        reg.convocatorias[conv].programas[cand] = fuente
        save_sources(paths, reg)
        return fuente, ("actualizado" if previous else "nuevo")
    finally:
        if own_client:
            client.close()
