# ZenWork

ZenWork es una plataforma de colaboración para equipos que combina en un solo lugar lo esencial de tres herramientas que normalmente se usan por separado: gestión de proyectos e issues (al estilo Jira), tableros Kanban (al estilo Trello) y documentos colaborativos (al estilo Notion). Además incluye chat en tiempo real, notificaciones y webhooks salientes para conectar ZenWork con otras herramientas.

Es un proyecto multi-organización: cada equipo trabaja dentro de su propia organización, con sus propios proyectos, tableros, documentos y miembros, sin ver los datos de otras organizaciones.

## Qué incluye

- **Proyectos e issues**: tipos de issue configurables, estados personalizados, prioridades, etiquetas, asignación de responsables y comentarios.
- **Tableros Kanban**: columnas configurables, tarjetas con checklist y fecha límite, y arrastrar y soltar entre columnas.
- **Documentos**: editor de texto enriquecido con jerarquía de páginas (páginas y subpáginas).
- **Chat**: mensajería en tiempo real por organización, con indicador de quién está conectado.
- **Notificaciones e invitaciones**: los miembros reciben avisos de asignaciones y comentarios, y las invitaciones a una organización se pueden aceptar apenas se inicia sesión.
- **Autenticación**: registro con email y contraseña, inicio de sesión con Discord o GitHub, y verificación en dos pasos (2FA) opcional.
- **Webhooks salientes**: cada organización puede registrar su propia URL para recibir eventos (issue creado, tarjeta movida, comentario nuevo, etc.), firmados para poder verificar su autenticidad.
- **Roles y permisos**: cada miembro tiene un rol dentro de la organización (propietario, administrador, miembro o invitado) que determina qué puede hacer.

## Cómo está armado

El proyecto es un monorepo (varios paquetes dentro de un mismo repositorio) organizado así:

```
apps/
  web/      → la aplicación en sí (interfaz + API), hecha con Next.js
  worker/   → un proceso en segundo plano que reintenta webhooks y hace limpieza periódica
packages/
  db/           → el esquema de la base de datos y el acceso a ella (Prisma)
  shared/       → tipos y validaciones compartidas entre el resto de los paquetes
  auth/         → lógica de autenticación (contraseñas, sesiones, dos pasos)
  middleware/   → límites de peticiones (rate limiting) y utilidades de seguridad
  integrations/ → envío de emails, webhooks y avisos a Discord
```

Localmente, la aplicación usa una base de datos SQLite (un archivo, sin necesidad de instalar nada) para que sea fácil de levantar. En producción usa PostgreSQL.

## Requisitos

- Node.js 20 o superior
- npm

## Poner el proyecto a andar en tu computadora

1. Instalar las dependencias desde la raíz del proyecto:

   ```bash
   npm install
   ```

2. Copiar el archivo de variables de entorno de ejemplo y completar lo necesario:

   ```bash
   cp .env.example apps/web/.env.local
   ```

   Para desarrollo local alcanza con dejar los valores por defecto (usa SQLite y no requiere ningún servicio externo). Los inicios de sesión con Discord/GitHub, el envío de emails y los webhooks de Discord son opcionales: si no se configuran, esas funciones quedan simplemente desactivadas sin afectar al resto de la aplicación.

3. Levantar la base de datos local y cargarla con datos de ejemplo:

   ```bash
   npm run db:migrate --workspace=@zenwork/db
   npm run db:seed --workspace=@zenwork/db
   ```

4. Iniciar la aplicación:

   ```bash
   npm run dev
   ```

   Va a quedar disponible en `http://localhost:3000`.

## Desplegar en Vercel

El proyecto está preparado para desplegarse en [Vercel](https://vercel.com) usando [Neon](https://neon.tech) como base de datos PostgreSQL (tiene un plan gratuito permanente, no es una prueba con límite de tiempo).

### 1. Crear la base de datos en Neon

Creá un proyecto en Neon y anotá dos cosas de la pantalla de conexión:

- La cadena de conexión **pooled** (la que se usa por defecto).
- La cadena de conexión **directa** ("unpooled" o "direct connection"), necesaria para poder aplicar las migraciones.

### 2. Crear el proyecto en Vercel

- Importá el repositorio desde GitHub.
- En la configuración del proyecto, definí el **Root Directory** como `apps/web`. Vercel va a detectar automáticamente que es una aplicación Next.js dentro de un monorepo e instalar las dependencias de todo el proyecto.
- No hace falta tocar el comando de build: ya está configurado para generar el cliente de la base de datos y aplicar las migraciones pendientes antes de compilar.

### 3. Configurar las variables de entorno en Vercel

Como mínimo, hay que cargar:

| Variable | Valor |
|---|---|
| `ZENWORK_DB_PROVIDER` | `postgresql` |
| `ZENWORK_DATABASE_URL` | la cadena de conexión pooled de Neon |
| `ZENWORK_DATABASE_URL_UNPOOLED` | la cadena de conexión directa de Neon |
| `ZENWORK_JWT_SECRET` | una cadena aleatoria larga (secreto de sesión) |
| `ZENWORK_JWT_REFRESH_SECRET` | otra cadena aleatoria larga, distinta a la anterior |
| `ZENWORK_2FA_SECRET_KEY` | otra cadena aleatoria más, para cifrar la configuración de 2FA |
| `ZENWORK_APP_URL` | la URL pública del sitio una vez desplegado |
| `NEXTAUTH_URL` | la misma URL que `ZENWORK_APP_URL` |

El resto de las variables (`.env.example` las lista todas, agrupadas y con una breve explicación de cada una) son opcionales y activan funciones adicionales:

- **Inicio de sesión con Discord o GitHub**: registrando una aplicación OAuth en cada plataforma.
- **Envío de emails de invitación**: con una cuenta de un proveedor como Resend.
- **Webhooks y bot de Discord**.
- **Rate limiting distribuido con Redis**: sin esta variable, los límites de peticiones se manejan en memoria, lo cual funciona pero no se comparte entre distintas instancias del servidor. Para producción se recomienda un Redis pensado para entornos serverless, como [Upstash](https://upstash.com) (también tiene un plan gratuito).

### 4. Desplegar

Con eso ya alcanza para hacer el primer deploy. Las siguientes veces que se suba código nuevo, Vercel vuelve a aplicar automáticamente cualquier migración pendiente de la base de datos antes de publicar la nueva versión.

## Notas

- Las migraciones para PostgreSQL viven en `packages/db/prisma-postgres`. Si en algún momento se modifica el esquema de la base de datos (`packages/db/prisma/schema.base.prisma`), hay que regenerar esa carpeta y crear una nueva migración antes de desplegar.
- El worker (`apps/worker`) es un proceso aparte, pensado para correr de forma continua (por ejemplo en un servicio como Railway o Render). Vercel no lo despliega junto con la aplicación web, ya que sus funciones son de corta duración por diseño.
