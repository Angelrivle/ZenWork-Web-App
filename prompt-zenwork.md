---

## 0. Rol y Objetivo

Actúa como arquitecto de software senior y desarrollador fullstack especializado en sistemas SaaS de alta escalabilidad. Vas a diseñar e implementar **ZenWork**, una **plataforma de colaboración y productividad empresarial** que combine las funciones esenciales de Jira (gestión de issues/proyectos), Trello (tableros Kanban) y Notion (documentos/wikis colaborativos), con notificaciones integradas vía Email, Discord y WhatsApp.

El sistema debe estar **listo para producción**, ser **seguro por defecto**, y estar diseñado para que la evolución futura (nuevas columnas, tablas, endpoints, features) **nunca rompa la base de datos ni los clientes existentes**.

---

## 1. Stack Tecnológico (Framework Fullstack)

| Capa | Tecnología recomendada | Justificación |
|---|---|---|
| Framework fullstack | **Next.js 15 (App Router)** con TypeScript | SSR/RSC, API routes, un solo despliegue front+back |
| Comunicación tipada API | **tRPC** (o GraphQL con Apollo si prefieres esquema explícito) | Evita over/under-fetching, tipado end-to-end |
| ORM | **Prisma** | Migraciones versionadas, type-safety, soporta evolución de esquema segura |
| Base de datos | **PostgreSQL 16** (`zenwork_db`) | Transacciones ACID, JSONB para campos flexibles, índices avanzados (GIN, BRIN) |
| Cache / Rate limiting / Colas | **Redis** + **BullMQ** | Rate limiting distribuido, colas para webhooks/notificaciones asíncronas |
| Autenticación | **Auth.js (NextAuth v5)** + JWT propio para API externa | OAuth (Discord, GitHub) + credenciales + sesiones |
| 2FA | **otplib / speakeasy** (TOTP) + códigos de respaldo | Estándar RFC 6238, compatible con Google Authenticator. Emisor TOTP: `ZenWork` |
| Validación | **Zod** en cada boundary (API, forms, webhooks) | Previene inyección de datos malformados |
| Tiempo real | **WebSockets (Socket.IO)** o **Pusher/Ably** | Actualizaciones en vivo de tableros/documentos |
| Búsqueda | **PostgreSQL Full Text Search** inicial, migrable a **Meilisearch/Elasticsearch** | Escalabilidad futura sin romper contrato |
| Almacenamiento de archivos | **S3-compatible (AWS S3 / Cloudflare R2)**, bucket `zenwork-assets` | Adjuntos, avatares, exportaciones |
| Contenedores | **Docker + docker-compose** (dev) / **Kubernetes** (prod, opcional) | Portabilidad y escalado horizontal |
| Observabilidad | **Sentry** (errores) + **OpenTelemetry** (trazas) | Trazabilidad en producción |

---

## 2. Arquitectura General

Diseña una arquitectura en capas dentro de un **monorepo** (Turborepo o Nx) llamado `zenwork`:

```
zenwork/
/apps
  /web          -> zenwork-web (Next.js: frontend + API routes/tRPC)
  /worker       -> zenwork-worker (procesa colas: webhooks, notificaciones)
/packages
  /db           -> zenwork-db (Esquema Prisma + migraciones + seed)
  /shared       -> zenwork-shared (tipos, esquemas Zod, constantes compartidas)
  /auth         -> zenwork-auth (lógica de autenticación reutilizable)
  /integrations -> zenwork-integrations (adaptadores: email, Discord, WhatsApp, GitHub)
```

**Principio clave de escalabilidad**: la lógica de negocio (services) debe estar desacoplada de los controladores/rutas, para poder reutilizarse desde API REST, tRPC, workers o futuros CLIs sin duplicar código.

**Convención de nombres del proyecto**: usa el prefijo/namespace `zenwork` de forma consistente en: nombre del repositorio, variables de entorno (`ZENWORK_DATABASE_URL`, `ZENWORK_JWT_SECRET`, `ZENWORK_REDIS_URL`), nombre de la base de datos, bucket de almacenamiento, nombre de la app OAuth registrada en Discord/GitHub, emisor (issuer) del 2FA, y el `Bearer` / cookie de sesión (`zenwork_session`, `zenwork_refresh_token`).

---

## 3. Autenticación y Seguridad

Implementa un módulo de auth completo para ZenWork:

1. **Registro/login con email + contraseña** (hash con Argon2id, nunca bcrypt puro para nuevos proyectos si se puede evitar).
2. **OAuth social**: Discord y GitHub como proveedores rápidos (además de Google si se desea extender). Las apps OAuth deben registrarse como "ZenWork" en cada plataforma, con su logo/callback correspondiente (`https://app.zenwork.com/api/auth/callback/discord`, etc.).
3. **2FA (TOTP)**: activación opcional/forzable por organización, con códigos de respaldo de un solo uso (hasheados en DB). El emisor mostrado en apps como Google Authenticator debe ser **ZenWork**.
4. **JWT**: access token de corta duración (15 min) + refresh token rotativo almacenado en cookie `httpOnly`, `secure`, `sameSite=strict` (`zenwork_refresh_token`). Implementa **rotación y revocación** (tabla `refresh_tokens` con estado `revoked`).
5. **RBAC (Role-Based Access Control)**: roles a nivel de organización (Owner, Admin, Member, Guest) y a nivel de proyecto/tablero.
6. **Rate limiting**: middleware basado en Redis (ej. `rate-limiter-flexible`) por IP + por usuario, con límites distintos para login (anti fuerza bruta), API general y webhooks entrantes.
7. **Prevención de SQL Injection**: uso exclusivo de Prisma/queries parametrizadas — nunca concatenar SQL crudo. Si se requiere SQL raw, usar `$queryRaw` con parámetros tipados, jamás interpolación de strings.
8. **Otras protecciones obligatorias**:
   - Helmet (headers HTTP seguros) y CSP estricta.
   - CSRF tokens en formularios sensibles (si no se usa SameSite estricta + JWT en header).
   - Validación de entrada con Zod en **cada** endpoint y webhook.
   - Sanitización de HTML generado por el editor tipo Notion (evitar XSS almacenado).
   - Logs de auditoría (`audit_logs`) para acciones sensibles: login, cambios de permisos, borrado de datos.
   - Secrets vía variables de entorno + gestor de secretos (Vault/Doppler) en producción.

---

## 4. Gestión de Entornos y Perfiles

- **Multi-tenant por Organización (Workspace)**: cada usuario puede pertenecer a múltiples organizaciones dentro de ZenWork; cada organización tiene su propio conjunto de proyectos, tableros y miembros.
- **Creación de entornos**: al crear una organización, generar automáticamente un espacio de bienvenida "Mi primer proyecto en ZenWork" con datos de ejemplo (onboarding).
- **Edición de perfil**: nombre, avatar, zona horaria, idioma, preferencias de notificación (email/Discord/WhatsApp on-off por tipo de evento).
- **Invitaciones**: por email con token de un solo uso y expiración, con plantilla de correo de marca ZenWork.

---

## 5. Funcionalidades Base (paridad con Jira/Trello/Notion)

### Gestión de proyectos e issues (estilo Jira)
- Proyectos con tipos de issue configurables (Bug, Tarea, Historia, Épica).
- Estados personalizables por proyecto (workflow con transiciones).
- Prioridades, etiquetas, asignados, estimaciones (story points).
- Comentarios con menciones (`@usuario`) y adjuntos.
- Sub-tareas y relaciones entre issues (bloquea/depende de).

### Tableros Kanban (estilo Trello)
- Tableros con columnas configurables, drag & drop (persistido vía posición fraccional, ej. `float`/`fractional-indexing`, para evitar reordenar toda la tabla al mover una tarjeta).
- Tarjetas con checklist, fecha límite, etiquetas de color, miembros asignados.

### Documentos colaborativos (estilo Notion)
- Editor de bloques (usar **Tiptap** o **BlockNote**, basados en ProseMirror) con soporte offline-first opcional.
- Edición colaborativa en tiempo real (CRDT con **Yjs**) para evitar conflictos de escritura simultánea.
- Jerarquía de páginas (árbol), páginas enlazadas, embebidos de tableros/issues.

### Notificaciones y Webhooks (multi-canal)
- Sistema de eventos internos (`event bus`) que se dispara en acciones clave (issue creado, comentario, mención, deadline próximo).
- Cola de trabajos (BullMQ) que procesa cada evento y lo enruta al canal configurado:
  - **Email**: vía proveedor transaccional (Resend, SendGrid o SES), remitente `notificaciones@zenwork.com`.
  - **Discord**: vía Webhooks de Discord (URL configurable por canal/organización) + opción de bot "ZenWork Bot" con slash commands.
  - **WhatsApp**: vía **WhatsApp Business Cloud API** (Meta) — requiere número verificado a nombre de ZenWork y plantillas de mensaje aprobadas (HSM) para notificaciones proactivas.
- **Webhooks salientes configurables por el usuario** (como Jira/Trello): el usuario registra una URL propia + secreto, el sistema firma el payload (HMAC-SHA256, header `X-ZenWork-Signature`) para verificación de integridad.
- **Webhooks entrantes**: endpoints públicos versionados (`/api/webhooks/v1/discord`, `/api/webhooks/v1/whatsapp`, etc.) protegidos con verificación de firma del proveedor + rate limiting agresivo.
- Reintentos con backoff exponencial y "dead letter queue" para webhooks fallidos.

---

## 6. Diseño de Base de Datos para Escalabilidad

Reglas obligatorias para que producción nunca se rompa al evolucionar el esquema:

1. **IDs**: usar `UUID` (o `CUID2`) como clave primaria, nunca autoincrementales expuestos públicamente (evita enumeración).
2. **Columnas nuevas**: siempre `NULLABLE` o con `DEFAULT` al añadirlas a tablas existentes — nunca `NOT NULL` sin default en una migración sobre datos ya existentes.
3. **Sin borrado destructivo inmediato**: usar **expand/contract pattern** — añadir columna nueva, migrar datos, dejar coexistir con la vieja, y solo eliminar la antigua en una migración posterior separada.
4. **Soft deletes**: columna `deleted_at` en vez de `DELETE` físico en entidades críticas (issues, documentos, usuarios).
5. **Campos flexibles**: usar columnas `JSONB` (con índice GIN) para metadatos extensibles por tipo de issue/proyecto sin necesidad de alterar el esquema en cada feature nueva.
6. **Versionado de API**: prefijo `/api/v1/`, `/api/v2/` — nunca romper contratos existentes.
7. **Índices obligatorios** desde el día uno:
   - FKs siempre indexadas (`organization_id`, `project_id`, `assignee_id`, etc.).
   - Índices compuestos para queries frecuentes (ej. `(project_id, status, created_at)`).
   - Índice GIN en columnas JSONB y en full-text search (`tsvector`).
   - Índice único en `(email)`, `(organization_id, slug)`.
8. **Particionamiento futuro**: diseñar tablas de alto volumen (`audit_logs`, `notifications`, `events`) pensando en particionamiento por rango de fecha (`created_at`) desde el inicio, aunque no se implemente el día 1.
9. **Migraciones**: gestionadas 100% con `prisma migrate`, revisadas en CI antes de aplicar en producción, con posibilidad de rollback.

---

## 7. Consistencia de Datos

- Operaciones multi-tabla críticas (ej. crear organización + owner + proyecto inicial) deben ejecutarse dentro de **transacciones** (`prisma.$transaction`).
- Uso de **constraints a nivel de base de datos** (FK, UNIQUE, CHECK) como última línea de defensa, no solo validación en aplicación.
- Para colaboración en tiempo real (Yjs/CRDT), definir estrategia de persistencia periódica del documento + snapshot para evitar pérdida de datos ante caída del servidor.
- Idempotencia en webhooks entrantes (usar `event_id` del proveedor para evitar procesar el mismo evento dos veces).

---

## 8. Entregables esperados de la IA al ejecutar este prompt

Pide explícitamente que la IA genere, en este orden, todo bajo la marca **ZenWork**:

1. Diagrama de arquitectura (texto o Mermaid) del sistema completo de ZenWork.
2. Esquema Prisma completo con comentarios explicando cada decisión de escalabilidad.
3. Estructura de carpetas del monorepo `zenwork`.
4. Módulo de autenticación (registro, login, OAuth Discord/GitHub, 2FA, JWT + refresh).
5. Middleware de rate limiting y seguridad.
6. Servicio de eventos + colas + adaptadores de notificación (Email/Discord/WhatsApp).
7. Endpoints/routers principales (organizaciones, proyectos, issues, tableros, documentos).
8. Estrategia de migraciones y ejemplo de una migración "expand/contract".
9. Plan de pruebas (unitarias para servicios críticos, integración para auth y webhooks).

---

## 9. Instrucción final para la IA

> "Estás construyendo **ZenWork**. Antes de escribir código, resume en una tabla las decisiones de arquitectura tomadas y sus alternativas descartadas. Luego procede fase por fase, mostrando el código completo de cada archivo, y explica en cada módulo cómo se garantiza la seguridad, la escalabilidad y la consistencia de datos descritas arriba. Usa el nombre 'ZenWork' de forma consistente en el branding visible (correos, plantillas, título de la app, metadatos SEO, issuer del 2FA, headers de webhooks) y usa el namespace `zenwork` en variables de entorno, paquetes y nombres técnicos. Si alguna funcionalidad requiere un servicio de terceros (ej. WhatsApp Business API), indica los pasos exactos de configuración externa necesarios, incluyendo el registro de la app como 'ZenWork' en el panel del proveedor."
