import { Router } from 'express'
import {
  getMonthlyProduction,
  getSummary,
  getMonthlyYearlyBreakdown,
} from '../controllers/statsController.js'

const router = Router()

router.get('/summary', getSummary)
router.get('/production', getMonthlyProduction)
router.get('/breakdown', getMonthlyYearlyBreakdown)

export default router


