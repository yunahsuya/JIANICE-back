import { Schema, model } from 'mongoose'

const schema = new Schema(
  {
    // 名稱
    // trim: true,
    name: {
      type: String,
      required: [true, '餐廳名稱是必填的'],
      minlength: [1, '餐廳名稱至少需要 1 個字'],
      maxlength: [50, '餐廳名稱最多只能有 50 個字'],
    },

    // 地址
    address: {
      type: String,
      required: [true, '餐廳地址是必填的'],
      minlength: [1, '餐廳地址至少需要 1 個字'],
      maxlength: [50, '餐廳地址最多只能有 50 個字'],
    },

    phone: {
      type: String,
      required: [true, '餐廳電話是必填的'],
      minlength: [9, '餐廳電話至少需要 9 個字'],
      maxlength: [10, '餐廳電話最多只能有 10 個字'],
    },

    price: {
      type: Number,
      min: [0, '價格不能為負數'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, '描述最多只能有 500 個字'],
    },

    category: {
      type: String,
      required: [true, '分類是必填的'],
      enum: {
        values: [
          '台式',
          '義式',
          '美式',
          '日式',
          '韓式',
          '蔬食',
          '早餐',
          '飲料',
          '麵',
          '飯',
          '義大利麵',
          '漢堡',
          '拉麵',
          '壽司',
          '夜市',
          '披薩',
          '烤肉',
        ],
        message: '請選擇有效的分類',
      },
    },

    sell: {
      type: Boolean,
      default: true,
      required: [true, '是否上架是必填的'],
    },

    image: {
      type: String,
      required: [true, '餐廳圖片是必填的'],
    },

    // 營養資訊
    nutritionInfo: {
      type: String,
    },

    city: {
      type: String,
      minlength: [3, '縣市至少需要 3 個字'],
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('restaurant', schema)
