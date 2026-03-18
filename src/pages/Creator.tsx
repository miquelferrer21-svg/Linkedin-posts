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
        f('mes') || MESES[0],
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
            <VisualCard type={activeType} content={markdown} hideExport />
          </div>
        </div>
      </main>
    </div>
  )
}
