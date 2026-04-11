import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import apiRouter from './routes/index.js'

export const createApp = () => {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))

  app.get('/', (_req, res) => {
    res.json({
      name: 'BFAR Bohol API',
      status: 'ok',
      version: 'v1',
    })
  })

  app.use('/api', apiRouter)

  app.use((err, _req, res, _next) => {
    console.error('[api] error handler:', err)
    res.status(err.status || 500).json({
      error: err.message || 'Unexpected server error',
    })
  })

  return app
}


