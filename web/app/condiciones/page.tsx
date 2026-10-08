import type { Metadata } from "next";
import Link from "next/link";

import { CORREO_CONTACTO } from "@/lib/autor";
import { titular } from "@/lib/bonos/pagos";
import { centimosPorPregunta, euros, fechaCaducidad, PLANES } from "@/lib/bonos/planes";
import { metaPagina } from "@/lib/seo";

export const metadata: Metadata = metaPagina({
  titulo: "Aviso legal y condiciones de los bonos y los apoyos",
  descripcion:
    "Quién está detrás de VotoClaro, condiciones de compra de los bonos del asistente y de los apoyos voluntarios.",
  ruta: "/condiciones",
});

export const dynamic = "force-dynamic";

// Spec 004, HU-4.8. BORRADOR: este texto debe revisarlo una gestoría antes de activar los pagos
// (ver specs/004-uso-y-bonos/activar-pagos.md). Los datos del titular vienen de variables de
// entorno: sin ellos, los pagos no se pueden activar.
export default function Condiciones() {
  const t = titular();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-medium sm:text-5xl">Aviso legal y condiciones</h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-medium">Quién está detrás</h2>
        {t ? (
          <ul className="space-y-1">
            <li>Titular: {t.nombre}</li>
            <li>NIF: {t.nif}</li>
            <li>
              Contacto:{" "}
              <a className="underline" href={`mailto:${t.email}`}>
                {t.email}
              </a>
            </li>
          </ul>
        ) : (
          <p className="text-ink-muted">
            VotoClaro es un proyecto independiente y sin relación con ningún partido. Los bonos
            todavía no están a la venta; cuando lo estén, aquí aparecerán los datos del titular.
          </p>
        )}
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="text-2xl font-medium">Qué es gratis</h2>
        <p>
          El comparador, las fichas de cada partido, las fuentes y la lectura fácil son gratis y sin
          límite. El asistente que responde preguntas tiene unas pocas preguntas gratis; para hacer
          más, puedes comprar un bono.
        </p>
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="text-2xl font-medium">Qué compras con un bono</h2>
        <ul className="space-y-1">
          {PLANES.map((p) => (
            <li key={p.id}>
              {p.nombre}: {p.preguntas} preguntas por {euros(p.precioCent)} (≈{" "}
              {centimosPorPregunta(p)} céntimos por pregunta), hasta {p.porHora} por hora.
            </li>
          ))}
        </ul>
        <p>
          Precios finales con IVA incluido. Es un pago único: no hay suscripción ni renovaciones.
          Los bonos valen hasta el {fechaCaducidad()}; después, las preguntas que queden caducan.
        </p>
        <p>
          El dinero cubre lo que cuesta la inteligencia artificial de cada respuesta y el
          mantenimiento de VotoClaro (servidor y actualización de los programas).
        </p>
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="text-2xl font-medium">Cómo funciona</h2>
        <p>
          Al pagar recibes un código (VC-XXXX-XXXX-XXXX). Se guarda en tu navegador y también
          aparece en el recibo de Stripe. Con él puedes usar el bono en otro dispositivo. No
          necesitas cuenta: no guardamos tu nombre ni tu email, así que sin el código no podemos
          recuperar el bono.
        </p>
        <p>
          Solo se descuentan las preguntas que reciben respuesta. Si una respuesta falla por un
          problema técnico, la pregunta no se descuenta.
        </p>
        <p>
          El asistente responde con lo que dicen los programas oficiales y cita la página de cada
          frase. No recomienda a quién votar ni valora propuestas. Puede equivocarse: comprueba
          siempre la fuente.
        </p>
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="text-2xl font-medium">Pago, desistimiento y devoluciones</h2>
        <p>
          El pago lo procesa Stripe (tarjeta, Apple Pay o Google Pay). VotoClaro no ve ni guarda los
          datos de tu tarjeta.
        </p>
        <p>
          El bono es contenido digital que se activa en cuanto pagas. Antes de pagar aceptas
          expresamente su ejecución inmediata y, por eso, no hay derecho de desistimiento (art.
          103.m del texto refundido de la Ley General para la Defensa de los Consumidores y
          Usuarios).
        </p>
        <p>
          Si se te cobra por error, o si el asistente deja de funcionar durante mucho tiempo antes
          de que caduque tu bono, escríbenos con tu código
          {t ? (
            <>
              {" "}
              a{" "}
              <a className="underline" href={`mailto:${t.email}`}>
                {t.email}
              </a>
            </>
          ) : null}{" "}
          y te devolveremos la parte de las preguntas que no hayas podido usar.
        </p>
      </section>

      {/* Spec 005, HU-5.4 a HU-5.7. BORRADOR: lo debe revisar la gestoría antes de activar los apoyos */}
      <section className="mt-10 scroll-mt-32 space-y-3 leading-relaxed" id="apoyos">
        <h2 className="text-2xl font-medium">Apoyos voluntarios</h2>
        <p>
          Puedes apoyar VotoClaro cada mes o una vez. Es una aportación voluntaria para cubrir sus
          costes (servidor, IA y dominio): no es una compra, no da acceso a nada que no sea gratis y
          no desgrava, porque VotoClaro no es una asociación ni una fundación.
        </p>
        <p>
          Ninguna aportación influye de forma política: no cambia los análisis, ni el orden de los
          partidos, ni las respuestas del chat.
        </p>
        <p>
          El apoyo mensual se cobra cada mes hasta que lo canceles, cuando quieras, desde el enlace
          «Gestionar o cancelar mi apoyo» de la página de apoyos o desde el recibo de Stripe. Si te
          equivocas al apoyar, escríbenos en los 14 días siguientes a{" "}
          <a className="underline" href={`mailto:${CORREO_CONTACTO}`}>
            {CORREO_CONTACTO}
          </a>{" "}
          y te lo devolvemos.
        </p>
        <p>
          Si escribes un nombre o alias en el pago, saldrá en el tablón de{" "}
          <Link className="underline" href="/apoya#tablon">
            apoyos
          </Link>
          , sin importes. Los nombres con siglas de partidos, lemas, insultos o enlaces salen como
          anónimos, y podemos ocultar cualquier nombre. Para quitar o cambiar el tuyo, escríbenos a{" "}
          {CORREO_CONTACTO} y lo retiramos en menos de 7 días.
        </p>
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="text-2xl font-medium">Privacidad</h2>
        <p>
          No guardamos el texto de tus preguntas. Para contar las preguntas gratis y recordar tu
          bono usamos dos cookies técnicas, sin publicidad ni seguimiento: una aleatoria que solo
          cuenta preguntas y otra con tu código de bono. De los apoyos guardamos solo el nombre o
          alias que escribas para el tablón (si lo escribes), el importe, el tipo y las fechas; tu
          email y tu tarjeta los tiene Stripe. Más detalles en{" "}
          <Link className="underline" href="/metodologia#privacidad">
            cómo lo hacemos
          </Link>
          .
        </p>
      </section>

      <section className="mt-10 space-y-3 leading-relaxed">
        <h2 className="text-2xl font-medium">Ley aplicable</h2>
        <p>
          Estas condiciones se rigen por la ley española. Si eres consumidor, puedes reclamar ante
          los juzgados de tu domicilio.
        </p>
      </section>
    </div>
  );
}
