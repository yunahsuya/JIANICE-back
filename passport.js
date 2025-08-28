// 用來幫助驗證帳密和管理登入權限的

// 驗證工具 (passport)
import passport from 'passport'

// 本地登入策略 (passport-local)
import passportLocal from 'passport-local'

// JWT 驗證策略 (passport-jwt)
import passportJWT from 'passport-jwt'

// 密碼加密套件 (bcrypt)
import bcrypt from 'bcrypt'

// User 使用者資料模型
import User from './models/user.js'

// 定義自己的驗證方法
// passport.use(驗證方法名稱, 驗證策略(策略設定, 策略執行完的處理))
// passportLocal = 帳號密碼驗證策略，檢查有沒有指定的帳號密碼欄位
// 設定本地帳號密碼驗證策略（login）
// 當有人登入，我們要怎麼檢查他帳號密碼有沒有對
/* 
  done() 是 passport 裡的 callback：

  第一個參數：錯誤物件 (null 表示沒錯誤)

  第二個參數：使用者資料（如果驗證成功）

  第三個參數：額外訊息（通常是錯誤原因）
*/
// passport.use() => 註冊一個驗證方法
// 設定 passport-local 策略
passport.use(
  // 自訂名稱叫 login，後續可以用這個叫這個策略
  'login',
  // passportLocal.Strategy => 是用帳號密碼驗證，會幫你檢查帳密對不對，
  new passportLocal.Strategy(
    {
      // 預設檢查 username 和 password 欄位
      // 可以修改檢查的欄位名稱
      // 告訴 passport，要從 req.body.account 拿帳號
      // 使用 account 當帳號欄位
      /* 
         usernameField => passport-local 策略的設定參數 => 你要用哪一個欄位當作登入帳號？
        預設是 "username"，但大部分網站都是用 "email"

        Passport 會自動去 req.body.account 找帳號資料
      */
      usernameField: 'account',
      // 從 req.body.password 拿密碼
      // 密碼欄位
      passwordField: 'password',
    },
    // 檢查完帳號密碼欄位有資料後的處理
    // account = 帳號欄位，password = 密碼欄位
    // done = 驗證方法執行完成，繼續並把結果帶到下一步
    // done(錯誤, 使用者資料, info)
    // 驗證函式
    /* 
      done => Passport 在驗證時的「回呼函式」（callback）

      作用是：
      告訴 Passport 驗證結果

      done(error) → 有錯誤
      done(null, false) → 驗證失敗（帳號或密碼錯）
      done(null, user) → 驗證成功，user 是該使用者資料
    */
    async (account, password, done) => {
      try {
        // 檢查帳號是否存在
        // 找使用者，條件是 account 或 email 跟輸入的一樣
        /* 
          findOne (Mongoose 的方法)
          在資料庫找符合條件的第一筆資料

          如果找不到，會回傳 null
        */
        const user = await User.findOne({ $or: [{ account }, { email: account }] }).orFail(
          new Error('USER NOT FOUND'),
        )
        // 檢查密碼是否正確
        // 用 bcrypt 比較輸入密碼和資料庫密碼是否一樣
        /* 
          bcrypt
          專門做 密碼加密 的套件

          功能：
          註冊時 → 把使用者密碼變成亂碼儲存
          登入時 → 把輸入的密碼加密後跟資料庫比對
        */
        /* 
          compareSync
          bcrypt 的方法，用來比對密碼

          Sync 代表「同步版本」（一次做完，會卡住程式）。

          例子
          bcrypt.compareSync(輸入的密碼, 資料庫的加密密碼)
       */
        if (!bcrypt.compareSync(password, user.password)) {
          // 密碼錯誤就丟錯誤
          throw new Error('PASSWORD')
        }
        // 驗證成功，把使用者資料帶到下一步
        // 驗證成功，done(null, user) 把使用者資料帶給下一步
        // 登入成功
        return done(null, user)
      } catch (error) {
        console.log('passport.js login')
        console.error(error)
        // 驗證失敗，把錯誤和訊息帶到下一步
        // 根據錯誤訊息，回傳對應提示給前端
        if (error.message === 'USER NOT FOUND') {
          return done(null, false, { message: '使用者不存在' })
        } else if (error.message === 'PASSWORD') {
          return done(null, false, { message: '密碼錯誤' })
          // 其他錯誤
        } else {
          return done(error)
        }
      }
    },
  ),
)

// 設定 JWT 驗證策略（jwt）
// 這個策略名字叫 jwt
/* 
  這段是在驗證「前端發過來的 JWT token」是不是合法且沒過期。

  會檢查 token 是否在資料庫裡（確認沒有被登出或撤銷）。

  如果過期但請求的是刷新或登出路由，允許繼續處理（因為這兩個路由需要過期 token 也能用來換新 token 或登出）。

  驗證結果用 done() 帶給下一步。
*/
/* 
  passport.use() 就是註冊一個驗證方法，

  passportLocal.Strategy 是用帳號密碼驗證，會幫你檢查帳密對不對，

  passportJWT.Strategy 是用 JWT 令牌驗證，確定你是不是有登入且 token 還有效。

  整體流程是：

  使用者輸入帳號密碼 → 本地策略驗證 → 登入成功發 token

  以後用 token 來認證自己 → JWT 策略驗證 token 合法性
*/
passport.use(
  'jwt',
  // passportJWT.Strategy => 是用 JWT 令牌驗證，確定你是不是有登入，且 token 還有效。
  /* 
    Strategy
    Passport 處理登入驗證的「方法模板」

    passport-local 就是用 LocalStrategy 這個策略。
    passport-jwt 就是用 JwtStrategy 這個策略。
  */
  new passportJWT.Strategy(
    {
      // 從 header 拿 token
      /* 
        jwtFromRequest / ExtractJwt
        passport-jwt 策略的設定，用來「從哪裡拿 JWT token」

        ExtractJwt 是一組工具，像是：
        fromAuthHeaderAsBearerToken() → 從 HTTP Header 的 Authorization: Bearer xxx 拿 token

        fromBodyField('token') → 從 POST body 的 token 欄位拿 token
      */
      jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 用來解密 token 的密鑰
      /* 
        secretOrKey: process.env.JWT_SECRET
        JWT 的「簽章密鑰」，要用這個來驗證 token 的真偽。

        process.env.JWT_SECRET 代表從 .env 檔讀取這個變數。
      */
      secretOrKey: process.env.JWT_SECRET,

      // 讓 callback 拿到 req 物件
      /* 
        passReqToCallback: true
        讓 Passport 在驗證函式中 把 req 物件也傳進去。

        預設不會傳 req，如果你要讀取 req.headers 或 req.ip，就要開這個。
      */
      passReqToCallback: true,

      // 忽略過期時間，因為舊換新的時候可以允許過期的 token
      // 先忽略過期時間（會自己手動檢查）
      /* 
        ignoreExpiration: true
        讓 Passport 忽略 token 的過期時間。

        有些系統會先檢查過期，再用 refresh token 換新的，所以會需要這個。
      */
      ignoreExpiration: true,
    },
    // req 必須要設定 passReqToCallback 才能使用
    // 因為套件只給解編後的 jwt 內容，不會給原本的 jwt，所以需要自己從 req 裡面拿
    // payload = JWT 的內容
    // done = 跟上面一樣
    async (req, payload, done) => {
      try {
        // 從 req 的 headers 裡面拿到 token
        // req.headers.authorization 的格式是 'Bearer token'
        // const token = req.headers.authorization.split(' ')[1]
        // 從 req 拿 token
        const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)

        // 手動檢查過期
        // 只有 refresh 和 logout 可以允許過期的 token
        // payload.exp 是 JWT 的過期時間，單位是秒，所以要乘以 1000 轉成毫秒
        // Date.now() 是現在的時間，單位是毫秒
        // 判斷 token 有沒有過期（payload.exp 是過期時間，單位秒，要*1000轉毫秒）
        /* 
          const expired = payload.exp * 1000 < Date.now()
          payload.exp 是 JWT 的過期時間（秒）。

          乘 1000 變成毫秒，跟現在時間 Date.now() 比較：
          如果過期 → expired = true
          如果沒過期 → expired = false
        */
        const expired = payload.exp * 1000 < Date.now()

        // 請求的路徑
        // http://localhost:4000/user/abcd?aaa=111&bbb=222
        // req.originUrl = /user/abcd?aaa=111&bbb=222
        // req.baseUrl = /user
        // req.path = /abcd
        // req.query = { aaa: '111', bbb: '222' }
        // 取得目前請求的路由完整路徑
        const url = req.baseUrl + req.path

        // 如果過期且不是刷新或登出路由，直接丟錯誤
        /* 
          if (expired && url !== '/user/refresh' && url !== '/user/logout')
          如果 token 過期，而且請求的路徑不是 refresh 也不是 logout，那就拒絕。
        */
        if (expired && url !== '/user/refresh' && url !== '/user/logout') {
          throw new Error('TOKEN EXPIRED')
        }

        // 檢查使用者是否存在，並且 tokens 裡面有這個 token
        // 找使用者，且 tokens 陣列裡有這個 token（代表還有效）
        /* 
          const user = await User.findOne({ _id: payload._id, tokens: token }).orFail(...)
          在資料庫找符合 _id 和 tokens 的使用者。
          .orFail() → 如果找不到，直接丟錯誤。
        */
        const user = await User.findOne({ _id: payload._id, tokens: token }).orFail(
          new Error('USER NOT FOUND'),
        )
        // 驗證成功，帶使用者和 token 到下一步
        /* 
          return done(null, { user, token })
          驗證成功，回傳一個物件 { user, token } 給 Passport，之後 API 就能用 req.user 取得。
        */
        return done(null, { user, token })
      } catch (error) {
        console.log('passport.js jwt')
        console.error(error)
        if (error.message === 'USER NOT FOUND') {
          return done(null, false, { message: '使用者不存在或 token 已失效' })
        } else if (error.message === 'TOKEN EXPIRED') {
          return done(null, false, { message: 'token 已過期' })
        } else {
          return done(error)
        }
      }
    },
  ),
)

/* 
  Passport 是什麼?
  Passport 是 Node.js 的一個「驗證（authentication）中介層」，

  它幫你處理「使用者要登入」時的驗證流程，比如：
  使用者輸入帳號密碼登入
  用 Google / Facebook / GitHub 登入
  用 JWT token 驗證
  等等…

  📌 重點：它本身不負責怎麼驗證，而是提供一個框架，讓你用各種策略（Strategy）去實作。
*/

/* 
  passport-local 是什麼？ 
  passport-local 是 Passport 的一個策略（Strategy）

  專門用來做「本地登入」（Local Authentication）
  → 也就是使用者輸入 帳號（username/email）+ 密碼 這種方式的登入。

  📦 安裝方式：
  npm install passport-local

  工作原理
  passport-local 幫你把登入流程規劃成三步：

  1. 接收使用者的帳號和密碼
  （你可以決定是用 username 還是 email 當帳號）

  2. 呼叫你提供的驗證函式
  你要自己在這裡去資料庫找該帳號，然後比對密碼是否正確。

  3. 決定驗證成功或失敗
  成功 → 回傳使用者資料，Passport 會幫你建立登入狀態（session 或 JWT）
  失敗 → 回傳錯誤訊息
*/

/* 
  Passport → 登入驗證框架

  passport-local → 一種策略，專門處理帳號密碼登入
  它負責把帳號密碼交給你的驗證邏輯，幫你統一登入流程
  它本身不會幫你比對密碼，你得自己寫
*/
