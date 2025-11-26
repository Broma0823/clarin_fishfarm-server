import { Router } from 'express'
import {
  createBeneficiary,
  listBeneficiaries,
} from '../controllers/beneficiariesController.js'

const router = Router()

router.get('/', listBeneficiaries)
router.post('/', createBeneficiary)

export default router


