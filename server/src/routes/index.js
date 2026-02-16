import { Router } from 'express'
import beneficiariesRouter from './beneficiaries.js'
import distributionsRouter from './distributions.js'
import statsRouter from './stats.js'
import uploadsRouter from './uploads.js'
import monitoringRouter from './monitoring.js'

const router = Router()

router.use('/beneficiaries', beneficiariesRouter)
router.use('/distributions', distributionsRouter)
router.use('/stats', statsRouter)
router.use('/uploads', uploadsRouter)
router.use('/monitoring', monitoringRouter)

router.get('/health', (_req, res) => {
  res.json({ status: 'healthy' })
})

export default router


