import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { AudioClip } from './audio'
import { STATUS, STATUS_LABEL, STARTED_BY_LABEL, fmtMonth } from './constants'
import './Buzzword.scss'

// 우리집 유행어: 연도별 타임라인
function BuzzwordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    apiClient.get('/buzzword')
      .then(res => setWords(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('유행어를 불러오지 못했어요.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const years = useMemo(() => {
    const keyword = q.trim().toLowerCase()
    const filtered = words.filter(w =>
      (!status || w.status === status) &&
      (!keyword || [w.phrase, w.meaning, w.origin_story, w.example].some(t => (t || '').toLowerCase().includes(keyword))))
    const groups = {}
    filtered.forEach(w => {
      const y = (w.started_at || '').slice(0, 4) || '언제인지 모름'
      ;(groups[y] = groups[y] || []).push(w)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [words, q, status])

  return (
    <div className="bz-root">
      <div className="bz-header">
        <div>
          <h2>🗣️ 유행어</h2>
          <p className="bz-desc">우리집에서 생겼다 사라지는 말. 그때 뭐라고 했는지 소리로 남겨요.</p>
        </div>
        <button className="bz-btn-add" onClick={() => navigate('/buzzword/new')}>+ 유행어 추가</button>
      </div>

      <div className="bz-filters">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="말이나 뜻으로 찾기" />
        <div className="bz-chips">
          <button className={!status ? 'on' : ''} onClick={() => setStatus('')}>전체 {words.length}</button>
          {STATUS.map(s => (
            <button key={s.value} className={status === s.value ? 'on' : ''} onClick={() => setStatus(s.value)}>
              {s.label} {words.filter(w => w.status === s.value).length}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="bz-loading"><div className="spinner" /></div>
        : years.length === 0 ? (
          <div className="bz-empty">
            {words.length === 0 ? '아직 남긴 유행어가 없어요. 요즘 집에서 자주 하는 말부터 남겨 보세요.' : '찾는 유행어가 없어요.'}
          </div>
        ) : years.map(([year, list]) => (
          <section key={year} className="bz-year">
            <h3 className="bz-year-title">{year === '언제인지 모름' ? year : `${year}년`}<span>{list.length}개</span></h3>
            <div className="bz-list">
              {list.map(w => (
                <article key={w._id || w.id} className={`bz-item ${w.status === 'RETIRED' ? 'retired' : ''}`}
                         onClick={() => navigate(`/buzzword/${w._id || w.id}`)}>
                  <div className="bz-item-top">
                    <strong className="bz-phrase">{w.phrase}</strong>
                    <span className={`bz-status ${w.status}`}>{STATUS_LABEL[w.status] || '요즘 씀'}</span>
                  </div>
                  {w.meaning && <p className="bz-meaning">{w.meaning}</p>}
                  <div className="bz-item-meta">
                    <span>{fmtMonth(w.started_at)}{w.retired_at ? ` ~ ${fmtMonth(w.retired_at)}` : ''}</span>
                    {w.started_by && <span>· {STARTED_BY_LABEL[w.started_by]}{w.started_by !== 'both' ? '가 시작' : ''}</span>}
                    <span>· 🎙 {w.audios?.length || 0}</span>
                  </div>
                  {w.audios?.length > 0 && (
                    <div onClick={e => e.stopPropagation()}>
                      <AudioClip audioId={w.audios[0].audio_id} label={w.audios[0].label} duration={w.audios[0].duration_sec} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

export default BuzzwordPage
