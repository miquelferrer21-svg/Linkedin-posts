import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import html2canvas from 'html2canvas'

// ─── Paleta (= CSS vars del HTML de referencia) ───────────────────────────────
const C = {
  n1: '#0B3064', n2: '#114076',
  s1: '#3C4C67', s2: '#3E5374',
  b1: '#5574A7', b2: '#8F9EB7', b3: '#C8D0DD',
  bg: '#D8DFEE', white: '#FFFFFF',
}

// ─── Canvas 1080×1080 escalado a 500×500 ─────────────────────────────────────
const SCALE = 500 / 1080
const WRAP: React.CSSProperties = { width: 500, height: 500, position: 'relative', overflow: 'hidden', flexShrink: 0 }
const CANVAS: React.CSSProperties = {
  width: 1080, height: 1080,
  transform: `scale(${SCALE})`, transformOrigin: 'top left',
  position: 'absolute', top: 0, left: 0,
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  fontFamily: "'Montserrat','Arial Black',sans-serif",
}

// ─── Onda SVG ─────────────────────────────────────────────────────────────────
function Wave({ f1, f2 }: { f1: string; f2: string }) {
  return (
    <div style={{ flexShrink: 0, lineHeight: 0 }}>
      <svg viewBox="0 0 1080 150" preserveAspectRatio="none" style={{ display: 'block', width: 1080, height: 150 }}>
        <path d="M0 96 C300 44 600 112 900 70 C990 56 1044 76 1080 66 L1080 150 L0 150Z" fill={f1} />
        <path d="M0 114 C300 66 600 128 900 90 C990 76 1044 94 1080 84 L1080 150 L0 150Z" fill={f2} opacity={0.48} />
      </svg>
    </div>
  )
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
function ls(md: string) { return md.split('\n').map(s => s.trim()).filter(Boolean) }
function clean(s: string) { return s.replace(/^[\p{Emoji}\s→•·\-–—:*#]+/u, '').replace(/\*\*/g, '').trim() }
function currentDate() {
  const d = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return d.charAt(0).toUpperCase() + d.slice(1)
}
function currentMonth() {
  const m = new Date().toLocaleDateString('es-ES', { month: 'long' })
  return m.charAt(0).toUpperCase() + m.slice(1)
}

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseFeat(md: string) {
  const lines = ls(md)
  const feat = clean(lines[0] || '').replace(/^Nueva función(?:\s+en\s+FinoMik)?:\s*/i, '')
  const desc = clean(lines.find(l => l.match(/permite|ahora|puedes|puede|A partir/i) && l.length > 20) || lines[1] || '')
  const features = lines.filter(l => l.match(/^[•\-*]|^\d+\./) && l.length > 8).map(clean).slice(0, 3)
  return { feat, desc, features }
}

function parseNoticia(md: string) {
  const lines = ls(md)
  const headline = clean(lines[0] || '')
  const source = lines.find(l => l.match(/banco|ocde|ine|cnmv|financial|bloomberg|reuters|expansión/i) && l.length < 80) || ''
  const body = lines.filter(l => l !== lines[0] && l !== source && !l.match(/^[#]|#\w/) && l.length > 30).slice(0, 3).join(' ')
  const insight = lines.find(l => l.toLowerCase().includes('finomik') || l.match(/¿sab|entend|aprend/i)) || ''
  const hashtag = lines.find(l => l.startsWith('#')) || '#EducaciónFinanciera'
  return { headline, source: clean(source), body, insight: clean(insight), hashtag }
}

function parseFrase(md: string) {
  const lines = ls(md)
  let quote = '', authorLine = ''
  for (const l of lines) {
    const qm = l.match(/[""]([^""]{10,})[""]/u)
    if (qm && !quote) { quote = qm[1]; continue }
    if (l.match(/^[–—-]\s*/) && !authorLine) { authorLine = l.replace(/^[–—-]\s*/, '').trim(); continue }
  }
  const parts = authorLine.split(/[,·]/)
  const authorName = (parts[0] || 'Autor').trim()
  const authorRole = (parts[1] || '').trim()
  const initials = authorName.split(' ').slice(0, 2).map((w: string) => w[0] || '').join('').toUpperCase() || 'FM'
  return { quote: quote || '', authorName, authorRole, initials }
}

function parseDato(md: string) {
  const lines = ls(md)
  const statLine = lines.find(l => l.match(/[+-]?\d+\s*(?:de\s*cada\s*\d+|%|€|\$|k€)/i) && l.length < 60) || ''
  const m = statLine.match(/^([+-]?[\d]+(?:[,.][\d]+)?(?:k)?)\s*(de\s*cada\s*\d+|%|€|\$|k€|[a-zA-Z€$%]*)/i)
  const statMain = m ? m[1] : (statLine.split(' ')[0] || '?')
  const statEmphasis = m ? m[2] : ''
  const statIdx = statLine ? lines.indexOf(statLine) : -1
  const statLabel = statIdx >= 0 && lines[statIdx + 1] ? clean(lines[statIdx + 1]) : clean(lines[1] || '')
  const context = lines.find(l => l.length > 60 && !l.match(/^[#]|#\w/) && l !== statLine && clean(l) !== statLabel) || ''
  const source = lines.find(l => l.match(/fuente:|ocde|ine|banco de españa|pisa/i)) || ''
  return { statMain, statEmphasis, statLabel: statLabel.slice(0, 80), context: clean(context), source: clean(source) }
}

type ErrorData = {
  bigNum: string; problemLabel: string; explanation: string
  impactTitle: string; impactTitle2: string
  impacts: Array<{ title: string; text: string }>
  solutionTitle: string; solutionTitle2: string
  solutions: Array<{ title: string; text: string }>
}
function parseError(md: string): ErrorData {
  const lines = ls(md)
  const bigNumLine = lines.find(l => l.match(/[+-]?\d+\s*(?:%|€|\$|k€)/i) && l.length < 50) || ''
  const bigNum = clean(bigNumLine) || '?'
  const problemLabel = lines.find(l => l.length > 20 && l.length < 120 && l !== bigNumLine && !l.match(/^[#]|#\w|finomik/i)) || ''
  const explanation = lines.find(l => l.length > 60 && l !== problemLabel && !l.match(/^[#]|#\w/)) || ''
  const itemLines = lines.filter(l => l.match(/^\d+\.|^•|^-|^✅|^❌/) && l.length > 15)
  function toItem(l: string): { title: string; text: string } {
    const c = clean(l)
    const ci = c.indexOf(':')
    if (ci > 0 && ci < 40) return { title: c.slice(0, ci).trim(), text: c.slice(ci + 1).trim() }
    const si = c.indexOf(' ', 15)
    return { title: c.slice(0, si > 0 ? si : 30), text: c.slice(si > 0 ? si : 30).trim() }
  }
  const impacts = itemLines.length >= 3
    ? itemLines.slice(0, 3).map(toItem)
    : [
        { title: 'Inflación silenciosa', text: 'El poder adquisitivo se erosiona sin que lo notes.' },
        { title: 'Sin compensación', text: 'La mayoría de cuentas ofrecen un 0% de interés.' },
        { title: 'Efecto acumulado', text: 'En 10 años el daño puede ser miles de euros.' },
      ]
  const solLines = lines.filter(l => l.match(/^✅|^✓|^→/) && l.length > 15)
  const solutions = solLines.length >= 3
    ? solLines.slice(0, 3).map(toItem)
    : [
        { title: 'Fondo de emergencia', text: 'Mantén 3-6 meses de gastos en cuenta remunerada.' },
        { title: 'El resto, invirtiendo', text: 'Lo que no necesitas a corto plazo puede trabajar para ti.' },
        { title: 'Empieza con poco', text: '50€/mes con interés compuesto supera miles parados.' },
      ]
  return {
    bigNum, problemLabel: clean(problemLabel), explanation: clean(explanation),
    impactTitle: 'Lo que no ves', impactTitle2: 'el coste invisible',
    impacts, solutionTitle: 'La alternativa', solutionTitle2: 'inteligente', solutions,
  }
}

function parseConcepto(md: string) {
  const lines = ls(md)
  const concept = clean(lines[0] || '').replace(/^El concepto de [^:]+:\s*/i, '').replace(/^Concepto:\s*/i, '')
  const def = clean(lines.find(l => l.includes('📌')) || lines.find(l => l.length > 40 && l !== lines[0] && !l.match(/^[#]|#\w/)) || '')
  const steps = lines.filter(l => l.match(/^\d+\./)).slice(0, 3).map(l => clean(l.replace(/^\d+\.\s*/, '')))
  const pills = lines.filter(l => l.match(/^[A-ZÁÉÍÓÚ][\w\s]{2,18}$/u) && l.length < 22 && l !== lines[0]).slice(0, 3)
  const mLine = lines.find(l => l.match(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i))
  const mRaw = mLine?.match(/enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i)?.[0] || ''
  const month = mRaw ? mRaw.charAt(0).toUpperCase() + mRaw.slice(1) : currentMonth()
  return { concept, def, steps, pills, month }
}

// ══════════════════════════════════════════════════════════════════════════════
// 01 · NUEVA FUNCIONALIDAD
// ══════════════════════════════════════════════════════════════════════════════
function FuncA({ content }: { content: string }) {
  const { feat, desc } = parseFeat(content)
  const words = feat.split(' ')
  const last = words[words.length - 1]; const rest = words.slice(0, -1).join(' ')
  return (
    <div style={{ ...CANVAS, background: C.n1 }}>
      <div style={{ flex: 1, padding: '96px 96px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,.2)', borderRadius: 40, padding: '10px 28px', fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b3, width: 'fit-content', marginBottom: 52, flexShrink: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.b3 }} />Nueva función
        </div>
        <h2 style={{ fontSize: 82, fontWeight: 900, color: C.white, lineHeight: 1.05, margin: '0 0 28px', flexShrink: 0 }}>
          {rest && <>{rest}<br /></>}<em style={{ fontStyle: 'normal', color: C.b2 }}>{last}</em>
        </h2>
        <p style={{ fontSize: 30, color: C.b3, lineHeight: 1.6, marginBottom: 36, maxWidth: 620, flexShrink: 0, margin: '0 0 36px' }}>{desc}</p>
        <div style={{ background: C.n2, borderRadius: 14, border: `1px solid ${C.s2}`, overflow: 'hidden', flexShrink: 0, width: 680 }}>
          <div style={{ height: 48, background: C.n1, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 10 }}>
            {[C.b1, C.s2, C.b2].map((bg, i) => <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: bg }} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, padding: 18 }}>
            {[['60%','80%','55%'],['80%','50%','80%'],['65%','85%']].map((ws, ci) => (
              <div key={ci} style={{ flex: 1, background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ws.map((w, i) => <div key={i} style={{ height: 7, borderRadius: 4, background: (ci === 0 && i === 0) || (ci === 1 && i === 1) ? C.b1 : C.s2, width: w }} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Wave f1={C.s2} f2={C.s1} />
      <div style={{ position: 'absolute', bottom: 36, left: 96, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.s2, zIndex: 2 }}>FINOMIK</div>
      <div style={{ position: 'absolute', bottom: 64, right: 80, width: 96, height: 96, borderRadius: '50%', background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: '0 6px 24px rgba(0,0,0,.22)' }}>
        <div style={{ width: 0, height: 0, borderLeft: `38px solid ${C.n1}`, borderTop: '22px solid transparent', borderBottom: '22px solid transparent', marginLeft: 8 }} />
      </div>
    </div>
  )
}

function FuncB({ content }: { content: string }) {
  const { feat, desc, features } = parseFeat(content)
  const words = feat.split(' ')
  const last = words[words.length - 1]; const rest = words.slice(0, -1).join(' ')
  const feats = features.length > 0 ? features : ['Gestión inteligente del aula', 'Informes exportables', 'Seguimiento por alumno']
  return (
    <div style={{ ...CANVAS, background: C.white }}>
      <div style={{ height: 14, background: C.n1, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '72px 96px', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -16, top: -40, fontSize: 380, fontWeight: 900, color: C.b3, opacity: .18, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>01</div>
        <div style={{ display: 'inline-block', background: C.n1, color: C.white, fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '10px 28px', borderRadius: 28, width: 'fit-content', marginBottom: 44, flexShrink: 0, position: 'relative' }}>Nueva función</div>
        <h2 style={{ fontSize: 78, fontWeight: 900, color: C.n1, lineHeight: 1.05, margin: '0 0 26px', flexShrink: 0, position: 'relative' }}>
          {rest && <>{rest}<br /></>}<span style={{ color: C.b1 }}>{last}</span>
        </h2>
        <p style={{ fontSize: 30, color: C.s1, lineHeight: 1.6, maxWidth: 660, marginBottom: 44, flexShrink: 0, position: 'relative', margin: '0 0 44px' }}>{desc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flexShrink: 0, position: 'relative' }}>
          {feats.slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.n1, flexShrink: 0 }} />
              <span style={{ fontSize: 29, fontWeight: 600, color: C.s1 }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 36, borderTop: `2px solid ${C.b3}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.n1 }}>FINOMIK</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.b1 }}>Ver demo →</div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 02 · NOTICIA FINANCIERA
// ══════════════════════════════════════════════════════════════════════════════
function NoticiaA({ content }: { content: string }) {
  const { headline, source, body, insight } = parseNoticia(content)
  return (
    <div style={{ ...CANVAS, background: C.n1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '44px 80px', borderBottom: `2px solid ${C.n2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.white, letterSpacing: 4 }}>FINOMIK</div>
        <div style={{ fontSize: 20, color: C.b2, fontWeight: 600, letterSpacing: 1 }}>{currentDate()} · Actualidad</div>
      </div>
      <div style={{ flex: 1, padding: '48px 80px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {source && <div style={{ display: 'inline-block', background: C.s2, color: C.b3, fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '10px 24px', borderRadius: 6, width: 'fit-content', marginBottom: 36, flexShrink: 0 }}>📎 {source.slice(0, 30)}</div>}
        <h2 style={{ fontSize: headline.length > 80 ? 44 : 54, fontWeight: 900, color: C.white, lineHeight: 1.2, margin: '0 0 30px', flexShrink: 0 }}>{headline}</h2>
        <div style={{ width: 72, height: 5, background: C.b1, borderRadius: 3, marginBottom: 30, flexShrink: 0 }} />
        <div style={{ fontSize: 28, color: C.b3, lineHeight: 1.7, overflow: 'hidden', flex: 1 }}>{body.slice(0, 260)}{body.length > 260 ? '…' : ''}</div>
        {insight && <div style={{ marginTop: 36, padding: '28px 36px', background: C.n2, borderLeft: `6px solid ${C.b1}`, borderRadius: '0 10px 10px 0', fontSize: 26, fontWeight: 600, color: C.b2, flexShrink: 0 }}>💡 {insight.slice(0, 130)}</div>}
      </div>
    </div>
  )
}

function NoticiaB({ content }: { content: string }) {
  const { headline, source, body, hashtag } = parseNoticia(content)
  return (
    <div style={{ ...CANVAS, background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.n1, padding: '38px 68px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.white, letterSpacing: 4 }}>FINOMIK</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.b3, letterSpacing: 1, textTransform: 'uppercase' }}>Análisis propio</div>
      </div>
      <div style={{ flex: 1, margin: 36, background: C.white, borderRadius: 20, padding: 52, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {source && <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b1, marginBottom: 26, flexShrink: 0 }}>{source.slice(0, 30)}</div>}
        <h2 style={{ fontSize: headline.length > 80 ? 38 : 48, fontWeight: 900, color: C.n1, lineHeight: 1.2, margin: '0 0 26px', flexShrink: 0 }}>{headline}</h2>
        <div style={{ width: 56, height: 5, background: C.n1, borderRadius: 3, marginBottom: 26, flexShrink: 0 }} />
        <div style={{ fontSize: 27, color: C.s1, lineHeight: 1.7, overflow: 'hidden', flex: 1 }}>{body.slice(0, 290)}{body.length > 290 ? '…' : ''}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 28, borderTop: `2px solid ${C.b3}`, flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.b2 }}>finomik.com</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.b1 }}>{hashtag}</div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 03 · FRASE ICÓNICA
// ══════════════════════════════════════════════════════════════════════════════
function FraseA({ content }: { content: string }) {
  const { quote, authorName, authorRole, initials } = parseFrase(content)
  const fs = quote.length > 120 ? 52 : quote.length > 80 ? 62 : 68
  return (
    <div style={{ ...CANVAS, background: C.n1, padding: '96px 100px', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 200, fontWeight: 900, color: C.s2, lineHeight: .8, fontFamily: 'Georgia,serif', flexShrink: 0 }}>"</div>
      <blockquote style={{ fontSize: fs, fontWeight: 800, fontStyle: 'italic', color: C.white, lineHeight: 1.35, flex: 1, display: 'flex', alignItems: 'center', padding: '32px 0', margin: 0 }}>"{quote}"</blockquote>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36, paddingTop: 48, borderTop: `2px solid ${C.s2}`, flexShrink: 0 }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: C.s2, border: `4px solid ${C.b1}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: C.white, flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.white }}>{authorName || 'Autor'}</div>
          {authorRole && <div style={{ fontSize: 24, color: C.b2, marginTop: 8 }}>{authorRole.slice(0, 50)}</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 40, right: 80, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.s2 }}>FINOMIK</div>
    </div>
  )
}

function FraseB({ content }: { content: string }) {
  const { quote, authorName, authorRole, initials } = parseFrase(content)
  const fs = quote.length > 120 ? 56 : quote.length > 80 ? 64 : 72
  return (
    <div style={{ ...CANVAS, background: C.white, padding: '96px 100px', justifyContent: 'space-between', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: C.n1 }} />
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.b1, flexShrink: 0 }}>Frase de la semana</div>
      <blockquote style={{ fontSize: fs, fontWeight: 900, color: C.n1, lineHeight: 1.3, flex: 1, display: 'flex', alignItems: 'center', padding: '32px 0', margin: 0 }}>"{quote}"</blockquote>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, paddingTop: 44, borderTop: `2px solid ${C.b3}`, flexShrink: 0 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: C.white, flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.n1 }}>{authorName || 'Autor'}</div>
          {authorRole && <div style={{ fontSize: 24, color: C.b2, marginTop: 8 }}>{authorRole.slice(0, 50)}</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 40, right: 80, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.b2 }}>FINOMIK</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 04 · DATO IMPACTANTE
// ══════════════════════════════════════════════════════════════════════════════
function DatoA({ content }: { content: string }) {
  const { statMain, statEmphasis, statLabel, context, source } = parseDato(content)
  return (
    <div style={{ ...CANVAS, background: C.n1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', border: '80px solid rgba(255,255,255,.04)', top: -140, right: -140, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', border: '54px solid rgba(255,255,255,.03)', bottom: 160, left: -100, pointerEvents: 'none' }} />
      <div style={{ flex: 1, padding: '86px 96px 40px', display: 'flex', flexDirection: 'column', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: C.b2, marginBottom: 36, flexShrink: 0 }}>¿Sabías que…?</div>
        <div style={{ fontSize: 216, fontWeight: 900, color: C.white, lineHeight: .85, marginBottom: 16, flexShrink: 0 }}>
          {statMain}<em style={{ fontStyle: 'normal', color: C.b2 }}>{statEmphasis ? ` ${statEmphasis}` : ''}</em>
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, color: C.b3, marginBottom: 36, lineHeight: 1.2, maxWidth: 780, flexShrink: 0 }}>{statLabel}</div>
        <div style={{ fontSize: 27, color: C.b2, lineHeight: 1.7, overflow: 'hidden', flex: 1 }}>{context.slice(0, 220)}{context.length > 220 ? '…' : ''}</div>
        {source && <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.s2, marginTop: 20, flexShrink: 0 }}>Fuente: {source.slice(0, 60)}</div>}
      </div>
      <div style={{ background: C.n2, padding: '32px 96px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.white }}>FINOMIK</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.b2 }}>Por eso existimos →</div>
      </div>
    </div>
  )
}

function DatoB({ content }: { content: string }) {
  const { statMain, statEmphasis, statLabel, context, source } = parseDato(content)
  return (
    <div style={{ ...CANVAS, background: C.white, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 14, background: C.n1, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '64px 96px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: C.b1, marginBottom: 26, flexShrink: 0 }}>¿Sabías que…?</div>
        <div style={{ fontSize: 206, fontWeight: 900, color: C.n1, lineHeight: .85, marginBottom: 16, flexShrink: 0 }}>
          <em style={{ fontStyle: 'normal', color: C.b1 }}>{statMain}</em>{statEmphasis || ''}
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.s1, marginBottom: 30, lineHeight: 1.2, maxWidth: 760, flexShrink: 0 }}>{statLabel}</div>
        <div style={{ fontSize: 27, color: C.b2, lineHeight: 1.7, overflow: 'hidden', flex: 1 }}>{context.slice(0, 220)}{context.length > 220 ? '…' : ''}</div>
        {source && <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: C.b3, marginTop: 20, flexShrink: 0 }}>Fuente: {source.slice(0, 60)}</div>}
      </div>
      <Wave f1={C.n1} f2={C.n2} />
      <div style={{ position: 'absolute', bottom: 32, left: 96, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: 'rgba(255,255,255,.9)', zIndex: 3 }}>FINOMIK</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 05 · ERROR FINANCIERO — 3 diapositivas
// ══════════════════════════════════════════════════════════════════════════════
function ErrSlide1({ data, bg }: { data: ErrorData; bg: string }) {
  const { bigNum, problemLabel, explanation } = data
  const m = bigNum.match(/^([+-]?\d+)(.*?)$/)
  const nMain = m ? m[1] : bigNum; const nSuf = m ? m[2] : ''
  return (
    <div style={{ ...CANVAS, background: bg, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', border: '80px solid rgba(255,255,255,.04)', top: -200, right: -200, pointerEvents: 'none' }} />
      <div style={{ flex: 1, padding: '80px 96px 36px', display: 'flex', flexDirection: 'column', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 40, padding: '10px 28px', fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b3, width: 'fit-content', marginBottom: 32, flexShrink: 0 }}>⚠ Error financiero</div>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b2, marginBottom: 20, flexShrink: 0 }}>1 de 3 · El problema</div>
        <div style={{ fontSize: 240, fontWeight: 900, color: C.white, lineHeight: .85, flexShrink: 0, marginBottom: 10 }}>
          {nMain}<em style={{ fontStyle: 'normal', color: C.b3 }}>{nSuf}</em>
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, color: C.b3, lineHeight: 1.2, maxWidth: 800, marginBottom: 32, flexShrink: 0 }}>{problemLabel}</div>
        <div style={{ fontSize: 27, color: 'rgba(255,255,255,.65)', lineHeight: 1.65, overflow: 'hidden', flex: 1 }}>{explanation.slice(0, 200)}</div>
      </div>
      <div style={{ padding: '28px 96px', background: C.n1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.b2 }}>FINOMIK</div>
        <div style={{ fontSize: 20, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>1 / 3</div>
      </div>
    </div>
  )
}

function ErrSlide2({ data, bg }: { data: ErrorData; bg: string }) {
  const { impactTitle, impactTitle2, impacts } = data
  const t2 = impactTitle2 || ''
  return (
    <div style={{ ...CANVAS, background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: '80px 96px 36px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b2, marginBottom: 24, flexShrink: 0 }}>2 de 3 · Cómo te afecta</div>
        <h2 style={{ fontSize: 64, fontWeight: 900, color: C.white, lineHeight: 1.1, margin: '0 0 52px', flexShrink: 0 }}>{impactTitle}{t2 && <><br />{t2}</>}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, overflow: 'hidden', flex: 1 }}>
          {impacts.slice(0, 3).map((item, i) => (
            <div key={i} style={{ background: C.n2, borderRadius: 16, padding: '32px 36px', display: 'flex', alignItems: 'flex-start', gap: 28, flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, background: C.s2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: C.white, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
              <div>
                <strong style={{ display: 'block', fontSize: 28, color: C.white, marginBottom: 6, fontWeight: 700 }}>{item.title}</strong>
                <div style={{ fontSize: 27, color: C.b3, lineHeight: 1.5, fontWeight: 500 }}>{item.text.slice(0, 90)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.n2, padding: '28px 96px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.b2 }}>FINOMIK</div>
        <div style={{ fontSize: 20, color: C.s2, fontWeight: 600 }}>2 / 3</div>
      </div>
    </div>
  )
}

function ErrSlide3({ data }: { data: ErrorData }) {
  const { solutionTitle, solutionTitle2, solutions } = data
  const t2 = solutionTitle2 || ''
  return (
    <div style={{ ...CANVAS, background: C.white, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 14, background: C.n1, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '64px 96px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b1, marginBottom: 24, flexShrink: 0 }}>3 de 3 · Cómo hacerlo bien</div>
        <h2 style={{ fontSize: 64, fontWeight: 900, color: C.n1, lineHeight: 1.1, margin: '0 0 48px', flexShrink: 0 }}>{solutionTitle}{t2 && <><br />{t2}</>}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, overflow: 'hidden', flex: 1 }}>
          {solutions.slice(0, 3).map((sol, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexShrink: 0 }}>
              <div style={{ width: 60, height: 60, borderRadius: 12, background: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: C.white, flexShrink: 0, fontWeight: 700, marginTop: 2 }}>✓</div>
              <div>
                <strong style={{ display: 'block', fontSize: 28, color: C.n1, marginBottom: 6, fontWeight: 700 }}>{sol.title}</strong>
                <div style={{ fontSize: 27, color: C.s1, lineHeight: 1.5, fontWeight: 500 }}>{sol.text.slice(0, 90)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Wave f1={C.n1} f2={C.n2} />
      <div style={{ position: 'absolute', bottom: 32, left: 96, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: 'rgba(255,255,255,.9)', zIndex: 3 }}>FINOMIK</div>
      <div style={{ position: 'absolute', bottom: 32, right: 80, fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,.55)', zIndex: 3 }}>3 / 3</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 06 · CONCEPTO DEL MES
// ══════════════════════════════════════════════════════════════════════════════
function ConceptoA({ content }: { content: string }) {
  const { concept, def, steps, month } = parseConcepto(content)
  const words = concept.split(' ')
  const last = words[words.length - 1]; const rest = words.slice(0, -1).join(' ')
  const stps = steps.length > 0 ? steps : ['Entiende el concepto con ejemplos reales', 'Practica en el simulador del aula', 'Aplica la decisión financiera correcta']
  return (
    <div style={{ ...CANVAS, background: C.white, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: C.n1, padding: '64px 80px 52px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -52, bottom: -72, width: 240, height: 240, borderRadius: '50%', border: '38px solid rgba(255,255,255,.05)' }} />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.b2, marginBottom: 16 }}>Concepto del mes · {month}</div>
        <div style={{ fontSize: 80, fontWeight: 900, color: C.white, lineHeight: 1.05 }}>
          {rest && <>{rest}<br /></>}<em style={{ fontStyle: 'normal', color: C.b2 }}>{last}</em>
        </div>
      </div>
      <div style={{ flex: 1, padding: '48px 80px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: '#EEF2F8', borderRadius: 14, padding: '32px 36px', fontSize: 27, color: C.n1, fontWeight: 600, lineHeight: 1.5, marginBottom: 36, borderLeft: `6px solid ${C.n1}`, flexShrink: 0 }}>📌 {def.slice(0, 150)}</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.b2, marginBottom: 24, flexShrink: 0 }}>Cómo funciona</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, overflow: 'hidden' }}>
          {stps.slice(0, 3).map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ width: 54, height: 54, borderRadius: 10, background: C.n1, color: C.white, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
              <div style={{ fontSize: 27, color: C.s1, lineHeight: 1.5, fontWeight: 500 }}>{step.slice(0, 90)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#EEF2F8', padding: '28px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.n1 }}>FINOMIK</div>
        <div style={{ fontSize: 22, color: C.b2, fontWeight: 600 }}>Educación financiera real</div>
      </div>
    </div>
  )
}

function ConceptoB({ content }: { content: string }) {
  const { concept, def, pills, month } = parseConcepto(content)
  const words = concept.split(' ')
  const last = words[words.length - 1]; const rest = words.slice(0, -1).join(' ')
  const ps = pills.length > 0 ? pills : ['Ahorro', 'Seguridad', 'Planificación']
  return (
    <div style={{ ...CANVAS, background: C.n1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: '86px 96px 0', display: 'flex', flexDirection: 'column', zIndex: 2, overflow: 'hidden' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: C.s2, marginBottom: 20, flexShrink: 0 }}>Concepto del mes · {month}</div>
        <h2 style={{ fontSize: 82, fontWeight: 900, color: C.white, lineHeight: 1.05, margin: '0 0 36px', flexShrink: 0 }}>
          {rest && <>{rest}<br /></>}<em style={{ fontStyle: 'normal', color: C.b2 }}>{last}</em>
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 40, flexShrink: 0 }}>
          {ps.map((p, i) => <div key={i} style={{ background: C.n2, border: `1px solid ${C.s2}`, borderRadius: 40, padding: '12px 36px', fontSize: 22, fontWeight: 600, color: C.b3 }}>{p}</div>)}
        </div>
        <div style={{ background: C.n2, borderLeft: `6px solid ${C.b1}`, borderRadius: '0 14px 14px 0', padding: '32px 36px', fontSize: 28, color: C.b3, lineHeight: 1.6, fontWeight: 500, flexShrink: 0 }}>{def.slice(0, 180)}</div>
      </div>
      <Wave f1={C.s2} f2={C.s1} />
      <div style={{ position: 'absolute', bottom: 36, right: 80, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: 'rgba(255,255,255,.28)', zIndex: 3 }}>FINOMIK</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Mapas de versiones
// ══════════════════════════════════════════════════════════════════════════════
type CardComp = React.ComponentType<{ content: string }>
const CARDS_A: Record<string, CardComp> = {
  nueva_funcionalidad: FuncA,
  noticia_financiera: NoticiaA,
  frase_iconica: FraseA,
  dato_impactante: DatoA,
  concepto_mes: ConceptoA,
}
const CARDS_B: Record<string, CardComp> = {
  nueva_funcionalidad: FuncB,
  noticia_financiera: NoticiaB,
  frase_iconica: FraseB,
  dato_impactante: DatoB,
  concepto_mes: ConceptoB,
}

// ══════════════════════════════════════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════════════════════════════════════
interface Props { type: string; content: string }

export default function VisualCard({ type, content }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [version, setVersion] = useState<'A' | 'B'>('A')
  const [slide, setSlide] = useState(0)
  const isError = type === 'error_financiero'

  async function handleExport() {
    if (!cardRef.current) return
    await document.fonts.ready
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: null, logging: false })
    const link = document.createElement('a')
    link.download = `finomik_${type}_${version}${isError ? `_${slide + 1}` : ''}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!isError && !CARDS_A[type]) return null

  const errData = isError ? parseError(content) : null
  // Version B of error: slightly different bg colors
  const errBg1 = version === 'A' ? C.s1 : C.n2
  const errBg2 = version === 'A' ? C.n1 : C.s1

  const CardA = CARDS_A[type]
  const CardB = CARDS_B[type]
  const Card = version === 'A' ? CardA : CardB

  return (
    <motion.div className="space-y-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}>

      {/* Tarjeta */}
      <div ref={cardRef} style={{ ...WRAP, borderRadius: 16, boxShadow: '0 16px 48px rgba(11,48,100,.18)' }}>
        {isError && errData ? (
          slide === 0 ? <ErrSlide1 data={errData} bg={errBg1} /> :
          slide === 1 ? <ErrSlide2 data={errData} bg={errBg2} /> :
          <ErrSlide3 data={errData} />
        ) : (
          <Card content={content} />
        )}
      </div>

      {/* Controles versión A/B (no en error) */}
      {!isError && CardB && (
        <div className="flex gap-2">
          {(['A', 'B'] as const).map(v => (
            <button key={v} onClick={() => setVersion(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border ${version === v ? 'bg-finomik-blue text-white border-transparent' : 'bg-white text-finomik-blue border-finomik-gray-light hover:border-finomik-blue'}`}>
              Versión {v}
            </button>
          ))}
        </div>
      )}

      {/* Controles diapositivas (solo error) */}
      {isError && (
        <div className="flex gap-2 items-center">
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setSlide(i)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border ${slide === i ? 'bg-finomik-blue text-white border-transparent' : 'bg-white text-finomik-blue border-finomik-gray-light hover:border-finomik-blue'}`}>
              {i === 0 ? '1 · Problema' : i === 1 ? '2 · Impacto' : '3 · Solución'}
            </button>
          ))}
          <div className="flex gap-1 ml-2">
            {(['A', 'B'] as const).map(v => (
              <button key={v} onClick={() => setVersion(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${version === v ? 'bg-finomik-blue text-white border-transparent' : 'bg-white text-finomik-blue border-finomik-gray-light hover:border-finomik-blue'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exportar */}
      <motion.button onClick={handleExport} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-xl text-sm font-bold bg-finomik-blue text-white hover:bg-finomik-blue-mid transition-colors">
        Exportar PNG para LinkedIn
      </motion.button>

    </motion.div>
  )
}
