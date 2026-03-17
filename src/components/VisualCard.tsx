import { useRef } from 'react'
import { motion } from 'framer-motion'
import html2canvas from 'html2canvas'

// ─── Paleta completa ──────────────────────────────────────────────────────────
const C = {
  navy:    '#0B3064',
  navy2:   '#114076',
  slate:   '#3C4C67',
  slateM:  '#3E5374',
  blue:    '#5574A7',
  silver:  '#8F9EB7',
  mist:    '#C8D0DD',
  white:   '#FFFFFF',
  yellow:  '#F5C518',
  green:   '#2DBD8A',
  red:     '#E84545',
  dark:    '#0d0d14',
  lightBg: '#f8f6f0',
}

// ─── Onda SVG de marca EduFin ─────────────────────────────────────────────────
// Una sola curva suave, característica de la identidad visual EduFin/FinoMik
function WaveBottom({ fill, height = 80 }: { fill: string; height?: number }) {
  return (
    <svg
      viewBox={`0 0 540 ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height }}
    >
      <path
        d={`M0,${height * 0.65} C135,${height * 0.15} 405,${height * 0.9} 540,${height * 0.35} L540,${height} L0,${height} Z`}
        fill={fill}
      />
    </svg>
  )
}

// ─── Parsers ──────────────────────────────────────────────────────────────────
function ls(md: string) { return md.split('\n').map(s => s.trim()).filter(Boolean) }
function clean(s: string) { return s.replace(/^[\p{Emoji}\s→•·\-–—:]+/u, '').replace(/\*\*/g, '').trim() }

function parseFrase(md: string) {
  const lines = ls(md); let quote = '', author = ''; const body: string[] = []
  for (const l of lines) {
    const qm = l.match(/[""]([^""]{15,})[""]/u)
    if (qm && !quote) { quote = qm[1]; continue }
    if (l.match(/^[–—-]\s*/) && !author) { author = l.replace(/^[–—-]\s*/, ''); continue }
    if (!l.match(/^[#]|#\w/)) body.push(clean(l))
  }
  return { quote: quote || body[0] || '', author, comment: body.slice(quote ? 0 : 1, 3).join(' ') }
}

function parseDato(md: string) {
  const lines = ls(md)
  const headline = clean(lines[0] || '')
  const bigNum = lines.slice(1).find(l => l.match(/\d+\s*de\s*cada\s*\d+|\d+\s*%|puesto\s+\d+/i)) || ''
  const unit = lines.slice(1).find(l => l !== bigNum && l.match(/jóvenes|españoles|personas|adultos|estudiantes/i)) || ''
  const desc = lines.find(l => l !== lines[0] && l !== bigNum && l !== unit && l.length > 30 && !l.match(/^[#📊]|#\w/)) || ''
  const body = lines.filter(l => l !== lines[0] && l !== bigNum && l !== unit && l !== desc && !l.match(/^[#]|#\w/)).slice(0, 2).join(' ')
  return { headline, bigNum: clean(bigNum), unit: clean(unit), desc: clean(desc), body }
}

function parseNoticia(md: string) {
  const lines = ls(md)
  const headline = clean(lines[0] || '')
  const source = lines.find(l => l.match(/banco|ocde|ine|cnmv|financial|bloomberg|reuters/i) && l.length < 60) || ''
  const nums = lines.filter(l => l.match(/\d+[%€$]|[€$]\d+/) && l.length < 40).slice(0, 3)
  const body = lines.filter(l => l !== lines[0] && l !== source && !nums.includes(l) && !l.match(/^[#]|#\w/) && l.length > 20).slice(0, 2).join(' ')
  const insight = lines.find(l => l.toLowerCase().includes('finomik') || l.match(/¿sab|entend/i)) || ''
  return { headline, source: clean(source), nums, body, insight: clean(insight) }
}

function parseError(md: string) {
  const lines = ls(md)
  const belief = clean(lines[0] || '').replace(/^[""]|[""]$/u, '')
  const xi = lines.findIndex(l => l.startsWith('❌'))
  const ci = lines.findIndex(l => l.startsWith('✅'))
  const items: string[] = []
  if (xi >= 0) items.push(clean(lines[xi].replace(/^❌\s*/, '')))
  if (ci >= 0) items.push(clean(lines[ci].replace(/^✅\s*/, '')))
  const extra = lines.filter((_, i) => i > ci && i < ci + 2).map(l => clean(l)).filter(s => s.length > 15)
  items.push(...extra)
  return { belief, items: items.slice(0, 3) }
}

function parseConcepto(md: string) {
  const lines = ls(md)
  const raw = clean(lines[0] || '')
  const concept = raw.replace(/^El concepto de [^:]+:\s*/i, '')
  const def = clean(lines.find(l => l.includes('📌')) || lines.find(l => l.length > 30 && l !== lines[0]) || '')
  const steps = lines.filter(l => l.match(/^\d+\./)).slice(0, 3).map(l => l.replace(/^\d+\.\s*/, '').replace(/\*\*/g, ''))
  return { concept, def, steps }
}

function parseFeat(md: string) {
  const lines = ls(md)
  const feat = clean(lines[0] || '').replace(/^Nueva función en FinoMik:\s*/i, '')
  const subtitle = clean(lines.find(l => l.match(/A partir de hoy|permite|ahora/i)) || '')
  const tags = lines.filter(l => !l.startsWith('🚀') && !l.match(/^[#]|#\w/) && l.length > 8 && l.length < 40).slice(1, 5).map(clean)
  return { feat, subtitle, tags }
}

// ─── Tipo base ────────────────────────────────────────────────────────────────
type S = React.CSSProperties
const card: S = { width: 540, height: 540, fontFamily: "'Montserrat','Arial Black',sans-serif", position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }

// ═══ NUEVA FUNCIONALIDAD ══════════════════════════════════════════════════════
// Navy. Badge amarillo. Headline con acento amarillo. Mockup de pantalla. Tags.
function FuncionalidadCard({ content }: { content: string }) {
  const { feat, subtitle, tags } = parseFeat(content)
  const words = feat.split(' ')
  const accentWord = words[words.length - 1]
  const mainWords = words.slice(0, -1).join(' ')

  return (
    <div style={{ ...card, background: C.navy, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '22px 28px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: C.silver, textTransform: 'uppercase' }}>FinoMik</span>
        <span style={{ background: C.yellow, color: C.navy, fontSize: 10, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 100 }}>
          ✦ Nueva función
        </span>
      </div>

      {/* Headline */}
      <div style={{ padding: '0 28px 18px', fontSize: 28, fontWeight: 900, color: C.white, lineHeight: 1.15, letterSpacing: -0.5 }}>
        {mainWords} <span style={{ color: C.yellow }}>{accentWord}</span>
      </div>

      {/* Mockup de pantalla */}
      <div style={{
        flex: 1, margin: '0 20px 20px',
        borderRadius: 12, background: '#0a1929',
        border: '1.5px solid rgba(255,255,255,0.1)',
        overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        {/* Browser bar */}
        <div style={{ background: '#111c2e', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 16, marginLeft: 8 }} />
        </div>
        {/* Screen content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Grid pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.18,
            backgroundImage: `linear-gradient(${C.blue} 1px, transparent 1px), linear-gradient(90deg, ${C.blue} 1px, transparent 1px)`,
            backgroundSize: '54px 54px',
          }} />
          {/* Play button */}
          <div style={{
            width: 52, height: 52, background: C.yellow, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 12px rgba(245,197,24,0.15)`, position: 'relative', zIndex: 2,
          }}>
            <svg width="18" height="20" viewBox="0 0 18 20" fill={C.navy}><polygon points="0,0 18,10 0,20" /></svg>
          </div>
        </div>
      </div>

      {/* Feature tags */}
      <div style={{ padding: '4px 28px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tags.slice(0, 4).map((t, i) => (
          <span key={i} style={{
            background: i === 0 ? `rgba(245,197,24,0.12)` : 'rgba(255,255,255,0.08)',
            border: `1px solid ${i === 0 ? 'rgba(245,197,24,0.3)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 100, padding: '4px 12px',
            fontSize: 10, fontWeight: 700,
            color: i === 0 ? C.yellow : C.mist, letterSpacing: 0.5,
          }}>{t.length > 22 ? t.slice(0, 22) : t}</span>
        ))}
        {subtitle && tags.length < 2 && (
          <span style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '4px 12px', fontSize: 10, fontWeight: 700, color: C.mist }}>
            {subtitle.slice(0, 28)}
          </span>
        )}
      </div>

      {/* Onda de marca */}
      <WaveBottom fill={C.navy2} height={44} />
    </div>
  )
}

// ═══ NOTICIA FINANCIERA ═══════════════════════════════════════════════════════
// Fondo claro (#f8f6f0). Header navy. Stats en cajas blancas. Insight en navy.
function NoticiaCard({ content }: { content: string }) {
  const { headline, source, nums, body, insight } = parseNoticia(content)
  const today = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })

  return (
    <div style={{ ...card, background: C.lightBg, display: 'flex', flexDirection: 'column' }}>
      {/* Header strip navy */}
      <div style={{ background: C.navy, padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: C.white, letterSpacing: 1 }}>FinoMik</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.silver, letterSpacing: 1, textTransform: 'uppercase' }}>{today} · Mercados</span>
      </div>

      {/* Category + source */}
      <div style={{ padding: '12px 28px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: C.navy, color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 100 }}>
          ⚡ Ahora
        </span>
        {source && <span style={{ fontSize: 10, color: C.blue, fontWeight: 600 }}>Fuente: {source.slice(0, 30)}</span>}
      </div>

      {/* Headline */}
      <div style={{ padding: '4px 28px 14px', fontSize: headline.length > 60 ? 19 : 23, fontWeight: 900, color: C.navy, lineHeight: 1.2, letterSpacing: -0.5 }}>
        {headline}
      </div>

      <div style={{ height: 2, background: C.navy, margin: '0 28px', opacity: 0.12 }} />

      {/* Stats row */}
      {nums.length > 0 ? (
        <div style={{ padding: '14px 28px', display: 'grid', gridTemplateColumns: `repeat(${Math.min(nums.length, 3)}, 1fr)`, gap: 12 }}>
          {nums.slice(0, 3).map((n, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 10, padding: 12, textAlign: 'center', boxShadow: '0 2px 10px rgba(11,48,100,.08)' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: n.includes('+') || n.includes('↑') ? C.green : n.includes('-') || n.includes('↓') ? C.red : C.navy, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.silver, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>Dato</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height: 16 }} />
      )}

      {/* Body text */}
      {body && (
        <div style={{ padding: '0 28px', fontSize: 12.5, color: C.slate, lineHeight: 1.7, fontWeight: 400, flex: 1 }}>
          {body.length > 180 ? body.slice(0, 180) + '…' : body}
        </div>
      )}

      {/* Insight box */}
      <div style={{ margin: '12px 28px 20px', background: C.navy, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.white, lineHeight: 1.5 }}>
          {insight.length > 100 ? insight.slice(0, 100) + '…' : insight || 'FinoMik: aprende a leer la economía real desde el aula.'}
        </div>
      </div>
    </div>
  )
}

// ═══ FRASE ICÓNICA ════════════════════════════════════════════════════════════
// Navy. Comilla amarilla grande. Avatar autor. Caja de comentario borde amarillo.
function FraseCard({ content }: { content: string }) {
  const { quote, author, comment } = parseFrase(content)
  const initials = author.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'F'
  const authorName = author.split(',')[0]
  const authorTitle = author.includes(',') ? author.split(',').slice(1).join(',').trim() : ''

  return (
    <div style={{ ...card, background: C.navy, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
      <div style={{ padding: '40px 36px', position: 'relative', zIndex: 2 }}>
        {/* Comilla amarilla */}
        <span style={{ fontSize: 80, fontWeight: 900, color: C.yellow, lineHeight: 0.6, marginBottom: 16, display: 'block', opacity: 0.7 }}>"</span>

        {/* Cita */}
        <div style={{ fontSize: quote.length > 100 ? 18 : quote.length > 60 ? 21 : 24, fontWeight: 700, color: C.white, lineHeight: 1.45, letterSpacing: -0.3, marginBottom: 24 }}>
          {quote}
        </div>

        {/* Autor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.blue}, ${C.slate})`,
            border: `2px solid ${C.yellow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: C.white, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{authorName || 'Autor'}</div>
            {authorTitle && <div style={{ fontSize: 11, color: C.silver, fontWeight: 500, marginTop: 2 }}>{authorTitle.slice(0, 50)}</div>}
          </div>
        </div>

        {/* Caja de comentario */}
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: `3px solid ${C.yellow}`, borderRadius: '0 10px 10px 0', padding: '14px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.yellow, marginBottom: 6 }}>FinoMik reflexiona</div>
          <div style={{ fontSize: 11.5, color: C.mist, lineHeight: 1.6, fontWeight: 500 }}>
            {comment.length > 120 ? comment.slice(0, 120) + '…' : comment || 'Una perspectiva esencial para entender la educación financiera que necesitamos en las aulas.'}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 20, right: 24, zIndex: 2, fontSize: 10, fontWeight: 800, letterSpacing: 2, color: C.silver, textTransform: 'uppercase' }}>FinoMik</div>
    </div>
  )
}

// ═══ DATO IMPACTANTE ══════════════════════════════════════════════════════════
// Fondo claro. Centrado. Numero enorme. CTA pill navy. Onda en la base.
function DatoCard({ content }: { content: string }) {
  const { headline, bigNum, unit, desc, body } = parseDato(content)
  const numParts = bigNum.match(/^(\d+)\s*(de\s*cada\s*\d+|%|.*)$/)
  const numBig = numParts?.[1] || bigNum.split(' ')[0] || '?'
  const numRest = numParts?.[2] || bigNum.split(' ').slice(1).join(' ') || ''

  return (
    <div style={{ ...card, background: C.navy, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '32px 28px', gap: 0, position: 'relative' }}>
      {/* Eyebrow */}
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: C.silver, marginBottom: 18, position: 'relative', zIndex: 1 }}>
        ¿Sabías que...?
      </div>

      {/* Numero grande */}
      <div style={{ fontSize: bigNum.length > 15 ? 52 : bigNum.length > 8 ? 68 : 96, fontWeight: 900, color: C.yellow, lineHeight: 1, letterSpacing: -4, marginBottom: 6, position: 'relative', zIndex: 1 }}>
        {numBig}<span style={{ color: C.mist, fontSize: '55%' }}>{numRest ? ` ${numRest}` : ''}</span>
      </div>

      {/* Unidad */}
      {unit && (
        <div style={{ fontSize: 22, fontWeight: 900, color: C.white, marginBottom: 14, position: 'relative', zIndex: 1 }}>{unit}</div>
      )}

      {/* Descripcion */}
      <div style={{ fontSize: 15, fontWeight: 700, color: C.white, lineHeight: 1.4, marginBottom: 18, maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {desc.length > 80 ? desc.slice(0, 80) + '…' : desc || headline}
      </div>

      <div style={{ width: 48, height: 3, background: C.yellow, borderRadius: 2, margin: '0 auto 18px', opacity: 0.4, position: 'relative', zIndex: 1 }} />

      {/* Contexto */}
      {body && (
        <div style={{ fontSize: 12.5, fontWeight: 500, color: C.mist, lineHeight: 1.6, maxWidth: 380, marginBottom: 22, position: 'relative', zIndex: 1 }}>
          {body.length > 130 ? body.slice(0, 130) + '…' : body}
        </div>
      )}

      {/* CTA pill */}
      <div style={{ background: C.yellow, color: C.navy, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 22px', borderRadius: 100, position: 'relative', zIndex: 1 }}>
        Por eso existe FinoMik →
      </div>

      <div style={{ position: 'absolute', bottom: 16, right: 20, fontSize: 9, fontWeight: 800, letterSpacing: 2, color: C.silver, textTransform: 'uppercase' }}>FinoMik</div>

      {/* Onda de marca */}
      <WaveBottom fill={C.navy2} height={70} />
    </div>
  )
}

// ═══ ERROR FINANCIERO ═════════════════════════════════════════════════════════
// Fondo muy oscuro. Glow rojo. Mito en texto grande. Reality items en verde.
function ErrorCard({ content }: { content: string }) {
  const { belief, items } = parseError(content)
  const icons = ['📉', '📈', '🎯']

  return (
    <div style={{ ...card, background: C.dark, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>FinoMik</span>
        <span style={{ background: 'rgba(232,69,69,0.15)', border: '1px solid rgba(232,69,69,0.4)', color: C.red, fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 100 }}>
          Error común
        </span>
      </div>

      {/* Main */}
      <div style={{ padding: '18px 28px', flex: 1, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.red, marginBottom: 8 }}>El error</div>
        <div style={{
          fontSize: belief.length > 60 ? 18 : 21, fontWeight: 900, color: C.white, lineHeight: 1.25, marginBottom: 20,
          paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: C.red, background: 'rgba(232,69,69,0.12)', border: '1px solid rgba(232,69,69,0.3)', width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, verticalAlign: 'middle' }}>✗</span>
          "{belief.length > 80 ? belief.slice(0, 80) + '…' : belief}"
        </div>

        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.green, marginBottom: 10 }}>✓ La realidad</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {(items.length > 0 ? items : ['La inflacion reduce el valor real de tu dinero', 'El interes compuesto solo trabaja si inviertes', 'Ahorrar + invertir + proteger es la estrategia real']).slice(0, 3).map((item, i) => (
            <div key={i} style={{ background: 'rgba(45,189,138,0.06)', border: '1px solid rgba(45,189,138,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icons[i]}</span>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#b0c4b0', lineHeight: 1.5 }}>
                {item.length > 90 ? item.slice(0, 90) + '…' : item}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>#FinanzasPersonales</span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>FinoMik</span>
      </div>
    </div>
  )
}

// ═══ CONCEPTO DEL MES ════════════════════════════════════════════════════════
// Navy. Patron de lineas diagonales. Nombre con acento amarillo. Steps con numeros amarillos.
function ConceptoCard({ content }: { content: string }) {
  const { concept, def, steps } = parseConcepto(content)
  const conceptWords = concept.split(' ')
  const lastWord = conceptWords[conceptWords.length - 1]
  const firstWords = conceptWords.slice(0, -1).join(' ')
  const month = new Date().toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('es-ES', { month: 'long' }).slice(1)

  return (
    <div style={{ ...card, background: C.navy, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Patron de lineas diagonales */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)`,
      }} />

      {/* Top */}
      <div style={{ padding: '22px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '5px 14px', fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.silver }}>
          📘 Concepto del mes
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 3, color: C.silver, textTransform: 'uppercase' }}>FinoMik</span>
      </div>

      {/* Hero: nombre del concepto */}
      <div style={{ padding: '0 28px 16px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.blue, marginBottom: 6 }}>Hoy aprendemos</div>
        <div style={{ fontSize: concept.length > 18 ? 28 : concept.length > 12 ? 34 : 40, fontWeight: 900, color: C.white, letterSpacing: -1, lineHeight: 1.05, marginBottom: 14 }}>
          {firstWords && <>{firstWords}<br /></>}
          <span style={{ color: C.yellow }}>{lastWord}</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.mist, lineHeight: 1.65, fontWeight: 400, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {def.length > 120 ? def.slice(0, 120) + '…' : def}
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: '0 28px', flex: 1, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(steps.length > 0 ? steps : ['Aprende el concepto con casos reales', 'Practica en simulaciones del aula', 'Aplica la decision financiera correcta']).slice(0, 3).map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 900, color: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.mist, lineHeight: 1.5, paddingTop: 4 }}>
              {step.length > 80 ? step.slice(0, 80) + '…' : step}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ padding: '14px 28px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.yellow }}>Aprende mas en FinoMik →</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.blue }}>#{concept.split(' ')[0]}</span>
      </div>
    </div>
  )
}

// ─── Mapa ─────────────────────────────────────────────────────────────────────
const CARDS: Record<string, React.ComponentType<{ content: string }>> = {
  nueva_funcionalidad: FuncionalidadCard,
  noticia_financiera:  NoticiaCard,
  frase_iconica:       FraseCard,
  dato_impactante:     DatoCard,
  error_financiero:    ErrorCard,
  concepto_mes:        ConceptoCard,
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface Props { type: string; content: string }

export default function VisualCard({ type, content }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

  async function handleExport() {
    if (!cardRef.current) return
    await document.fonts.ready
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: null, logging: false })
    const link = document.createElement('a')
    link.download = `finomik_${type}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const Card = CARDS[type]
  if (!Card) return null

  return (
    <motion.div className="space-y-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}>
      <div ref={cardRef} className="rounded-2xl overflow-hidden shadow-xl inline-block w-full">
        <Card content={content} />
      </div>
      <motion.button onClick={handleExport} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="w-full py-3 rounded-xl text-sm font-bold bg-finomik-blue text-white hover:bg-finomik-blue-mid transition-colors">
        Exportar PNG para LinkedIn
      </motion.button>
    </motion.div>
  )
}
