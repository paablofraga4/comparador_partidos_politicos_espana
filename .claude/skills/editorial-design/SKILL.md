---
name: editorial-design
description: Sistema de diseño "editorial cívico" del comparador. Úsala al crear o modificar cualquier página, componente, estilo, copy de interfaz o animación en web/. Define tokens de color, tipografía, componentes clave (chips de partido, marcas de cita, panel de fuente), movimiento y reglas de accesibilidad y neutralidad visual.
---

# Editorial cívico

Sensación buscada: **un buen periódico digital que te explica la política con calma y te
enseña la fuente**. Rigor, aire, cero estridencia. Propuesta inicial; la tarea T-202 la
concreta en código (`web/app/globals.css` + componentes base) y actualiza esta skill.

## Principios
1. **El contenido manda**: tipografía y espacio hacen el trabajo; adornos mínimos.
2. **El rotulador es la marca**: el subrayado amarillo identifica "aquí está la fuente"
   (marcas de cita, fragmentos resaltados del PDF). No se usa para nada más.
3. **Neutralidad visual** (constitución I.5): colores de partido solo como punto/borde de
   identificación; nunca fondos grandes; siempre con el nombre al lado; orden alfabético.
4. **Amable**: frases cortas, verbos claros ("Compara", "Pregunta"), cero jerga.

## Tokens (CSS variables, Tailwind v4 `@theme`)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--paper` | `#FAF8F3` | `#121316` | fondo |
| `--paper-raised` | `#FFFFFF` | `#1A1C20` | tarjetas, panel |
| `--ink` | `#16181D` | `#ECEAE4` | texto principal, botones primarios |
| `--ink-muted` | `#5B6170` | `#A3A7B0` | texto secundario (≥ 4.5:1) |
| `--rule` | `#E4E0D6` | `#2A2D33` | separadores, bordes |
| `--marker` | `#FFE45C` | `#FFE45C` @ 30 % | subrayado/resaltado de cita |
| `--notice` | `#8A5A00` sobre `#FFF4DB` | `#F2C46D` sobre `#2B2210` | aviso "programa de 2023" |
| `--focus` | `#16181D` + halo `--marker` | idem | anillo de foco |

Colores de partido: `data/candidaturas.yaml` → `--party-<id>`; solo `border-left`, punto de 8-10 px
o subrayado de pestaña. Nunca texto sobre color de partido salvo que pase AA.

## Tipografía (`next/font/google`)
- **Titulares**: Newsreader (serif editorial, ejes ópticos). Pesos 500-650.
- **Texto e interfaz**: Public Sans (sans cívica, muy legible). 400/500/600; `tabular-nums`
  para páginas y cifras.
- Escala: 14 · 16 (base) · 18 · 22 · 28 · 36 · 48. Interlineado cuerpo 1.6; titulares 1.15.
- Medida: 60-72 caracteres por línea en texto corrido.
- Lectura fácil: base 18-19 px, interlineado 1.75, sin cursivas.

## Componentes clave
- **PartyChip**: punto de color + nombre corto; seleccionable (estado `aria-pressed`).
- **TopicChip**: icono lucide + nombre.
- **CitationMark**: "p. 45" pequeño, `tabular-nums`, subrayado `--marker` de 0.35em por
  debajo del texto; hover/focus = resaltado completo. Ver skill `grounding`.
- **SourcePanel**: lateral 480 px (escritorio) / hoja completa (móvil); página PDF con
  rects `--marker` en multiply; literal en cita tipográfica; acciones al pie.
- **ProgramBadge**: "29N · 10 nov" (neutro) o aviso `--notice` "Programa de 2023 (anterior)".
- **NoMention**: texto `--ink-muted` en cursiva suave "No lo menciona en su programa" +
  enlace "Comprobar en el documento". Nunca rojo.
- **EasyReadToggle**: interruptor en cabecera, etiqueta visible "Lectura fácil".

## Movimiento (Motion)
- 150-250 ms, `ease-out`; entrada de tarjetas con desplazamiento 8 px + opacidad, en cascada
  máx. 40 ms entre elementos; panel de fuente deslizante.
- Sin rebotes ni parallax. `prefers-reduced-motion` → solo opacidad.

## Accesibilidad (obligatorio)
- Contraste AA, foco visible siempre, objetivos ≥ 44 px, `lang="es"`.
- Comparativa navegable por teclado; anuncios `aria-live` al cambiar selección.
- Imágenes de páginas PDF con `alt` = literal resaltado.
