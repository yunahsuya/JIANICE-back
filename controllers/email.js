import https from 'https'

// 使用 refresh token 取得新的 access token
const getAccessTokenFromRefresh = async () => {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString()

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          if (response.access_token) {
            console.log('成功取得新的 access token')
            resolve(response.access_token)
          } else {
            console.error('無法取得 access token:', response)
            reject(new Error('無法取得 access token'))
          }
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', (error) => {
      console.error('Refresh token 請求錯誤:', error)
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

// 使用 Gmail API 發送郵件（使用 refresh token）
export const sendReportEmail = async (reportData) => {
  try {
    // 使用 refresh token 取得新的 access token
    const accessToken = await getAccessTokenFromRefresh()
    return await sendEmail(reportData, accessToken)
  } catch (error) {
    console.error('取得 access token 失敗:', error)
    throw error
  }
}

// 發送郵件
const sendEmail = async (reportData, accessToken) => {
  return new Promise((resolve, reject) => {
    const categoryMap = {
      technical: '技術問題',
      feature: '功能建議',
      content: '內容錯誤',
      account: '帳戶問題',
      other: '其他',
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff6f00; border-bottom: 2px solid #ff6f00; padding-bottom: 10px; text-align: center;">
          JiaNice 用戶回報訊息
        </h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">📋 回報資訊</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>👤 姓名：</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${reportData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>電子信箱：</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${reportData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>回報類別：</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${categoryMap[reportData.category]}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>📝 主旨：</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${reportData.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>🕒 提交時間：</strong></td>
              <td style="padding: 8px 0;">${new Date().toLocaleString('zh-TW')}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #ff6f00; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #333; margin-top: 0;">💬 詳細描述</h3>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; white-space: pre-wrap; line-height: 1.6;">
            ${reportData.message}
          </div>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #2e7d32;">
            <strong>提示：</strong> 您可以回覆此封 email 來直接回覆用戶
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          此訊息來自 JiaNice 回報系統 | ${new Date().toLocaleString('zh-TW')}
        </p>
      </div>
    `

    // 創建郵件內容（base64 編碼）
    const email = [
      'From: JiaNice System <yunahsuya@gmail.com>',
      `To: ${process.env.ADMIN_EMAIL || 'yunahsuya@gmail.com'}`,
      `Reply-To: ${reportData.email}`,
      `Subject: =?UTF-8?B?${Buffer.from(`[JiaNice 回報] ${reportData.subject}`).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailContent).toString('base64'),
    ].join('\n')

    const postData = JSON.stringify({
      raw: Buffer.from(email).toString('base64'),
    })

    // 使用 Gmail API 發送
    const options = {
      hostname: 'gmail.googleapis.com',
      port: 443,
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('回報 Email 發送成功')
          resolve({ success: true })
        } else {
          console.error('Gmail API 發送失敗:', data)
          reject(new Error('Email 發送失敗'))
        }
      })
    })

    req.on('error', (error) => {
      console.error('Gmail API 請求錯誤:', error)
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

// 發送確認 email 給用戶
export const sendConfirmationEmail = async (reportData) => {
  try {
    // 使用 refresh token 取得新的 access token
    const accessToken = await getAccessTokenFromRefresh()
    return await sendConfirmationEmailWithToken(reportData, accessToken)
  } catch (error) {
    console.error('取得 access token 失敗:', error)
    throw error
  }
}

// 發送確認郵件
const sendConfirmationEmailWithToken = async (reportData, accessToken) => {
  return new Promise((resolve, reject) => {
    const categoryMap = {
      technical: '技術問題',
      feature: '功能建議',
      content: '內容錯誤',
      account: '帳戶問題',
      other: '其他',
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ff6f00;">感謝您的回報！</h2>
        
        <p>親愛的 ${reportData.name}，</p>
        
        <p>我們已收到您的回報訊息，詳細資訊如下：</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">回報摘要</h3>
          <p><strong>類別：</strong> ${categoryMap[reportData.category]}</p>
          <p><strong>主旨：</strong> ${reportData.subject}</p>
          <p><strong>提交時間：</strong> ${new Date().toLocaleString('zh-TW')}</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #ff6f00; margin: 20px 0;">
          <p style="white-space: pre-wrap; line-height: 1.6;">${reportData.message}</p>
        </div>
        
        <p>我們會盡快處理您的問題，並透過此信箱回覆您。</p>
        
        <p>再次感謝您使用 JiaNice！</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          JiaNice 團隊 | ${new Date().toLocaleString('zh-TW')}
        </p>
      </div>
    `

    // 創建郵件內容
    const email = [
      'From: JiaNice System <yunahsuya@gmail.com>',
      `To: ${reportData.email}`,
      `Subject: =?UTF-8?B?${Buffer.from(`[JiaNice] 感謝您的回報 - ${reportData.subject}`).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailContent).toString('base64'),
    ].join('\n')

    const postData = JSON.stringify({
      raw: Buffer.from(email).toString('base64'),
    })

    const options = {
      hostname: 'gmail.googleapis.com',
      port: 443,
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('確認 Email 發送成功')
          resolve({ success: true })
        } else {
          console.error('確認 Email 發送失敗:', data)
          reject(new Error('確認 Email 發送失敗'))
        }
      })
    })

    req.on('error', (error) => {
      console.error('確認 Email 請求錯誤:', error)
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}
