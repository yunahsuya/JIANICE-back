import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import * as diary from '../controllers/diary.js'
import upload from '../middlewares/upload.js'

const router = Router()

// 🔒 取得公開日記（需登入）
router.get('/', diary.get)

// 🔒 取得所有日記（需登入）
router.get('/all', auth.token, diary.getAll)

// 🔒 取得某篇日記（需登入）
router.get('/:id', diary.getId)

// 📝 新增日記（需登入 + 上傳圖片）
router.post('/', auth.token, upload, diary.create)

// 🛠️ 更新日記（需登入 + 上傳圖片）
router.patch('/:id', auth.token, upload, diary.update)

// 🔒 刪除日記（需登入）
router.delete('/:id', auth.token, diary.deleteDiary)

export default router
