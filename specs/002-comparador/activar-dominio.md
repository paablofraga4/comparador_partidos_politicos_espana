# Runbook · Activar el dominio votoclaro.app

El código ya está listo: canónicas, sitemap, imagen para compartir y redirecciones. Solo falta
comprar el dominio y apuntarlo. Son unos 20 minutos, más la espera del DNS.

## 1. Comprar el dominio (Cloudflare)
1. https://dash.cloudflare.com → **Domain Registration → Register Domains**.
2. Busca `votoclaro.app` y cómpralo. El DNS queda en Cloudflare.

## 2. Añadirlo en Railway
Servicio web → **Settings → Networking → + Custom Domain**:
1. Escribe `votoclaro.app`. Railway muestra un **CNAME** y un **TXT**.
2. (Opcional) Repite con `www.votoclaro.app`. La web redirige `www` al dominio principal.

## 3. Registros DNS en Cloudflare
`votoclaro.app` → **DNS → Records → Add record**:

| Tipo | Name | Contenido | Proxy |
|---|---|---|---|
| CNAME | `@` | el destino que da Railway | **DNS only** (nube gris) |
| TXT | el que da Railway | el valor que da Railway | — |
| CNAME | `www` (si lo añadiste) | el destino que da Railway para www | **DNS only** |
| TXT | el de www (si lo añadiste) | su valor | — |

- El TXT es obligatorio: sin él, Railway responde 404.
- Si alguna vez activas la nube naranja, pon **SSL/TLS → Full**. No sirven ni «Full (strict)» ni
  «Flexible».

## 4. Esperar el check verde en Railway
Suele tardar unos minutos. El certificado HTTPS llega en menos de una hora.

## 5. Cambiar la URL del sitio
Railway → **Variables** → `NEXT_PUBLIC_SITE_URL` = `https://votoclaro.app`. Railway vuelve a
compilar y desplegar en unos 3 minutos.

Desde ese momento:
- la dirección de Railway redirige al dominio (salvo `/api`, que es la del webhook y la de la
  salud);
- las canónicas, el sitemap y la imagen para compartir usan el dominio;
- Stripe vuelve al dominio después de cada pago.

## 6. Stripe
**Settings → Public details** → Website: `https://votoclaro.app`.

El webhook puede quedarse con la URL de Railway: `/api` no se redirige.

## 7. Google Search Console (recomendado: propiedad de dominio)
1. https://search.google.com/search-console → **Añadir propiedad → Dominio** → `votoclaro.app`.
2. Google da un **TXT**. Añádelo en Cloudflare (DNS → TXT, Name `@`) y pulsa **Verificar**. Search
   Console puede ofrecerte hacerlo automáticamente con Cloudflare.
3. **Sitemaps** → envía `https://votoclaro.app/sitemap.xml`.
4. **Inspección de URLs** → pide la indexación de la portada, `/comparar` y `/temas`.

Alternativa sin DNS: una propiedad por **prefijo de URL** con «Etiqueta HTML» → el valor de
`content` va en la variable `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, que requiere redespliegue.

## 8. Bing (opcional, un clic)
https://www.bing.com/webmasters → **Importar desde Google Search Console**. Bing también
alimenta a algunos buscadores con IA.

## 9. Comprobación
- `https://votoclaro.app` carga con candado.
- La URL de Railway redirige a `votoclaro.app`.
- `https://votoclaro.app/sitemap.xml` muestra URLs con el dominio.

Quien hubiera comprado un bono en la URL de Railway tendrá que introducir su código una vez en el
dominio nuevo («Tengo un código»), porque las cookies van por dominio.
