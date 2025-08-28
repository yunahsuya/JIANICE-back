// ------------------------------------------------------------------- 1. 匯入 ------------------------------------------------------------------------

// 從套件拿到 HTTP 狀態碼常數（像 200 OK、500 Internal Server Error），避免手寫數字
import { StatusCodes } from 'http-status-codes'

// 讀進 Axios，用來發 HTTP 請求（像你派信差去 HPA 拿資料）
import axios from 'axios'

// Node.js 的檔案系統模組，讀寫檔案用（把快取存成檔案）
import fs from 'fs'

// 處理檔案/資料夾路徑（不同作業系統都能對齊）
import path from 'path'

// 定義 HPA API 的共同網址前綴，之後所有請求都從這裡出發
const HPA_API_BASE_URL = 'https://www.hpa.gov.tw/wf'

// ------------------------------------------------------------------- 2. 建立 Axios 客戶端 ------------------------------------------------------------------------

// const hpaApi = axios.create => 建一個有預設設定的 Axios 實例，像客製化的信差
const hpaApi = axios.create({
  // baseURL: HPA_API_BASE_URL => 預設主機位置是 HPA（省得每次都寫完整網址）
  baseURL: HPA_API_BASE_URL,
  // timeout: 15000 => 最多等 15 秒；超過就當作失敗（避免卡死）
  timeout: 15000,
  // headers: => 預設請求標頭
  headers: {
    // 'Content-Type': 'application/json' => 告訴對方：我用 JSON 溝通
    'Content-Type': 'application/json',
    // Accept: 'application/json' => 我也希望你回 JSON 給我
    Accept: 'application/json',
  },
})

// ------------------------------------------------------------------- 3. 快取檔案位置 ------------------------------------------------------------------------

// const getCurrentYear = () => 箭頭函式：取得今年年份 (動態取得當前年份)
const getCurrentYear = () => {
  // return new Date().getFullYear() => 例如 2025 (取當年的年份)
  return new Date().getFullYear()
}

// 快取檔案路徑
/* 
  const CACHE_FILE_PATH = path.join(process.cwd(), 'cache', 'hpa-news-cache.json')

  這是 定義檔案路徑：
  process.cwd() = 程式啟動時所在的資料夾（根目錄）。
  cache/hpa-news-cache.json = 存放快取檔的相對位置。
  合起來 → 組成「這個檔案該存在哪裡」

 「組出檔案的完整路徑」。
    👉 就像是：「我家（專案根目錄） → 地下室 cache → hpa-news-cache.json」。
    檔案會不會真的存在，要看後面程式有沒有去 寫入

  在專案根目錄裡，放一個叫 cache 的資料夾，裡面有一個 hpa-news-cache.json 檔案
  不管專案在哪台電腦上跑，都能保證「相對路徑正確」。
  不用手動打一個超長的路徑，比如 C:/user/... 或 /home/...，就能通用

  const CACHE_FILE_PATH = path.join(process.cwd(), 'cache', 'hpa-news-cache.json') => 用目前專案根目錄（process.cwd()）＋cache/…json 組出快取檔的絕對路徑

  process.cwd() => 目前專案根目錄（就是你專案跑起來的最外層資料夾 📂）

  cwd = current working directory。
  就是「程式現在在哪個資料夾裡跑」。
  想像你站在專案的最外層，這就是 process.cwd()

  'cache' = 資料夾名稱，專門放快取檔案的地方 (如果沒有這個資料夾，程式會自動去建立)

  hpa-news-cache.json' = 檔案名稱
*/
const CACHE_FILE_PATH = path.join(process.cwd(), 'cache', 'hpa-news-cache.json')

// ------------------------------------------------------------------- 4. 設計「年度」快取結構 ------------------------------------------------------------------------

//

/* 
  年度快取結構 => 快取不是一次放所有年份的新聞，而是「分年度」存
  
  如果我想要「2025年」的新聞，就只需要拿 cache.data[2025]。
  不用去翻全部資料，效率比較好～

  所以「年度快取」就是針對 某一年份的新聞資料 來做快取


  年度快取 vs 每日清除
  年度快取：就是把新聞資料照年份分開存。比如 cache.data["2025"] = [新聞...]。
  你說你是每天更新 → 那就等於「每天都把舊的清掉，再抓一份新的」，所以確實不太需要分年度。
  但「分年度」的設計，是因為有些情境可能要查過去幾年的新聞
*/

// 快取機制 - 按年份分別快取
// const cache => 建立一個放快取的物件
const cache = {
  // data: {} => data 是一個物件 (以年份為key)：data[2025] = [...] 存該年的新聞。
  data: {},
  // timestamp: {} => timestamp[2025] = 172… 記錄每年快取寫入時間（毫秒）
  timestamp: {},
  // 快取有效期限：2天(48小時) =>（ 2 * 24 * 60 * 60 * 1000 毫秒）
  ttl: 2 * 24 * 60 * 60 * 1000,
}

// ------------------------------------------------------------------- 5. 檔案快取：確保資料夾、讀取與寫入 ------------------------------------------------------------------------

// 把資料放在「腦袋（記憶體）」很快，但會忘；放在「抽屜（硬碟）」比較慢，但不會忘。這段就是腦袋↔抽屜的搬家員

// 確保快取目錄存在
// const ensureCacheDir = () => 檢查/建立快取資料夾
const ensureCacheDir = () => {
  // const cacheDir = path.dirname(CACHE_FILE_PATH => 取出快取檔所在的資料夾路徑
  const cacheDir = path.dirname(CACHE_FILE_PATH)
  // 如果沒有這個資料夾，程式會自動去建立，所以資料夾名稱「cache」其實就是你在這行程式碼裡定義的
  // if (!fs.existsSync(cacheDir)) => 如果資料夾不存在…
  if (!fs.existsSync(cacheDir)) {
    // fs.mkdirSync(cacheDir, { recursive: true }) => 建立資料夾（recursive 可一次建多層）
    fs.mkdirSync(cacheDir, { recursive: true })
  }
}

// 從檔案載入快取
/* 
  const loadCacheFromFile = () => 嘗試把快取從硬碟讀回記憶體
  作用：啟動時，先試著把快取 JSON 讀回來。
  如果不做 → 每次重啟都要重抓 API，很浪費
*/
const loadCacheFromFile = () => {
  // try => 例外處理開始
  try {
    // ensureCacheDir() => 先確保資料夾存在
    ensureCacheDir()
    // if (fs.existsSync(CACHE_FILE_PATH)) => 如果快取檔存在…
    if (fs.existsSync(CACHE_FILE_PATH)) {
      // const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8') => 讀文字內容
      const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8')
      /* 
        const parsed = JSON.parse(cacheData) => 轉成物件

        為什麼要 JSON.parse(cacheData) 把資料轉成物件？
        因為從檔案讀回來的是「字串」。

        要轉成「物件」，程式才好操作。
        例：
        "{\"標題\":\"新聞1\"}" → 轉成 { 標題: "新聞1" }

        因為從檔案讀出來的東西，一定是純文字

        舉例：
        讀到的內容是這樣一段字串：
        "{\"data\":{\"2025\":[{\"標題\":\"新聞1\"}]},\"timestamp\":{}}"

        可是你要在程式裡面操作的，是「物件」👇：
        {
          data: {
            2025: [{ 標題: "新聞1" }]
          },
          timestamp: {}
        }

        👉 所以必須用 JSON.parse(...) 把字串轉回「JavaScript 物件」，程式才好操作
      */
      const parsed = JSON.parse(cacheData)
      cache.data = parsed.data || {}
      cache.timestamp = parsed.timestamp || {}
      console.log('快取已從檔案載入')
    }
    // } catch (error) => 抓讀檔/解析出錯的情況
  } catch (error) {
    console.log('載入快取檔案失敗，使用空快取:', error.message)
    /* 
      cache.data = {} => 清空到安全狀態

      這樣做是 保險：確保快取變數回到「乾淨的空物件」。
      如果快取壞掉了，至少程式不會拿到舊資料亂跑
    */
    cache.data = {}
    cache.timestamp = {}
  }
}

// ------------------------------------------------------------------- 5. 檔案快取：確保資料夾、讀取與寫入 ------------------------------------------------------------------------

// 儲存快取到檔案
// const saveCacheToFile = () => 把記憶體快取寫回硬碟
/* 
  const saveCacheToFile = () => ...
  作用：把「記憶體快取」寫回硬碟 JSON 檔。
  如果不做，伺服器一重啟，快取就全沒了

  為什麼要把「記憶體快取」寫回硬碟？
  因為：
  記憶體快取（cache 變數）只存在程式跑的時候。
  一旦伺服器重啟、掛掉，記憶體裡的東西就消失啦 🫠。

  為了避免「每次重開伺服器就得重新抓 API」的情況，就要 把快取存到硬碟（json 檔）。
  這樣下次伺服器重啟時，可以重新讀回來，等於「延續快取的生命」

  小小比喻：
  記憶體快取 = 白板上的筆記，方便隨時擦寫。
  硬碟 JSON 檔 = 筆記本，萬一白板擦掉了，還能翻筆記本找回來
*/
const saveCacheToFile = () => {
  try {
    // ensureCacheDir() => 確保資料夾存在
    ensureCacheDir()
    /* 
      const cacheData => 要寫入的內容（物件）
      
      意思就是：你準備要存到檔案裡的內容。
      這樣以後重啟可以直接讀回，不用再呼叫 API
    */
    const cacheData = {
      // data: cache.data => 包含資料
      data: cache.data,
      // timestamp: cache.timestamp => 包含每年寫入時間
      timestamp: cache.timestamp,
    }
    // fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2)) => 同步寫檔（排版縮排 2 格，方便人類閱讀）
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2))
    console.log('快取已儲存到檔案')
  } catch (error) {
    console.error('儲存快取檔案失敗:', error.message)
  }
}

// ------------------------------------------------------------------- 6. 快取的讀、寫、驗證、清除 ------------------------------------------------------------------------

// 檢查快取是否有效
/* 
  const isCacheValid = (year) => 檢查某年份的快取還沒過期嗎？
  為什麼要檢查：避免拿「過期的快取」。
  例如：去年的新聞，現在已經不是最新，就該重抓
*/
const isCacheValid = (year) => {
  /* 
    if (!cache.data[year] || !cache.timestamp[year]) return false

    意思：
    如果 沒有這一年的資料，或
    沒有這一年的時間戳記（存的時間），
    → 那就判定「快取無效」，回傳 false
  */
  if (!cache.data[year] || !cache.timestamp[year]) return false
  // const now = Date.now() => 目前時間（毫秒）
  const now = Date.now()
  // return now - cache.timestamp[year] < cache.ttl => 距離上次寫入是否小於 TTL（48 小時）
  return now - cache.timestamp[year] < cache.ttl
}

// 取得快取資料
// const getCachedData = (year) => 取某年的快取內容 (當年的快取內容)
/* 
  const getCachedData = (year) => ...
  就是單純拿「這一年的快取資料」。
  把存好的東西拿出來用。
*/
const getCachedData = (year) => {
  /* 
    return cache.data[year] => 直接回傳陣列（可能為 undefined）=> 新聞很多，一次存多篇 (所以用 陣列)

    這會回傳某一年的新聞陣列。
    因為 API 回來的新聞本來就是「一篇一篇」，自然會用陣列存。
    例如： [ {title: "兒童健康"}, {title: "流感"} ]

    陣列裡面：一篇一篇的新聞物件。
    可能是 [ {標題:"新聞1"}, {標題:"新聞2"} ]

    例如 
    cache.data[2025] 就是 2025 年的快取內容
  */
  return cache.data[year]
}

// 設定快取資料
//
/* 
  const setCachedData = (year, data) => 寫入某年的快取

  把某一年的新聞存進快取。
 「哪年」就是你呼叫的時候傳的參數（例如 setCachedData(2025, 新聞陣列)）

 「把今年（或某年）的新聞丟進快取」。
  你有判斷「今年」→ 所以會存到 cache.data["2025"]。
  不是它自動知道今年，而是你呼叫的時候塞了「今年」這個 year

  const currentYear = new Date().getFullYear() → 會算出今年，比如現在就是 2025

  這個值被當成 year 傳進去 → 所以 cache.data["2025"] = data。
  所以不是快取「自己知道今年」，而是你程式碼「塞進去今年」
*/
const setCachedData = (year, data) => {
  // cache.data[year] = data => 存資料
  cache.data[year] = data
  // cache.timestamp[year] = Date.now() => 記住寫入時間
  cache.timestamp[year] = Date.now()
  console.log(`快取已更新，年份: ${year}，時間:`, new Date().toLocaleString())
  // 儲存到檔案
  /* 
    saveCacheToFile() → 「同步寫回硬碟」
    寫回：快取可以長期保存。
    不寫：伺服器一掛，快取消失，下次啟動要全部重抓
  */
  saveCacheToFile()
}

// 清除快取
// const clearCache = (year = null) => 可以清某年，或全部
const clearCache = (year = null) => {
  // if (year) => 如果有指定年份…
  if (year) {
    // delete cache.data[year] => 刪除該年的資料
    delete cache.data[year]
    // delete cache.timestamp[year] => 刪除該年的時間戳
    delete cache.timestamp[year]
    console.log(`快取已清除，年份: ${year}`)
    // else => 否則（沒給年份）
  } else {
    // 清除所有快取
    /* 
      cache.data = {} => 全清（所有年份的快取）
      這是「全清」，把所有年份的快取資料清掉。
      什麼時候會用？例如跨年了（2026），舊的 2025 資料就失效了。
      不清也行，但就可能拿到舊資料
    */
    cache.data = {}
    cache.timestamp = {}
    console.log('所有快取已清除')
  }
  // 更新檔案
  // saveCacheToFile() => 清完就同步寫入到硬碟
  saveCacheToFile()
}

// ------------------------------------------------------------------- 7. 年份查詢參數與 API 呼叫 ------------------------------------------------------------------------

// const buildYearRange = (year) => 幫指定年份組出查詢用的日期範圍
/* 
  buildYearRange(year)
  幫這一年組出「查詢日期範圍」。
  比如 2025 → { start: "2025-01-01", end: "2025-12-31" }。
  讓 API 知道要抓哪段期間的新聞。
*/
const buildYearRange = (year) => {
  // return { startdate: \${year}/1/1`, enddate: `${year}/12/31` }` => 回傳像 { startdate: '2025/1/1', enddate: '2025/12/31' }
  return { startdate: `${year}/1/1`, enddate: `${year}/12/31` }
}

// const fetchFromHpaApi = async (params = {}) => 非同步函式，真的去呼叫 HPA API
const fetchFromHpaApi = async (params = {}) => {
  try {
    // const { data } = await hpaApi.get('/newsapi.ashx', { params }) => GET /newsapi.ashx 並帶上 params；解構回傳物件裡的 data
    /* 
      const { data } = await hpaApi.get('/newsapi.ashx', { params })

      真的去呼叫 API，要的網址就是你貼的 https://www.hpa.gov.tw/wf/newsapi.ashx。
      呼叫 API = 跟對方伺服器要資料。
      回來會有一個物件，裡面有很多欄位，你只取 data（新聞陣列）

      意思：發一個 GET 請求去 /newsapi.ashx，帶上參數。
      API 回的東西會有個大包裝 → { data: {...} }。
      用解構方式直接拿裡面的 data（新聞內容）。
    */
    const { data } = await hpaApi.get('/newsapi.ashx', { params })
    // return data => 回傳資料本體
    return data
  } catch (error) {
    console.error('國民健康署API請求失敗:', error?.message || error)
    // throw new Error('無法從國民健康署取得資料') => 把錯誤往外丟，讓上層決定怎麼回應
    throw new Error('無法從國民健康署取得資料')
  }
}

// ------------------------------------------------------------------- 8. 年份判斷與過濾 ------------------------------------------------------------------------

// 檢查日期是否為指定年份
// const isTargetYear = (dateStr, targetYear) => 看某個日期字串是不是在 targetYear
const isTargetYear = (dateStr, targetYear) => {
  // if (!dateStr) return false => 沒日期就直接不是
  if (!dateStr) return false
  // try => 防呆：解析日期可能失敗
  try {
    // const d = new Date(dateStr) => 轉成 Date 物件
    /* 
      const d = new Date(dateStr)
      把「字串型態的日期」轉成 JS 的 Date 物件。
      這樣才能比較、排序、轉格式
    */
    const d = new Date(dateStr)
    // if (isNaN(d.getTime())) return false => 解析失敗（Invalid Date）就 false
    /* 
      if (isNaN(d.getTime())) return false
      如果 dateStr 根本不是有效日期 → Invalid Date。
      判斷失敗就回 false
    */
    if (isNaN(d.getTime())) return false
    // return d.getFullYear() === targetYear => 年份相等才算
    return d.getFullYear() === targetYear
  } catch {
    return false
  }
}

// 過濾指定年份的新聞
// const filterByYear = (list, targetYear) => 把一堆新聞過濾出「發布日期在該年」的
const filterByYear = (list, targetYear) => {
  // if (!Array.isArray(list)) return [] => 不是陣列就回空陣列
  if (!Array.isArray(list)) return []

  console.log(`原始資料筆數: ${list.length}`)
  console.log(`API參數範圍: ${targetYear}/1/1 - ${targetYear}/12/31`)

  // const filtered = list.filter((item) => 開始篩選
  const filtered = list.filter((item) => {
    if (!item || typeof item !== 'object') return false

    // const publishDate = item['發布日期'] => 取出「發布日期」（HPA 的欄位名）
    const publishDate = item['發布日期']
    // const modifyDate = item['修改日期'] => 取出「修改日期」
    const modifyDate = item['修改日期']

    // 發布日期必須是指定年份
    // const publishedInTargetYear = isTargetYear(publishDate, targetYear) => 判斷是否為目標年份
    const publishedInTargetYear = isTargetYear(publishDate, targetYear)

    // 暫時只檢查發布日期
    // const shouldInclude = publishedInTargetYear => 是否要包含
    const shouldInclude = publishedInTargetYear

    if (shouldInclude) {
      console.log('符合條件:', {
        // 標題: item['標題'] => 顯示標題
        標題: item['標題'],
        // 發布日期: publishDate => 顯示發布日
        發布日期: publishDate,
        // 修改日期: modifyDate => 顯示修改日
        修改日期: modifyDate,
      })
    } else {
      console.log('不符合條件:', {
        標題: item['標題'],
        發布日期: publishDate,
        修改日期: modifyDate,
        發布日期是否目標年份: publishedInTargetYear,
      })
    }

    // return shouldInclude => 決定是否保留這筆
    return shouldInclude
  })

  console.log(`過濾後筆數: ${filtered.length}`)
  // return filtered => 回傳過濾結果 (filter 結束，得到新陣列)
  return filtered
}

// ------------------------------------------------------------------- 9. 取得或更新該年快取（整合流程） ------------------------------------------------------------------------

// 取得或更新快取資料
// const getOrUpdateCache = async (year) => 這是整段流程的「入口」，先看快取，不行再打 API
/* 
  const getOrUpdateCache = async (year) => ...
  這是整個流程的「入口」。
  先看快取。
  如果快取沒資料，就「再呼叫 API」（= 重新去抓資料）
*/
const getOrUpdateCache = async (year) => {
  // 檢查快取是否有效
  // if (isCacheValid(year)) => 還有效
  if (isCacheValid(year)) {
    console.log(`使用快取資料，年份: ${year}`)
    // return getCachedData(year) => 直接回快取
    /* 
      return getCachedData(year)
      意思：直接回傳快取裡的資料。
      不用再呼叫 API

      如果不寫這個，就少了一個「拿資料」的出口。你每次都要自己去 cache.data[year] 抓，比較麻煩

      如果每次都直接 cache.data[year] 抓，會怎樣？
      如果你都用 cache.data[year]，程式就單純取「記憶體裡的值」。

      cache.data[year] 只是取記憶體值，會不會耗效能？
      不會！🌱
      
      因為：
      記憶體讀取 → 就好像你手伸到口袋拿手機一樣，超快。
      呼叫 API → 像是跑去便利商店買東西，要走出去、等、再回來，會花時間。
      所以用快取（記憶體裡的值）就是為了省掉「每次都去便利商店」的成本。
      👉 不會增加效能負擔，反而是幫助效能變好

      問題：假設該年份根本沒有資料（undefined），程式可能會爆錯，然後你得自己判斷「要不要呼叫 API」。
      所以才會包成 getCachedData(year)，裡面可以順便幫你做檢查（有就回資料，沒有就回 undefined）。


    */
    return getCachedData(year)
  }

  // 快取無效，從API取得新資料
  console.log(`快取已過期，從API取得新資料，年份: ${year}`)

  // const range = buildYearRange(year) => 組查詢日期範圍
  /* 
    const range = buildYearRange(year)
    幫這一年組出查詢日期範圍。
    讓 API 知道要抓哪一年的新聞

    就是幫 API 組參數，比如：
    startDate=2025-01-01
    endDate=2025-12-31
    這樣 API 才知道要給你哪一段新聞
  */
  const range = buildYearRange(year)
  // const data = await fetchFromHpaApi(range) => 去 HPA 抓資料
  const data = await fetchFromHpaApi(range)
  // const filtered = filterByYear(data, year) => 只保留該年的
  const filtered = filterByYear(data, year)

  // 更新快取
  // setCachedData(year, filtered) => 寫進記憶體＋硬碟
  setCachedData(year, filtered)

  // return filtered => 回傳結果
  return filtered
}

// ------------------------------------------------------------------- 10. 對外 API：今年全部 ------------------------------------------------------------------------

// 2025年全部（使用快取）
// export const getAllNews = async (_req, res) => 匯出一個路由處理器，回傳「今年」的全部新聞
/* 
  export const getAllNews = async (_req, res) => ...
  匯出一個 API 路由處理器。
  _req：參數叫 req，前面加 _ 代表「這裡沒用到」

  前面加 _ 的意思：這個參數有傳進來，但程式沒用到。 
  不代表「程式沒用到」，而是「這個 function 的第一個參數沒用到」
*/
export const getAllNews = async (_req, res) => {
  try {
    // const currentYear = getCurrentYear() => 取得今年（例如 2025）
    const currentYear = getCurrentYear()
    console.log(`請求API參數，年份: ${currentYear}`)

    // const filtered = await getOrUpdateCache(currentYear) => 取快取或打 API
    const filtered = await getOrUpdateCache(currentYear)

    // res.status(StatusCodes.OK).json => 回 200，內容是 JSON
    /* 
      res.status(StatusCodes.OK).json(...)
      回應一個 200 OK 狀態碼。
      回應內容用 JSON 格式（因為前端好解析）
    */
    res.status(StatusCodes.OK).json({
      success: true,
      message: `${currentYear}年新聞（已過濾）`,
      // data: filtered => 新聞陣列
      /* 
        data: filtered
        filtered 是一個「新聞陣列」。
        因為新聞很多，所以存在陣列裡
      */
      data: filtered,
      // year: currentYear => 回傳年份
      year: currentYear,
      /* 
        cached: isCacheValid(currentYear)
        告訴前端：這資料是「新抓的」還是「用快取的」

        這是回傳給前端的提示：
        cached: true → 「這批資料是快取的」
        cached: false → 「這批資料是剛從 API 抓的」

        為什麼要知道？
        前端就能決定要不要顯示「更新時間」或「這是快取資料」。
        對除錯或效能分析也有幫助。
      */
      cached: isCacheValid(currentYear),
      /* 
        cacheTimestamp: cache.timestamp[currentYear] => 如果有快取時間
        
        ? new Date(cache.timestamp[currentYear]).toLocaleString() => 轉成人類可讀字串
        : null => 否則 null
      */
      /* 
      new Date(cache.timestamp[currentYear]).toLocaleString()
      把「儲存時間戳記」轉成人類可讀的字串。
      不轉的話會顯示像 1734716400000（很醜的毫秒數）
     */
      cacheTimestamp: cache.timestamp[currentYear]
        ? new Date(cache.timestamp[currentYear]).toLocaleString()
        : null,
    })
  } catch (error) {
    /* 
      res => 鏈式呼叫開始
      
      .status(StatusCodes.INTERNAL_SERVER_ERROR) => 回 500
    */
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '取得新聞失敗' })
  }
}

// ------------------------------------------------------------------- 11. 今年 + 關鍵字搜尋（必填 keyword） ------------------------------------------------------------------------

// 當年 + 關鍵字（使用快取並過濾）
// export const searchNewsByKeyword = async (req, res) => 路由處理
export const searchNewsByKeyword = async (req, res) => {
  try {
    // const { keyword } = req.query => 從查詢字串抓 keyword
    /* 
      const { keyword } = req.query
      從網址 query string 拿出 keyword。
      例：/news?keyword=兒童 → req.query.keyword = "兒童"。
    */
    const { keyword } = req.query
    // if (!keyword) => 沒給關鍵字…
    if (!keyword) {
      // return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '請提供 keyword' }) => 回 400（缺參數）
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '請提供 keyword' })
    }

    // const currentYear = getCurrentYear() => 今年
    const currentYear = getCurrentYear()
    // const allData = await getOrUpdateCache(currentYear) => 拿今年資料（用快取）
    /* 
      const allData = await getOrUpdateCache(currentYear) => 不是內建方法，是程式自己寫的函式。
      意思：拿今年的資料 → 優先快取，不行再呼叫 API
    */
    const allData = await getOrUpdateCache(currentYear)

    // 在快取資料中搜尋關鍵字
    // const filtered = allData.filter => 過濾包含關鍵字的
    const filtered = allData.filter(
      /* 
        includes => 是大小寫敏感，中文通常沒差，但若有英文關鍵字，可能要考慮大小寫或改用正則

        includes
        是大小寫敏感。
        例："Hello".includes("h") → false（因為大寫 H ≠ 小寫 h）
      */
      (item) => item['標題']?.includes(keyword) || item['內容']?.includes(keyword),
    )

    // res.status(StatusCodes.OK).json => 回 200
    res.status(StatusCodes.OK).json({
      success: true,
      message: `${currentYear}年關鍵字新聞（已過濾）`,
      data: filtered,
      year: currentYear,
      cached: isCacheValid(currentYear),
      cacheTimestamp: cache.timestamp[currentYear]
        ? new Date(cache.timestamp[currentYear]).toLocaleString()
        : null,
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '搜尋新聞失敗' })
  }
}

// ------------------------------------------------------------------- 12. 今年 + （可選）關鍵字搜尋 ------------------------------------------------------------------------

// 當年 + (可選) 關鍵字（使用快取並過濾）
export const searchNews = async (req, res) => {
  try {
    // const { keyword } = req.query => 可能有，也可能沒有關鍵字
    const { keyword } = req.query
    // const currentYear = getCurrentYear() => 今年。
    const currentYear = getCurrentYear()

    // const allData = await getOrUpdateCache(currentYear) => 先拿今年資料
    const allData = await getOrUpdateCache(currentYear)

    // 如果有關鍵字，在快取資料中搜尋
    // let filtered = allData => 預設：不過濾
    let filtered = allData
    // if (keyword) => 有關鍵字才過濾
    if (keyword) {
      filtered = allData.filter(
        (item) => item['標題']?.includes(keyword) || item['內容']?.includes(keyword),
      )
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${currentYear}年搜尋新聞（已過濾）`,
      data: filtered,
      year: currentYear,
      cached: isCacheValid(currentYear),
      cacheTimestamp: cache.timestamp[currentYear]
        ? new Date(cache.timestamp[currentYear]).toLocaleString()
        : null,
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '搜尋新聞失敗' })
  }
}

// ------------------------------------------------------------------- 13. 今年最新新聞（其實是同一批資料） ------------------------------------------------------------------------

// 當年最新新聞（使用快取）
export const getLatestNews = async (_req, res) => {
  try {
    // const currentYear = getCurrentYear() => 今年
    const currentYear = getCurrentYear()
    // const filtered = await getOrUpdateCache(currentYear) => 取今年的（目前沒有另外做「排序最新」的邏輯）
    const filtered = await getOrUpdateCache(currentYear)

    res.status(StatusCodes.OK).json({
      success: true,
      // message: \${currentYear}年最新新聞（已過濾）=> 語意是「今年新聞」，若要「真的最新」，可在這裡加排序
      message: `${currentYear}年最新新聞（已過濾）`,
      data: filtered,
      year: currentYear,
      cached: isCacheValid(currentYear),
      cacheTimestamp: cache.timestamp[currentYear]
        ? new Date(cache.timestamp[currentYear]).toLocaleString()
        : null,
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '取得新聞失敗' })
  }
}

// ------------------------------------------------------------------- 14. 手動清除快取端點 ------------------------------------------------------------------------

// 新增：手動清除快取端點（可選）
export const clearCacheEndpoint = async (req, res) => {
  try {
    // const { year } = req.query => 可帶 year 指定清哪一年；不帶就全清
    const { year } = req.query
    // clearCache(year) // 如果沒有提供year，會清除所有快取 (呼叫清快取)
    clearCache(year)
    res.status(StatusCodes.OK).json({
      success: true,
      // message: year ? \${year}年快取已清除` : '所有快取已清除',` => 根據是否有 year 給不同訊息
      message: year ? `${year}年快取已清除` : '所有快取已清除',
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '清除快取失敗' })
  }
}

// ------------------------------------------------------------------- 15. 啟動時從檔案把快取載回來 ------------------------------------------------------------------------

// 在伺服器啟動時載入快取
// loadCacheFromFile() => 一啟動就把硬碟的快取讀回記憶體，避免剛開機就空空的
loadCacheFromFile()

/* 
  1. 為什麼要用 JSON 溝通跟回應？

  因為 JSON 就像是前後端溝通的共同語言。
  如果不用「資料庫」，只要暫存 API 回來的資料，就會用 JSON 存在檔案裡（快取）。
  優點：簡單、結構清楚，程式一讀就能轉成物件來用。

  因為 JSON 是一種通用的資料格式，像「國際語言」一樣 🌍。電腦跟電腦、API 跟前端之間，都能輕鬆理解 JSON。
  JSON 長得就是一種「文字版的物件」：{ "標題": "新聞A", "日期": "2025-01-01" }
  它不像資料庫那麼複雜，也不像純文字那麼難懂，剛剛好適合「傳資料」💌。

  👉 所以 API 回應、快取檔案存放，最常見就是用 JSON

*/
