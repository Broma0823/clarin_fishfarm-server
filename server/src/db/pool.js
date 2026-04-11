import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl:
    env.databaseUrl.includes('localhost') || env.databaseUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
})

pool.on('error', (error) => {
  console.error('[postgres] unexpected error on idle client', error)
  process.exit(1)
})

export const query = (text, params) => pool.query(text, params)


