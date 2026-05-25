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

## Sidebar, notificaciones y soporte

- Sidebar desktop/mobile: `src/ui/components/sidebar/app-sidebar.tsx`
- Sidebar cliente: `src/ui/components/sidebar/app-sidebar-client.tsx`
- Campana superior de notificaciones: `src/ui/components/notifications/notifications-bell.client.tsx`
- Pagina de notificaciones: `src/app/app/notifications/page.tsx`
- Pagina de soporte/manual: `src/app/app/support/page.tsx`

Notas:

- El contador de notificaciones no leidas solo debe mostrarse en la campana superior, no en el item "Notificaciones" del sidebar.
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
