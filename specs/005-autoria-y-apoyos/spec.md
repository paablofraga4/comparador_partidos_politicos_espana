# Spec 005 · Autoría y apoyos

- **Estado**: aprobada (8 oct 2026).
- **Decisiones del propietario en el chat (8 oct 2026)**:
  - el pie muestra el *copyright* con su nombre y su LinkedIn, de forma discreta;
  - los apoyos se cobran con el Stripe que ya usa la web (spec 004), mensuales o de una vez;
  - el tablón muestra nombres sin importes, con dos listas: quienes más han apoyado y los
    últimos apoyos;
  - de momento cuenta el total acumulado, pero se podrá pasar a «este mes»;
  - se habla de «apoyos» y de «personas que apoyan», no de «donantes»;
  - importes de HU-5.4 aceptados;
  - las cuentas muestran también lo ingresado por bonos, como total;
  - costes fijos: Railway 8 €/mes (servidor y base de datos) y dominio 14 €/año.
- **Depende de**: [constitución](../constitution.md) y [spec 004](../004-uso-y-bonos/spec.md)
  (Stripe, interruptor de pagos y datos del titular).
- **Constitución**: sin cambios.
  - I. Los apoyos no compran nada: no cambian el contenido, el orden ni el chat, y se rechazan
    los que vienen de partidos o candidaturas (HU-5.6). La lista de «quienes más han apoyado»
    ordena a personas que apoyan, no a partidos, así que no choca con I.4.
  - VI.1. Sin cuentas ni publicidad: los apoyos aparecen solo con su nombre, sin logos ni
    enlaces; el apoyo mensual se gestiona en Stripe con el email, sin crear una cuenta en la web.

## Contexto

VotoClaro no tiene anuncios ni financiación de partidos. Mantenerlo cuesta dinero cada mes:
servidor, base de datos, la IA del chat y el dominio. Hoy solo se cubre con los bonos del chat.

Queremos:
- que se sepa quién lo hace, sin protagonismo;
- contar con claridad lo que cuesta;
- que quien lo encuentre útil pueda apoyarlo, cada mes o una vez, y salir en un tablón de
  agradecimiento si quiere.

## Usuarios
- **Quien visita la web**: quiere saber quién está detrás y quién la financia, para fiarse de
  que es neutral.
- **Quien quiere apoyar**: quiere hacerlo en un par de pasos, sin registrarse, y poder
  cancelarlo cuando quiera.
- **El propietario**: quiere cubrir los costes y poder retirar del tablón cualquier nombre
  inadecuado.

## Historias de usuario

### HU-5.1 Autoría en el pie
- En todas las páginas, la última línea del pie dice «© 2026 Pablo Fraga Naveira · LinkedIn», y
  «LinkedIn» enlaza a su perfil. *(8 oct: antes el enlace era el nombre y la palabra «LinkedIn»
  solo existía para lectores de pantalla; el propietario no lo encontraba.)*
- Va en texto pequeño y apagado, como el resto de avisos del pie. No hay foto ni logotipo.
- `/apoya` también lo nombra, con su LinkedIn, al decir que el desarrollo no se cobra.
- La portada, justo debajo de «Cómo se mantiene VotoClaro», lleva una línea: «Hecho por Pablo
  Fraga Naveira, de forma independiente · LinkedIn · correo de contacto». *(8 oct, a petición
  del propietario.)*
- El pie enlaza a `/apoya` («Apoya VotoClaro: cuentas y tablón»).
- El correo de contacto de los apoyos es votoclarocomparador@gmail.com.
- La licencia del repositorio (MIT) nombra al mismo autor en lugar de «Los autores de
  VotoClaro». Los análisis siguen bajo CC BY 4.0 y los programas siguen siendo de sus partidos.

### HU-5.2 «Cómo se mantiene VotoClaro», al final de la portada
Una sección corta, después de «Cómo funciona», con:
- **el porqué**, en texto honesto: VotoClaro no tiene anuncios ni ningún partido detrás, y
  mantenerlo cuesta unos {X} € al mes;
- **el desglose** en una línea: servidor y base de datos, IA del chat y dominio;
- **tres formas de ayudar**, con el mismo peso visual:
  - «Apoyar cada mes»;
  - «Apoyar una vez»;
  - «Comprar preguntas del chat», que lleva a los bonos de la spec 004;
- un enlace: «Ver quién lo apoya y en qué se gasta →», que lleva a `/apoya`;
- una versión en lectura fácil del texto.

El tablón **no** está en la portada: solo el enlace.

### HU-5.3 Cuentas claras en `/apoya`
*(Ampliada el 8 oct a petición del propietario: barra del mes, carga de los programas y euros.)*
- **Antes de lo que cuesta, una barra «Este mes llevamos cubierto el X %»**: lo que entra este mes
  (apoyos y bonos) frente a la meta del mes, que suma:
  - lo que cuesta este mes: costes fijos, IA de las consultas del mes y comisiones;
  - lo que falta por cubrir de la carga de los programas, que se paga una vez. Lo que sobró en
    meses anteriores (ingresos menos costes, desde el mes de inicio de `data/costes.yaml`) se
    descuenta de ella.
- Los dólares se pasan a euros con el tipo de referencia del BCE guardado, con su fecha, en
  `data/costes.yaml`. Sin cambio guardado, no hay barra (no se mezclan monedas).
- **Lo que cuesta al mes**, partida a partida:
  - la IA del chat, con el gasto real de los últimos 30 días, que ya se registra cada día de
    forma agregada;
  - la IA de la carga de los programas (analizarlos y adaptarlos a lectura fácil), con la suma
    de lo que registró cada análisis al generarse. Es un coste por programa, que se repetirá con
    los del 29N, y un mínimo: no incluye los reintentos. *(Añadido el 8 oct a petición del
    propietario.)*
  - servidor y base de datos (8 €/mes) y dominio (14 €/año, prorrateado: 1,17 €/mes), con las
    cifras de las facturas, que el propietario actualiza a mano en un archivo público del
    repositorio;
  - las comisiones de Stripe de lo cobrado;
  - la fecha de la última actualización de cada cifra.
- **Lo que entra**, en total: los apoyos y, por separado, los bonos del chat, que también
  cubren costes. Y cuántas personas apoyan cada mes.
- **El trabajo no se cobra**: el desarrollo y la revisión los hace el autor sin coste.
- Nada de cifras inventadas: si falta un dato, se muestra «pendiente de actualizar».

### HU-5.4 Apoyar sin cuenta
1. La persona elige **cada mes** o **una vez** y un importe:
   - cada mes: 2 €, 5 € o 10 €;
   - una vez: 3 €, 10 €, 25 € u otra cantidad (mínimo 2 €).
2. Se abre Stripe (tarjeta, Apple Pay o Google Pay). Antes de pagar se informa de que:
   - es una aportación voluntaria, no una compra, y no desgrava, porque VotoClaro no es una
     asociación ni una fundación;
   - la puede cancelar cuando quiera, si es mensual.
3. Un campo opcional: **«Nombre o alias para el tablón»**.
   - Si lo deja vacío, el apoyo es anónimo: cuenta en los totales, pero no sale su nombre.
   - Máximo 40 caracteres, sin enlaces.
4. Al volver, una página de agradecimiento dice si su nombre saldrá en el tablón y cómo
   cancelar el apoyo mensual.
5. Nosotros no guardamos su email ni sus datos de pago: los tiene Stripe.

### HU-5.5 Tablón de apoyos en `/apoya`
- La sección se titula «Tablón de apoyos», con «Gracias a quienes hacen posible VotoClaro».
- Dos listas, solo con los apoyos que han dado un nombre:
  - **«Quienes más han apoyado»**: las 10 personas con más aportado, **sin mostrar importes**;
  - **«Últimos apoyos»**: las 10 más recientes, con el tipo («cada mes» o «una vez») y la
    fecha.
- Debajo, «y {N} personas más que prefieren no salir».
- Un ajuste decide si las listas y los totales cuentan **todo el tiempo** (por defecto) o
  **solo este mes**, sin tocar el código.
- Diseño neutro: ningún color de partido ni distintivos por importe.

### HU-5.6 Neutralidad, visible en `/apoya`
*(Cambio del propietario, 8 oct: no se dice que se rechacen apoyos de partidos ni se pide una
declaración antes de pagar; se dice que ninguna aportación influye de forma política.)*
- Ninguna aportación influye de forma política: no cambia los análisis, ni el orden de los
  partidos, ni las respuestas del chat. Se dice en `/apoya`, en `/condiciones` y en el pago.
- El tablón no muestra logos, enlaces ni mensajes; tampoco los de empresas.
- Los nombres pasan un filtro automático antes de salir: siglas y nombres de las candidaturas,
  lemas, palabras ofensivas y enlaces. Lo que no pasa sale como anónimo.
- El propietario puede ocultar cualquier nombre después.

### HU-5.7 Gestionar el apoyo
- «Gestionar o cancelar mi apoyo mensual» lleva al portal de Stripe, que identifica a la
  persona por su email. No se crea ninguna cuenta en VotoClaro.
- Para quitar o cambiar el nombre del tablón, se escribe al email del titular. Se retira en
  menos de 7 días.
- Si un pago se devuelve, ese apoyo deja de contar y sale del tablón.

### HU-5.8 Interruptor
- Los apoyos se activan con su propio interruptor y, como los bonos, solo funcionan si están
  los datos del titular. Sin ellos, la web no permite apoyar.
- Con los apoyos apagados, la sección de la portada y `/apoya` siguen mostrando los costes y los
  bonos, y los botones de apoyar no aparecen.

## Requisitos no funcionales
- **Rendimiento**: la portada sigue cumpliendo LCP < 2,5 s en 4G. La sección no añade
  JavaScript en el cliente.
- **Privacidad**:
  - solo se guarda lo necesario para el tablón y los totales: nombre o alias (si lo da),
    importes, tipo y fechas;
  - no se guardan emails, IPs ni datos de tarjeta;
  - el nombre solo se publica si la persona lo escribe para eso.
- **Accesibilidad**: WCAG 2.2 AA, teclado, 375 px y objetivos de 44 px. Las listas son listas
  reales para el lector de pantalla.
- **Honestidad**: nunca se dice «sin ánimo de lucro», porque los bonos llevan margen. Sin
  patrones oscuros: nada preseleccionado, sin cuentas atrás ni importes destacados.
- **Coste**: las comisiones de Stripe por apoyo se muestran como una partida más.

## Criterios de aceptación
Verificados el 8 de octubre. Entre paréntesis, cómo: e2e = flujo completo con la pasarela
simulada (`scripts/dev-apoyos.mjs`), test = Vitest con PGlite.

- [x] El pie de todas las páginas muestra «© 2026 Pablo Fraga Naveira» con el enlace a
      LinkedIn, y la licencia nombra al autor (test del pie).
- [x] La portada termina con «Cómo se mantiene VotoClaro», el coste mensual, las tres formas de
      ayudar y el enlace a `/apoya`, sin tablón (*build* y revisión visual).
  - Cambio sobre HU-5.2: la portada es estática y no incluye la IA en la cifra («unos 9 € al
    mes en servidor y dominio, más lo que gasta la IA del chat»); la cifra real de la IA está
    en `/apoya`.
- [x] `/apoya` muestra el coste por partidas, con la IA calculada a partir del gasto registrado
      y la fecha de cada cifra (test y revisión visual).
- [x] Con la pasarela simulada (e2e):
  - un apoyo mensual con nombre aparece en «Últimos apoyos» y, al cobrar otro mes, sube en
    «Quienes más han apoyado»;
  - un apoyo sin nombre solo suma en «personas que prefieren no salir» y en los totales;
  - un pago devuelto sale del tablón y de los totales;
  - al cancelar el mensual deja de contar «cada mes», pero sigue en el tablón.
- [x] Un nombre con las siglas de una candidatura o con un enlace sale como anónimo (test y e2e
      con «Viva VOX»).
- [x] Al cambiar el ajuste a «este mes», las listas y los totales solo cuentan el mes en curso
      (test, con el inicio del mes en hora de España).
- [x] Ninguna tabla guarda emails, IPs ni datos de tarjeta (diseño de la migración 003).
- [x] Con los apoyos apagados, o sin los datos del titular, no se puede apoyar y no aparecen
      los botones (test de las salvaguardas y *build* con el interruptor apagado y encendido).
- [ ] Accesible.
  - Teclado, 375 px y objetivos de 44 px: verificados.
  - Lector de pantalla: falta probarlo (T-213).
- [ ] **Producción, con Stripe en modo real**: lo prueba el propietario siguiendo
      [activar-apoyos.md](activar-apoyos.md).

## Fuera de alcance
- Recompensas por apoyar (niveles, ventajas en el chat, regalos).
- Recibos fiscales o desgravación.
- Cuentas de usuario.
- Bizum y transferencias.
- Logos, enlaces o mensajes en el tablón.
- Asesoría legal o fiscal: el texto de los apoyos en `/condiciones` lo debe revisar la gestoría
  antes de activarlos.

