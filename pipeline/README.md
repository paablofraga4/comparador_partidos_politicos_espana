# Pipeline de VotoClaro

Convierte cada programa electoral (PDF o web) en análisis por tema con citas verificadas.
Spec: [`../specs/001-datos-y-analisis/spec.md`](../specs/001-datos-y-analisis/spec.md).

```bash
uv sync                      # instala dependencias (Python 3.13 gestionado por uv)
uv run vc --help             # comandos disponibles
uv run vc status             # estado de cada candidatura y convocatoria
uv run pytest -q             # tests
uv run vc validate           # validación de data/ (la misma que ejecuta la CI)
```

Flujo por programa: `fetch → extract → chunk → analyze → verify → report` (ver skill
`ingest-program`).
