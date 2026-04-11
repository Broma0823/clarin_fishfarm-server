import { Router } from 'express'
import {
  listMonitoringParameters,
  getMonitoringParameter,
  createMonitoringParameter,
  updateMonitoringParameter,
  deleteMonitoringParameter,
  getLatestParameters,
} from '../controllers/monitoringController.js'

const router = Router()

router.get('/', listMonitoringParameters)
router.get('/latest', getLatestParameters)
router.get('/:id', getMonitoringParameter)
router.post('/', createMonitoringParameter)
router.put('/:id', updateMonitoringParameter)
router.delete('/:id', deleteMonitoringParameter)

export default router

