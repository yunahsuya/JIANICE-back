import Diary from '../models/diary.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'

// 新增日記
export const create = async (req, res) => {
  try {
    // 處理多檔案上傳，將所有圖片 URL 存入陣列
    const imageUrls = req.files ? req.files.map((file) => file.path) : []

    await Diary.create({
      date: req.body.date,
      title: req.body.title,
      description: req.body.description,
      image: imageUrls,
      sell: req.body.sell,
      category: req.body.category,
    })
    // 成功的訊息
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '成功建立日記',
    })
  } catch (error) {
    console.log('controllers/diary.js create')
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
    const diarys = await Diary.find()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記列表取得成功',
      diarys,
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

// 日記取得
export const get = async (req, res) => {
  try {
    const diarys = await Diary.find({ sell: true })
    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記取得成功',
      diarys,
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
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('DIARY ID')
    }

    // 處理多檔案上傳，將所有圖片 URL 存入陣列
    const imageUrls = req.files ? req.files.map((file) => file.path) : []

    const updateData = { ...req.body }

    // 修改：處理圖片更新邏輯
    let finalImages = []

    // 如果有現有圖片，解析並加入
    if (req.body.existingImages) {
      try {
        const existingImages = JSON.parse(req.body.existingImages)
        finalImages = [...existingImages]
      } catch (error) {
        console.error('解析現有圖片失敗:', error)
      }
    }

    // 如果有新上傳的圖片，加入
    if (imageUrls.length > 0) {
      finalImages = [...finalImages, ...imageUrls]
    }

    // 只有在有圖片時才更新 image 欄位
    if (finalImages.length > 0) {
      updateData.image = finalImages
    }

    const diary = await Diary.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).orFail(new Error('DIARY NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記更新成功',
      diary,
    })
  } catch (error) {
    console.log('controllers/diary.js update')
    console.error(error)
    if (error.message === 'DIARY ID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的日記 ID',
      })
    } else if (error.message === 'DIARY NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const getId = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('DIARY ID')
    }

    const diary = await Diary.findById(req.params.id).orFail(new Error('DIARY  NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記取得成功',
      diary,
    })
  } catch (error) {
    console.log('controllers/diary.js getId')
    console.error(error)
    if (error.message === 'DIARY ID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的日記 ID',
      })
    } else if (error.message === 'DIARY NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 刪除日記
export const deleteDiary = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('DIARY ID')
    }

    const diary = await Diary.findByIdAndDelete(req.params.id).orFail(new Error('DIARY NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '日記刪除成功',
      diary,
    })
  } catch (error) {
    console.log('controllers/diary.js deleteDiary')
    console.error(error)
    if (error.message === 'DIARY ID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的日記 ID',
      })
    } else if (error.message === 'DIARY NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '日記不存在',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// export const deleteDiary = async (req, res) => {
//   try {
//     await Diary.findByIdAndDelete(req.params.id).orFail(new Error('DIARY NOT FOUND'))
//   } catch (error) {
//     console.log('controllers/diary.js deleteDiary')
//     console.error(error)
//   }
// }
