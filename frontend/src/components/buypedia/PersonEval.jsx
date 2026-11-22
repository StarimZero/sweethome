import { REBUY, RATING_OPTIONS } from './buypediaUtils'

// 한 사람의 평가 입력 (별점 / 재구매 의사 / 한줄평). 등록 화면과 평가 대기함에서 같이 씀.
// onChange('rating' | 'rebuy' | 'comment', 값)
function PersonEval({ who, icon, rating, rebuy, comment, onChange }) {
  return (
    <div className="bp-person">
      <div className="who">{icon} {who}</div>
      <div className="form-group">
        <label>별점</label>
        <select
          value={rating ?? ''}
          onChange={e => onChange('rating', e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">안 먹음</option>
          {RATING_OPTIONS.map(v => <option key={v} value={v}>{'★'.repeat(Math.floor(v))}{v % 1 ? '½' : ''} {v.toFixed(1)}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>재구매 의사</label>
        <div className="bp-seg">
          {Object.entries(REBUY).map(([k, v]) => (
            <button
              key={k} type="button" className={`${v.cls} ${rebuy === k ? 'on' : ''}`}
              onClick={() => onChange('rebuy', rebuy === k ? null : k)}
            >{v.label}</button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label>한줄평</label>
        <textarea value={comment || ''} onChange={e => onChange('comment', e.target.value)} placeholder="예: 피가 얇고 육즙 많음" />
      </div>
    </div>
  )
}

export default PersonEval
