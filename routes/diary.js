import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import * as diary from '../controllers/diary.js'
import upload from '../middlewares/upload.js'

const router = Router()

// 取得公開日記（需登入）
router.get('/', auth.token, diary.get)

// 取得所有日記（需登入）
router.get('/all', auth.token, diary.getAll)

// 📝 新增日記（需登入 + 上傳圖片）
router.post('/', auth.token, upload, diary.create)

// 新增：分類管理路由（必須放在 /:id 路由之前）
router.get('/categories', auth.token, diary.getCustomCategories)
router.post('/categories', auth.token, diary.addCustomCategory)
router.delete('/categories/:category', auth.token, diary.deleteCustomCategory)

// 取得某篇日記（需登入）
router.get('/:id', auth.token, diary.getId)

//️ 更新日記（需登入 + 上傳圖片）
router.patch('/:id', auth.token, upload, diary.update)

// 🔒 刪除日記（需登入）
router.delete('/:id', auth.token, diary.deleteDiary)

export default router