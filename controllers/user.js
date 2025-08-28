// 把 User 這個資料模型（model）匯入到目前檔案
// User 代表 MongoDB 裡的「使用者」collection，方便你做資料庫操作
import User from '../models/user.js'

// 從 http-status-codes 這個套件匯入 HTTP 狀態碼的常數
// 例如 StatusCodes.OK 代表 200，StatusCodes.BAD_REQUEST 代表 400
import { StatusCodes } from 'http-status-codes'

// 這行引入 JWT（Json Web Token）套件，用來做登入驗證和產生 token
// JWT 是一種安全地把使用者資訊加密後傳遞的方式
import jwt from 'jsonwebtoken'

// 引入 validator 套件，裡面有很多常用的驗證函式，像是檢查 email 格式、ID 格式等等
import validator from 'validator'

// 引入產品（Product）的資料模型，可以在操作使用者的購物車時，驗證產品是否存在
import Product from '../models/product.js'

// create（註冊新帳戶）=> 匯出一個叫 create 的非同步函式，用來建立新使用者帳戶
// 建立新帳戶 => 使用者第一次註冊時，系統幫他把帳號、密碼、email 等資料存到資料庫裡
export const create = async (req, res) => {
  try {
    // User.create() 是 Mongoose 幫你存資料庫的指令
    // 用 User.create 把 req.body 裡的帳號、Email、密碼存到資料庫
    await User.create({
      // 從前端 req.body 拿帳號、信箱和密碼來新增一筆使用者資料
      // req.body 是前端送過來的資料，像註冊表單填的東西
      account: req.body.account,
      email: req.body.email,
      password: req.body.password,

      /* 
        height: req.body.height,
        weight: req.body.weight,
        disease: req.body.disease,
        state: req.body.state,
      */
    })
    // 如果成功，回應 201（Created）表示帳號建好了。
    // 建立成功後，回傳 HTTP 201（已創建）狀態，並帶成功訊息給前端
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '成功建立帳戶',
    })
  } catch (error) {
    // 如果有錯誤（例如格式錯誤、重複帳號等），進入這裡，先在後端印出錯誤方便除錯
    console.log('controllers/user.js create')
    console.error(error)
    // 如果是資料驗證錯誤（像必填欄位沒填或格式錯誤），回 400 錯誤，告訴前端是哪裡錯。
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      // 如果欄位格式錯誤會回 400（Bad Request）並告訴你哪裡錯了。
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
      // 如果是資料庫重複鍵值錯誤（例如帳號或 Email 重複），回 409 衝突錯誤，提示「使用者已存在」。
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      // 如果帳號已經存在（重複 key 錯誤），回 409（Conflict）。
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '使用者已存在',
      })
      // 其他錯誤回 500 伺服器錯誤，這是最保險的錯誤回應。
    } else {
      // 其他錯誤回 500（伺服器錯誤）
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// login（登入）=> 匯出 login 函式，負責使用者登入
export const login = async (req, res) => {
  try {
    // https://github.com/auth0/node-jsonwebtoken?tab=readme-ov-file#jwtsignpayload-secretorprivatekey-options-callback
    // 用 JWT 產生一個「令牌」（token），裡面放使用者 ID，7 天後過期
    // 用 JWT 產生一個帶有使用者 _id 的 token，有效期 7 天
    // process.env.JWT_SECRET 是你自己設定的秘密金鑰，用來加密 token
    /* 
      process 是 Node.js 裡的一個全域物件（Global Object），它代表目前運行的這個程式的環境

      你可以用它拿到很多重要的資訊，像是：
      process.env：裡面放著環境變數（環境設定），例如資料庫網址、API 密鑰等。

      process.argv：命令列參數

      process.exit()：結束程式的命令
    */
    /* 
      process.env？
      因為我們通常不會直接把重要的設定（像密碼、網址）寫死在程式碼裡，這樣不安全。

      所以會放在 .env 檔案，利用 process.env 讀取這些「環境變數」，讓程式可以動態拿到設定。

      .env 這個檔案裡的內容像這樣： 
      DB_URL=mongodb://localhost:27017/mydb

      // DB_URL => 自定義
      const dbUrl = process.env.DB_URL
      程式裡用 process.env.DB_URL 就是去拿 .env 裡的這個值
      意思是「從環境變數裡拿 DB_URL 這個設定」來用。
   */
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // 把這個 token 加進使用者資料庫裡的 tokens 陣列，方便追蹤和登出時刪除。
    // 把這個 token 推進使用者的 tokens 陣列，然後存回資料庫，方便之後驗證和管理
    req.user.tokens.push(token)
    await req.user.save()

    // 登入成功回傳 200，並回傳使用者帳號、角色、購物車總額和 token
    res.status(StatusCodes.OK).json({
      success: true,
      message: '登入成功',
      // 回傳帳號、角色、購物車總數和 token，讓前端可以用它來認證
      user: {
        account: req.user.account,
        role: req.user.role,
        cartTotal: req.user.cartTotal,
        token,
      },
    })
    // 登入出錯時印錯誤並回 500
  } catch (error) {
    console.log('controllers/user.js login')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// ... existing code ...

// 管理員功能：新增使用者
export const createUserByAdmin = async (req, res) => {
  try {
    // 檢查是否為管理員
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '權限不足',
      })
    }

    // 建立新使用者
    const user = await User.create({
      account: req.body.account,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'user',
    })

    // 回傳使用者資料（不包含密碼和 tokens）
    const userResponse = user.toObject()
    delete userResponse.password
    delete userResponse.tokens

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '使用者建立成功',
      result: userResponse,
    })
  } catch (error) {
    console.log('controllers/user.js createUserByAdmin')
    console.error(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '帳號或電子郵件已存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 管理員功能：取得所有使用者列表
export const getAllUsers = async (req, res) => {
  try {
    // 檢查是否為管理員
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '權限不足',
      })
    }

    // 取得所有使用者，但不包含密碼和 tokens
    const users = await User.find({}, '-password -tokens').sort({ createdAt: -1 }) // 按建立時間排序

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: users,
    })
  } catch (error) {
    console.log('controllers/user.js getAllUsers')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// --------------------------------------------------------------------

// 管理員功能：更新使用者資料
export const updateUser = async (req, res) => {
  try {
    // 檢查是否為管理員
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '權限不足',
      })
    }

    // 驗證使用者 ID 格式
    if (!validator.isMongoId(req.params.id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '使用者 ID 格式錯誤',
      })
    }

    // 檢查是否要更新密碼
    if (req.body.password) {
      // 如果密碼長度不符合要求
      if (req.body.password.length < 4 || req.body.password.length > 20) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '密碼長度必須在 4 到 20 個字元之間',
        })
      }
      // 加密新密碼
      req.body.password = bcrypt.hashSync(req.body.password, 10)
    }

    // 更新使用者資料
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // 回傳更新後的資料
      runValidators: true, // 執行 schema 驗證
    })
      .select('-password -tokens')
      .orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '使用者資料更新成功',
      result: user,
    })
  } catch (error) {
    console.log('controllers/user.js updateUser')
    console.error(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '帳號或電子郵件已存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 管理員功能：刪除使用者
export const deleteUser = async (req, res) => {
  try {
    // 檢查是否為管理員
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '權限不足',
      })
    }

    // 驗證使用者 ID 格式
    if (!validator.isMongoId(req.params.id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '使用者 ID 格式錯誤',
      })
    }

    // 檢查是否要刪除自己
    if (req.params.id === req.user._id.toString()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '不能刪除自己的帳號',
      })
    }

    // 刪除使用者
    const user = await User.findByIdAndDelete(req.params.id).orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '使用者刪除成功',
      result: { _id: user._id, account: user.account },
    })
  } catch (error) {
    console.log('controllers/user.js deleteUser')
    console.error(error)
    if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// --------------------------------------------------------------------

// profile（取得個人資料）=> 查詢自己的資料
// profile => 取得已存在的帳戶資料，就是當使用者登入後，要查詢自己帳戶資訊時用的功能，讓他知道自己的基本資料是什麼
export const profile = (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    user: {
      // 回傳簡單的使用者資料（帳號、角色和購物車總數）
      // 回傳使用者的帳號、角色和購物車總額
      // 這邊不用 try/catch 因為它不涉及資料庫查詢，只是回傳存在 req.user 的資料
      // 這裡 req.user 是先經過身份認證中間件，拿到的使用者物件
      account: req.user.account,
      email: req.user.email,
      role: req.user.role,
      cartTotal: req.user.cartTotal,
      height: req.user.height,
      weight: req.user.weight,
      disease: req.user.disease || [],
      state: req.user.state || [],
      favoriteRestaurants: req.user.favoriteRestaurants || [],
    },
  })
}

// refresh（更新 token）
// 匯出 refresh，讓使用者能換一個新的 token
export const refresh = async (req, res) => {
  try {
    // 找出目前 token 在 tokens 陣列的索引
    const i = req.user.tokens.indexOf(req.token)
    // 產生新 token，替換掉舊的，然後存回資料庫
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // 找到目前使用的 token 在陣列的位置，把它換成新的 token，延長有效期限
    // 讓使用者不用重新登入就能拿到新的認證
    req.user.tokens[i] = token
    await req.user.save()
    // 回傳新的 token
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      token,
    })
    // 錯誤處理
  } catch (error) {
    console.log('controllers/user.js refresh')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 更新個人資料
export const updateProfile = async (req, res) => {
  try {
    // 只允許更新特定欄位
    const allowedFields = ['height', 'weight', 'disease', 'state']
    const updateData = {}

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    })

    // 更新使用者資料
    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true, // 回傳更新後的資料
      runValidators: true, // 執行 schema 驗證
    }).select('-password -tokens')

    res.status(StatusCodes.OK).json({
      success: true,
      message: '個人資料更新成功',
      result: user,
    })
  } catch (error) {
    console.log('controllers/user.js updateProfile')
    console.error(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// logout（登出）
// 匯出 logout，讓使用者登出
export const logout = async (req, res) => {
  try {
    // 從 tokens 中移除當前的 token
    // 從使用者資料裡，把目前這個 token 從 tokens 陣列刪掉，等於讓它失效
    // 之後用這個 token 請求就不能認證成功，完成登出
    // filter => JavaScript 陣列方法，作用是 從一堆資料中「篩選」出你想要的那部分，而不是直接刪除整個陣列 => 它會回傳一個新的陣列，裡面只包含符合條件的元素。
    // 從使用者的 token 陣列裡挑出所有 不等於目前 token 的元素，也就是把目前的 token 從陣列剔除（留下其他的）
    // 它不是真的刪掉整個陣列，只是做了挑選，重新把挑選後的結果存回去
    // 從 tokens 陣列過濾掉目前 token（就是登出這個 token），然後存回資料庫
    req.user.tokens = req.user.tokens.filter((token) => token !== req.token)
    await req.user.save()
    // 回傳成功。
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
    })
    // 錯誤處理。
  } catch (error) {
    console.log('controllers/user.js logout')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// cart（加入或更新購物車）=> 匯出 cart，用來更新購物車商品數量
// 購物車功能 - 新增或修改商品數量（cart）
export const cart = async (req, res) => {
  try {
    // 驗證請求的商品 ID
    // 先驗證商品 ID 是不是合法的 MongoDB 格式
    // 驗證前端傳來的商品 ID 格式是否正確
    // 判斷一個網址參數 id 格式是不是正確：這裡 .orFail() 根本不會幫你檢查格式，因為它只會在你已經送出資料庫查詢後才生效。
    if (!validator.isMongoId(req.body.product)) {
      throw new Error('PRODUCT ID')
    }
    // 檢查商品是否存在
    // 確認商品存在資料庫
    // 確認商品存在，不存在就丟錯誤
    /* 
      orFail => Mongoose（MongoDB 的 Node.js 套件）裡查詢結果的附加方法。

      用法是：當你用 findById 或 findOne 查資料時，
      如果找不到符合條件的資料，orFail() 就會丟出錯誤
    */
    //  嘗試找 id 對應的使用者，如果找不到，就丟一個錯誤，錯誤訊息是 'USER NOT FOUND'。 (直接用 try/catch 去抓錯誤，讓錯誤處理變得更清楚、更乾淨)
    /* 
      名稱	     解釋	        作用
      process	   Node.js     全域物件，代表執行環境	讀取環境變數，讓程式可以拿到外部設定
      orFail()	 Mongoose    查詢方法的延伸	查不到資料時丟錯，方便錯誤統一處理
    */
    /* 
      throw new Error => 你在程式中自己主動丟出錯誤，表示「我這裡發現有問題啦！」，比如你檢查到 id 格式錯誤時，你會丟錯
      orFail() => 是 Mongoose 的查詢工具，幫你判斷「這筆資料到底有沒有找到」，它的用法是「如果找不到就幫我丟錯誤」，讓你不必自己再寫判斷，程式更簡潔
    
      為什麼用 orFail() 好？
      想像你要找東西，如果沒找到：

      你可以自己寫：
      const item = await Model.findById(id)
      if (!item) throw new Error('NOT FOUND')

      也可以用 orFail()：
      const item = await Model.findById(id).orFail(new Error('NOT FOUND'))
      它幫你把「判斷是不是空值然後丟錯」這件事包起來了。
      */

    /* 
      .orFail() 的功能：
      它是 Mongoose 查詢結果的延伸，只在查找資料庫時有用，如果「找不到符合條件的資料」，就幫你自動丟錯誤。

      那為什麼不能全部用 .orFail()？
      因為 .orFail() 是針對資料庫查詢結果而設計的：

      它只能用在 Mongoose 的查詢語句後面，像是 findById()、findOne()、findByIdAndUpdate() 這種有「回傳資料的查詢」才適用。

      你沒辦法用 .orFail() 去判斷其他類型的錯誤，像是「參數格式不對」、「使用者權限不足」這些，是程式邏輯層面需要主動檢查的錯誤。
    */
    /* 
      情境	          用法	                              好處
      主動發現錯誤	   throw new Error('錯誤訊息')	       明確表示「我這裡有問題」
      查詢找不到資料	 findById(id).orFail(new Error())	   幫你簡化找不到資料的錯誤判斷
    */
    await Product.findOne({ _id: req.body.product }).orFail(new Error('PRODUCT NOT FOUND'))

    // 檢查購物車中是否已經有該商品
    // 購物車內的 product 資料型態是 ObjectId，使用 .toString() 轉換為字串進行比較
    // 在購物車找有沒有這個商品
    const i = req.user.cart.findIndex((item) => item.product.toString() === req.body.product)
    // 如果購物車中已經有該商品，則增加數量
    /* 
      再判斷購物車裡是否已有這商品

      有，就加減數量，如果小於 1 就移除。
      沒有，就新增這商品和數量。
    */

    /* 
      如果有這商品，調整數量。

      數量小於 1 就移除商品。

      如果沒有，且數量大於 0，則加入新商品。
    */
    if (i > -1) {
      req.user.cart[i].quantity += req.body.quantity
      if (req.user.cart[i].quantity < 1) {
        // 如果數量小於 1，則從購物車中移除該商品
        req.user.cart.splice(i, 1)
      }
    }
    // 如果購物車中沒有該商品，且數量 > 0，則新增商品到購物車
    else if (req.body.quantity > 0) {
      req.user.cart.push({
        product: req.body.product,
        quantity: req.body.quantity,
      })
    }
    // 保存
    // 最後存回資料庫
    // 儲存變更
    await req.user.save()

    // 回傳購物車總價
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.cartTotal,
    })
    // 詳細錯誤回應
  } catch (error) {
    console.error(error)
    if (error.message === 'USER ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '使用者 ID 格式錯誤',
      })
    } else if (error.message === 'PRODUCT ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品 ID 格式錯誤',
      })
    } else if (error.message === 'PRODUCT NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '商品不存在',
      })
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

//  getCart（取得購物車內容）
// 取得購物車內容（getCart）
// 匯出 getCart，取得使用者購物車詳情
export const getCart = async (req, res) => {
  try {
    // email account        --> 只取 email 和 account 欄位
    // -password -email     --> 除了 password 和 email 以外的欄位
    // 從資料庫用使用者 ID 找到購物車資料，並且用 populate 取出商品詳細資料（不是只有 ID）
    // User 就是代表一個 collection，裡面有很多使用者資料的 document
    // 找使用者資料，取出購物車欄位
    const user = await User.findById(req.user._id, 'cart')
      // .populate(ref欄位, 指定取的欄位) => 從參考的另一個資料集合拉出完整資料填充欄位的功能
      // 關聯 cart.product 的 ref 指定的 collection，只取 name 欄位
      // .populate('cart.product', 'name')
      // populate => 在 MongoDB 裡面，有時候一筆資料裡會存另一筆資料的「ID」，但這個 ID 本身只是個參考，不能直接看到裡面所有細節
      // populate 的功能就是 => 幫你從另一個 collection 裡找到對應的資料，然後「填滿」或「展開」這筆資料的詳細內容，讓你可以直接拿到完整的資訊
      /* 
        collection」是什麼？
        在 MongoDB（文件型資料庫）裡，collection 就像是一個資料的「資料夾」或「群組」，裡面會放很多相似型態的「文件」（document）
      
        文件（document）就像是一筆筆的資料，類似資料表裡的一行(row)，而 collection 就是裝這些資料行的資料表（table）或資料夾

        生活化比喻
        想像你的書櫃裡有很多書架，

        每個書架放的書是同一類型的書，比如小說書架、食譜書架、漫畫書架…

        這些書架就是「collection」，每本書就是「document」

        在 MongoDB 裡的角色
        名詞	        角色說明	                               生活比喻
        Collection	  類似資料庫裡的資料表，放一類型的文件資料	  書櫃裡同一書架的書
        Document	    資料庫裡一筆完整的資料，JSON 格式的物件    書架上的一本書
        */
      /* 
        簡單比喻
        想像你有一張訂單單子，上面寫著「買了商品ID：12345」，但你想知道這個商品的名字、價格、描述等細節。

        populate 就像一個幫你去商品倉庫「拿貨」的人，幫你把商品的詳細資料放進訂單裡，讓你一眼就看到完整內容
      */
      // 「從使用者資料，找到購物車裡所有商品的詳細資料」，不只是商品的 ID，而是完整商品資訊
      /* 
        populate => 從參考的另一個資料集合拉出完整資料填充欄位的功能
        作用 => 讓你不用自己再多次查詢，直接拿到相關的詳細內容
        用途 => 讓資料更完整好用，方便前端或後端處理
      */
      // 用 .populate('cart.product') 把商品 ID 換成商品詳細資料（名字、價格等）
      .populate('cart.product')
      // 找不到使用者會丟錯誤
      .orFail(new Error('USER NOT FOUND'))

    // 回傳購物車列表給前端
    // 回傳購物車內容
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: user.cart,
    })
    // 錯誤回應。
  } catch (error) {
    if (error.message === 'USER ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '使用者 ID 格式錯誤',
      })
      // 如果找不到使用者，回錯誤
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

/* 
  不是效能問題，而是「適用範圍」的差別
  .orFail() 是幫你判斷「資料庫查詢結果是否為空」的工具，這是它的責任範圍。

  檔案上傳、格式驗證、權限檢查、參數合理性判斷，這些是程式邏輯，需要你自己用 throw 去丟錯誤，跟 .orFail() 沒關係
*/

/* 
  簡單表格整理：
  狀況	                用 .orFail()	    用 throw new Error()
  資料庫查詢找不到資料	  ✅	              ❌（不能用在查詢外）
  參數格式不對	         ❌	             ✅
  權限不足	             ❌	             ✅
  請求缺少必要欄位	      ❌	              ✅

  用故事理解：
  .orFail() 就像資料庫幫你「查不到資料時自動告訴你」，但它不會管你怎麼傳進去的資料對不對，

  格式錯誤、缺欄位這種，是你當服務生之前自己要先確認好，不然根本沒辦法送去廚房（資料庫）。
*/
