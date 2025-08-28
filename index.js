// 整個 Express 伺服器的「啟動與設定總控」

// 2. 加入 .env 設定 + 連接 MongoDB
// dotenv/config：讓你可以在專案根目錄放 .env 檔，裡面寫像 DB_URL=mongodb://... 的環境變數
import 'dotenv/config'

// 1. 伺服器主體架構
import express from 'express'

// 2. 加入 .env 設定 + 連接 MongoDB
import mongoose from 'mongoose'

// 3. 加入中介函式（Middleware）
import { StatusCodes } from 'http-status-codes'

// 3. 加入中介函式（Middleware）
import cors from 'cors'

// 4. 設計路由資料夾與基礎架構
import userRouter from './routes/user.js'
import productRouter from './routes/product.js'
import orderRouter from './routes/order.js'

// 日記
import diaryRouter from './routes/diary.js'

// 餐廳
import restaurantRouter from './routes/restaurant.js'

// 健康新聞
// import newsdataRouter from './routes/newsdata.js'

// 國民健康署新聞 (測試用)
// import hpaNewsRouter from './routes/hpanews11.js'
import hpaNewsRouter from './routes/hpanews.js'

// 幫你處理「使用者要登入」時的驗證流程，本身不負責怎麼驗證，而是提供一個框架，讓你用各種策略（Strategy）去實作
import './passport.js'

// ------------------------------------- 2. 加入 .env 設定 + 連接 MongoDB -------------------------------
/* 
  環境變數與 MongoDB 連線設定
  
  import 'dotenv/config'
  import mongoose from 'mongoose'
*/
mongoose
  // mongoose.connect(...)：用 process.env.DB_URL 的連線字串連到 MongoDB 資料庫。
  .connect(process.env.DB_URL)
  // .then()：連線成功後印出成功訊息，並且設定一個安全選項 sanitizeFilter
  .then(() => {
    console.log('資料庫連線成功')
    // sanitizeFilter => Mongoose 裡面，是用來 避免用戶送來的查詢條件裡有不安全的內容，幫你自動「清理」那些可能會造成資料庫安全問題的字串或物件
    // 功能是什麼？ => 會把查詢裡面像是 $ 開頭的 MongoDB 操作符（例如 $ne、$gt 等）「過濾」掉，避免有人惡意利用這些操作符去做注入攻擊（Injection Attack）
    /* 
      為什麼要用它？
      因為你在寫 API 時，常常會讓使用者自己帶條件去查資料（例如前端送一個搜尋條件），如果沒有清理，壞人可能會故意塞入有害的 MongoDB 指令，造成資料被刪除、修改或資料庫當機。
    */
    //  告訴 Mongoose，啟用自動過濾查詢條件的功能，這樣在你用 .find()、.findOne() 等查詢時，Mongoose 會幫你把不安全的內容去除，讓你的資料庫更安全。
    /* 
      它是防止「查詢注入」的安全機制。

      把前端傳來的查詢條件裡面不該有的東西給過濾掉。

      幫助你維護資料庫的完整性和安全
    */
    mongoose.set('sanitizeFilter', true)
  })
  // .catch()：連線失敗印出錯誤，方便你知道連不上
  .catch((error) => {
    console.log('資料庫連線失敗')
    console.error('資料庫連線失敗', error)
  })

// ----------------------------------------- 1. 伺服器主體架構 -------------------------------------------

/* 
import express from 'express'
*/
//  建立 Express 伺服器主體
// 載入 Express 套件，建立一個叫 app 的伺服器實例，之後所有路由跟中介函式都會掛在它上面。
const app = express()

// ------------------------------------- 3. 加入中介函式（Middleware） --------------------------------------
/* 
  import { StatusCodes } from 'http-status-codes'
  import cors from 'cors'
*/
// 中介函式（Middleware）設定
// cors() => 幫你打開跨網域請求限制，讓前端不同網域能呼叫你的 API。
app.use(cors())

// express.json()：幫你把收到的 JSON 請求主體解析成 JS 物件，方便用 req.body 取用
app.use(express.json())

// 錯誤處理中介函式，會攔截 JSON 解析失敗（格式錯誤）的請求，回 400 錯誤給前端
app.use((error, req, res, _next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: 'JSON 格式錯誤',
  })
})

// ------------------------------------- 4. 設計路由資料夾與基礎架構 ------------------------------------

/* 
  import userRouter from './routes/user.js'
  import productRouter from './routes/product.js'
  import orderRouter from './routes/order.js'
  import diaryRouter from './routes/diary.js'
  import restaurantRouter from './routes/restaurant.js'
  import newsdataRouter from './routes/newsdata.js'
*/
// 這裡把你分好的各個功能路由（像是 user、product、order、日記、餐廳、新聞）都掛到對應路徑上
// 例如請求 /user 時，就會由 userRouter 裡面的規則負責處理
app.use('/user', userRouter)
app.use('/product', productRouter)
app.use('/order', orderRouter)

// 日記
app.use('/diary', diaryRouter)

// 餐廳
app.use('/restaurant', restaurantRouter)

// 健康新聞
// app.use('/newsdata', newsdataRouter)

// 國民健康署新聞
app.use('/hpanews', hpaNewsRouter)

// 處理未定義的路由
// 這行是「萬用路由」，會攔截所有前面沒定義的路由，回 404，提醒前端這條路徑不存在
app.all(/.*/, (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '找不到該路由',
  })
})

// ----------------------------------------- 6. 啟動伺服器 -------------------------------------------
// 讓伺服器開始監聽 4000 這個埠口，準備接受前端或其他服務的請求。
// 成功啟動會印出「伺服器啟動」的訊息。
app.listen(4000, () => {
  console.log('伺服器啟動')
})

/* 
  這段程式碼就像一座大樓的「大廳與電梯系統」：

  你先連好「水電」(資料庫連線)

  建立「大樓主體」(Express 伺服器)

  配置好「規則與管理員」(中介函式)

  將「各個房間」(路由) 安排好

  確保有人能找到路，沒路的地方會被告知「找不到」

  最後開門迎客（啟動伺服器）
*/
