import { Router } from 'express'
import beneficiariesRouter from './beneficiaries.js'
import statsRouter from './stats.js'
import uploadsRouter from './uploads.js'

const router = Router()

router.use('/beneficiaries', beneficiariesRouter)
router.use('/stats', statsRouter)
router.use('/uploads', uploadsRouter)

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy' })
})

export default router


