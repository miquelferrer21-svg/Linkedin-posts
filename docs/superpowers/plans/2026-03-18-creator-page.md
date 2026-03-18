# Creator Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/crear` page where the user fills in fields per post type, sees a live visual card preview, and saves the post to Supabase.

**Architecture:** `Creator.tsx` is a new page with two columns: left = type tabs + form fields, right = `VisualCard` receiving a markdown string built from the form state on every render. On save, it finds or creates a session for today and inserts the document. `Dashboard.tsx` reads a `?type=` query param on mount so it can highlight the correct tab after redirect.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS client, React Router v6, Tailwind CSS (finomik color tokens: `finomik-blue`, `finomik-gray`, `finomik-gray-light`, `finomik-blue-light`).

---

## File map

| File | Action |
|---|---|
| `src/components/VisualCard.tsx` | Update `parseNoticia` line ~60: add `fuente:` to the source detection regex |
| `src/components/PostCard.tsx` | Remove the date header JSX block (lines 71-83). Keep `date` in the `Post` interface and `formattedDate` computation — just stop rendering it |
| `src/App.tsx` | Add `<Route path="/crear" element={...} />` |
| `src/pages/Dashboard.tsx` | Add "Crear post" button in header; read `?type=` query param for initial tab |
| `src/pages/Creator.tsx` | Create: type tabs, field form, buildMarkdown, live preview, save flow |

---

## Task 1: Fix parseNoticia and remove PostCard date

**Files:**
- Modify: `src/components/VisualCard.tsx` line 60
- Modify: `src/components/PostCard.tsx` lines 54-83

### Context

`parseNoticia` finds the source line by matching a hardcoded keyword list. If the source doesn't contain `banco|ocde|ine|cnmv|financial|bloomberg|reuters|expansión`, it silently returns empty. The fix: add `fuente:` to that pattern so that markdown prefixed with "Fuente: " always matches.

`PostCard` shows a date header div (lines 71-83) that the user wants removed. The `Post` interface, `formattedDate` computation, and `date` prop must remain — just stop rendering the header div.

- [ ] **Step 1: Update parseNoticia in VisualCard.tsx**

Find this line (around line 60):
```typescript
const source = lines.find(l => l.match(/banco|ocde|ine|cnmv|financial|bloomberg|reuters|expansión/i) && l.length < 80) || ''
```

Replace with:
```typescript
const source = lines.find(l => l.match(/fuente:|banco|ocde|ine|cnmv|financial|bloomberg|reuters|expansión/i) && l.length < 80) || ''
```

- [ ] **Step 2: Remove date header from PostCard.tsx**

In `PostCard.tsx`, remove the entire `{/* Date header */}` block. The file goes from:
```tsx
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
```

To:
```tsx
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-finomik-gray-light overflow-hidden ${STATUS_STYLES[post.status]}`}>
      {/* Visual card */}
```

Keep the `formattedDate` computation above the return — TypeScript will warn about unused vars if removed and `date` is still in the interface, which is fine. Actually, remove the `formattedDate` computation too since it's no longer used. The `date` field stays in the `Post` interface.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/miquelferrer/Desktop/Trabajo/Finomik/finomik-content-hub && npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/VisualCard.tsx src/components/PostCard.tsx
git commit -m "fix: update parseNoticia source detection, remove PostCard date header"
```

---

## Task 2: Add route and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Dashboard.tsx`

### Context

`App.tsx` uses React Router v6. Add a protected `/crear` route (same pattern as `/dashboard`).

`Dashboard.tsx` needs two changes:
1. A "Crear post" button in the header that navigates to `/crear`.
2. Read the `?type=` query param on mount to set `activeType` — so after saving a post, the user lands on the correct type tab.

- [ ] **Step 1: Add /crear route in App.tsx**

Import `Creator` and add the route. The full updated `App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Creator from './pages/Creator'
import type { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen bg-finomik-blue" />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/crear" element={session ? <Creator /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Add "Crear post" button and useSearchParams in Dashboard.tsx**

Add `useNavigate` and `useSearchParams` imports from react-router-dom. Change the `activeType` initial state to read from the query param. Add the "Crear post" button.

At the top of `Dashboard.tsx`, add to the existing React import line and add router imports:
```tsx
import { useSearchParams, useNavigate } from 'react-router-dom'
```

Change the `activeType` state initialization from:
```tsx
const [activeType, setActiveType] = useState<string>(POST_TYPES[0].key)
```
To:
```tsx
const [searchParams] = useSearchParams()
const navigate = useNavigate()
const [activeType, setActiveType] = useState<string>(
  searchParams.get('type') || POST_TYPES[0].key
)
```

In the header JSX, replace:
```tsx
        <button
          onClick={handleSignOut}
          className="text-finomik-gray-light text-sm hover:text-white transition-colors"
        >
          Salir
        </button>
```
With:
```tsx
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/crear')}
            className="bg-white text-finomik-blue text-sm font-bold px-4 py-1.5 rounded-xl hover:bg-finomik-gray-light transition-colors"
          >
            + Crear post
          </button>
          <button
            onClick={handleSignOut}
            className="text-finomik-gray-light text-sm hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/Dashboard.tsx
git commit -m "feat: add /crear route and nav button, read ?type= param in dashboard"
```

---

## Task 3: Create Creator.tsx

**Files:**
- Create: `src/pages/Creator.tsx`

### Context

This is the main task. The page has two columns:
- Left: type tabs + form fields that change per type
- Right: `<VisualCard>` receiving the live-built markdown

`buildMarkdown(type, fields)` is a pure function that assembles the markdown string from the current fields. `VisualCard` already handles empty/missing fields gracefully via parser fallbacks.

The save flow: find or create a session for today → insert document → redirect to `/dashboard?type=`.

The field config drives both the form render and the required-field validation.

- [ ] **Step 1: Create Creator.tsx with the full implementation**

Create `src/pages/Creator.tsx` with the following complete implementation:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import VisualCard from '../components/VisualCard'

type PostType = 'noticia_financiera' | 'frase_iconica' | 'dato_impactante' | 'error_financiero' | 'concepto_mes' | 'nueva_funcionalidad'

const POST_TYPES: { key: PostType; label: string }[] = [
  { key: 'noticia_financiera', label: '📰 Noticia' },
  { key: 'frase_iconica',      label: '💬 Frase' },
  { key: 'dato_impactante',    label: '📊 Dato' },
  { key: 'error_financiero',   label: '💸 Error' },
  { key: 'concepto_mes',       label: '🧠 Concepto' },
  { key: 'nueva_funcionalidad',label: '🚀 Funcionalidad' },
]

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type FieldType = 'input' | 'textarea' | 'select'

interface FieldConfig {
  key: string
  label: string
  type: FieldType
  maxLength?: number
  placeholder?: string
  required?: boolean
  options?: string[]
}

const FIELDS: Record<PostType, FieldConfig[]> = {
  noticia_financiera: [
    { key: 'titular',        label: 'Titular',               type: 'input',    maxLength: 100, required: true, placeholder: 'Pregunta o dato impactante' },
    { key: 'fuente',         label: 'Fuente',                type: 'input',    maxLength: 60,  placeholder: 'ej: Banco de España, OCDE' },
    { key: 'contexto',       label: 'Contexto',              type: 'textarea', placeholder: '2-3 lineas de que ha pasado' },
    { key: 'conexionFinomik',label: 'Conexion con FinoMik',  type: 'input',    maxLength: 200, placeholder: 'Frase que mencione FinoMik' },
    { key: 'hashtag',        label: 'Hashtag tematico',      type: 'input',    maxLength: 30,  placeholder: 'EducacionFinanciera (sin #)' },
  ],
  frase_iconica: [
    { key: 'frase',  label: 'Frase',            type: 'textarea', maxLength: 300, required: true },
    { key: 'nombre', label: 'Nombre del autor', type: 'input',    maxLength: 60,  required: true },
    { key: 'cargo',  label: 'Cargo o contexto', type: 'input',    maxLength: 80 },
  ],
  dato_impactante: [
    { key: 'cifra',    label: 'Cifra',             type: 'input',    maxLength: 50,  required: true, placeholder: 'ej: 68% o 4 de cada 10' },
    { key: 'etiqueta', label: 'Etiqueta del dato', type: 'input',    maxLength: 80,  required: true },
    { key: 'contexto', label: 'Contexto',          type: 'textarea', placeholder: '2 lineas de que significa' },
    { key: 'fuente',   label: 'Fuente',            type: 'input',    maxLength: 60,  placeholder: 'ej: OCDE, INE, Banco de España' },
  ],
  error_financiero: [
    { key: 'cifra',       label: 'Cifra',                    type: 'input',    maxLength: 40,  required: true, placeholder: 'ej: 72%' },
    { key: 'etiqueta',    label: 'Etiqueta del error',       type: 'input',    maxLength: 100, required: true },
    { key: 'explicacion', label: 'Explicacion',              type: 'textarea', required: true },
    { key: 'cons1titulo', label: 'Consecuencia 1 — Titulo',  type: 'input',    maxLength: 40 },
    { key: 'cons1texto',  label: 'Consecuencia 1 — Texto',   type: 'input',    maxLength: 100 },
    { key: 'cons2titulo', label: 'Consecuencia 2 — Titulo',  type: 'input',    maxLength: 40 },
    { key: 'cons2texto',  label: 'Consecuencia 2 — Texto',   type: 'input',    maxLength: 100 },
    { key: 'cons3titulo', label: 'Consecuencia 3 — Titulo',  type: 'input',    maxLength: 40 },
    { key: 'cons3texto',  label: 'Consecuencia 3 — Texto',   type: 'input',    maxLength: 100 },
    { key: 'sol1titulo',  label: 'Solucion 1 — Titulo',      type: 'input',    maxLength: 40 },
    { key: 'sol1texto',   label: 'Solucion 1 — Texto',       type: 'input',    maxLength: 100 },
    { key: 'sol2titulo',  label: 'Solucion 2 — Titulo',      type: 'input',    maxLength: 40 },
    { key: 'sol2texto',   label: 'Solucion 2 — Texto',       type: 'input',    maxLength: 100 },
    { key: 'sol3titulo',  label: 'Solucion 3 — Titulo',      type: 'input',    maxLength: 40 },
    { key: 'sol3texto',   label: 'Solucion 3 — Texto',       type: 'input',    maxLength: 100 },
  ],
  concepto_mes: [
    { key: 'concepto',   label: 'Nombre del concepto', type: 'input',    maxLength: 40,  required: true },
    { key: 'mes',        label: 'Mes',                 type: 'select',   options: MESES },
    { key: 'definicion', label: 'Definicion',          type: 'textarea', maxLength: 200 },
    { key: 'paso1',      label: 'Paso 1',              type: 'input',    maxLength: 100 },
    { key: 'paso2',      label: 'Paso 2',              type: 'input',    maxLength: 100 },
    { key: 'paso3',      label: 'Paso 3',              type: 'input',    maxLength: 100 },
    { key: 'pill1',      label: 'Palabra clave 1',     type: 'input',    maxLength: 18 },
    { key: 'pill2',      label: 'Palabra clave 2',     type: 'input',    maxLength: 18 },
    { key: 'pill3',      label: 'Palabra clave 3',     type: 'input',    maxLength: 18 },
  ],
  nueva_funcionalidad: [
    { key: 'nombre',      label: 'Nombre de la funcionalidad', type: 'input',    maxLength: 60,  required: true },
    { key: 'descripcion', label: 'Descripcion',                type: 'textarea', maxLength: 200, required: true, placeholder: 'Ahora puedes / A partir de hoy / FinoMik permite...' },
    { key: 'car1',        label: 'Caracteristica 1',           type: 'input',    maxLength: 100 },
    { key: 'car2',        label: 'Caracteristica 2',           type: 'input',    maxLength: 100 },
    { key: 'car3',        label: 'Caracteristica 3',           type: 'input',    maxLength: 100 },
  ],
}

const REQUIRED: Record<PostType, string[]> = {
  noticia_financiera:  ['titular'],
  frase_iconica:       ['frase', 'nombre'],
  dato_impactante:     ['cifra', 'etiqueta'],
  error_financiero:    ['cifra', 'etiqueta', 'explicacion'],
  concepto_mes:        ['concepto'],
  nueva_funcionalidad: ['nombre', 'descripcion'],
}

function buildMarkdown(type: PostType, fields: Record<string, string>): string {
  const f = (key: string) => fields[key] || ''
  switch (type) {
    case 'noticia_financiera':
      return [
        f('titular'),
        `Fuente: ${f('fuente')}`,
        '',
        f('contexto'),
        '',
        f('conexionFinomik'),
        '',
        `#${f('hashtag')}`,
      ].join('\n')
    case 'frase_iconica':
      return [
        `\u201c${f('frase')}\u201d`,
        `\u2014 ${f('nombre')}, ${f('cargo')}`,
      ].join('\n')
    case 'dato_impactante':
      return [
        f('cifra'),
        f('etiqueta'),
        '',
        f('contexto'),
        '',
        `Fuente: ${f('fuente')}`,
      ].join('\n')
    case 'error_financiero':
      return [
        f('cifra'),
        f('etiqueta'),
        f('explicacion'),
        '',
        `1. ${f('cons1titulo')}: ${f('cons1texto')}`,
        `2. ${f('cons2titulo')}: ${f('cons2texto')}`,
        `3. ${f('cons3titulo')}: ${f('cons3texto')}`,
        '',
        `\u2705 ${f('sol1titulo')}: ${f('sol1texto')}`,
        `\u2705 ${f('sol2titulo')}: ${f('sol2texto')}`,
        `\u2705 ${f('sol3titulo')}: ${f('sol3texto')}`,
      ].join('\n')
    case 'concepto_mes':
      return [
        f('concepto'),
        f('mes'),
        '',
        `\u{1F4CC} ${f('definicion')}`,
        '',
        `1. ${f('paso1')}`,
        `2. ${f('paso2')}`,
        `3. ${f('paso3')}`,
        '',
        f('pill1'),
        f('pill2'),
        f('pill3'),
      ].join('\n')
    case 'nueva_funcionalidad':
      return [
        f('nombre'),
        f('descripcion'),
        '',
        `- ${f('car1')}`,
        `- ${f('car2')}`,
        `- ${f('car3')}`,
      ].join('\n')
    default:
      return ''
  }
}

export default function Creator() {
  const navigate = useNavigate()
  const [activeType, setActiveType] = useState<PostType>('noticia_financiera')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markdown = buildMarkdown(activeType, fields)

  function handleTypeChange(type: PostType) {
    setActiveType(type)
    setFields({})
    setError(null)
  }

  function handleField(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const missing = REQUIRED[activeType].some(k => !fields[k]?.trim())
    if (missing) {
      setError('Completa los campos obligatorios antes de guardar.')
      return
    }

    setSaving(true)
    setError(null)

    const today = new Date().toISOString().slice(0, 10)

    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', today)
      .maybeSingle()

    let sessionId: string
    if (existingSession) {
      sessionId = existingSession.id
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({ date: today })
        .select('id')
        .single()
      if (sessionError || !newSession) {
        setError('No se pudo crear la sesion. Intentalo de nuevo.')
        setSaving(false)
        return
      }
      sessionId = newSession.id
    }

    const { error: insertError } = await supabase
      .from('documents')
      .insert({ session_id: sessionId, type: activeType, content: markdown, status: 'sin_revisar' })

    if (insertError) {
      setError('No se pudo guardar el post. Intentalo de nuevo.')
      setSaving(false)
      return
    }

    navigate(`/dashboard?type=${activeType}`)
  }

  const inputClass = 'w-full border border-finomik-gray-light rounded-lg px-3 py-2 text-sm text-finomik-blue focus:outline-none focus:border-finomik-blue bg-white'
  const labelClass = 'block text-xs font-bold text-finomik-gray mb-1'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-finomik-blue text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-finomik-gray-light text-sm hover:text-white transition-colors"
          >
            ← Volver
          </button>
          <div>
            <h1 className="font-black text-xl">Finomik</h1>
            <p className="text-finomik-gray-light text-xs">Crear post</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-white text-finomik-blue text-sm font-bold px-5 py-2 rounded-xl hover:bg-finomik-gray-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Type tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {POST_TYPES.map(pt => (
            <button
              key={pt.key}
              onClick={() => handleTypeChange(pt.key)}
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

        <div className="grid grid-cols-2 gap-8 items-start">
          {/* Form column */}
          <div className="bg-white rounded-2xl shadow-sm border border-finomik-gray-light p-6 space-y-4">
            {FIELDS[activeType].map(field => (
              <div key={field.key}>
                <label className={labelClass}>
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    className={`${inputClass} resize-y min-h-[80px]`}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={fields[field.key] || ''}
                    onChange={e => handleField(field.key, e.target.value)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className={inputClass}
                    value={fields[field.key] || field.options![0]}
                    onChange={e => handleField(field.key, e.target.value)}
                  >
                    {field.options!.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={inputClass}
                    maxLength={field.maxLength}
                    placeholder={field.placeholder}
                    value={fields[field.key] || ''}
                    onChange={e => handleField(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {error && (
              <p className="text-red-500 text-xs font-bold">{error}</p>
            )}
          </div>

          {/* Preview column */}
          <div className="sticky top-8">
            <p className="text-xs font-bold text-finomik-gray mb-3">Preview en vivo</p>
            <VisualCard type={activeType} content={markdown} />
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Creator.tsx
git commit -m "feat: add Creator page with form, live preview and save to Supabase"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify dashboard has "Crear post" button**

Open `http://localhost:5173/dashboard`. The header should show a white "+ Crear post" button next to "Salir".

- [ ] **Step 3: Verify navigation to /crear**

Click "+ Crear post". Should navigate to `/crear` with the two-column layout and the 6 type tabs.

- [ ] **Step 4: Verify live preview**

Select "💬 Frase". Type a quote in the Frase field and a name in Nombre del autor. The card on the right should update immediately showing the quote and author.

- [ ] **Step 5: Verify save flow**

Fill in the required fields for any type. Click "Guardar" in the header. Should redirect to `/dashboard?type=frase_iconica` (or whichever type). The new post should appear first in the list.

- [ ] **Step 6: Verify date is gone from PostCard**

Back on the dashboard, confirm that no post shows a date header above the card.

- [ ] **Step 7: Verify parseNoticia fix**

On the Creator page, select "📰 Noticia". Fill in Titular and Fuente with a custom value like "Ministerio de Hacienda". The preview card should show the source text (not blank).
