import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env manually since we're in scripts folder
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bfar_db'
const dbName = dbUrl.split('/').pop().split('?')[0]

const { Client } = pg

const setupDatabase = async () => {
  console.log('🔧 Setting up database...')
  console.log(`   Target database: ${dbName}`)
  console.log(`   Connection: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`)
  
  // Try to connect to the target database first
  let client = new Client({ connectionString: dbUrl })
  
  try {
    await client.connect()
    console.log('✅ Connected to target database!')
    await client.end()
  } catch (error) {
    // If target database doesn't exist, try connecting to default postgres
    if (error.code === '3D000' || error.message.includes('does not exist')) {
      console.log('⚠️  Target database does not exist, attempting to create it...')
      await client.end().catch(() => {})
      
      const defaultUrl = dbUrl.replace(`/${dbName}`, '/postgres')
      client = new Client({ connectionString: defaultUrl })
      
      try {
        await client.connect()
        console.log('✅ Connected to PostgreSQL')
        
        // Check if database exists
        const checkDb = await client.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`,
          [dbName]
        )

        if (checkDb.rows.length === 0) {
          console.log(`📦 Creating database: ${dbName}...`)
          await client.query(`CREATE DATABASE ${dbName}`)
          console.log(`✅ Database "${dbName}" created successfully!`)
        } else {
          console.log(`✅ Database "${dbName}" already exists`)
        }
        await client.end()
      } catch (createError) {
        await client.end().catch(() => {})
        throw createError
      }
    } else {
      throw error
    }
  }

  // Now run migrations
  console.log('\n📋 Running migrations...')
  try {
    // Import and run migrations
    const { query } = await import('../src/db/pool.js')
    const fs = await import('fs')
    const path = await import('path')
    
    const migrationsDir = resolve(__dirname, '../db/migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      console.log(`⚙️  Running migration: ${file}`)
      await query(sql)
    }
    console.log('✅ All migrations applied')
  } catch (migrationError) {
    console.error('❌ Migration failed:', migrationError.message)
    throw migrationError
  }
  
  console.log('\n✨ Database setup complete!')
}

setupDatabase().catch((error) => {
  console.error('\n❌ Database setup failed:')
  if (error.code === 'ECONNREFUSED') {
    console.error('   → PostgreSQL is not running')
    console.error('   → Start PostgreSQL service from Windows Services')
    console.error('   → Or run: net start postgresql-x64-XX (replace XX with version)')
  } else if (error.code === '28P01' || error.message.includes('password')) {
    console.error('   → Authentication failed')
    console.error('   → Check username and password in server/.env')
    console.error(`   → Current URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`)
  } else if (error.code === '3D000') {
    console.error('   → Database does not exist and could not be created')
    console.error('   → Make sure you have permission to create databases')
  } else {
    console.error('   → Error:', error.message)
    console.error('   → Code:', error.code)
  }
  console.error('\nFull error:', error)
  process.exit(1)
})

