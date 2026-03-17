import { useRef } from 'react'
import html2canvas from 'html2canvas'
import ReactMarkdown from 'react-markdown'

const FORMAT_META: Record<string, { emoji: string; label: string; bg: string; accent: string }> = {
  frase_iconica:    { emoji: '💬', label: 'Frase Icónica',      bg: '#0B3064', accent: '#5574A7' },
  dato_impactante:  { emoji: '📊', label: 'Dato Impactante',    bg: '#114076', accent: '#5574A7' },
  concepto_mes:     { emoji: '🧠', label: 'Concepto del Mes',   bg: '#0B3064', accent: '#3E5374' },
  nueva_funcionalidad: { emoji: '🚀', label: 'Nueva Funcionalidad', bg: '#3C4C67', accent: '#5574A7' },
  error_financiero: { emoji: '💸', label: 'Error Financiero',   bg: '#0B3064', accent: '#5574A7' },
}

interface Props {
  type: string
  content: string
}

export default function VisualCard({ type, content }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const meta = FORMAT_META[type] ?? { emoji: '📄', label: type, bg: '#0B3064', accent: '#5574A7' }

  async function handleExport() {
    if (!cardRef.current) return
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: meta.bg,
    })
    const link = document.createElement('a')
    link.download = `finomik_${type}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="space-y-3">
      {/* Tarjeta exportable */}
      <div
        ref={cardRef}
        style={{ backgroundColor: meta.bg, fontFamily: 'Montserrat, sans-serif' }}
        className="w-full aspect-square rounded-2xl p-10 flex flex-col justify-between overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.emoji}</span>
            <span className="text-white text-xs font-bold uppercase tracking-widest opacity-70">
              {meta.label}
            </span>
          </div>
          <span className="text-white font-black text-lg tracking-tight opacity-90">Finomik</span>
        </div>

        {/* Contenido */}
        <div
          className="flex-1 flex items-center py-6 overflow-hidden"
          style={{ color: '#ffffff' }}
        >
          <div className="prose prose-invert prose-sm max-w-none w-full
            prose-headings:text-white prose-headings:font-black
            prose-p:text-white prose-p:opacity-90 prose-p:leading-relaxed
            prose-strong:text-white prose-strong:font-extrabold
            prose-li:text-white prose-li:opacity-90
            prose-hr:border-white prose-hr:opacity-20
          ">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 pt-4 border-t"
          style={{ borderColor: meta.accent }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
          <span className="text-xs font-bold opacity-50" style={{ color: '#ffffff' }}>
            finomik.com
          </span>
        </div>
      </div>

      {/* Boton de exportar */}
      <button
        onClick={handleExport}
        className="w-full py-2.5 rounded-xl text-sm font-bold bg-finomik-blue text-white hover:bg-finomik-blue-mid transition-colors"
      >
        Exportar PNG para LinkedIn
      </button>
    </div>
  )
}
