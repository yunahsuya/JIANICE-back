/* 
  從 mongoose 套件中引入：

  Schema：
  用來定義資料的結構

  Error：
  處理驗證錯誤時會用到

  model：
  把 schema 轉成真正可以操作的資料表（model）

*/
import { Schema, Error, model } from 'mongoose'

// 驗證 email 格式、字串是否是英數字等等
import validator from 'validator'

// 加密密碼的工具
import bcrypt from 'bcrypt'

const cartSchema = new Schema(
  {
    product: {
      /* 
        type: Schema.Types.ObjectId, => 這個欄位是參考別的 collection（資料表）的 _id

        像是：你買了一個商品，但商品的完整資訊是在 products 那張資料表裡面～

        所以這裡的 ObjectId 就是 MongoDB 裡面每筆資料的身分證（也就是 _id）

        而因為你有寫 ref: 'products'，所以 mongoose 會知道：
        👉 這是參考 products 資料表的欄位喔！
      */
      type: Schema.Types.ObjectId,
      // 為什麼搭配 ref？	✅ 告訴 mongoose 要去哪張資料表找對應的資料。
      ref: 'products',
      required: [true, '商品 ID 是必填的'],
    },
    quantity: {
      type: Number,
      required: [true, '數量必填'],
      min: [1, '數量最少為 1'],
    },
  },
  { versionKey: false },
)

const schema = new Schema(
  {
    // 帳號
    account: {
      type: String,
      required: [true, '帳號是必填的'],
      minlength: [4, '帳號至少需要 4 個字元'],
      maxlength: [20, '帳號最多只能有 20 個字元'],
      unique: true,
      trim: true,
      validate: {
        validator(value) {
          return validator.isAlphanumeric(value)
        },
        message: '帳號只能包含英文字母和數字',
      },
    },

    // 郵件
    email: {
      type: String,
      required: [true, '電子郵件是必填的'],
      unique: true,
      trim: true,
      validate: {
        validator(value) {
          return validator.isEmail(value)
        },
        message: '請輸入有效的電子郵件地址',
      },
    },

    // 購物車
    cart: {
      type: [cartSchema],
    },

    // 授權碼
    tokens: {
      type: [String],
    },

    // 角色
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // 密碼
    password: {
      type: String,
      required: [true, '密碼是必填的'],
    },

    // 身高
    height: {
      type: Number,
    },

    // 體重
    weight: {
      type: Number,
    },

    // 疾病 (高血壓、糖尿病)
    disease: {
      type: [String],
    },

    // 狀態 (健身、減重)
    state: {
      type: [String],
    },

    // 餐廳收藏
    favoriteRestaurants: {
      type: [String],
      // type: [restaurantSchema],
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

// -----------------------------------------------------------------------

// -----------------------------------------------------------------------

// 在保存前對密碼進行處理
// 盡量用 function 不要用箭頭
// next = 讓 mongoose 繼續下一步處理
// https://mongoosejs.com/docs/middleware.html#middleware
schema.pre('save', function (next) {
  // this = 現在要保存的資料
  const user = this
  // 如果密碼欄位有修改，進行加密
  // isModified => 判斷有沒有改欄位，防止重複加密密碼。 (一開始使用者輸入時 isModified 是 true 嗎？	✅ 是的！因為是新資料，當作是「有改過」。)
  if (user.isModified('password')) {
    // 驗證密碼明文格式
    if (user.password.length < 4 || user.password.length > 20) {
      // 如果密碼長度不符合要求，拋出 mongoose 的驗證錯誤
      // 用跟 mongoose 的 schema 驗證錯誤一樣的錯誤格式
      // 可以跟其他驗證錯誤一起處理
      const error = new Error.ValidationError()
      // 設定密碼欄位錯誤
      error.addError(
        'password',
        new Error.ValidatorError({ message: '密碼長度必須在 4 到 20 個字元之間' }),
      )
      // 繼續處理，把錯誤傳出去
      // mongoose 遇到錯誤就不會存資料庫
      next(error)
      return
    } else {
      // 密碼格式符合要求，使用 bcrypt 加密密碼
      user.password = bcrypt.hashSync(user.password, 10)
    }
  }
  // 限制有效 token 數量
  // isModified => 把陣列裡最前面的那一個元素刪掉
  if (user.isModified('tokens') && user.tokens.length > 3) {
    user.tokens.shift()
  }
  // 繼續處理
  next()
})

// 虛擬的動態欄位
// 盡量用 function 不要用箭頭
// .get() 欄位資料的產生方式
// virtual => 幫我計算「購物車裡面所有商品的總數量」，這個資料不需要存進資料庫，只要讀的時候算一次就好！
/* 
  虛擬欄位的優點：

  - 不佔資料庫空間

  - 資料變動時自動更新

  - 很適合做「統計類型」的資訊（像總價、總數量、BMI...）
*/
// reduce => JavaScript 的一個陣列方法，用來「累加」或「累計」整個陣列的值
schema.virtual('cartTotal').get(function () {
  // this = 現在要保存的資料
  const user = this
  return user.cart.reduce((total, item) => {
    return total + item.quantity
  }, 0)
})

export default model('users', schema)
