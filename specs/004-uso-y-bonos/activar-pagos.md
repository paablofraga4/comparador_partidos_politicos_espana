# Runbook · Activar los bonos de pago

Los bonos están programados y probados, pero **apagados**. Para cobrar de verdad hacen falta
tres cosas que solo puede hacer el propietario. Sigue el orden.

## 1. Antes de nada: lo legal y lo fiscal (gestoría)

Pregúntale a una gestoría, con este enlace a mano (`/condiciones`):

- Alta en Hacienda (modelo 036/037) y, si corresponde, en autónomos (RETA). Vender por
  internet de forma continuada suele considerarse actividad económica.
- IVA: los precios llevan el 21 % incluido; hay que declararlo (y la OSS si se vende a
  personas de otros países de la UE por encima del umbral).
- Que revisen el texto de `/condiciones` (`web/app/condiciones/page.tsx`). Es un **borrador**:
  - qué se compra;
  - renuncia al desistimiento (contenido digital, art. 103.m);
  - devoluciones;
  - privacidad.

## 2. Cuenta de Stripe (web)

1. Regístrate en <https://dashboard.stripe.com/register>. El **modo de prueba** funciona al
   momento, sin verificar nada.
2. **Settings → Customer emails**: activa *Successful payments*. Así el recibo llega por email
   con el código del bono, que va en el nombre del producto.
3. **Settings → Public details**: nombre público «VotoClaro» y el email de contacto.

## 3. Probar en local con el modo de prueba (sin cobrar)

1. En el *dashboard*, con **Test mode** activado: **Developers → API keys** → copia la
   *Secret key* (`sk_test_…`).
2. En tu `.env` (nunca en el chat ni en el repo):
   ```
   PAGOS_ACTIVOS=1
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_WEBHOOK_SECRET=whsec_prueba
   TITULAR_NOMBRE=Prueba
   TITULAR_NIF=00000000T
   TITULAR_EMAIL=tu@email
   ```
3. Abre `/pregunta`, gasta las 2 gratis, elige un plan y paga con la tarjeta de prueba de Stripe
   `4242 4242 4242 4242` (cualquier fecha futura y cualquier CVC). Debes volver a `/bono` con el
   bono activo.

   En local, el *webhook* no llega: la vuelta del pago (`/api/bonos/confirmar`) ya activa el bono.

> ⚠️ Nunca pongas claves `sk_test_` en Railway: con ellas cualquiera conseguiría bonos con la
> tarjeta de prueba.

## 4. Producción (dinero real)

1. En Stripe, **Activate payments**: datos de la persona o empresa (como particular o
   autónomo) y la cuenta bancaria. Sin esto no hay claves reales.
2. **Developers → API keys** (modo real): *Secret key* `sk_live_…`.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<tu-dominio>/api/bonos/webhook`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded` y
     `charge.refunded`.
   - Copia el *Signing secret* (`whsec_…`).
4. **Railway → servicio web → Variables**:
   - `PAGOS_ACTIVOS` = `1`
   - `STRIPE_SECRET_KEY` = `sk_live_…`
   - `STRIPE_WEBHOOK_SECRET` = `whsec_…`
   - `TITULAR_NOMBRE`, `TITULAR_NIF` y `TITULAR_EMAIL`: se publican en `/condiciones`, como
     exige la LSSI.

   Si falta cualquiera de ellas, la web sigue mostrando «Pronto podrás ampliar con un bono».
5. Prueba real:
   - compra el Bono 25 con tu tarjeta y comprueba `/bono`;
   - en Stripe, **Payments → Refund** del pago;
   - el bono debe aparecer como anulado (el *webhook* lo anula).

## Apagar

`PAGOS_ACTIVOS` = `0` en Railway. Los bonos ya vendidos siguen funcionando: se leen de la
base. Solo se deja de vender.

## Ajustar planes o precios

Solo en `web/lib/bonos/planes.ts`, con un PR que actualice también la tabla de la spec 004
(HU-4.4).
