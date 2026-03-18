import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const POST_TYPES = [
  { key: 'noticia_financiera',  emoji: '📰', label: 'Noticia Financiera',   freq: '1-2 veces por semana' },
  { key: 'frase_iconica',       emoji: '💬', label: 'Frase Icónica',        freq: 'Lunes o viernes' },
  { key: 'dato_impactante',     emoji: '📊', label: 'Dato Impactante',      freq: '1 vez por semana' },
  { key: 'error_financiero',    emoji: '💸', label: 'Error Financiero',     freq: 'Cada 2 semanas' },
  { key: 'concepto_mes',        emoji: '🧠', label: 'Concepto del Mes',     freq: 'Primer lunes del mes' },
  { key: 'nueva_funcionalidad', emoji: '🚀', label: 'Nueva Funcionalidad',  freq: 'Con cada release' },
]

type Counts = Record<string, { total: number; por_colgar: number; colgado: number }>

export default function Dashboard() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState<Counts>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('documents').select('type, status').then(({ data }) => {
      if (data) {
        const c: Counts = {}
        for (const row of data) {
          if (!c[row.type]) c[row.type] = { total: 0, por_colgar: 0, colgado: 0 }
          c[row.type].total++
          if (row.status === 'por_colgar' || row.status === 'por_revisar') c[row.type].por_colgar++
          if (row.status === 'colgado') c[row.type].colgado++
        }
        setCounts(c)
      }
      setLoading(false)
    })
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/crear')}
            className="bg-white text-finomik-blue text-sm font-bold px-4 py-1.5 rounded-xl hover:bg-finomik-gray-light transition-colors"
          >
            + Crear post
          </button>
          <button onClick={handleSignOut} className="text-finomik-gray-light text-sm hover:text-white transition-colors">
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Instructions */}
        <div className="bg-white rounded-xl border border-finomik-gray-light px-5 py-4 text-xs text-finomik-gray space-y-1">
          <p className="font-bold text-finomik-blue">Como generar nuevos posts</p>
          <p>1. Abre el terminal y ejecuta <code className="bg-gray-100 px-1 rounded">./run.sh</code> en la carpeta <code className="bg-gray-100 px-1 rounded">finomik-agents</code></p>
          <p>2. Cuando termine, ejecuta <code className="bg-gray-100 px-1 rounded">node sync.js</code> en esta carpeta</p>
          <p>3. Recarga la pagina. Los nuevos posts apareceran en cada seccion</p>
        </div>

        {/* Type grid */}
        {loading ? (
          <p className="text-center text-finomik-gray text-sm py-12">Cargando...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {POST_TYPES.map(pt => {
              const c = counts[pt.key] ?? { total: 0, por_colgar: 0, colgado: 0 }
              return (
                <button
                  key={pt.key}
                  onClick={() => navigate(`/dashboard/${pt.key}`)}
                  className="bg-white rounded-2xl border border-finomik-gray-light p-5 text-left hover:border-finomik-blue hover:shadow-md transition-all group"
                >
                  <div className="text-3xl mb-3">{pt.emoji}</div>
                  <div className="font-black text-finomik-blue text-sm mb-1 group-hover:text-finomik-blue">{pt.label}</div>
                  <div className="text-xs text-finomik-gray mb-4">{pt.freq}</div>
                  <div className="flex gap-2 flex-wrap">
                    {c.por_colgar > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {c.por_colgar} por colgar
                      </span>
                    )}
                    {c.colgado > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {c.colgado} publicado{c.colgado !== 1 ? 's' : ''}
                      </span>
                    )}
                    {c.total === 0 && (
                      <span className="text-finomik-gray text-xs">Sin posts</span>
                    )}
                    {c.total > 0 && c.por_colgar === 0 && c.colgado === 0 && (
                      <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
                        {c.total} sin revisar
                      </span>
                    )}
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
