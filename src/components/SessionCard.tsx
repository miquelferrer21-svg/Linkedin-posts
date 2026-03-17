import DocumentViewer from './DocumentViewer'
import { useState } from 'react'

const TYPE_LABELS: Record<string, string> = {
  noticia_financiera: '📰 Noticia Financiera',
  frase_iconica: '💬 Frase Icónica',
  dato_impactante: '📊 Dato Impactante',
  error_financiero: '💸 Error Financiero',
  concepto_mes: '🧠 Concepto del Mes',
  nueva_funcionalidad: '🚀 Nueva Funcionalidad',
}

interface Document {
  type: string
  content: string
}

interface Props {
  date: string
  documents: Document[]
}

export default function SessionCard({ date, documents }: Props) {
  const [activeType, setActiveType] = useState<string | null>(null)

  const activeDoc = documents.find(d => d.type === activeType)

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-finomik-gray-light overflow-hidden">
      <div className="px-6 py-4 border-b border-finomik-gray-light">
        <p className="font-extrabold text-finomik-blue capitalize">{formattedDate}</p>
        <p className="text-xs text-finomik-gray mt-0.5">{documents.length} documento{documents.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="px-6 py-3 flex gap-2 flex-wrap border-b border-finomik-gray-light">
        {documents.map(doc => (
          <button
            key={doc.type}
            onClick={() => setActiveType(activeType === doc.type ? null : doc.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeType === doc.type
                ? 'bg-finomik-blue text-white'
                : 'bg-finomik-gray-light text-finomik-blue hover:bg-finomik-blue-light hover:text-white'
            }`}
          >
            {TYPE_LABELS[doc.type] ?? doc.type}
          </button>
        ))}
      </div>
      {activeDoc && (
        <div className="px-6 py-5">
          <DocumentViewer content={activeDoc.content} />
        </div>
      )}
    </div>
  )
}
