import { Router } from 'express'
import * as report from '../controllers/report.js'

const router = Router()

// 創建回報訊息（公開，不需要登入）
router.post('/', report.create)

export default router
