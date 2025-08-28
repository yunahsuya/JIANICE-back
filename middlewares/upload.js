import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { StatusCodes } from 'http-status-codes'

// 設定 cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 上傳設定
const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
  }),
  // req = 請求資訊
  // file = 檔案資訊
  // callback(錯誤, 是否允許上傳)
  fileFilter(req, file, callback) {
    console.log('上傳檔案資訊:', file)
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      // 如果檔案類型是 JPEG 或 PNG，允許上傳
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  limits: {
    fileSize: 1024 * 1024, // 限制檔案大小為 1MB
  },
})

/* 
  這是用 ES6 的寫法，把一個匿名函式預設匯出，方便其他檔案 import 進來使用。

  這個函式是 Express 的中間件格式，有 req（請求物件）、res（回應物件）和 next（下一個中間件函式）。
*/
export default (req, res, next) => {
  /* 
    這裡用 multer 的 upload.single('image') 方法建立單檔案上傳中間件，欄位名稱是 'image'。

    但是它不是直接當中間件用，而是直接用函式呼叫的方式，給它 req, res，然後帶一個 callback 處理完成後的狀況（error）。

    這樣寫的好處是：可以在上傳完立刻做錯誤判斷和自訂回應。
  */
  upload.array('image', 12)(req, res, (error) => {
    // upload.single('image')(req, res, (error) => {
    console.log(req, res, '測試')
    // 處理上傳錯誤
    /* 
      如果在上傳檔案過程中發生錯誤（例如檔案格式錯誤、大小超過限制），就會進到這裡。

      面先用 console.error 把錯誤詳細訊息印出來，方便調試。
    */
    if (error) {
      console.error('上傳錯誤:', error)
      /* 
        這裡馬上回應前端，狀態碼是 400（Bad Request），告訴使用者上傳失敗。

        回傳的 JSON 有 success: false 及錯誤訊息，說明可能是檔案格式或大小問題。
      */
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '檔案上傳失敗，請確保檔案類型為 JPEG 或 PNG，且大小不超過 1MB',
      })
    }
    // 繼續下一步
    // 如果沒有錯誤，代表上傳成功，這行印出剛剛上傳成功的檔案資訊，通常會有檔案名稱、路徑、大小等。
    console.log('上傳成功:', req.files)
    /* 
      呼叫 next() 代表「讓 Express 往下一個中間件或路由繼續執行」，

      所以如果檔案成功上傳，接下來可以繼續做資料存資料庫、回應使用者等後續工作。
    */
    next()
  })
}

/* 
  單檔案上傳（欄位名稱是 image）

  主動攔截錯誤，不會讓錯誤亂冒出，給使用者清楚的錯誤訊息

  成功時印出檔案資訊，方便追蹤

  成功後繼續往後走
*/
