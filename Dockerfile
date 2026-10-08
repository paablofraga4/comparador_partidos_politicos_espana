# syntax=docker/dockerfile:1.7
# VotoClaro · imagen de la web (plan técnico D11). Se construye desde la raíz del monorepo
# porque la web lee data/ (registros, análisis y PDFs).

FROM node:24-alpine AS deps
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_GITHUB_REPO=paablofraga4/comparador_partidos_politicos_espana
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
# La portada es estática: los botones de apoyar se deciden en el build (spec 005, HU-5.8)
ARG APOYOS_ACTIVOS=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GITHUB_REPO=$NEXT_PUBLIC_GITHUB_REPO \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    APOYOS_ACTIVOS=$APOYOS_ACTIVOS \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY web ./web
COPY data ./data
COPY config ./config
WORKDIR /app/web
RUN npm run build && npm run build:scripts

FROM node:24-alpine AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    VC_DATA_DIR=/app/data
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
# output: standalone con outputFileTracingRoot en la raíz → el servidor queda en web/
COPY --from=build --chown=app:app /app/web/.next/standalone ./
COPY --from=build --chown=app:app /app/web/.next/static ./web/.next/static
COPY --from=build --chown=app:app /app/web/public ./web/public
# Datos que la web lee en tiempo de ejecución (los PDFs ya van en web/public/documentos)
COPY --chown=app:app data/*.yaml ./data/
COPY --chown=app:app data/analyses ./data/analyses
# Índices del chat: texto extraído (para db:sync), migraciones y scripts empaquetados
COPY --chown=app:app data/extracted ./data/extracted
COPY --chown=app:app config ./config
COPY --from=build --chown=app:app /app/web/scripts/dist ./web/scripts/dist
COPY --chown=app:app web/db ./web/db
USER app
WORKDIR /app/web
EXPOSE 3000
CMD ["node", "server.js"]
