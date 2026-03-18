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
      setError('No se pudo guardar el cambio. Inténtalo de nuevo.')
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
