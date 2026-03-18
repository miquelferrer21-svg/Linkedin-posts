# Diseño: Banco de Posts por Tipo con Sistema de Estados

**Fecha:** 2026-03-18
**Proyecto:** finomik-content-hub
**Estado:** Aprobado por usuario

---

## Objetivo

Reorganizar el dashboard de gestión de contenido para que los posts se naveguen por **tipo de post** en lugar de por fecha. Añadir un sistema de **estados** (sin revisar, por revisar, colgado, no me gusta) con filtrado y marcado visual.

---

## Contexto actual

- El dashboard muestra posts agrupados por sesión (fecha), con botones para cambiar de tipo dentro de cada sesión.
- No existe ningún sistema de estado para los posts.
- La tabla `documents` en Supabase tiene: `id`, `session_id`, `type`, `content`, `created_at`.
- Los usuarios autenticados tienen permiso de lectura. El script `sync.js` tiene permiso de escritura.

---

## Cambios en base de datos

### 1. Actualizar constraint de `type` en `documents`

El schema actual tiene un constraint de tipo obsoleto. Reemplazarlo:

```sql
ALTER TABLE documents DROP CONSTRAINT documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN ('noticia_financiera', 'frase_iconica', 'dato_impactante',
                  'error_financiero', 'concepto_mes', 'nueva_funcionalidad'));
```

### 2. Nueva columna `status` en `documents`

```sql
ALTER TABLE documents
ADD COLUMN status TEXT NOT NULL DEFAULT 'sin_revisar'
CHECK (status IN ('sin_revisar', 'por_revisar', 'colgado', 'no_me_gusta'));
```

### 3. Actualizar permisos RLS

El usuario autenticado necesita permiso para actualizar el campo `status`:

```sql
CREATE POLICY "Authenticated users can update document status"
ON documents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

**Nota de seguridad:** Esta política permite actualizar cualquier columna de `documents`. Para mitigarlo, la llamada desde el cliente debe enviar **únicamente** el campo `status` en el UPDATE, nunca `content`, `type` ni `session_id`. Ver implementación en `Dashboard.tsx`.

### 4. Actualizar `supabase/schema.sql`

Ademas de aplicar las migraciones, actualizar el archivo `schema.sql` para que refleje el estado final: añadir la columna `status` al bloque `CREATE TABLE documents` y reemplazar el constraint de `type`.

---

## Diseño de interfaz

### Layout general

```
┌──────────────────────────────────────────────────────┐
│  [Finomik] Content Hub                     [Salir]   │  ← Header
├──────────────────────────────────────────────────────┤
│  [📰 Noticia] [💬 Frase] [📊 Dato] [💸 Error]        │
│  [🧠 Concepto] [🚀 Funcionalidad]                    │  ← Tabs por tipo
├──────────────────────────────────────────────────────┤
│  Filtrar: [Todos] [Sin revisar] [Por revisar]         │
│           [Colgado] [No me gusta]                    │  ← Filtros de estado
├──────────────────────────────────────────────────────┤
│  Lista de posts del tipo seleccionado, ordenados      │
│  por fecha descendente, con indicadores visuales      │
└──────────────────────────────────────────────────────┘
```

### Cada post en la lista muestra

- Fecha de generación (del campo `sessions.date`)
- Tarjeta visual completa (componente `VisualCard` existente)
- Tres botones de acción: "Por revisar", "Colgado", "No me gusta"
- Indicador visual del estado activo

### Indicadores visuales por estado

| Estado | Estilo aplicado al contenedor del post |
|---|---|
| `sin_revisar` | Sin estilo adicional |
| `por_revisar` | Borde izquierdo amarillo (`#F5C518`) + etiqueta "Por revisar" |
| `colgado` | Borde izquierdo verde (`#2DBD8A`) + icono ✓ + etiqueta "Colgado" |
| `no_me_gusta` | Opacidad 60% + borde izquierdo rojo (`#E84545`) + etiqueta "No me gusta" |

---

## Sistema de estados

### Reglas de negocio

- Cada post tiene exactamente un estado en todo momento.
- Los botones de estado actúan como **radio buttons** con toggle: pulsar el estado activo lo vuelve a `sin_revisar`.
- El cambio se persiste en Supabase inmediatamente al hacer clic (sin confirmación).
- El filtro de estado filtra la lista del tipo activo.

### Flujo de interacción

1. Usuario selecciona tipo de post (tab).
2. Dashboard carga todos los posts de ese tipo desde Supabase, ordenados por fecha descendente.
3. Usuario aplica filtro de estado (opcional).
4. Usuario ve la lista filtrada con indicadores visuales.
5. Usuario pulsa un botón de estado en cualquier post.
6. Se hace `UPDATE` en Supabase sobre ese `document.id`.
7. El estado local se actualiza sin recargar toda la lista.

---

## Cambios en componentes

### `Dashboard.tsx` — Refactor completo

**Estado actual:** carga todas las sesiones con sus documentos, muestra `SessionCard` por fecha.

**Estado nuevo:**
- Estado local: `activeType` (tab activo), `activeFilter: FilterStatus` (filtro de UI, default `'all'`), `posts: Post[]`, `loading: boolean`, `error: string | null`.
- Al cambiar de tab: mostrar estado de carga, hacer fetch, actualizar `posts`, gestionar errores.
- Función `updateStatus(documentId: string, newStatus: PostStatus)`: actualización optimista (actualiza estado local antes del fetch), revierte si el UPDATE falla.
- La lista mostrada es `posts` filtrada por `activeFilter` (si es `'all'`, se muestran todos).

### `SessionCard.tsx` — Eliminar

Este componente ya no es necesario. Su lógica de selección de tipo se traslada a los tabs del dashboard.

### Nuevo componente `PostCard.tsx`

Wrapper alrededor de `VisualCard` que añade:
- Fecha del post (recibida como prop).
- Botones de estado.
- Estilos visuales según el estado activo.

**Importante:** `noticia_financiera` usaba `DocumentViewer` en `SessionCard`. En la nueva arquitectura, todos los tipos (incluyendo `noticia_financiera`) pasan por `VisualCard`, que ya tiene el componente `NoticiaCard` para ese tipo. `DocumentViewer` queda sin uso y puede eliminarse.

### `VisualCard.tsx` — Sin cambios

Se reutiliza tal cual. Solo cambia el componente que lo envuelve.

---

## Estructura de datos en frontend

```typescript
// Tipo para el estado de un post en DB
type PostStatus = 'sin_revisar' | 'por_revisar' | 'colgado' | 'no_me_gusta'

// Tipo para el filtro de la UI ('all' es solo un valor de UI, no existe en DB)
type FilterStatus = 'all' | PostStatus

interface Post {
  id: string
  type: string
  content: string
  status: PostStatus
  date: string        // mapeado desde sessions.date tras el fetch
  session_id: string
  created_at: string
}
```

### Query Supabase para cargar posts por tipo

La query devuelve `sessions` como objeto anidado. Hay que mapear `date` al nivel raiz:

```typescript
const { data, error } = await supabase
  .from('documents')
  .select('*, sessions(date)')
  .eq('type', activeType)
  .order('created_at', { ascending: false })

const posts: Post[] = (data ?? []).map(({ sessions, ...rest }) => ({
  ...rest,
  date: sessions?.date ?? '',
}))
```

### Update de estado (solo campo `status`)

```typescript
await supabase
  .from('documents')
  .update({ status: newStatus })   // solo este campo, nunca content/type
  .eq('id', documentId)
```

La actualización es **optimista**: el estado local se actualiza inmediatamente. Si el UPDATE falla, el estado local se revierte al valor anterior y se muestra un mensaje de error.

---

## Archivos afectados

| Archivo | Acción |
|---|---|
| `supabase/schema.sql` | Actualizar constraint `type`, añadir columna `status` y política RLS |
| `src/pages/Dashboard.tsx` | Refactor completo |
| `src/components/SessionCard.tsx` | Eliminar |
| `src/components/PostCard.tsx` | Crear nuevo |
| `src/components/VisualCard.tsx` | Sin cambios |
| `src/components/DocumentViewer.tsx` | Eliminar (ya no se usa) |

---

## Lo que NO cambia

- Sistema de autenticación.
- Renderizado de tarjetas visuales (`VisualCard.tsx`).
- Exportación a PNG.
- Script de sincronización `sync.js`.
- Esquema de base de datos excepto la nueva columna.
