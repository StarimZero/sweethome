import { REBUY } from './buypediaUtils'

// 재구매 의사 배지. who: '남편' / '아내' 같은 접두어 (선택)
function RebuyBadge({ value, who }) {
  const info = REBUY[value]
  if (!info) return <span className="bp-rebuy none">{who ? `${who} -` : '-'}</span>
  return <span className={`bp-rebuy ${info.cls}`}>{who ? `${who} ` : ''}{info.short}</span>
}

export default RebuyBadge
