Backend (Node + Express)

Instrucciones rápidas:

- Instalar dependencias: `npm install`
- Ejecutar localmente: `npm start` (asegurar que Postgres esté accesible)

Variables de entorno (ejemplo en `.env.example`):
- `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_DB`, `PORT`

En CI la pipeline construye y publica la imagen, y el deploy remoto arranca un contenedor `postgres` y el contenedor `backend`.
