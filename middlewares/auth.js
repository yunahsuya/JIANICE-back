import passport from 'passport'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

export const login = (req, res, next) => {
  // 使用 passport 的 login 驗證方法
  // passport.authenticate(驗證方法, 設定, 處理function)
  // session: false = 停用 cookie
  // 處理function 的 (error, user, info) 對應 done() 的三個東西
  passport.authenticate('login', { session: false }, (error, user, info) => {
    // 如果沒有收到使用者資料，或發生錯誤
    if (!user || error) {
      // Local 驗證策略內建的錯誤，缺少帳號密碼欄位時會發生
      if (info?.message === 'Missing credentials') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '請提供帳號密碼',
        })
      }
      // 不是發生錯誤，但是驗證失敗，例如收到 "使用者不存在" 或 "密碼錯誤" 的訊息
      else if (!error && info) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: info.message,
        })
      }
      // 其他錯誤
      else {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '伺服器內部錯誤',
        })
      }
    }
    // 如果驗證成功
    // 將查詢到的使用者資料放入 req 給後續的 middleware 或 controller 使用
    req.user = user
    // 繼續下一步
    next()
  })(req, res, next)
}

export const token = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error, data, info) => {
    console.log('passport.js token')
    console.log(error, data, info)
    if (!data || error) {
      // 是不是 JWT 錯誤，可能是過期、格式錯誤、SECRET 錯誤等
      if (info instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '無效的 token',
        })
      }
      // 其他 info，可能是查無使用者
      else if (info) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: info.message || '無效的 token',
        })
      }
      // 沒有 info，但是有錯誤
      else {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '伺服器內部錯誤',
        })
      }
    }
    req.user = data.user
    req.token = data.token
    next()
  })(req, res, next)
}

export const admin = (req, res, next) => {
  // 檢查使用者是否為管理員
  if (req.user.role !== 'admin') {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: '沒有權限存取此資源',
    })
  }
  next()
}

/* 
  middleware 主要的工作

  檢查：像身份驗證（判斷你是不是有權限）

  處理：例如解析請求裡的 JSON 資料、處理上傳的檔案

  修改：在資料進入最終功能前，加入、改變一些東西

  阻擋：如果不符合規定，拒絕請求並回應錯誤

  放行：確認沒問題後，讓資料繼續流向下一個 middleware 或最終的路由處理函式

  幫你把關、處理和改造資料，讓最後的功能收到乾淨又安全的資料
  */
