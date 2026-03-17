import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SessionCard from '../components/SessionCard'

interface Document {
  type: string
  content: string
}

interface ContentSession {
  id: string
  date: string
  documents: Document[]
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<ContentSession[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, documents(type, content)')
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error.message)
        setFetchError('No se pudo cargar el contenido. Inténtalo de nuevo.')
      } else if (data) {
        setSessions((data as ContentSession[]).map(s => ({ ...s, documents: s.documents ?? [] })))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

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
        <div className="bg-finomik-gray-light rounded-xl px-5 py-4 text-xs text-finomik-gray space-y-1">
          <p className="font-bold text-finomik-blue">Como generar nuevos posts</p>
          <p>1. Abre el terminal y ejecuta <code className="bg-white px-1 rounded">./run.sh</code> en la carpeta <code className="bg-white px-1 rounded">finomik-agents</code></p>
          <p>2. Cuando termine, ejecuta <code className="bg-white px-1 rounded">node sync.js</code> en esta carpeta</p>
          <p>3. Recarga la pagina. Los nuevos posts apareceran aqui abajo</p>
        </div>
        {loading && (
          <p className="text-finomik-gray text-sm text-center py-12">Cargando...</p>
        )}
        {fetchError && (
          <p className="text-red-500 text-sm text-center py-12">{fetchError}</p>
        )}
        {!loading && !fetchError && sessions.length === 0 && (
          <p className="text-finomik-gray text-sm text-center py-12">
            No hay contenido todavía. Ejecuta los agentes y luego <code>node sync.js</code>.
          </p>
        )}
        {sessions.map(session => (
          <SessionCard key={session.id} date={session.date} documents={session.documents} />
        ))}
      </main>
    </div>
  )
}
