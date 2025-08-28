import { Router } from 'express'
import * as hpaNews from '../controllers/hpanews.js'

const router = Router()

// 當年全部
router.get('/', hpaNews.getAllNews)

// 當年 + (可選) 關鍵字（建議前端統一用這支）
router.get('/search', hpaNews.searchNews)

// 當年（別名）
router.get('/latest', hpaNews.getLatestNews)

// 清除快取（可選，用於管理）
router.delete('/cache', hpaNews.clearCacheEndpoint)

export default router
