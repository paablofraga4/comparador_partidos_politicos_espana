# Spec 004 · Uso del chat: preguntas gratis y bonos

- **Estado**: aprobada (6 oct 2026). Decisiones del propietario en el chat:
  - 2 preguntas gratis en total;
  - bonos de 0,99 €, 2,99 € y 4,99 € con margen;
  - mensaje honesto: coste de la IA + mantenimiento;
  - pagos implementados pero **apagados** hasta tener el alta y los textos legales.
- **Relación**: sustituye la capa 3 («por persona anónima») de la spec 003, HU-3.7. El resto de
  capas (tope de OpenAI, tope diario, tamaño acotado, antibots) siguen vigentes.
- **Constitución**: sin cambios.
  - VI.1: sin cuentas; las *cookies* de esta spec son técnicas (cuota y bono), no de seguimiento.
  - VI.2: no se guarda el texto de las preguntas; el techo por IP mantiene la sal diaria.

## Objetivo

El chat cuesta dinero en cada respuesta; el comparador no. Queremos:
- que cualquiera pruebe el chat sin registrarse;
- que el gasto gratuito tenga un techo diario fijo, vengan los visitantes que vengan;
- que quien quiera más pueda pagar un bono sin crear una cuenta.

## Principios

1. **El comparador es gratis y sin límite**: comparativa, fichas, citas, PDF y lectura fácil.
   Solo se limita el chat.
2. **Sin cuentas y sin datos personales.** Nosotros no guardamos nombre ni email. El pago lo
   procesa Stripe, que es quien ve los datos de la tarjeta.
3. **Honestidad.** El texto explica el coste de la IA y el mantenimiento. Nunca dice «sin ánimo
   de lucro», porque los precios llevan margen.
4. **Mismo trato para todos.** El límite no depende de qué se pregunte ni de qué partido trate
   la pregunta.

## Historias de usuario

### HU-4.1 Preguntas gratis
- Cada navegador tiene **2 preguntas gratis en total** (`CHAT_GRATIS_TOTAL`).
- Se reconoce con una *cookie* técnica `vc_uso`:
  - es aleatoria, `httpOnly` y solo se envía a `/api`;
  - caduca el 31-12-2026;
  - en la base solo se guarda su *hash*.
- Además hay un **techo diario por IP** (`CHAT_GRATIS_POR_IP_DIA`, 6 por defecto), con el HMAC de la
  IP y sal diaria. Así, borrar *cookies* no da preguntas ilimitadas.
- Hay un **tope diario de gasto gratuito** (`CHAT_DAILY_BUDGET_USD`). Al alcanzarlo, las preguntas
  gratis se pausan hasta el día siguiente. Las de pago siguen.
- Solo cuentan las respuestas completadas:
  - la pregunta se reserva al empezar, de forma atómica, y se devuelve si la respuesta falla;
  - parar la respuesta a mano sí cuenta, porque ya ha consumido IA.
- Los evals (`x-evals-token`) no cuentan.

### HU-4.2 Contador visible
Antes de preguntar y tras cada respuesta, se ve lo que queda: «Te quedan 2 preguntas gratis» o
«Tu bono: 87 preguntas».

### HU-4.3 Al llegar al límite
En lugar de la caja de pregunta aparece una tarjeta con:
- un **título**: «Has usado tus 2 preguntas gratis»;
- el **porqué**, en texto honesto: «Cada respuesta del asistente usa inteligencia artificial, y
  eso cuesta dinero. Con un bono cubres ese coste y ayudas a mantener VotoClaro al día. El
  comparador, las fuentes y la lectura fácil siguen siendo gratis para todo el mundo.»;
- los **3 planes**: preguntas, precio con IVA y precio por pregunta. No hay «recomendado»
  destacado ni cuentas atrás (sin patrones oscuros);
- un enlace **«Tengo un código»** y otro a **«Seguir comparando gratis»**;
- una versión en **lectura fácil** del texto.

Si los pagos están apagados, el texto es: «Pronto podrás ampliar con un bono. Mientras tanto, el
comparador sigue siendo gratis y sin límite».

### HU-4.4 Planes
| Plan | Precio (IVA incl.) | Preguntas | Máx. por hora | Por pregunta |
|---|---|---|---|---|
| Bono 25 | 0,99 € | 25 | 10 | ~4 céntimos |
| Bono 100 | 2,99 € | 100 | 20 | 3 céntimos |
| Bono 200 | 4,99 € | 200 | 30 | 2,5 céntimos |

- Son pagos únicos, sin suscripción, válidos hasta el **31-12-2026**.
- Las conversaciones admiten hasta 10 turnos.
- Estimación de margen: coste por pregunta de 0,012 € (prudente: los evals midieron 0,006 €);
  IVA del 21 %; Stripe al 1,5 % + 0,25 €.
- Los planes viven en `web/lib/bonos/planes.ts` y no se escriben en ningún otro sitio del código.

### HU-4.5 Comprar sin cuenta
1. La persona elige un plan y se crea un bono **pendiente** con un código aleatorio
   (`VC-XXXX-XXXX-XXXX`, 60 bits). En la base solo se guarda su *hash*.
2. Se abre Stripe Checkout (tarjeta, Apple Pay o Google Pay).
   - El código va en los metadatos y en el nombre del producto, para que aparezca en el recibo
     de Stripe como forma de recuperarlo.
   - Antes de pagar se informa de que el bono se activa al momento y de que, por eso, se
     renuncia al desistimiento (contenido digital, art. 103.m del TRLGDCU).
3. Al volver del pago, el servidor comprueba la sesión con Stripe, activa el bono, guarda el
   código en la *cookie* `vc_bono` (`httpOnly`) y muestra `/bono`, que incluye:
   - el código, con un botón para copiarlo;
   - las preguntas que quedan y la fecha de caducidad;
   - «Guárdalo para usarlo en otro dispositivo».
4. Un *webhook* (`checkout.session.completed`) activa el bono aunque la persona cierre la
   pestaña antes de volver.

### HU-4.6 Usar el bono en otro dispositivo
- «Tengo un código» → se introduce el código y queda guardado en ese navegador.
- Como máximo 10 intentos por hora y por IP.
- «Quitar el bono de este navegador», para dispositivos compartidos.

### HU-4.7 Devoluciones
Si se devuelve un pago desde Stripe, el *webhook* `charge.refunded` anula el bono.

### HU-4.8 Interruptor y salvaguardas
- `PAGOS_ACTIVOS=1` solo surte efecto si están todas estas variables:
  - `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`;
  - `TITULAR_NOMBRE`, `TITULAR_NIF` y `TITULAR_EMAIL`, que se muestran en `/condiciones`
    (aviso legal y condiciones de compra, LSSI art. 10).

  Si falta alguna, la web se comporta como con los pagos apagados. **Es imposible cobrar sin la
  identidad del titular.**
- En desarrollo, `PAGOS_PASARELA=simulada` prueba el flujo completo sin Stripe. En producción se
  ignora.

### HU-4.9 Presupuestos
- **Gratis**: `CHAT_DAILY_BUDGET_USD`, 1,5 $ por defecto.
- **Pago**: `CHAT_DAILY_BUDGET_PAGO_USD`, 25 $ por defecto. Es un tope de emergencia: lo pagado
  se sirve salvo avería.
- `uso_diario` separa los dos tipos.
- El tope mensual del proyecto de OpenAI sigue siendo la última barrera.

## Fuera de alcance
- Suscripciones y cuentas.
- Bizum.
- Facturas a medida: Stripe emite recibos.
- Plataformas que actúan como vendedor (Paddle, Lemon Squeezy): sus comisiones se comen el plan
  de 0,99 €.
- Asesoría legal o fiscal. El texto de `/condiciones` es un **borrador que debe revisar una
  gestoría** antes de activar los pagos.

## Criterios de aceptación
Verificados el 6 de octubre. Entre paréntesis, cómo: e2e = en el navegador, test = Vitest con
PGlite.

- [x] Con un navegador nuevo:
  - 2 preguntas se responden y la 3.ª muestra la tarjeta de planes (e2e);
  - la 7.ª desde la misma IP en el mismo día, aunque se borren las *cookies*, también (test).
- [x] Una respuesta que falla no gasta la pregunta (e2e, con un modelo inexistente).
- [x] Al superar el tope diario gratuito, el plan gratis se pausa y el de pago no (test).
- [x] Pasarela simulada (e2e):
  - comprar Bono 25 da 25 preguntas;
  - el código funciona en otro navegador;
  - al devolver el pago, el bono se anula.
- [x] Un bono no admite más preguntas por hora que las de su plan, ni más que su total, ni
  después de caducar (test).
- [x] Con `PAGOS_ACTIVOS=1` pero sin los datos del titular, no se puede comprar (test).
- [x] Ninguna tabla guarda el texto de las preguntas, emails ni IPs en claro (diseño y test del
  *hash* del código).
- [ ] La tarjeta de planes es accesible.
  - Teclado, 375 px y objetivos de 44 px: verificados.
  - Lector de pantalla: falta probarlo (T-213).
- [x] **Producción, con Stripe en modo real**: el propietario probó la compra del Bono 25, el
  uso del bono y la devolución, que lo anula vía *webhook*.
