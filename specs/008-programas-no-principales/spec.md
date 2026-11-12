# Spec 008 · Programas de las candidaturas no principales, sin IA

- **Estado**: aprobada (12 nov 2026). El titular eligió esta opción en el chat frente a «no hacer
  nada» y «analizarlas todas».
- **Depende de**: [constitución](../constitution.md) (I.6, enmienda del 12 nov),
  [spec 001](../001-datos-y-analisis/spec.md) (ingesta) y [spec 002](../002-comparador/spec.md).

## Contexto

Analizar un programa con IA cuesta entre 1 y 1,5 USD. Hay 43 candidaturas no principales en el
BOE: si todas publicaran, serían unos 55-65 USD. El titular decide no analizarlas por coste. Sin
nada más, una candidatura pequeña que publique seguiría como «pendiente», que es inexacto.

## Historias de usuario

### HU-8.1 Una candidatura no principal publica su programa
**Como** votante **quiero** saber que ha publicado y poder leerlo **para** conocer su propuesta.
- Su programa se registra desde el documento oficial (`vc fetch`, con archivo en Internet
  Archive), sin análisis.
- Ficha: etiqueta «Programa 29N publicado · sin resumen por temas», «Leer el programa ({N}
  págs.)» (visor con buscador) y «Original en su web», y una frase que explica que solo se
  resumen por temas los de las principales, con enlace a la metodología.
- Comparador y páginas de tema: «Ha publicado su programa del 29N, sin resumen por temas. Leer el
  programa», en lugar de «Pendiente».
- Tu papeleta: «Programa del 29N publicado».
- Chat: no lo usa y lo dice si se pregunta por esa candidatura.
- El visor del programa entra en el sitemap.

### HU-8.2 Candado de coste
**Como** titular **quiero** que nadie analice por error una candidatura no principal **para** no
gastar sin querer.
- `vc analyze` se niega con una no principal, antes de llamar a la IA, salvo con
  `--forzar-no-principal`. La regla de principal es la misma que en la web.

## Criterios de aceptación
- [x] Con el programa del 29N registrado sin análisis, la web lo da por «publicado» (antes que el
      de 2023); con análisis aprobado, manda el análisis (test de `programaVigente`).
- [x] `vc analyze -c pacma` sale con error sin llamar a la IA (test).
- [x] Ficha, comparador, temas, Tu papeleta y chat tratan el estado «publicado».
- [x] Constitución I.6, metodología y runbook de ingesta lo explican.

## Fuera de alcance
- Analizar con IA programas de candidaturas no principales.
- Resúmenes manuales.
