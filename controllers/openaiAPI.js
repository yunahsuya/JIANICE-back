// index.js（範例程式）
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 獲取當前檔案的目錄路徑
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 載入 .env 檔案（指定路徑到 back 目錄）
config({ path: join(__dirname, '..', '.env') })

import OpenAI from 'openai'

// 測試用
console.log(process.env.OPENAI_API_KEY)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function run() {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: '你是一個幫忙寫程式的助理' },
      { role: 'user', content: '用 Node.js 寫一個基本的 ChatGPT 呼叫範例' },
    ],
  })

  console.log('AI 回覆：', response.choices[0].message.content)
}
run().catch(console.error)
