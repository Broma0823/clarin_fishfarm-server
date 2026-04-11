import { Router } from 'express'
import {
  listDistributions,
  createDistribution,
  updateDistribution,
  deleteDistribution,
} from '../controllers/distributionsController.js'

const router = Router()

router.get('/', listDistributions)
router.post('/', createDistribution)
router.put('/:id', updateDistribution)
router.delete('/:id', deleteDistribution)

export default router

