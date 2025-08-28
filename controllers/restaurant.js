// ------------------------------------------------------------------- 1. 匯入 ------------------------------------------------------------------------

// 從套件拿到 HTTP 狀態碼常數（像 200 OK、500 Internal Server Error），避免手寫數字
import { StatusCodes } from 'http-status-codes'

// 讀進 Axios，用來發 HTTP 請求（像你派信差去環保署拿資料）
import axios from 'axios'

// Node.js 的檔案系統模組，讀寫檔案用（把快取存成檔案）
import fs from 'fs'

// 處理檔案/資料夾路徑（不同作業系統都能對齊）
import path from 'path'

// 定義環保署 API 的共同網址前綴
const RESTAURANT_API_BASE_URL = 'https://data.moenv.gov.tw/api/v2'

// ------------------------------------------------------------------- 2. 建立 Axios 客戶端 ------------------------------------------------------------------------

// const restaurantApi = axios.create => 建一個有預設設定的 Axios 實例
const restaurantApi = axios.create({
  // baseURL: RESTAURANT_API_BASE_URL => 預設主機位置是環保署API
  baseURL: RESTAURANT_API_BASE_URL,
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

// 快取檔案路徑
const CACHE_FILE_PATH = path.join(process.cwd(), 'cache', 'restaurant-cache.json')

// ------------------------------------------------------------------- 4. 設計快取結構 ------------------------------------------------------------------------

// 快取機制
const cache = {
  // data: {} => data 是一個物件 (以城市為key)：data['臺北市'] = [...] 存該城市的餐廳
  data: {},
  // timestamp: {} => timestamp['臺北市'] = 172… 記錄每個城市快取寫入時間（毫秒）
  timestamp: {},
  // 快取有效期限：1天(24小時) =>（ 24 * 60 * 60 * 1000 毫秒）
  ttl: 24 * 60 * 60 * 1000,
}

// ------------------------------------------------------------------- 5. 檔案快取：確保資料夾、讀取與寫入 ------------------------------------------------------------------------

// 確保快取目錄存在
const ensureCacheDir = () => {
  const cacheDir = path.dirname(CACHE_FILE_PATH)
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
}

// 從檔案載入快取
const loadCacheFromFile = () => {
  try {
    ensureCacheDir()
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8')
      const parsed = JSON.parse(cacheData)
      cache.data = parsed.data || {}
      cache.timestamp = parsed.timestamp || {}
      console.log('餐廳快取已從檔案載入')
    }
  } catch (error) {
    console.log('載入餐廳快取檔案失敗，使用空快取:', error.message)
    cache.data = {}
    cache.timestamp = {}
  }
}

// 儲存快取到檔案
const saveCacheToFile = () => {
  try {
    ensureCacheDir()
    const cacheData = {
      data: cache.data,
      timestamp: cache.timestamp,
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2))
    console.log('餐廳快取已儲存到檔案')
  } catch (error) {
    console.error('儲存餐廳快取檔案失敗:', error.message)
  }
}

// ------------------------------------------------------------------- 6. 快取的讀、寫、驗證、清除 ------------------------------------------------------------------------

// 檢查快取是否有效
const isCacheValid = (city) => {
  if (!cache.data[city] || !cache.timestamp[city]) return false
  const now = Date.now()
  return now - cache.timestamp[city] < cache.ttl
}

// 取得快取資料
const getCachedData = (city) => {
  return cache.data[city]
}

// 設定快取資料
const setCachedData = (city, data) => {
  cache.data[city] = data
  cache.timestamp[city] = Date.now()
  console.log(`餐廳快取已更新，城市: ${city}，時間:`, new Date().toLocaleString())
  saveCacheToFile()
}

// 清除快取
const clearCache = (city = null) => {
  if (city) {
    delete cache.data[city]
    delete cache.timestamp[city]
    console.log(`餐廳快取已清除，城市: ${city}`)
  } else {
    cache.data = {}
    cache.timestamp = {}
    console.log('所有餐廳快取已清除')
  }
  saveCacheToFile()
}

// ------------------------------------------------------------------- 7. API 呼叫 ------------------------------------------------------------------------

// 從環保署API取得餐廳資料
const fetchFromRestaurantApi = async (params = {}) => {
  try {
    const { data } = await restaurantApi.get('/gis_p_11', {
      params: {
        api_key: '540e2ca4-41e1-4186-8497-fdd67024ac44',
        limit: 2000,
        sort: 'ImportDate desc',
        format: 'JSON',
        ...params,
      },
    })
    return data
  } catch (error) {
    console.error('環保署餐廳API請求失敗:', error?.response?.data || error?.message || error)
    throw new Error(
      `無法從環保署取得餐廳資料: ${error?.response?.data?.message || error?.message || '未知錯誤'}`,
    )
  }
}

// ------------------------------------------------------------------- 8. 取得或更新該城市快取（整合流程） ------------------------------------------------------------------------

// 取得或更新快取資料
const getOrUpdateCache = async (city = '') => {
  const cacheKey = city || 'all'

  // 檢查快取是否有效
  if (isCacheValid(cacheKey)) {
    console.log(`使用餐廳快取資料，城市: ${cacheKey}`)
    return getCachedData(cacheKey)
  }

  // 快取無效，從API取得新資料
  console.log(`餐廳快取已過期，從API取得新資料，城市: ${cacheKey}`)

  try {
    const params = {}
    if (city) {
      // 如果指定城市，加入篩選條件
      params['filters[city]'] = city
    }

    const data = await fetchFromRestaurantApi(params)
    const restaurants = data.records || []

    // 更新快取
    setCachedData(cacheKey, restaurants)

    return restaurants
  } catch (error) {
    console.error(`無法從API取得${city}餐廳資料，嘗試使用現有快取:`, error.message)

    // 如果API失敗，但有舊的快取資料，使用舊資料
    const cachedData = getCachedData(cacheKey)
    if (cachedData && cachedData.length > 0) {
      console.log(`使用過期的快取資料，城市: ${cacheKey}`)
      return cachedData
    }

    // 如果沒有快取資料，拋出錯誤
    throw error
  }
}

// ------------------------------------------------------------------- 9. 對外 API：全部餐廳 ------------------------------------------------------------------------

// 取得所有餐廳（使用快取）
export const get = async (_req, res) => {
  try {
    console.log('請求所有餐廳資料')

    const restaurants = await getOrUpdateCache()

    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳資料（已快取）',
      restaurants: restaurants,
      total: restaurants.length,
      cached: isCacheValid('all'),
      cacheTimestamp: cache.timestamp['all']
        ? new Date(cache.timestamp['all']).toLocaleString()
        : null,
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '取得餐廳資料失敗' })
  }
}

// ------------------------------------------------------------------- 10. 根據城市篩選餐廳 ------------------------------------------------------------------------

// 根據城市取得餐廳
export const getByCity = async (req, res) => {
  try {
    const { city } = req.params
    console.log(`請求城市餐廳資料: ${city}`)

    // 先嘗試從快取取得所有餐廳資料
    const allRestaurants = await getOrUpdateCache()

    // 然後在記憶體中篩選指定城市的餐廳
    const filteredRestaurants = allRestaurants.filter((restaurant) => restaurant.city === city)

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${city}餐廳資料（已快取）`,
      restaurants: filteredRestaurants,
      city: city,
      total: filteredRestaurants.length,
      cached: isCacheValid('all'),
      cacheTimestamp: cache.timestamp['all']
        ? new Date(cache.timestamp['all']).toLocaleString()
        : null,
    })
  } catch (error) {
    console.error(`取得${req.params.city}餐廳資料失敗:`, error)
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '取得餐廳資料失敗' })
  }
}

// ------------------------------------------------------------------- 11. 搜尋餐廳 ------------------------------------------------------------------------

// 搜尋餐廳（可選城市和關鍵字）
export const search = async (req, res) => {
  try {
    const { city, keyword } = req.query
    console.log(`搜尋餐廳 - 城市: ${city || '全部'}, 關鍵字: ${keyword || '無'}`)

    // 先取得資料（根據城市）
    const allData = await getOrUpdateCache(city)

    // 如果有關鍵字，在資料中搜尋
    let filtered = allData
    if (keyword) {
      filtered = allData.filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword.toLowerCase()) ||
          item.address?.toLowerCase().includes(keyword.toLowerCase()),
      )
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳搜尋結果',
      restaurants: filtered,
      city: city || '全部',
      keyword: keyword || '無',
      total: filtered.length,
      cached: isCacheValid(city || 'all'),
      cacheTimestamp: cache.timestamp[city || 'all']
        ? new Date(cache.timestamp[city || 'all']).toLocaleString()
        : null,
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '搜尋餐廳失敗' })
  }
}

// ------------------------------------------------------------------- 12. 手動清除快取端點 ------------------------------------------------------------------------

// 手動清除快取端點
export const clearCacheEndpoint = async (req, res) => {
  try {
    const { city } = req.query
    clearCache(city)
    res.status(StatusCodes.OK).json({
      success: true,
      message: city ? `${city}餐廳快取已清除` : '所有餐廳快取已清除',
    })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || '清除餐廳快取失敗' })
  }
}

// ------------------------------------------------------------------- 13. 啟動時從檔案把快取載回來 ------------------------------------------------------------------------

// 在伺服器啟動時載入快取
loadCacheFromFile()
