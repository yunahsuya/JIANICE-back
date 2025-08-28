// API 本人 => 讓兩個系統可以講話的橋樑

/* 
  把 API 想像成「後端幫你準備好的一個網址」，
  這個網址會根據你用的方式（GET、POST、PUT、DELETE），來幫你做不同的事情 ✨
*/

/* 
  routes/product.js：定義「API 的路由」

  controllers/product.js：API 功能本人！

   index.js：主程式入口，啟動伺服器 & 使用路由

   🧩 地方     	                    在哪裡	                                  做什麼
      前端 Vue	                    axios.get('/api/products')	              去後端拿資料
      後端 routes/product.js	      router.get('/', getAll)	                  把 / 的 GET 請求交給 getAll
      後端 controllers/product.js 	getAll()	                                撈資料、回傳 JSON
      主程式 index.js	              app.use('/api/products', productRoutes)	  把路由裝進 Express 裡

    Vue ➡️ Axios ➡️ Express ➡️ Controller ➡️ Database ➡️ 然後又回來 Vue 畫出資料 💖
 */

/* 
    controllers 就是 API 功能本！人！

    💌 後端處理 API 的流程像這樣：
    1️⃣ 路由 router：「欸欸～有人按這個 API 喔！」
    2️⃣ 控制器 controller：「好！我來處理這個請求！」
    3️⃣ 回應 res：「我幫你把結果送回去前端！」
    
  */

/* 
    import Product...	          => 把我們的資料表 model 叫進來，才能新增商品
    req.body.name	              => 前端傳過來的資料（像是表單內容）
    await Product.create(...)	  => 把商品資料存進資料庫！（就是新增資料）
    res.status(...).json(...)	  => 把結果用 JSON 格式回傳給前端  

    🧪 如果前端送這樣的資料過來：

    {
      "name": "貓咪零食",
      "price": 99
    }


    那我們這個 API 功能就會幫他存到資料庫，然後回傳這樣：
    {
      "success": true,
      "message": "商品新增成功✨",
      "product": {
        "_id": "abc123",
        "name": "貓咪零食",
        "price": 99
      }
    }
    */

// 載入餐廳的資料表 (把我們的資料表 model 叫進來，才能新增商品)
import Restaurant from '../models/restaurant.js'

// 讓我們可以用更清楚的 http 回應代碼
import { StatusCodes } from 'http-status-codes'

import validator from 'validator'

// 🧸 嘗試建立新的商品
export const create = async (req, res) => {
  try {
    const restaurant = await Restaurant.create({
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      sell: req.body.sell,
      image: req.files?.[0]?.path,
      nutritionInfo: req.body.nutritionInfo,
      city: req.body.city,
    })

    // 🥳 建立成功，回應給前端
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '餐廳建立成功',
      restaurant,
    })
  } catch (error) {
    console.log('controllers/restaurant.js create')
    console.error(error)

    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      res.Status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const getAll = async (req, res) => {
  try {
    const restaurants = await Restaurant.find()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳列表取得成功',
      restaurants,
    })
  } catch (error) {
    console.log('controllers/restaurants.js getAll')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const get = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ sell: true })
    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳列表取得成功',
      restaurants,
    })
  } catch (error) {
    console.log('controllers/restaurant.js getAllo')
    console.error(error)

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const update = async (req, res) => {
  try {
    // 驗證餐廳 ID 是否有效
    // 「安全機制」，確保我們不會對資料庫做錯誤操作
    // validator.isMongoId(...) => 檢查這個 ID 是不是一個合法的 MongoDB ObjectId（避免亂傳字串）
    // req.params.id => 取得網址中的餐廳 ID，例如 /restaurant/update/123456789...
    //  validator.isMongoId() => 驗證 ID 合法性 (避免資料庫報錯)
    if (!validator.isMongoId(req.params.id)) {
      // 如果不是合法的 ID，就直接丟錯誤（throw new Error(...)）
      throw new Error('RESTAURANT ID')
    }

    /* 
      整體流程：

      // 判斷是不是找不到餐廳的錯誤
      await Restaurant.findByIdAndUpdate(...).orFail(new Error('RESTAURANT NOT FOUND'))

      // 回傳狀態碼 404 Not Found
      .orFail(...) 👉 所以如果資料庫查不到這筆資料，它就會主動丟出錯誤訊息 RESTAURANT NOT FOUND
    
      // 告訴前端：「這筆資料不在資料庫裡」
      然後這個錯誤就會被 catch (error) 接住，再來跑這段
      else if (error.message === 'RESTAURANT NOT FOUND') {

      */

    // 更新資料庫裡的餐廳資訊
    // Restaurant.findByIdAndUpdate(...) => 在 Restaurant 資料表裡找到對應 ID 的餐廳，並更新它的資料
    // findByIdAndUpdate => 用 ID 更新資料 (主要邏輯)
    const restaurant = await Restaurant.findByIdAndUpdate(
      /* 
        在 Express（Node.js 的 web 框架）裡，
        每一次使用者對你發送一個 request（請求），你就會收到一個 req（Request）物件。
      
        這個 req 裡面裝著很多使用者送過來的資訊，比如：

        屬性	      裡面是什麼
        req.body	  使用者送來的表單資料（POST 的內容）
        req.query	  URL 上的查詢字串（?keyword=xxx）
        req.params	路由參數（動態網址中的變數！就是你問的這個！）

        那 params 到底是什麼咧？ (我們來看一個例子：)

        // 路由定義
        app.get('/restaurant/:id', (req, res) => {
          console.log(req.params.id)
        })

        如果使用者輸入網址：
        GET /restaurant/abc123


        那這時候 Express 就會自動把 :id 的部分抓出來放進 req.params 裡：
        req.params = {
          id: 'abc123'
        }

        所以你才能這樣寫：
        req.params.id // => 'abc123' 
        這樣你就可以拿這個 ID 去資料庫找餐廳啦～ 🍽️✨

        🌼 為什麼不是 req.body.id？
        req.body 是使用者在 POST、PUT 請求時，送的資料（像表單送出）

        req.params 是使用者在網址路徑裡傳的資料

        req.query 則是網址後面 ?key=value 的查詢參數

        🧸 舉個更生活化的例子：

        如果你在一個網站點進某間餐廳的頁面，網址是：
        https://foodie.com/restaurant/abc123

        這個 abc123 就是「餐廳的 ID」，
        Express 就會自動幫你把它放進 req.params.id 🪄

        你就可以在後端這樣寫：
        Restaurant.findById(req.params.id)
        是不是像在收信時，郵差已經幫你把地址的號碼挑出來啦～📮✨  
        */

      /* 
          🌐 Express 是什麼？
          Express	Node.js 的 Web 框架，幫你寫 API 路由和處理請求 (Express 是一個在 Node.js 上超受歡迎的「網頁伺服器框架」)

          路由定義 => 定義當有人打 /xxx 時該做什麼
          寫在哪？ => 一般會寫在 routes/xxx.js 裡
          和 controller 分工？ => routes 只是定義「走哪裡」，真正邏輯寫在 controllers/xxx.js 裡

          👉 你可以把 Express 想像成：
          🍽️「餐廳的廚房」：幫你負責接訂單（處理請求）、煮菜（處理資料）、出餐（送出回應）！

          用 Express 你就可以：
          1. 建立 API（比如 GET /products）
          2. 管理前、後端的溝通
          3. 設定網址路由
          4. 控制錯誤處理流程
          5. 把資料存進資料庫，或從資料庫撈出來

          簡單說～它是 後端開發的萬用工具箱 🧰✨ 


          📦 Express 放在哪裡？
          當你看到專案裡面有這個檔案：

          const express = require('express')
          或者：
          import express from 'express'

          就代表這個專案正在使用 Express 啦 💡
          它通常會被裝在 node_modules 裡（用 npm install express 安裝）。
        
          ✅ 常見 Express 專案結構：

          project/
          ├── server.js  ← 主入口（開伺服器）
          ├── routes/
          │   └── product.js  ← 路由定義都放這
          ├── controllers/
          │   └── product.js  ← 實際功能實作在這（邏輯、資料處理）
          ├── models/
          │   └── product.js  ← 資料模型（Mongoose 定義資料欄位）
                  
          */
      req.params.id,
      {
        // ...req.body => 把前端傳來的欄位全部展開，例如：name, location, tags 等等
        ...req.body,
        // image: req.file?.path => 更新圖片欄位（如果有上傳新圖片）
        // req.file => 是經過 multer（或上傳工具）處理後的檔案物件
        // ?. => 是 optional chaining → 沒有圖片也不會報錯，image 就會變成 undefined，代表圖片不更新
        // req.file?.path => 是否更新圖片 (可選擇性更新圖片)
        image: req.files?.[0]?.path,
      },
      {
        // 更新設定
        // new: true => 回傳「更新後」的資料（不設的話會拿到更新前的）
        // new: true => 回傳更新後資料 (不然拿到的是舊的)
        new: true,
        // runValidators: true => 更新時一樣要驗證資料（就像新增時要驗證一樣）
        runValidators: true,
      },

      /* 
        orFail => Mongoose 的方法，用來「保證一定要找到資料」，否則就 主動丟出錯誤
        
        我想根據 ID 找到某筆餐廳資料並更新它」
       「但如果找不到，我就不要靜靜地什麼都不做，我要直接丟出一個錯誤！

       這樣一來，我們才能在 catch (error) 裡知道：
       👉 「喔～這是因為找不到那筆資料，而不是其他 bug」

       💡 .orFail(...) 裡面可以放一個 Error 物件，自己設定錯誤訊息
      */

      // .orFail() => 找不到就丟錯誤 (強化錯誤處理)
      // .orFail(...) => 如果找不到對應的餐廳（可能 ID 正確格式但實際不存在），就丟一個錯誤，讓下面的 catch 處理。
    ).orFail(new Error('RESTAURANT NOT FOUND'))

    // 成功回傳更新結果 (成功的話，就回傳 HTTP 狀態碼 200（OK）)
    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳更新成功',
      // 更新後的 restaurant 資料
      restaurant,
    })
    // catch 區塊 => 回傳不同錯誤訊息 (對應不同狀況有不同回饋)
    // 錯誤處理區塊 catch
    // 如果上面任何地方出錯（像 ID 錯、沒找到餐廳、欄位格式錯…）就會跑進這裡，並輸出錯誤資訊到後端主控台，方便開發者除錯
  } catch (error) {
    console.log('controllers/restaurant.js update')
    console.error(error)

    // 針對不同錯誤原因，回傳不同的回應

    // ID 格式不正確
    // 使用者傳來的 ID 是亂碼，直接告訴他：「你的 ID 是無效的」
    if (error.message === 'RESTAURANT ID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的餐廳 ID',
      })
      // 判斷是不是找不到餐廳的錯誤
      // 找不到要更新的餐廳 (你給我的餐廳 ID 是對的格式，但是資料庫沒有這筆資料)
      // 這種情況就會觸發 .orFail(new Error('RESTAURANT NOT FOUND'))，然後 error.message 就會是 RESTAURANT NOT FOUND
    } else if (error.message === 'RESTAURANT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '餐廳不存在',
      })
      // 欄位驗證錯誤
      // 比如說 restaurant 傳來字串不是數字，或是 name 空白了，就會透過這段抓出第一個錯誤訊息顯示
    } else if (error.name === 'ValidationError') {
      /* 

        Object.keys(error.errors)[0] => 用來從「Mongoose 驗證錯誤」裡，找出是哪一個欄位出錯

         Mongoose 驗證錯誤 (ValidationError) 是長這樣：


        {
          name: 'ValidationError',
          errors: {
            name: { message: '商品名稱為必填' },
            price: { message: '價格必須是正數' }
          }
        }

        Object.keys(error.errors) // 會得到 ['name', 'price']
        Object.keys(error.errors)[0] // 就會是 'name'

        🥺 為什麼只取第一個？
        → 因為有時候一次出錯很多欄位，但我們只想先顯示「第一個錯誤給使用者看」，讓他一步步修正就好，不要一次爆炸 🧯
      
      */
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        /* 
          message: error.errors[key].message => 請拿出這個錯誤物件裡，對應那個欄位的錯誤訊息

          📦 例如：  
              key = 'name'
              error.errors[key] = { message: '商品名稱為必填' }
              error.errors[key].message = '商品名稱為必填'

          💌 最終它就會變成：
          {
            success: false,
            message: '商品名稱為必填'
          }
        */
        //  error.errors[key].message	拿出該欄位的錯誤訊息內容
        message: error.errors[key].message,
      })
    } else {
      // 其他錯誤 => 所有「非預期」錯誤（像資料庫壞了、程式有 bug），就統一回傳 500，讓使用者知道：「不是你錯，是我們的錯 QQ」
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

/* 
  Mongoose 會幫我們檢查一些東西（像是欄位是不是必填、價格是不是數字）

  如果有錯，它就會回來一包「錯誤」給我們 ：

  error = {
    name: 'ValidationError',
    errors: {
      name: {
        message: '商品名稱為必填',
        kind: 'required',
        path: 'name',
        value: ''
      }
    }
  }

  🧸 所以當我們這樣寫的時候：
  const key = Object.keys(error.errors)[0]

  🪄 它會從 errors 裡拿到欄位名清單：
  Object.keys(error.errors)  // ['name']
  所以 key = 'name' 🧷

  然後：
  error.errors[key] = error.errors['name'] = {
  message: '商品名稱為必填',
  ...

  接著：
  error.errors[key].message = '商品名稱為必填'


  就可以把這個錯誤訊息好好拿出來，包進我們的回應：
  res.status(400).json({
    success: false,
    message: error.errors[key].message
  })
  }

*/

export const getId = async (req, res) => {
  try {
    // 檢查網址裡的 id 長得像不是合法的 MongoDB id 嗎？如果不是，就要處理。
    // params → 物件，存放從 URL 路徑參數取得的值
    // 取出 params 物件中名稱為 id 的屬性值
    // 來源 → 由 router 定義的路徑模板中的「冒號參數」決定，例如 /users/:id 會讓 Express 把 :id 解析到 req.params.id
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('RESTAURANT ID')
    }

    const restaurant = await Restaurant.findById(req.params.id).orFail(
      new Error('RESTAURANT NOT FOUND'),
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳取得成功',
      restaurant,
    })
  } catch (error) {
    // controllers/restaurant.js => 標記錯誤的來源檔案
    // getId => 標記錯誤的來源函式
    console.log('controllers/restaurant.js getId')
    console.error(error)

    if (error.message === 'RESTAURANT ID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的餐廳 ID',
      })
    } else if (error.message === 'RESTAURANT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '餐廳不存在',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

/* 
  🔸 什麼是「前端的路由」？
  
  前端的「路由」是在告訴瀏覽器：
「你現在在哪一個畫面，要顯示哪一個頁面元件？」

  🧠 我們可以用 SPA（單頁應用程式）來舉例：
  http://yourwebsite.com/home  → 顯示首頁
  http://yourwebsite.com/about → 顯示關於我們
  http://yourwebsite.com/shop  → 顯示商品頁

  這些網址看起來好像在切換不同頁面，
  但其實是在 前端程式裡透過 Router 去切換元件（component）而已！ 🔄

  前端的路由，是負責「畫面上該顯示什麼內容」

*/

/* 
  那後端的路由是什麼？
  後端的「路由」則是負責處理請求的～

  🔧「當有人傳送某個 API 的請求時，要給什麼資料？或做什麼動作？」

  例如：
  GET /products         → 把所有商品資料撈出來
  POST /products        → 建立一個新商品
  PATCH /products/:id   → 更新某一筆商品

  這些後端路由會被 Express 接收，然後做出回應
*/

/* 
  分類	    路由功能	                    舉例	                         誰來處理
  前端路由	切換畫面、顯示對應的頁面元件	  /home → 顯示 Home 元件	        前端框架（React、Vue 等）
  後端路由	接收請求、處理資料、傳回回應	  GET /products → 傳回商品列表    後端（Express）
*/

/* 
  為什麼「兩邊都需要路由」？

  因為——

  🌐 前端：負責「畫面呈現與互動」
  用來讓使用者看到的東西不一樣，像是「頁面切換」、「點商品打開詳細資訊」

  🔧 後端：負責「資料處理與回應」
  用來讓伺服器收到請求後知道要回什麼內容（例如撈資料、修改資料）

  ✨ 他們各司其職，一起合作才能讓整個網站順利運作！

*/

/* 
  🥹 小小比喻時間！
      你可以想像一個購物網站：

      🛍️ 使用者操作（前端路由）：
      按「商品列表」→ 換畫面 /products

      點進「商品A」→ 換畫面 /products/123

      📦 資料來源（後端路由）：
      /products → 撈出所有商品

      /products/123 → 撈出商品A的資料

      如果沒有前端路由 👉 點來點去畫面不會換
      如果沒有後端路由 👉 畫面換了也撈不到資料

      是不是就像是前端畫圖，後端負責上顏色 🎨💾

*/

/* 
  controllers 是什麼？
  controller（控制器）是處理實際邏輯的地方！

  比如說：

  拿資料（find）

  存資料（create）

  更新資料（update）

  刪除資料（delete）

  做驗證（像是欄位是不是空的）

  controllers 是：API 真正「做事」的地方，也就是功能本人 

*/

/* 
  🧠 來個比喻：
      想像你去一家餐廳點餐 🍜：

      東西	角色	做什麼
      點菜單	前端（Vue）	前端送出請求
      服務生	路由 router	負責轉達要點什麼
      廚師	控制器 controller	負責真正下鍋做菜（寫功能）
      出菜	res 回應	把菜送到你桌上（回前端）

*/

/* 
  🎯 我們的目標是：
      做一個新增商品（product）的 API 功能！

      前端會傳商品資料（像是名稱、價格）過來，
      我們就幫它存進資料庫，然後回傳成功的訊息 💌

  🔧 第一步：先準備基本環境（幫你都設好了）
    假設我們已經有這些：
    ✅ MongoDB 資料庫 ✅

    ✅ Mongoose model 叫做 Product

    ✅ 路由已經指向這個 controller    

*/

/* 
   API 可以分成兩邊的角色：
  角色	                  在哪邊	             功能
  ✋ 發出 API 請求	       ✅ 前端（Vue）	     用 axios.get(...)、fetch(...) 等方式發送
  🤝 接收並處理 API 請求	✅ 後端（Express）  	建立路由和 controller 處理請求並回傳資料

  API 就是中間這個「橋樑邏輯」，讓前端和後端可以彼此說話
*/

/* 
  controller 主要工作是什麼？
  
  接收來自路由的請求（Request）

  依照請求的內容，處理商業邏輯（像是查資料庫、新增、更新、刪除）

  決定要回傳什麼資料給前端（Response）

  處理可能發生的錯誤（try/catch）
*/

/* 
  Controller 是一組函式集合，每個函式負責一種操作（例如取得餐廳列表、取得特定餐廳、建立餐廳）

  它們通常放在 controllers 資料夾裡，跟路由 routes 分開，讓程式更模組化、容易維護

  在 Controller 裡會呼叫資料庫模型（model）來取得或更新資料
*/

/* 
  API 是什麼？

  API（Application Programming Interface）是讓不同系統、軟體互相溝通的「介面」或「門」🔑

  在你的專案裡，API 就是伺服器提供給前端的各種網址和方法（像是 GET /restaurants/:id）

  透過這些 API，前端可以叫伺服器拿資料、存資料、改資料、刪資料
*/

/* 
  Controller 是什麼？

  Controller 是「API 背後的實作邏輯」

  也就是說，當有人叫你 API（例如 GET /restaurants/:id），

  Express 路由會找到對應的 Controller 函式來幫你處理這個請求，

  例如從資料庫撈餐廳資料、回傳結果給前端。
*/

/* 
  API 是「你跟伺服器溝通的橋樑」，也就是網路上的路徑和方法。

  Controller 是「API 的大腦」，實際幫你處理請求的程式碼。

  所以，controller 不是 API 本人，但它是 API 背後的關鍵執行者。
*/

/* 
  API = 「HTTP 方法 + 路徑」的組合，
  讓前端知道要怎麼跟後端溝通、做什麼事情

  API 就像是前端跟後端溝通的橋樑或語言，
  讓前端能夠清楚地「問」後端要資料，或者「告訴」後端要做什麼事

  API 裡面最常見的就是像 GET、POST、PATCH、DELETE 這些「方法（HTTP methods）」啦！
  它們就是 API 在跟你說：

  GET：我要「拿」資料

  POST：我要「新增」資料

  PATCH（或 PUT）：我要「修改」資料

  DELETE：我要「刪除」資料

  這些方法跟網址（路徑）合起來，才完整組成一個 API 路徑喔！

  比如說：
  GET /restaurants/:id → 拿某個餐廳的資料
  POST /restaurants → 新增一間餐廳
  PATCH /restaurants/:id → 修改某個餐廳
  DELETE /restaurants/:id → 刪除某個餐廳
*/
