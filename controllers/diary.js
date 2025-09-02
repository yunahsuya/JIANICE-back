import User from '../models/user.js'  // 改為引入 User 模型
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
import { v2 as cloudinary } from 'cloudinary'

// 從 Cloudinary URL 提取 public_id 的輔助函數
const extractPublicIdFromUrl = (url) => {
  try {
    // Cloudinary URL 格式: https://res.cloudinary.com/[cloud_name]/image/upload/[version]/[public_id].[format]
    const urlParts = url.split('/')
    const lastPart = urlParts[urlParts.length - 1]
    // 移除副檔名
    const publicId = lastPart.split('.')[0]
    return publicId
  } catch (error) {
    console.error('提取 public_id 失敗:', error)
    return null
  }
}

// 從 Cloudinary 刪除圖片的輔助函數
const deleteCloudinaryImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) return

  const deletionPromises = imageUrls.map(async (url) => {
    try {
      const publicId = extractPublicIdFromUrl(url)
      if (publicId) {
        const result = await cloudinary.uploader.destroy(publicId)
        console.log(`刪除 Cloudinary 圖片 ${publicId}:`, result)
        return result
      }
    } catch (error) {
      console.error(`刪除 Cloudinary 圖片失敗 ${url}:`, error)
    }
  })

  await Promise.allSettled(deletionPromises)
}

// 新增日記
export const create = async (req, res) => {
  try {
    // 除錯：檢查 req.user 是否存在
    console.log('create diary - req.user:', req.user)
    console.log('create diary - req.user._id:', req.user?._id)
    
    if (!req.user || !req.user._id) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: '用戶未登入或登入資訊無效',
      })
    }

    // 處理多檔案上傳，將所有圖片 URL 存入陣列
    const imageUrls = req.files ? req.files.map((file) => file.path) : []

    // 準備新的日記資料
const newDiary = {
  date: req.body.date,
  title: req.body.title || '',  // 確保標題不為 undefined
  description: req.body.description,
  image: imageUrls,
  sell: req.body.sell === 'true' || req.body.sell === true, // 轉換為布林值
  category: req.body.category,
}

    // 更新用戶的日記陣列
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { diary: newDiary } },
      { new: true }
    )

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    console.log('create diary - updated user:', user)
    
    // 取得剛新增的日記（陣列中的最後一個）
    const createdDiary = user.diary[user.diary.length - 1]
    
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '成功建立日記',
      diary: createdDiary,
    })
  } catch (error) {
    console.log('controllers/diary.js create - error:')
    console.log(error)

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

// 取得所有日記
export const getAll = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記列表取得成功',
      diarys: user.diary || [],
    })
  } catch (error) {
    console.log('controllers/diary.js getAll')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 日記取得 - 只取得當前用戶的公開日記
export const get = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    // 過濾出公開的日記
    const publicDiarys = (user.diary || []).filter(diary => diary.sell === true)

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記取得成功',
      diarys: publicDiarys,
    })
  } catch (error) {
    console.log('controllers/diary.js get')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 更新日記
export const update = async (req, res) => {
  try {
    console.log('update diary - req.params.id:', req.params.id)
    console.log('update diary - req.body:', req.body)
    
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('DIARY ID')
    }

    // 處理多檔案上傳
    const imageUrls = req.files ? req.files.map((file) => file.path) : []

    // 準備更新資料
    const updateData = { ...req.body }

    // 確保 sell 欄位被正確處理為布林值
    if (req.body.sell !== undefined) {
      updateData.sell = req.body.sell === 'true' || req.body.sell === true
      console.log('update diary - sell value:', req.body.sell, 'converted to:', updateData.sell)
    }

    // 處理圖片更新邏輯
    let finalImages = []
    let imagesToDelete = []

    // 取得現有的日記資料以獲取舊圖片
    const user = await User.findById(req.user._id)
    const existingDiary = user.diary.find(diary => diary._id.toString() === req.params.id)
    
    if (existingDiary && existingDiary.image) {
      // 如果有現有圖片，預設要刪除它們（除非在 existingImages 中保留）
      imagesToDelete = [...existingDiary.image]
    }

    // 如果有現有圖片要保留，解析並加入
    if (req.body.existingImages) {
      try {
        const existingImages = JSON.parse(req.body.existingImages)
        finalImages = [...existingImages]
        // 從要刪除的列表中移除保留的圖片
        imagesToDelete = imagesToDelete.filter(img => !existingImages.includes(img))
      } catch (error) {
        console.error('解析現有圖片失敗:', error)
      }
    }

    // 如果有新上傳的圖片，加入
    if (imageUrls.length > 0) {
      finalImages = [...finalImages, ...imageUrls]
    }

    // 刪除不再使用的 Cloudinary 圖片
    if (imagesToDelete.length > 0) {
      await deleteCloudinaryImages(imagesToDelete)
    }

    // 使用 $set 操作符來更新特定的日記項目，避免觸發整個陣列的驗證
    const result = await User.updateOne(
      { 
        _id: req.user._id,
        'diary._id': req.params.id 
      },
      { 
        $set: { 
          'diary.$.date': updateData.date,
          'diary.$.title': updateData.title,
          'diary.$.description': updateData.description,
          'diary.$.category': updateData.category,
          'diary.$.sell': updateData.sell
        }
      }
    )

    // 如果有圖片要更新
    if (finalImages.length > 0) {
      await User.updateOne(
        { 
          _id: req.user._id,
          'diary._id': req.params.id 
        },
        { 
          $set: { 
            'diary.$.image': finalImages
          }
        }
      )
    }

    if (result.matchedCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶或日記不存在',
      })
    }

    if (result.modifiedCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    }

    // 取得更新後的日記資料
    const updatedUser = await User.findById(req.user._id)
    const updatedDiary = updatedUser.diary.find(diary => diary._id.toString() === req.params.id)

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記更新成功',
      diary: updatedDiary,
    })
  } catch (error) {
    console.log('controllers/diary.js update - error:')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getId = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('DIARY ID')
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    const diary = user.diary.find(diary => diary._id.toString() === req.params.id)
    if (!diary) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記取得成功',
      diary,
    })
  } catch (error) {
    console.log('controllers/diary.js getId')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 刪除日記
export const deleteDiary = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('DIARY ID')
    }

    // 先取得要刪除的日記資料以獲取圖片 URLs
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    const diaryToDelete = user.diary.find(diary => diary._id.toString() === req.params.id)
    if (!diaryToDelete) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    }

    // 從 Cloudinary 刪除圖片
    if (diaryToDelete.image && diaryToDelete.image.length > 0) {
      await deleteCloudinaryImages(diaryToDelete.image)
    }

    // 使用 updateOne 和 $pull 來刪除日記 - 這是最安全的方法
    const result = await User.updateOne(
      { _id: req.user._id },
      { $pull: { diary: { _id: req.params.id } } }
    )

    if (result.matchedCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    if (result.modifiedCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記刪除成功',
    })
  } catch (error) {
    console.log('controllers/diary.js deleteDiary')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}



// 新增：取得用戶的自定義分類
export const getCustomCategories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '取得自定義分類成功',
      categories: user.customCategories || [],
    })
  } catch (error) {
    console.log('controllers/diary.js getCustomCategories')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 新增：新增自定義分類
export const addCustomCategory = async (req, res) => {
  try {
    const { category } = req.body

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '分類名稱不能為空',
      })
    }

    const trimmedCategory = category.trim()

    // 檢查分類名稱長度
    if (trimmedCategory.length > 20) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '分類名稱不能超過 20 個字元',
      })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    // 檢查分類是否已存在
    if (user.customCategories && user.customCategories.includes(trimmedCategory)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '此分類已存在',
      })
    }

    // 新增分類
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { customCategories: trimmedCategory } },
      { new: true }
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: '新增分類成功',
      categories: updatedUser.customCategories,
    })
  } catch (error) {
    console.log('controllers/diary.js addCustomCategory')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 新增：刪除自定義分類
export const deleteCustomCategory = async (req, res) => {
  try {
    const { category } = req.params

    if (!category || typeof category !== 'string') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '分類名稱不能為空',
      })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '用戶不存在',
      })
    }

    // 檢查分類是否存在
    if (!user.customCategories || !user.customCategories.includes(category)) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '此分類不存在',
      })
    }

    // 檢查是否有日記使用此分類
    const hasDiaryWithCategory = user.diary && user.diary.some(diary => diary.category === category)
    if (hasDiaryWithCategory) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無法刪除正在使用的分類，請先修改相關日記的分類',
      })
    }

    // 刪除分類
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { customCategories: category } },
      { new: true }
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: '刪除分類成功',
      categories: updatedUser.customCategories,
    })
  } catch (error) {
    console.log('controllers/diary.js deleteCustomCategory')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}
