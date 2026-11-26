export const STATUS = [
  { value: 'ACTIVE', label: '요즘 씀' },
  { value: 'SOMETIMES', label: '가끔 씀' },
  { value: 'RETIRED', label: '이제 안 씀' },
]
export const STATUS_LABEL = Object.fromEntries(STATUS.map(s => [s.value, s.label]))

export const STARTED_BY = [
  { value: 'husband', label: '호랭이' },
  { value: 'wife', label: '보구치' },
  { value: 'both', label: '둘 다' },
]
export const STARTED_BY_LABEL = Object.fromEntries(STARTED_BY.map(s => [s.value, s.label]))

export const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const fmtMonth = (ym) => {
  if (!ym) return '언제인지 모름'
  const [y, m] = ym.split('-')
  return m ? `${y}년 ${Number(m)}월` : `${y}년`
}

export const fmtKB = (bytes) => `${Math.max(1, Math.round((bytes || 0) / 1024))}KB`

export const emptyForm = () => ({
  phrase: '', meaning: '', example: '', started_at: '', started_by: '', status: 'ACTIVE',
  retired_at: '', origin_story: '', comment_husband: '', comment_wife: '',
})
