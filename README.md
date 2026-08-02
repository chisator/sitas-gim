# SITAS FITNESS

Gestión de gimnasio: rutinas, registros de entrenamiento, progreso y reservas de
clases. Next.js 14 (App Router) + Supabase.

## Despliegues

Los dos apuntan **a la misma base de datos de producción**. Tenerlo presente:
cualquier prueba en Vercel modifica datos reales del gimnasio.

| Entorno | Dónde | Para qué |
|---|---|---|
| Vercel | rama `main` | probar cambios |
| VPS Hostinger | Docker, deploy manual | producción, la que usa el gimnasio |

## Variables de entorno

| Variable | Necesaria en | Si falta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | build y runtime | la app no arranca en el navegador |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build y runtime | ídem |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | el build pasa, pero los paneles de admin y entrenador tiran 500 |

Las `NEXT_PUBLIC_*` se inlinean **en tiempo de build**, así que hay que pasarlas
al construir la imagen, no solo al ejecutarla.

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy al VPS

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="..." \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  -t sitas-gim .
```

```bash
docker run -d -p 3000:3000 --env-file .env --name sitas-gim sitas-gim
```

## Base de datos

El esquema vive en `supabase/migrations/`. Antes de tocar nada, sincronizar con
lo que realmente corre en producción:

```bash
npx supabase db pull
```

Algunos objetos se crearon a mano en el SQL Editor y pueden no estar en los
archivos. Ante la duda, la base manda, no el repo.

## Notas

- Las fechas de rutinas se guardan normalizadas a mediodía UTC y se comparan en
  hora argentina (`lib/utils.ts`). No usar `new Date()` del servidor para
  decidir si una rutina está vigente: el proceso corre en UTC.
- Los créditos de clases viven en dos campos: `activity_credits` y
  `expiring_activity_credits`. Del día 1 al 5 de cada mes el primero está vacío,
  así que **siempre hay que mirar los dos**.
- Las escrituras de créditos y los conteos de cupo van con service role
  (`lib/admin.ts`): con el cliente del usuario, RLS solo deja ver las reservas
  propias y los conteos dan cero.
