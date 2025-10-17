# Projects / Modules / Features

## A. Árbol navegable y SSR
- Lista de proyectos (`/app/projects`) reimplementada con fetch SSR, paginación real y traducciones automáticas.
- Header y árbol inicial se trasladaron a componentes cliente (`projects-list.client.tsx`, `project-detail.client.tsx`) preparados para expansión de módulos.
- Respuestas normalizadas desde `fetchProjectsMine` para evitar formas inconsistentes del backend.

## B. Detalle Módulo y Feature
- Vistas SSR para módulos y features obtienen datos desde el backend, muestran jerarquía de submódulos, features y metadatos.
- Badges de estado/prioridad con traducciones e indicadores de links a módulo, issues y versiones.

## C. Formularios
- Formularios unificados (`ProjectForm`, `ModuleForm`, `FeatureForm`) con modo crear/editar y prefill.
- Acciones de servidor por recurso (`projects/actions.ts`, `modules/.../actions.ts`, `features/.../actions.ts`) manejan validaciones, revalidate y redirect.

## D. Revalidate & Mutaciones
- Tras operaciones create/update/delete se revalidan lista y detalle afectados, con redirecciones consistentes.
- Fetchers extendidos (`fetchUpdateModule`, `fetchDeleteModule`, `fetchUpdateFeature`, etc.) para cubrir todas las mutaciones requeridas.

## E. i18n
- Nuevas cadenas en `en/es/fr/pt/nl` (inglés reusado como fallback en fr/pt/nl) para lista, formularios, errores y badges.
- Componentes usan `useTranslations` / `getTranslations` y `useFormatter` para fechas amigables.

## F. Limpieza
- Formularios legacy (`NewProjectFormClient`, etc.) y duplicados eliminados.
- Fetchers adaptados a un contrato consistente (`PaginatedResponse`).
- Añadidos `loading.tsx`/`error.tsx` en rutas principales para feedback rápido.

## G. QA técnico
- `npm run lint` sigue reportando issues previos (hooks/unused vars en auth/sidebar). No bloquean nuevas funcionalidades; documentados para seguimiento.
- Sin pruebas automáticas adicionales; pages renderizadas con SSR y captura de errores 401/403/404 mediante helpers existentes.

### TODO / Seguimiento
- Traducir nuevas cadenas en fr/pt/nl si se requiere soporte completo.
- Resolver advertencias existentes del linting global (auth/register, sidebar, etc.) fuera del alcance de esta entrega.
