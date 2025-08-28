// Router 是用來建立一組路由的工具 (用它把路徑跟功能一一綁定起來)
import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import * as restaurant from '../controllers/restaurant.js'
import upload from '../middlewares/upload.js'

// 呼叫 Router() 這個功能，建立一個新的路由器物件 router，用來管理這一組關於餐廳的路由設定
const router = Router()

// 設定一個「GET 請求」的路由，路徑是 /（根路徑），當有人發送 GET / 時，會呼叫 restaurant.get 這個函式來處理
router.get('/', restaurant.get)

// 設定一個「GET 請求」路徑是 /all
// auth.token → 會檢查使用者有沒有帶 token（登入狀態）
// auth.admin.restaurant.getAll → 只有管理員可以使用的功能，取得全部餐廳資料
router.get('/all', auth.token, auth.admin, restaurant.getAll)

/* 
  設定「GET 請求」路徑是 /:id（動態路徑）
  當有人用 /123 或其他 id 訪問，會呼叫 restaurant.getId 去取得指定 id 的餐廳資料。
*/
// 這裡的 :id 是一個參數，會帶入對應的餐廳 id。
router.get('/:id', restaurant.getId)

/* 

  設定「POST 請求」路徑是 /，

  auth.token → 驗證登入狀態

  auth.admin → 只有管理員能做這件事

  upload → 處理檔案上傳（照片等等）

  restaurant.create → 真的執行新增餐廳的功能
*/
router.post('/', auth.token, auth.admin, upload, restaurant.create)

/* 
  設定「PATCH 請求」路徑是 /:id，

  也是驗證登入跟管理員權限

  處理上傳

  最後呼叫 restaurant.update 來更新指定餐廳資料
*/
router.patch('/:id', auth.token, auth.admin, upload, restaurant.update)

export default router
