# Runbook · Activar los apoyos

Los apoyos están programados y probados con la pasarela simulada, pero **apagados**. Usan la
misma cuenta de Stripe, el mismo *webhook* y los mismos datos del titular que los bonos
([activar-pagos.md](../004-uso-y-bonos/activar-pagos.md)), así que solo faltan estos pasos, en
este orden. Todos son por la web.

## 1. Gestoría

Pregúntale, con `/condiciones#apoyos` a mano:
- cómo tributan las aportaciones voluntarias que recibes como particular (además de lo que ya
  vendes con los bonos);
- que revisen el texto de «Apoyos voluntarios» en `/condiciones`
  (`web/app/condiciones/page.tsx`). Es un **borrador**.

## 2. Stripe (modo real)

1. **Developers → Webhooks → tu endpoint** (`https://votoclaro.app/api/bonos/webhook`) →
   *Add events* y añade estos dos:
   - `invoice.paid`: cuenta cada mes de los apoyos mensuales;
   - `customer.subscription.deleted`: marca un apoyo mensual como cancelado.

   Ya estaban: `checkout.session.completed`, `checkout.session.async_payment_succeeded` y
   `charge.refunded`.
2. **Settings → Billing → Customer portal** → actívalo.
   - Permite que el cliente **cancele suscripciones** y **actualice el método de pago**.
   - Copia el **enlace de inicio de sesión** (*login link*, `https://billing.stripe.com/p/login/…`).
3. Si usas una **clave restringida**, añádele:
   - *Invoices*: lectura, para enlazar cada cobro mensual con su posible devolución;
   - si al apoyar sale «No se ha podido abrir el pago», mira el error en los registros de Railway
     («⚠ no se pudo crear la sesión de apoyo») y añade el permiso que nombre.

## 3. Railway → servicio web → Variables

```
APOYOS_ACTIVOS=1
STRIPE_PORTAL_URL=<el enlace del paso 2.2>
```

Opcionales:
- `APOYOS_PERIODO=mes` para que el tablón y los totales cuenten solo el mes en curso (por
  defecto, `total`).
- `APOYOS_OCULTOS=ap_…,ap_…` para ocultar nombres (ver el paso 5).

Railway redespliega solo. `APOYOS_ACTIVOS` llega también al *build* (ARG del `Dockerfile`),
porque la portada es estática y decide ahí si pinta los botones de apoyar.

## 4. Comprobar

1. Al final de la portada salen «Apoyar cada mes» y «Apoyar una vez».
2. En `/apoya`, apoya una vez con 3 € y un nombre de prueba. Debes volver a `/apoya/gracias` y
   ver el nombre en «Últimos apoyos».
3. En Stripe, **devuelve ese pago** entero: el nombre sale del tablón y de los totales en
   unos segundos.

## 5. Ocultar un nombre

1. En Stripe, abre el pago y busca `apoyo_id` en **Metadata** (empieza por `ap_`).
2. Añádelo a `APOYOS_OCULTOS` en Railway (separado por comas). El apoyo sigue contando en los
   totales, como anónimo.

Si alguien pide quitar su nombre, hazlo en menos de 7 días (lo promete `/apoya`).

## 6. Mantener las cuentas

Cuando cambie una factura (Railway, dominio), actualiza `data/costes.yaml` con la cifra y la
fecha. La IA del chat se calcula sola con el gasto registrado.
