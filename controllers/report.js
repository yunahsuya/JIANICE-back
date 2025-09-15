import { StatusCodes } from 'http-status-codes'
import { sendReportEmail, sendConfirmationEmail } from './email.js'
import User from '../models/user.js'

// 創建回報訊息（只發 email，不存資料庫）
export const create = async (req, res) => {
  try {
    const { name, email, category, subject, message } = req.body

    // 基本驗證
    if (!name || !email || !category || !subject || !message) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '所有欄位都是必填的',
      })
    }

    // 驗證 email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請輸入有效的電子信箱格式',
      })
    }

    // 驗證類別
    const validCategories = ['technical', 'feature', 'content', 'account', 'other']
    if (!validCategories.includes(category)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的回報類別',
      })
    }

    // 檢查用戶是否存在，如果不存在則創建
    let user = await User.findOne({ email: email.trim().toLowerCase() })

    if (!user) {
      // 如果用戶不存在，創建一個新用戶（只包含必要欄位）
      user = new User({
        email: email.trim().toLowerCase(),
        account: email.split('@')[0], // 使用 email 前綴作為帳號
        password: 'temp_password', // 臨時密碼，用戶可以稍後設定
        reportCount: 0,
        lastReportDate: null,
      })
      await user.save()
    }

    // 檢查今天的回報次數限制
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 設定為今天的開始時間

    const lastReportDate = user.lastReportDate ? new Date(user.lastReportDate) : null
    const isNewDay = !lastReportDate || lastReportDate < today

    // 如果是新的一天，重置計數
    if (isNewDay) {
      user.reportCount = 0
      user.lastReportDate = today
    }

    // 檢查是否超過每日限制
    if (user.reportCount >= 3) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: '今天已達到回報訊息的上限（3次），請明天再試',
      })
    }

    // 增加回報計數
    user.reportCount += 1
    await user.save()

    const reportData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    }

    // 發送 email 給管理員
    await sendReportEmail(reportData)

    // 發送確認 email 給用戶
    await sendConfirmationEmail(reportData)

    res.status(StatusCodes.OK).json({
      success: true,
      message: `回報訊息已成功提交！我們已發送確認 email 給您，並會盡快處理您的問題。\n今日剩餘回報次數：${3 - user.reportCount}次`,
    })
  } catch (error) {
    console.error('處理回報訊息失敗:', error)

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '發送失敗，請稍後再試或直接聯繫我們',
    })
  }
}
