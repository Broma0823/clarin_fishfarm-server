import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query } from '../src/db/pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.resolve(__dirname, '../db/migrations')

const run = async () => {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`⚙️  Running migration: ${file}`)
    await query(sql)
  }

  console.log('✅ All migrations applied')
  process.exit(0)
}

run().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})


