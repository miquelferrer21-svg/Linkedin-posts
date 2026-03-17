import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const outputsPath = process.env.AGENTS_OUTPUT_PATH
if (!outputsPath) {
  console.error('❌ AGENTS_OUTPUT_PATH not set in .env')
  process.exit(1)
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const VALID_TYPES = ['tendencias', 'angulos', 'contenido', 'report_semanal']

const dateDirs = readdirSync(outputsPath).filter(d => DATE_REGEX.test(d)).sort()

if (dateDirs.length === 0) {
  console.log('No date directories found in', outputsPath)
  process.exit(0)
}

for (const dateDir of dateDirs) {
  const dirPath = join(outputsPath, dateDir)
  console.log(`\n📅 Processing ${dateDir}...`)

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .upsert({ date: dateDir }, { onConflict: 'date' })
    .select('id')
    .single()

  if (sessionError) {
    console.error(`  ❌ Session error:`, sessionError.message)
    continue
  }

  const sessionId = session.id

  for (const type of VALID_TYPES) {
    const filePath = join(dirPath, `${type}.md`)
    if (!existsSync(filePath)) continue

    const content = readFileSync(filePath, 'utf-8')

    const { error } = await supabase
      .from('documents')
      .upsert(
        { session_id: sessionId, type, content },
        { onConflict: 'session_id,type' }
      )

    if (error) {
      console.error(`  ❌ Error upserting ${type}:`, error.message)
    } else {
      console.log(`  ✅ ${type}`)
    }
  }
}

console.log('\n✅ Sync complete.')
