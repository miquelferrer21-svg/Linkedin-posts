# Post Bank by Type with Status System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the dashboard to navigate posts by type (tab per type) instead of by date, and add a status system (sin_revisar / por_revisar / colgado / no_me_gusta) with filtering and visual indicators.

**Architecture:** The database gets a new `status` column with a default of `sin_revisar` (covers all existing posts). Dashboard is rewritten around type-tabs + status-filter. A new `PostCard` component wraps the existing `VisualCard` and adds the status UI. `SessionCard` and `DocumentViewer` are deleted.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (PostgreSQL + RLS), Tailwind CSS v3.4, Framer Motion.

**Spec:** `docs/superpowers/specs/2026-03-18-post-bank-by-type-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `supabase/schema.sql` | Final schema with status column and correct type constraint |
| Delete | `src/components/SessionCard.tsx` | Replaced by tab navigation in Dashboard |
| Delete | `src/components/DocumentViewer.tsx` | No longer needed (noticia_financiera uses VisualCard) |
| Create | `src/components/PostCard.tsx` | Wraps VisualCard, adds status buttons + visual state |
| Modify | `src/pages/Dashboard.tsx` | Tab nav by type, status filter, fetch by type, updateStatus |
| No change | `src/components/VisualCard.tsx` | Already handles all 6 types including noticia_financiera |

---

## Task 1: DB Migration — Add status column and fix type constraint

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Get the Supabase project ID**

  Run in MCP:
  ```
  mcp__supabase__list_projects
  ```
  Note the project `id` for `finomik-content-hub`.

- [ ] **Step 2: Apply migration — fix type constraint and add status column**

  Run in MCP (`mcp__supabase__apply_migration`), project_id from step 1, name `add_status_and_fix_type_constraint`:

  ```sql
  -- Fix obsolete type constraint
  ALTER TABLE documents DROP CONSTRAINT documents_type_check;
  ALTER TABLE documents ADD CONSTRAINT documents_type_check
    CHECK (type IN (
      'noticia_financiera', 'frase_iconica', 'dato_impactante',
      'error_financiero', 'concepto_mes', 'nueva_funcionalidad'
    ));

  -- Add status column with default (covers all existing rows)
  ALTER TABLE documents
    ADD COLUMN status TEXT NOT NULL DEFAULT 'sin_revisar'
    CHECK (status IN ('sin_revisar', 'por_revisar', 'colgado', 'no_me_gusta'));
  ```

- [ ] **Step 3: Apply migration — add RLS policy for status updates**

  Run in MCP (`mcp__supabase__apply_migration`), name `allow_authenticated_update_status`:

  ```sql
  CREATE POLICY "Authenticated users can update document status"
    ON documents
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  ```

- [ ] **Step 4: Verify the migration**

  Run in MCP (`mcp__supabase__execute_sql`):
  ```sql
  SELECT id, type, status FROM documents LIMIT 5;
  ```
  Expected: rows with the existing post types and `status = 'sin_revisar'` for all.

- [ ] **Step 5: Update `supabase/schema.sql` to reflect final state**

  Replace the entire contents of `supabase/schema.sql` with:

  ```sql
  -- Sessions table
  create table sessions (
    id uuid primary key default gen_random_uuid(),
    date date not null unique,
    created_at timestamptz default now()
  );

  -- Documents table
  create table documents (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references sessions(id) on delete cascade,
    type text not null check (type in (
      'noticia_financiera', 'frase_iconica', 'dato_impactante',
      'error_financiero', 'concepto_mes', 'nueva_funcionalidad'
    )),
    content text not null,
    status text not null default 'sin_revisar'
      check (status in ('sin_revisar', 'por_revisar', 'colgado', 'no_me_gusta')),
    created_at timestamptz default now(),
    unique(session_id, type)
  );

  -- Enable Row Level Security
  alter table sessions enable row level security;
  alter table documents enable row level security;

  -- Allow authenticated users to read everything
  create policy "Authenticated users can read sessions"
    on sessions for select
    to authenticated
    using (true);

  create policy "Authenticated users can read documents"
    on documents for select
    to authenticated
    using (true);

  -- Allow authenticated users to update status only
  -- NOTE: client must only send { status } in the update call, never other fields
  create policy "Authenticated users can update document status"
    on documents for update
    to authenticated
    using (true)
    with check (true);

  -- Allow service role to insert/update (used by sync.js)
  create policy "Service role can insert sessions"
    on sessions for insert
    to service_role
    with check (true);

  create policy "Service role can upsert documents"
    on documents for insert
    to service_role
    with check (true);

  create policy "Service role can update documents"
    on documents for update
    to service_role
    using (true);
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add supabase/schema.sql
  git commit -m "feat: add status column and fix type constraint in documents table"
  ```

---

## Task 2: Create PostCard component

**Files:**
- Create: `src/components/PostCard.tsx`

`PostCard` wraps `VisualCard` and adds: date header, three status action buttons, and visual styling based on the active status.

- [ ] **Step 1: Create `src/components/PostCard.tsx`**

  ```tsx
  import VisualCard from './VisualCard'

  type PostStatus = 'sin_revisar' | 'por_revisar' | 'colgado' | 'no_me_gusta'

  interface Post {
    id: string
    type: string
    content: string
    status: PostStatus
    date: string
  }

  interface Props {
    post: Post
    onStatusChange: (id: string, newStatus: PostStatus) => void
  }

  const STATUS_STYLES: Record<PostStatus, string> = {
    sin_revisar: '',
    por_revisar: 'border-l-4 border-yellow-400',
    colgado: 'border-l-4 border-green-500',
    no_me_gusta: 'border-l-4 border-red-500 opacity-60',
  }

  const STATUS_LABELS: Record<PostStatus, string> = {
    sin_revisar: '',
    por_revisar: '🕐 Por revisar',
    colgado: '✓ Colgado',
    no_me_gusta: '✕ No me gusta',
  }

  const ACTIONS: { status: PostStatus; label: string; activeClass: string; hoverClass: string }[] = [
    {
      status: 'por_revisar',
      label: 'Por revisar',
      activeClass: 'bg-yellow-400 text-white',
      hoverClass: 'hover:bg-yellow-100 hover:text-yellow-700',
    },
    {
      status: 'colgado',
      label: '✓ Colgado',
      activeClass: 'bg-green-500 text-white',
      hoverClass: 'hover:bg-green-100 hover:text-green-700',
    },
    {
      status: 'no_me_gusta',
      label: '✕ No me gusta',
      activeClass: 'bg-red-500 text-white',
      hoverClass: 'hover:bg-red-100 hover:text-red-700',
    },
  ]

  export default function PostCard({ post, onStatusChange }: Props) {
    const formattedDate = new Date(post.date + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    function handleAction(status: PostStatus) {
      // Toggle: if already active, reset to sin_revisar
      const next: PostStatus = post.status === status ? 'sin_revisar' : status
      onStatusChange(post.id, next)
    }

    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-finomik-gray-light overflow-hidden ${STATUS_STYLES[post.status]}`}>
        {/* Date header */}
        <div className="px-6 py-3 border-b border-finomik-gray-light flex items-center justify-between">
          <p className="font-extrabold text-finomik-blue capitalize text-sm">{formattedDate}</p>
          {post.status !== 'sin_revisar' && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              post.status === 'por_revisar' ? 'bg-yellow-100 text-yellow-700' :
              post.status === 'colgado' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {STATUS_LABELS[post.status]}
            </span>
          )}
        </div>

        {/* Visual card */}
        <div className="px-6 py-5">
          <VisualCard type={post.type} content={post.content} />
        </div>

        {/* Status action buttons */}
        <div className="px-6 pb-4 flex gap-2">
          {ACTIONS.map(action => (
            <button
              key={action.status}
              onClick={() => handleAction(action.status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                post.status === action.status
                  ? action.activeClass + ' border-transparent'
                  : 'bg-white text-finomik-gray border-finomik-gray-light ' + action.hoverClass
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify the component renders without errors**

  Check that the dev server (`npm run dev`) shows no TypeScript or import errors in the terminal. No need to mount it yet.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/PostCard.tsx
  git commit -m "feat: add PostCard component with status buttons and visual indicators"
  ```

---

## Task 3: Refactor Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

Replace the session-date approach with type-tab navigation and status filtering.

- [ ] **Step 1: Rewrite `src/pages/Dashboard.tsx`**

  Replace the entire file with:

  ```tsx
  import { useEffect, useState } from 'react'
  import { supabase } from '../lib/supabase'
  import PostCard from '../components/PostCard'

  type PostStatus = 'sin_revisar' | 'por_revisar' | 'colgado' | 'no_me_gusta'
  type FilterStatus = 'all' | PostStatus

  interface Post {
    id: string
    type: string
    content: string
    status: PostStatus
    date: string
    session_id: string
    created_at: string
  }

  const POST_TYPES = [
    { key: 'noticia_financiera', label: '📰 Noticia' },
    { key: 'frase_iconica',      label: '💬 Frase' },
    { key: 'dato_impactante',    label: '📊 Dato' },
    { key: 'error_financiero',   label: '💸 Error' },
    { key: 'concepto_mes',       label: '🧠 Concepto' },
    { key: 'nueva_funcionalidad',label: '🚀 Funcionalidad' },
  ]

  const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
    { value: 'all',          label: 'Todos' },
    { value: 'sin_revisar',  label: 'Sin revisar' },
    { value: 'por_revisar',  label: 'Por revisar' },
    { value: 'colgado',      label: 'Colgado' },
    { value: 'no_me_gusta',  label: 'No me gusta' },
  ]

  export default function Dashboard() {
    const [activeType, setActiveType] = useState<string>(POST_TYPES[0].key)
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      async function loadPosts() {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('documents')
          .select('*, sessions(date)')
          .eq('type', activeType)
          .order('created_at', { ascending: false })

        if (fetchError) {
          setError('No se pudo cargar el contenido. Inténtalo de nuevo.')
        } else {
          const mapped: Post[] = (data ?? []).map(({ sessions, ...rest }) => ({
            ...rest,
            status: rest.status as PostStatus,
            date: (sessions as { date: string } | null)?.date ?? '',
          }))
          setPosts(mapped)
        }
        setLoading(false)
      }
      loadPosts()
    }, [activeType])

    async function updateStatus(id: string, newStatus: PostStatus) {
      // Capture original status before optimistic update for rollback
      const originalStatus = posts.find(p => p.id === id)?.status ?? 'sin_revisar'

      // Optimistic update
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))

      const { error: updateError } = await supabase
        .from('documents')
        .update({ status: newStatus })   // only status — never content/type/session_id
        .eq('id', id)

      if (updateError) {
        // Revert to original status on failure
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: originalStatus } : p))
        console.error('Error updating status:', updateError.message)
      }
    }

    async function handleSignOut() {
      await supabase.auth.signOut()
    }

    const filteredPosts = activeFilter === 'all'
      ? posts
      : posts.filter(p => p.status === activeFilter)

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-finomik-blue text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl">Finomik</h1>
            <p className="text-finomik-gray-light text-xs">Content Hub</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-finomik-gray-light text-sm hover:text-white transition-colors"
          >
            Salir
          </button>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          {/* Instructions */}
          <div className="bg-finomik-gray-light rounded-xl px-5 py-4 text-xs text-finomik-gray space-y-1">
            <p className="font-bold text-finomik-blue">Como generar nuevos posts</p>
            <p>1. Abre el terminal y ejecuta <code className="bg-white px-1 rounded">./run.sh</code> en la carpeta <code className="bg-white px-1 rounded">finomik-agents</code></p>
            <p>2. Cuando termine, ejecuta <code className="bg-white px-1 rounded">node sync.js</code> en esta carpeta</p>
            <p>3. Recarga la pagina. Los nuevos posts apareceran aqui abajo</p>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map(pt => (
              <button
                key={pt.key}
                onClick={() => { setActiveType(pt.key); setActiveFilter('all') }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeType === pt.key
                    ? 'bg-finomik-blue text-white'
                    : 'bg-white text-finomik-blue border border-finomik-gray-light hover:bg-finomik-blue-light hover:text-white'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-finomik-gray font-bold">Filtrar:</span>
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors border ${
                  activeFilter === opt.value
                    ? 'bg-finomik-blue text-white border-transparent'
                    : 'bg-white text-finomik-gray border-finomik-gray-light hover:border-finomik-blue hover:text-finomik-blue'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading && (
            <p className="text-finomik-gray text-sm text-center py-12">Cargando...</p>
          )}
          {error && (
            <p className="text-red-500 text-sm text-center py-12">{error}</p>
          )}
          {!loading && !error && filteredPosts.length === 0 && (
            <p className="text-finomik-gray text-sm text-center py-12">
              No hay posts de este tipo
              {activeFilter !== 'all' ? ' con este estado' : ''}.
            </p>
          )}
          {!loading && !error && filteredPosts.map(post => (
            <PostCard key={post.id} post={post} onStatusChange={updateStatus} />
          ))}
        </main>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify in the browser**

  Open `http://localhost:5174/`. You should see:
  - 6 tabs de tipo en la parte superior
  - Filtros de estado debajo
  - Posts del tipo seleccionado en lista vertical
  - Botones "Por revisar", "Colgado", "No me gusta" en cada post
  - Al hacer clic en un boton, el post cambia de aspecto visualmente
  - Al hacer clic de nuevo en el mismo boton, vuelve a "sin revisar"

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/Dashboard.tsx
  git commit -m "feat: refactor dashboard to type-tab navigation with status filtering"
  ```

---

## Task 4: Delete unused components

**Files:**
- Delete: `src/components/SessionCard.tsx`
- Delete: `src/components/DocumentViewer.tsx`

- [ ] **Step 1: Delete the files**

  ```bash
  rm src/components/SessionCard.tsx
  rm src/components/DocumentViewer.tsx
  ```

- [ ] **Step 2: Verify no broken imports**

  Check the dev server terminal for errors. Expected: no TypeScript import errors.

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "chore: remove SessionCard and DocumentViewer (replaced by PostCard and Dashboard tabs)"
  ```

---

## Verification Final

- [ ] Tabs de tipo funcionan: al cambiar de tab se cargan los posts correctos
- [ ] Filtro de estado funciona: "Colgado" muestra solo posts con ese estado
- [ ] Marcar un post como "Colgado" persiste tras recargar la pagina
- [ ] Posts marcados como "No me gusta" aparecen con opacidad reducida y borde rojo
- [ ] El toggle funciona: pulsar el estado activo vuelve a "sin revisar"
- [ ] Posts existentes aparecen en sus tabs correspondientes (status = sin_revisar por defecto)
