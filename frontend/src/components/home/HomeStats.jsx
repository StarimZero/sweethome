import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import { useAuth } from '../../context/AuthContext'
import './HomeStats.scss'

const fmt = (n) => Number(n || 0).toLocaleString()
const fmtSize = (kb) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${Math.round(kb)}KB`)

// 홈 사진 아래 대시보드: 메뉴별 기록 수, DB 사용량, 챗봇 사용량 (로그인했을 때만)
function HomeStats() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!user) return
    apiClient.get('/couple/stats')
      .then(res => setStats(res.data))
      .catch(() => setFailed(true))
  }, [user])

  if (!user) return null
  if (failed) return null
  if (!stats) return <section className="home-stats"><div className="hs-loading">기록을 세는 중...</div></section>

  const { db } = stats
  const level = db.percent >= 80 ? 'danger' : db.percent >= 50 ? 'warn' : 'ok'
  const space = [...stats.menus, ...stats.system].filter(r => r.size_kb > 0)
    .sort((a, b) => b.size_kb - a.size_kb).slice(0, 4)

  return (
    <section className="home-stats">
      <div className="hs-summary">
        <div className="hs-card big">
          <span className="label">지금까지 남긴 기록</span>
          <strong>{fmt(stats.total_records)}<small>건</small></strong>
          <span className="sub">이번 달 {fmt(stats.added_this_month)}건 추가</span>
        </div>
        <div className="hs-card">
          <span className="label">DB 사용량</span>
          <strong>{db.used_mb}<small>MB / {db.limit_mb}MB</small></strong>
          <div className={`hs-bar ${level}`}><span style={{ width: `${Math.max(db.percent, 1)}%` }} /></div>
          <span className="sub">{db.percent}% 사용{space.length > 0 && ` · 많이 차지하는 것: ${space.map(s => `${s.label} ${fmtSize(s.size_kb)}`).join(', ')}`}</span>
        </div>
        <div className="hs-card">
          <span className="label">이번 달 챗봇</span>
          <strong>{fmt(stats.ask_this_month.questions)}<small>번 질문</small></strong>
          <span className="sub">{fmt(stats.ask_this_month.tokens)}토큰</span>
        </div>
      </div>

      <div className="hs-menus">
        {stats.menus.map(m => (
          <button key={m.collection} className="hs-menu" onClick={() => navigate(m.path)}>
            <span className="name">{m.label}</span>
            <span className="count">{fmt(m.count)}</span>
            {m.this_month > 0 && <span className="new">+{m.this_month}</span>}
          </button>
        ))}
      </div>
    </section>
  )
}

export default HomeStats
