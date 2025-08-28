import { Router } from 'express'
import * as restaurant from '../controllers/restaurant.js'

const router = Router()

// 取得所有餐廳（從環保署API）
router.get('/', restaurant.get)

// 根據城市取得餐廳
router.get('/city/:city', restaurant.getByCity)

// 搜尋餐廳（可選城市和關鍵字）
router.get('/search', restaurant.search)

// 清除快取（用於管理）
router.delete('/cache', restaurant.clearCacheEndpoint)

export default router