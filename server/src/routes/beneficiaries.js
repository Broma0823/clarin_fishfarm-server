import { Router } from 'express'
import {
  createBeneficiary,
  listBeneficiaries,
  deleteBeneficiary,
  updateBeneficiary,
  searchSimilarNames,
  getBeneficiaryByName,
} from '../controllers/beneficiariesController.js'

const router = Router()

router.get('/', listBeneficiaries)
router.get('/search-similar', searchSimilarNames)
router.get('/by-name', getBeneficiaryByName)
router.post('/', createBeneficiary)
router.put('/:id', updateBeneficiary)
router.delete('/:id', deleteBeneficiary)

export default router


