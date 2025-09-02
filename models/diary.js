import { Schema, model } from 'mongoose'

const schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: [true, '用戶是必填的'], // 新增這行
    },

    // 日期
    date: {
      type: Date,
      required: false, // ✅ 不一定要有
    },

    // 標題
    title: {
      type: String,
      required: [true, '標題是必填的'],
    },

    // 描述
    description: {
      type: String,
      required: [true, '每日三件好事是必填的'],
    },

    // 圖片
    image: {
      type: [String],
      required: [true, '圖片是必填的'],
    },

    // 上架
    sell: {
      type: Boolean,
      default: true,
    },

    // 分類
    category: {
      type: String,
      required: [true, '分類是必填的'],
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('diary', schema)
