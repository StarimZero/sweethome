import { STATUS, STARTED_BY } from './constants'

// 등록·수정에서 같이 쓰는 입력 칸
function BuzzwordForm({ form, setForm }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <>
      <div className="form-section">
        <div className="section-title">어떤 말인가요</div>
        <label className="field">
          <span>유행어 *</span>
          <input value={form.phrase} onChange={set('phrase')} placeholder="예: 호랭이굴" maxLength={60} autoFocus />
        </label>
        <label className="field">
          <span>뜻 / 언제 쓰는 말인지</span>
          <textarea value={form.meaning} onChange={set('meaning')} rows={2} placeholder="예: 우리 집. 밖에서 놀다가 집에 갈 때" />
        </label>
        <label className="field">
          <span>예문</span>
          <input value={form.example} onChange={set('example')} placeholder="예: 오늘은 호랭이굴에서 와인이나 마시자" />
        </label>
      </div>

      <div className="form-section">
        <div className="section-title">언제, 누가</div>
        <div className="field-row">
          <label className="field">
            <span>생긴 때</span>
            <input type="month" value={form.started_at} onChange={set('started_at')} />
          </label>
          <div className="field">
            <span>시작한 사람</span>
            <div className="bz-seg">
              {STARTED_BY.map(s => (
                <button type="button" key={s.value} className={form.started_by === s.value ? 'on' : ''}
                        onClick={() => setForm(f => ({ ...f, started_by: f.started_by === s.value ? '' : s.value }))}>{s.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <span>지금 상태</span>
            <div className="bz-seg">
              {STATUS.map(s => (
                <button type="button" key={s.value} className={form.status === s.value ? 'on' : ''}
                        onClick={() => setForm(f => ({ ...f, status: s.value }))}>{s.label}</button>
              ))}
            </div>
          </div>
          {form.status === 'RETIRED' && (
            <label className="field">
              <span>안 쓰게 된 때</span>
              <input type="month" value={form.retired_at} onChange={set('retired_at')} />
            </label>
          )}
        </div>
        <label className="field">
          <span>어떻게 생겼나</span>
          <textarea value={form.origin_story} onChange={set('origin_story')} rows={3} placeholder="생긴 사연을 한두 줄로" />
        </label>
      </div>

      <div className="form-section">
        <div className="section-title">한마디</div>
        <div className="field-row">
          <label className="field">
            <span>호랭이</span>
            <input value={form.comment_husband} onChange={set('comment_husband')} />
          </label>
          <label className="field">
            <span>보구치</span>
            <input value={form.comment_wife} onChange={set('comment_wife')} />
          </label>
        </div>
      </div>
    </>
  )
}

export default BuzzwordForm
