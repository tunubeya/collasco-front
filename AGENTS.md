# Instrucciones para trabajar en qms-front

Este proyecto es el frontend de Collasco/QMS. Es una app Next.js con App Router, TypeScript, Tailwind y `next-intl`.

Siempre trata de actualizar las instrucciones para que se entiendan mejor si se puede

## Comandos utiles

- Verificar tipos: `npx tsc --noEmit`
- Desarrollo local: `npm run dev` (usa Next en el puerto 3001)
- Build: `npm run build`

Antes de cerrar cambios de codigo, correr al menos `npx tsc --noEmit`.

## Estructura importante

- Rutas de app: `src/app`
- Componentes UI: `src/ui/components`
- APIs del frontend: `src/lib/api`
- Tipos/modelos: `src/lib/model-definitions`
- Traducciones: `src/lib/i18n/translations/{es,en,fr,pt,nl}.json`
- Utilidades: `src/lib/utils.ts`
- Backend vecino: `../ums-api` cuando el bug dependa del contrato o persistencia de API.

## Convenciones

- Mantener cambios acotados a la solicitud.
- Usar `apply_patch` para editar archivos manualmente.
- No revertir cambios existentes del usuario.
- Si se agrega texto visible en pantalla, agregar traducciones en todos los idiomas: `es`, `en`, `fr`, `pt`, `nl`.
- Evitar textos hardcodeados en componentes de UI cuando ya existe `next-intl`.
- Preferir patrones ya existentes antes de crear abstracciones nuevas.

## Idioma y locale

- Locales soportados: `en`, `es`, `pt`, `nl`, `fr`. Si llega una variante como `es-BO` o `pt-BR`, usar el idioma base.
- El idioma de usuarios internos se guarda en `user.locale`. `GET /users/me/profile` lo devuelve y `PATCH /users/me` acepta `{ locale }`, solo o junto con `name` / `email`.
- Cuando el usuario logueado cambia el idioma desde la app, guardar la cookie local y sincronizar `locale` con `PATCH /users/me`.
- Para tickets externos, seguir enviando el locale actual de la UI en `POST /public/tickets/links/:token`; el backend lo guarda como idioma del reporter externo.

## Tickets

- Listado principal: `src/ui/components/tickets/tickets-tabs.client.tsx`
- Pagina de tickets: `src/app/app/tickets/page.tsx`
- Detalle de ticket: `src/app/app/tickets/[ticketId]/ticket-detail.client.tsx`
- API: `src/lib/api/tickets.ts`
- Tipos: `src/lib/model-definitions/ticket.ts`

Notas:

- El listado de tickets debe mostrar el proyecto del ticket. Usar `ticket.project?.name` y fallback a `ticket.projectId` contra la lista de proyectos cargada.
- El contador del sidebar en el item "Tickets" muestra los tickets asignados al usuario actual usando `getTicketCounts().counts.assigned`.
- Si cambia el responsable de un ticket, disparar `notifyTicketCountsChanged()` para que el sidebar actualice el contador.
- El helper de eventos para conteos esta en `src/ui/components/tickets/ticket-count-events.ts`.
- En follow-up publico, los clientes externos no ven ni crean secciones `COMMENT`; al agregar respuestas publicas enviar solo `{ content }` y dejar que el backend las guarde como `RESPONSE`.

## Sidebar, notificaciones y soporte

- Sidebar desktop/mobile: `src/ui/components/sidebar/app-sidebar.tsx`
- Sidebar cliente: `src/ui/components/sidebar/app-sidebar-client.tsx`
- Campana superior de notificaciones: `src/ui/components/notifications/notifications-bell.client.tsx`
- Pagina de notificaciones: `src/app/app/notifications/page.tsx`
- Pagina de soporte/manual: `src/app/app/support/page.tsx`

Notas:

- El contador de notificaciones no leidas solo debe mostrarse en la campana superior, no en el item "Notificaciones" del sidebar.
- Las notificaciones deben ser clickeables cuando tengan destino (`ticketId`, `projectId`, `moduleId`, etc.) y navegar al ticket o entidad relacionada.
- La accion "Marcar como no leida" debe mostrarse de forma contextual dentro del menu de acciones de cada notificacion, tanto en la pagina como en la campana.
- La distincion visual entre notificaciones leidas y no leidas debe ser clara en la pagina y en la campana.
- El item "Tickets" del sidebar puede mostrar badge de tickets asignados.
- La pagina `/app/support` muestra primero un CTA para crear tickets publicos si el usuario encuentra un error y luego el manual de Collasco.
- En soporte, los textos del CTA viven en `support.ticketCta.*`.

## Links publicos actuales

- Manual de soporte Collasco: `https://collasco.com/public/manual/shared/bbcd7836-bcad-4eb8-bf39-ac1199df43c7`
- Crear ticket publico de soporte: `https://collasco.com/public/tickets/links/acb3a50ab213b354a177602b56b469a69c8a24c4c32bc2cbcef92cbfc6bfc9cd?locale=en`

## UI

- Mantener la interfaz sobria y funcional.
- En pantallas pequenas, evitar scroll horizontal innecesario si el contenido puede partirse en varias filas.
- En el listado de tickets, las pestanas deben usar wrapping y no scroll horizontal.
- El filtro de estado de tickets debe estar junto al selector de proyecto.
- Para pestanas de navegación, usar los botones compartidos `AppPrimaryTabButton` y `AppSecondaryTabButton` de `src/ui/components/tabs/app-tabs.tsx` en vez de recrear estilos locales.

### Patrón de vistas públicas tipo changelog/release notes

Usar como referencia la UI de `src/app/public/releases/links/[token]/public-release-notes.client.tsx` cuando se pidan vistas públicas bonitas, compartibles o de lectura para clientes.

Elementos del patrón:

- Fondo general blanco `bg-white` y contenido centrado con `max-w-5xl`.
- Header destacado con tarjeta blanca y franja superior `bg-linear-to-r from-slate-900 to-slate-700`.
- Título principal del objeto/proyecto, subtítulo corto y métricas compactas en cards translúcidas.
- Contenido ordenado como timeline en desktop, con línea vertical e icono circular por item.
- Cada item en card blanca con borde `border-slate-200`, `rounded-xl`, `shadow-sm`.
- Header interno de cada item con versión, nombre opcional, fecha con icono y badge para el item más reciente.
- Cuerpo de contenido en bloque `bg-slate-50` y renderizado con `RichTextPreview`.
- Mantener la página enfocada en lectura, sin landing hero marketing ni decoración innecesaria.

## Releases documentales

- Pestaña de releases del proyecto: `src/app/app/projects/[projectId]/project-releases-tab.client.tsx`
- API frontend: `src/lib/api/releases.ts`
- Integración de pestañas del proyecto: `src/app/app/projects/[projectId]/project-tabs.client.tsx`
- Vista pública de release notes: `src/app/public/releases/links/[token]/public-release-notes.client.tsx`

Notas:

- Los releases usan endpoints `/projects/:projectId/releases` pero dependen de permisos QA: `qa.read` para lectura y `qa.write` para crear/preparar/publicar/editar.
- Antes de permitir publicar un release, consultar o refrescar `GET /projects/:projectId/releases/documentation-status`.
- Si `release` devuelve `409 Conflict`, mostrar el `documentationStatus` del error para explicar documentación pendiente o versiones publicadas faltantes.
- `prepare` puede existir con warnings; `release` bloquea si hay documentación sin versión publicada o drafts con cambios pendientes.
- Un release `PREPARED` puede volver a `DRAFT` con `PATCH /projects/:projectId/releases/:releaseId` enviando `{ "status": "DRAFT" }`; esto solo desbloquea edición. El snapshot documental se refresca al ejecutar `POST /projects/:projectId/releases/:releaseId/prepare` nuevamente.
- En UI llamar a las release notes "changelog del release".
- El changelog del release solo se edita o regenera en releases `DRAFT`; en `PREPARED` y `RELEASED` se muestra solo como lectura.
- Generar el changelog del release sobrescribe el contenido actual; pedir confirmación si ya hay contenido.
- El changelog del release y cualquier contenido largo editable deben usar `RichTextEditor` y visualizarse con `RichTextPreview`; no usar Markdown ni `textarea` salvo que la solicitud lo pida explícitamente.
- El endpoint `POST /projects/:projectId/releases/:releaseId/notes/generate` devuelve HTML rich text y solo aplica a releases `DRAFT`; el front debe mostrarlo con `RichTextPreview`/`RichTextEditor`.
- Los links públicos de release notes son por proyecto y muestran todos los releases `RELEASED`: administrar con `/projects/:projectId/releases/share-links` y renderizar `/public/releases/links/:token` sin auth.
- Toda ruta pública nueva debe agregarse a `publicRoutePrefixes` en `src/middleware.ts` para evitar redirección a login.
- Las rutas públicas deben salir temprano del middleware antes de refrescar sesión o llamar al backend; el middleware no debe bloquear páginas públicas con trabajo de autenticación.
