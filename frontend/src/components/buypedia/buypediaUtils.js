import { useEffect, useState } from 'react'
import apiClient from '../../api'

export const CATEGORY_GROUP = 'BUYPEDIA_CAT'
export const CATEGORY_GROUP_NAME = 'Buypedia 카테고리'
export const BUY_GROUP = 'BUYPEDIA_BUY'

export const REBUY = {
  YES: { label: '또 산다', short: '또 삼', cls: 'yes' },
  SOSO: { label: '보통', short: '보통', cls: 'soso' },
  NO: { label: '안 산다', short: '안 삼', cls: 'no' },
}

export const UNITS = ['g', 'ml', '개']

// 별점 선택지: 빈 값 = 안 먹음
export const RATING_OPTIONS = Array.from({ length: 11 }, (_, i) => i * 0.5)

// 백엔드 product_key 와 같은 규칙 (공백 제거 + 소문자)
export const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()

export const fmtRating = (v) => {
  if (v === null || v === undefined) return '-'
  return Number.isInteger(v) ? v.toFixed(1) : String(Math.round(v * 100) / 100)
}

export const fmtPrice = (v) => (v || v === 0 ? `${Number(v).toLocaleString()}원` : '-')

// 순위표용 단가 표시 (백엔드 unit_price / unit_basis). 예: '100ml당 23.7원'
export const fmtUnitPrice = (value, basis, estimated = false) => (value || value === 0) && basis
  ? `${basis}당 ${estimated ? '≈' : ''}${Number(value).toLocaleString()}원` : null

// 품목 안에서 가장 흔한 단가 기준(100g / 100ml / 개)으로 최저가 제품 key. 비교할 게 2개 미만이면 null
export const cheapestKey = (products) => {
  // 백엔드가 비교 대상(price_compared)으로 정한 것만. 무게를 모르는 반반팩 등은 빠짐
  const withPrice = products.filter(p => p.unit_price && p.unit_basis && !p.blacklisted && p.price_compared !== false)
  const counts = {}
  withPrice.forEach(p => { counts[p.unit_basis] = (counts[p.unit_basis] || 0) + 1 })
  const basis = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
  const same = withPrice.filter(p => p.unit_basis === basis)
  if (same.length < 2) return null
  const min = Math.min(...same.map(p => p.unit_price))
  const cheapest = same.filter(p => p.unit_price === min)
  return cheapest.length === same.length ? null : cheapest.map(p => p.key)
}

// 100g당 / 100ml당 / 개당 가격
export const unitPrice = (price, amount, unit) => {
  if (!price || !amount || !unit) return null
  if (unit === '개') return `개당 ${Math.round(price / amount).toLocaleString()}원`
  return `100${unit}당 ${Math.round((price / amount) * 100).toLocaleString()}원`
}

// 비슷한 이름 찾기 (편집 거리 1 이하 또는 포함 관계). 완전히 같은 건 제외.
const distance = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return 2
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[a.length][b.length]
}

export const findSimilar = (value, candidates) => {
  const v = norm(value)
  if (v.length < 2) return null
  if (candidates.some(c => norm(c) === v)) return null
  return candidates.find(c => {
    const n = norm(c)
    return distance(v, n) <= 1 || (n.length >= 2 && (n.includes(v) || v.includes(n)))
  }) || null
}

// 카테고리 / 구매 방식 코드
export function useBuypediaCodes() {
  const [categories, setCategories] = useState([])
  const [buyTypes, setBuyTypes] = useState([])

  useEffect(() => {
    Promise.all([
      apiClient.get(`/code/group/${CATEGORY_GROUP}`),
      apiClient.get(`/code/group/${BUY_GROUP}`),
    ])
      .then(([cat, buy]) => { setCategories(cat.data); setBuyTypes(buy.data) })
      .catch(console.error)
  }, [])

  // 등록 화면에서 즉석으로 카테고리 추가
  const addCategory = async (name) => {
    const order = Math.max(0, ...categories.map(c => c.sort_order || 0)) + 1
    const res = await apiClient.post('/code', {
      group_code: CATEGORY_GROUP,
      group_name: CATEGORY_GROUP_NAME,
      code_id: `BPC_${Date.now().toString(36).toUpperCase()}`,
      code_name: name.trim(),
      sort_order: order,
      use_yn: 'Y',
    })
    setCategories(prev => [...prev, res.data])
    return res.data
  }

  const categoryName = (id) => categories.find(c => c.code_id === id)?.code_name || id
  const buyTypeName = (id) => buyTypes.find(c => c.code_id === id)?.code_name || ''

  return { categories, buyTypes, addCategory, categoryName, buyTypeName }
}
