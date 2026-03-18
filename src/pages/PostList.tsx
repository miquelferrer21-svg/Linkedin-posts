import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type PostStatus = 'sin_revisar' | 'por_colgar' | 'colgado' | 'no_me_gusta'
type FilterStatus = 'all' | PostStatus

interface Post {
  id: string
  type: string
  content: string
  status: PostStatus
  created_at: string
  date: string
}

const POST_TYPES = [
  { key: 'noticia_financiera',  label: '📰 Noticia' },
  { key: 'frase_iconica',       label: '💬 Frase' },
  { key: 'dato_impactante',     label: '📊 Dato' },
  { key: 'error_financiero',    label: '💸 Error' },
  { key: 'concepto_mes',        label: '🧠 Concepto' },
  { key: 'nueva_funcionalidad', label: '🚀 Funcionalidad' },
]

const TYPE_LABELS: Record<string, string> = {
  noticia_financiera:  '📰 Noticia Financiera',
  frase_iconica:       '💬 Frase Icónica',
  dato_impactante:     '📊 Dato Impactante',
  error_financiero:    '💸 Error Financiero',
  concepto_mes:        '🧠 Concepto del Mes',
  nueva_funcionalidad: '🚀 Nueva Funcionalidad',
}

const STATUS_CONFIG: Record<PostStatus, { label: string; bg: string; text: string }> = {
  sin_revisar: { label: 'Sin revisar', bg: 'bg-gray-100',   text: 'text-gray-500'   },
  por_colgar:  { label: 'Por colgar',  bg: 'bg-amber-100',  text: 'text-amber-700'  },
  colgado:     { label: 'Publicado',   bg: 'bg-green-100',  text: 'text-green-700'  },
  no_me_gusta: { label: 'Descartado', bg: 'bg-red-100',    text: 'text-red-600'    },
}

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',         label: 'Todos' },
  { value: 'sin_revisar', label: 'Sin revisar' },
  { value: 'por_colgar',  label: 'Por colgar' },
  { value: 'colgado',     label: 'Publicado' },
  { value: 'no_me_gusta', label: 'Descartado' },
]

// Extracts a human-readable title from the card content
function extractTitle(type: string, content: string): string {
  // Strip the new agent format wrappers if present
  const CARD_SEP = '=== TARJETA VISUAL ==='
  const TEXT_SEP = '=== TEXTO DEL POST ==='
  let card = content
  if (content.includes(CARD_SEP)) {
    const start = content.indexOf(CARD_SEP) + CARD_SEP.length
    const end = content.includes(TEXT_SEP) ? content.indexOf(TEXT_SEP) : content.length
    card = content.slice(start, end)
  }
  const lines = card.split('\n').map(l => l.trim()).filter(Boolean)

  if (type === 'frase_iconica') {
    const author = lines.find(l => l.startsWith('—') || l.startsWith('-'))
    if (author) return author.replace(/^[—-]\s*/, '').split(',')[0].trim()
    const quote = lines.find(l => l.match(/^["""]/))
    return quote ? quote.replace(/^[""]|[""].*$/g, '').slice(0, 70) : lines[0] || 'Sin título'
  }
  if (type === 'dato_impactante') {
    const cifra = lines[0] || ''
    const etiqueta = lines[1] || ''
    return etiqueta ? `${cifra} · ${etiqueta.slice(0, 50)}` : cifra
  }
  return lines[0]?.replace(/^[""]|[""]$/g, '').slice(0, 80) || 'Sin título'
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PostList() {
  const { type = '' } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    setLoading(true)
    supabase
      .from('documents')
      .select('*, sessions(date)')
      .eq('type', type)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const mapped: Post[] = (data ?? []).map(({ sessions, ...rest }) => ({
          ...rest,
          status: (rest.status === 'por_revisar' ? 'por_colgar' : rest.status) as PostStatus,
          date: (sessions as { date: string } | null)?.date ?? '',
        }))
        setPosts(mapped)
        setLoading(false)
      })
  }, [type])

  const visible = filter === 'all' ? posts : posts.filter(p => p.status === filter)
  const label = TYPE_LABELS[type] ?? type

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-finomik-blue text-white px-6 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-finomik-gray-light text-sm hover:text-white transition-colors"
            >
              ← Volver
            </button>
            <div>
              <p className="text-finomik-gray-light text-xs font-medium">Finomik · Content Hub</p>
              <h1 className="font-black text-lg leading-tight">{label}</h1>
            </div>
          </div>
          <button
            onClick={() => navigate('/crear')}
            className="bg-white text-finomik-blue text-sm font-bold px-4 py-1.5 rounded-xl hover:bg-finomik-gray-light transition-colors"
          >
            + Crear post
          </button>
        </div>
        {/* Type switcher tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {POST_TYPES.map(pt => (
            <button
              key={pt.key}
              onClick={() => navigate(`/dashboard/${pt.key}`)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                pt.key === type
                  ? 'bg-white/15 text-white border-white'
                  : 'text-finomik-gray-light border-transparent hover:text-white hover:bg-white/10'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => {
            const count = f.value === 'all' ? posts.length : posts.filter(p => p.status === f.value).length
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                  filter === f.value
                    ? 'bg-finomik-blue text-white border-transparent'
                    : 'bg-white text-finomik-blue border-finomik-gray-light hover:border-finomik-blue'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filter === f.value ? 'bg-white/20' : 'bg-finomik-gray-light'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading && <p className="text-finomik-gray text-sm text-center py-12">Cargando...</p>}

        {!loading && visible.length === 0 && (
          <p className="text-finomik-gray text-sm text-center py-12">
            No hay posts{filter !== 'all' ? ' con este estado' : ''}.
          </p>
        )}

        {!loading && visible.length > 0 && (
          <div className="bg-white rounded-2xl border border-finomik-gray-light divide-y divide-finomik-gray-light overflow-hidden">
            {visible.map(post => {
              const title = extractTitle(type, post.content)
              const sc = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.sin_revisar
              return (
                <button
                  key={post.id}
                  onClick={() => navigate(`/dashboard/${type}/${post.id}`)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-finomik-blue truncate group-hover:text-finomik-blue-mid">
                      {title}
                    </p>
                    <p className="text-xs text-finomik-gray mt-0.5">{formatDate(post.date || post.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                    <span className="text-finomik-gray-light text-lg">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
