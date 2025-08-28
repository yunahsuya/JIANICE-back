// ESLint 官方提供的 JavaScript 規則集合
import js from '@eslint/js'

// 提供各種全域變數設定，例如 node、browser 等
import globals from 'globals'

// ESLint 官方提供的 helper，用來更清楚地寫配置
import { defineConfig } from 'eslint/config'

// 把 Prettier 整合到 ESLint，讓 ESLint 幫你自動檢查程式碼排版
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

/* 匯出 ESLint 配置
  
  用 defineConfig 包起來
  裡面是一個陣列，每個元素都是不同的 ESLint 設定區塊。

  為什麼是陣列？
  因為你可以針對不同檔案類型、環境分別設定
*/
export default defineConfig([
  {
    // files → 指定檢查哪些檔案（所有 .js、.mjs、.cjs）
    files: ['**/*.{js,mjs,cjs}'],

    // plugins: { js } → 使用 @eslint/js 的規則
    plugins: { js },

    // extends: ['js/recommended'] → 套用官方推薦的 JS 規則
    extends: ['js/recommended'],
  },
  /* 
    這裡告訴 ESLint，這些檔案是 Node.js 環境：

    globals.node → Node.js 全域變數，例如 process、__dirname

    不然 ESLint 會認為這些變數不存在，報錯
  */
  { files: ['**/*.{js,mjs,cjs}'], languageOptions: { globals: globals.node } },

  /* 
    套用 eslint-plugin-prettier/recommended：

    把 Prettier 的規則，加入 ESLint。

    如果程式碼不符合 Prettier 標準，ESLint 會直接提示
  */
  eslintPluginPrettierRecommended,
  {
    // rules → 自訂規則
    rules: {
      // 'no-unused-vars' → 變數若宣告但沒用會警告
      // { argsIgnorePattern: '^_' } → 如果函式參數名字以 _ 開頭，就算沒用也不會警告
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
])

/* 
  這份設定做了幾件事：

  ESLint 官方推薦規則，套用在 JS 檔案。

  指定 Node.js 環境，避免全域變數報錯。

  整合 Prettier，自動檢查程式碼排版。

  忽略 _ 開頭的未使用參數。
*/
