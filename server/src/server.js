import { createApp } from './app.js'
import { env } from './config/env.js'
import { pool } from './db/pool.js'

const app = createApp()

const start = async () => {
  try {
    console.log('🔌 Attempting to connect to database...')
    console.log(`   Database URL: ${env.databaseUrl.replace(/:[^:@]+@/, ':****@')}`)
    
    await pool.query('SELECT 1')
    console.log('✅ Database connection successful!')
    
    app.listen(env.port, () => {
      console.log(`🚀 BFAR API listening on http://localhost:${env.port}`)
      console.log(`📊 API endpoint: http://localhost:${env.port}/api`)
    })
  } catch (error) {
    console.error('\n❌ Unable to start server!\n')
    console.error('Error details:')
    console.error('─'.repeat(50))
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ PostgreSQL is not running or not accessible')
      console.error('   → Make sure PostgreSQL service is running')
      console.error('   → Check if PostgreSQL is on port 5432')
    } else if (error.code === '28P01' || error.message.includes('password')) {
      console.error('❌ Database authentication failed')
      console.error('   → Check your username and password in server/.env')
      console.error('   → Current DATABASE_URL:', env.databaseUrl.replace(/:[^:@]+@/, ':****@'))
    } else if (error.code === '3D000' || error.message.includes('does not exist')) {
      console.error('❌ Database does not exist')
      console.error('   → Create the database: CREATE DATABASE bfar_db;')
      console.error('   → Or update DATABASE_URL in server/.env to use an existing database')
    } else {
      console.error('Error:', error.message)
      console.error('Code:', error.code)
    }
    
    console.error('─'.repeat(50))
    console.error('\nFull error:', error)
    console.error('\n💡 Troubleshooting tips:')
    console.error('   1. Make sure PostgreSQL is installed and running')
    console.error('   2. Check server/.env file has correct DATABASE_URL')
    console.error('   3. Verify database exists: psql -U postgres -c "\\l"')
    console.error('   4. Create database if needed: CREATE DATABASE bfar_db;')
    
    process.exit(1)
  }
}

start()


