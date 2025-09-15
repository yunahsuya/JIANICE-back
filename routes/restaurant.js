import { Router } from 'express'
import * as restaurantController from '../controllers/restaurant.js'

const router = Router()

// 取得所有餐廳
router.get('/', restaurantController.get)

// 根據城市篩選餐廳
router.get('/city/:city', restaurantController.getByCity)

// 根據食物類型篩選餐廳
router.get('/category/:category', restaurantController.getByCategory)

// 根據城市和食物類型篩選餐廳
router.get('/city/:city/category/:category', restaurantController.getByCityAndCategory)

// 搜尋餐廳
router.get('/search', restaurantController.search)

// 隨機選取餐廳
router.get('/random', restaurantController.getRandom)

// 清除快取
router.delete('/cache', restaurantController.clearCacheEndpoint)

export default router