# Comparador de programas electorales · Elecciones generales 29N

> **Estado:** en construcción. Fase 0: especificaciones pendientes de aprobación.

Una web pública, neutral y fácil de usar para saber **qué propone cada partido** en las
elecciones generales del 29 de noviembre de 2026 y compararlos tema a tema: vivienda,
inmigración, pensiones, sanidad…

- **Compara** varios partidos en los temas que te importan, o **conoce** a fondo uno solo.
- **Pregunta** en lenguaje natural («¿Qué proponen sobre los pisos turísticos?»).
- **Comprueba** cualquier frase: cada afirmación enlaza al PDF oficial del programa, en la
  página exacta y con el fragmento resaltado.
- **Lectura fácil**: todo el contenido tiene también una versión sencilla.

Hasta que cada partido publique su programa del 29N, se muestra el de las generales de 2023,
señalado claramente como anterior.

## Principios

Resumen de la [constitución del proyecto](specs/constitution.md):

1. **Neutralidad**: mismo trato para todos los partidos, orden alfabético, sin valoraciones,
   rankings ni encuestas.
2. **Nada sin fuente**: cada frase tiene una cita literal verificada automáticamente. Si un
   partido no habla de un tema, se dice.
3. **Transparencia**: metodología pública, historial de cambios en git y un canal para
   reportar errores.
4. **El asistente informa, no aconseja**: nunca recomienda voto.
5. **Accesible y respetuosa con la privacidad**: no se guardan las preguntas.

## Cómo funciona

```
PDF oficial ─► extracción de texto ─► análisis por tema con IA ─► verificación de citas ─► revisión humana (PR) ─► web
```

Los análisis se generan una vez por programa, se revisan en un *pull request* y se publican.
Están en [`data/analyses/`](data/analyses/) y cualquiera puede auditarlos.

## Estructura

| Carpeta | Contenido |
|---|---|
| [`specs/`](specs/) | Constitución, especificaciones (desarrollo guiado por specs), plan técnico y tareas |
| [`data/`](data/) | Partidos, temas, PDFs, texto extraído y análisis |
| `pipeline/` | Ingesta y análisis (Python) |
| `web/` | Aplicación web (Next.js) |
| `evals/` | Batería de pruebas del asistente |

## ¿Has visto un error?

Abre una [*issue*](../../issues/new) indicando el partido, el tema y la propuesta. Cada
corrección queda registrada en el historial.

## Aviso

Proyecto independiente, sin relación con ningún partido político ni institución. Los
programas electorales son documentos públicos de sus respectivos partidos.
