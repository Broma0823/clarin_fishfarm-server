import { createApp } from './app.js'
import { env } from './config/env.js'
import { pool } from './db/pool.js'

const app = createApp()

const start = async () => {
  try {
    await pool.query('SELECT 1')
    app.listen(env.port, () => {
      console.log(`🚀 BFAR API listening on http://localhost:${env.port}`)
    })
  } catch (error) {
    console.error('Unable to start server:', error)
    process.exit(1)
  }
}

start()


