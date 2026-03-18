import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import VisualCard from '../components/VisualCard'

type PostStatus = 'sin_revisar' | 'por_colgar' | 'colgado' | 'no_me_gusta'

interface Post {
  id: string
  type: string
  content: string
  status: PostStatus
  created_at: string
  date: string
}

const TYPE_LABELS: Record<string, string> = {
  noticia_financiera:  '📰 Noticia Financiera',
  frase_iconica:       '💬 Frase Icónica',
  dato_impactante:     '📊 Dato Impactante',
  error_financiero:    '💸 Error Financiero',
  concepto_mes:        '🧠 Concepto del Mes',
  nueva_funcionalidad: '🚀 Nueva Funcionalidad',
}

const STATUS_ACTIONS: { value: PostStatus; label: string; bg: string; text: string; ring: string }[] = [
  { value: 'sin_revisar', label: 'Sin revisar', bg: 'bg-gray-100',   text: 'text-gray-600',   ring: 'ring-gray-300'   },
  { value: 'por_colgar',  label: 'Por colgar',  bg: 'bg-amber-100',  text: 'text-amber-700',  ring: 'ring-amber-400'  },
  { value: 'colgado',     label: 'Publicado',   bg: 'bg-green-100',  text: 'text-green-700',  ring: 'ring-green-400'  },
  { value: 'no_me_gusta', label: 'Descartado',  bg: 'bg-red-100',    text: 'text-red-600',    ring: 'ring-red-400'    },
]

const CARD_SEP = '=== TARJETA VISUAL ==='
const TEXT_SEP = '=== TEXTO DEL POST ==='

function parseContent(content: string): { cardContent: string; postText: string } {
  if (!content.includes(CARD_SEP)) {
    return { cardContent: content, postText: '' }
  }
  const cardStart = content.indexOf(CARD_SEP) + CARD_SEP.length
  const cardEnd = content.includes(TEXT_SEP) ? content.indexOf(TEXT_SEP) : content.length
  const cardContent = content.slice(cardStart, cardEnd).trim()
  const postText = content.includes(TEXT_SEP)
    ? content.slice(content.indexOf(TEXT_SEP) + TEXT_SEP.length).trim()
    : ''
  return { cardContent, postText }
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PostDetail() {
  const { type = '', id = '' } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('documents')
      .select('*, sessions(date)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const { sessions, ...rest } = data as { sessions: { date: string } | null } & Omit<Post, 'date'>
          const rawStatus = rest.status as string
          setPost({
            ...rest,
            status: (rawStatus === 'por_revisar' ? 'por_colgar' : rawStatus) as PostStatus,
            date: (sessions as { date: string } | null)?.date ?? '',
          })
        }
        setLoading(false)
      })
  }, [id])

  async function setStatus(status: PostStatus) {
    if (!post || saving) return
    setSaving(true)
    await supabase.from('documents').update({ status }).eq('id', post.id)
    setPost(p => p ? { ...p, status } : p)
    setSaving(false)
  }

  const label = TYPE_LABELS[type] ?? type
  const isNoticia = type === 'noticia_financiera'

  const { cardContent, postText } = post
    ? parseContent(post.content)
    : { cardContent: '', postText: '' }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-finomik-blue text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(`/dashboard/${type}`)}
          className="text-finomik-gray-light text-sm hover:text-white transition-colors flex-shrink-0"
        >
          ← Volver
        </button>
        <div>
          <p className="text-finomik-gray-light text-xs font-medium">Finomik · Content Hub</p>
          <h1 className="font-black text-lg leading-tight">{label}</h1>
        </div>
      </header>

      {loading && <p className="text-finomik-gray text-sm text-center py-16">Cargando...</p>}

      {!loading && !post && (
        <p className="text-finomik-gray text-sm text-center py-16">Post no encontrado.</p>
      )}

      {!loading && post && (
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Meta row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-finomik-gray">{formatDate(post.date || post.created_at)}</p>
            {/* Status buttons */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_ACTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  disabled={saving}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all ${s.bg} ${s.text} ${
                    post.status === s.value
                      ? `ring-2 ${s.ring} border-transparent scale-105`
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {isNoticia ? (
            /* Noticia: text only */
            <div className="bg-white rounded-2xl border border-finomik-gray-light p-6">
              <p className="text-xs font-bold text-finomik-gray uppercase mb-3">Texto del post</p>
              <pre className="text-sm text-finomik-blue whitespace-pre-wrap font-sans leading-relaxed">
                {post.content}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Visual card */}
              <div className="flex-shrink-0">
                <p className="text-xs font-bold text-finomik-gray uppercase mb-3">Tarjeta visual</p>
                <VisualCard type={type} content={cardContent} />
              </div>

              {/* Post text */}
              {postText && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-finomik-gray uppercase mb-3">Texto del post</p>
                  <div className="bg-white rounded-2xl border border-finomik-gray-light p-6 h-full">
                    <pre className="text-sm text-finomik-blue whitespace-pre-wrap font-sans leading-relaxed">
                      {postText}
                    </pre>
                  </div>
                </div>
              )}

              {!postText && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-finomik-gray uppercase mb-3">Contenido</p>
                  <div className="bg-white rounded-2xl border border-finomik-gray-light p-6">
                    <pre className="text-sm text-finomik-blue whitespace-pre-wrap font-sans leading-relaxed">
                      {cardContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  )
}
