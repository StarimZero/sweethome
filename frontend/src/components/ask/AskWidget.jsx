import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import { useAuth } from '../../context/AuthContext'
import './Ask.scss'

// 화면별 예시 질문
const EXAMPLES = {
  '/buypedia': ['올해 쿠팡에서 제일 많이 산 거 뭐야?', '생수 요즘 얼마에 샀지?', '만두는 뭐가 제일 괜찮아?'],
  '/review': ['둘 다 4점 넘게 준 맛집 어디야?', '보구치님이 제일 좋아한 맛집은?', '최근에 간 맛집 알려줘'],
  '/liquor': ['우리가 제일 좋아한 와인은?', '삼겹살이랑 먹은 술 뭐 있었지?', '제일 비싸게 산 술은?'],
}
const DEFAULT_EXAMPLES = ['올해 쿠팡에서 제일 많이 산 거 뭐야?', '둘 다 4점 넘게 준 맛집 어디야?', '우리가 제일 좋아한 와인은?']

const MENU_LABEL = { '/buypedia': 'Buypedia', '/review': '맛집 리뷰', '/liquor': '주류' }

const firstSegment = (path) => `/${(path || '').split('/')[1] || ''}`

const fmtTime = (iso) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 모든 화면 오른쪽 아래 💬 버튼 → 질문 창. 대화 / 내 질문 기록(아이디별) 두 탭.
function AskWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('chat') // chat | history
  const [messages, setMessages] = useState([]) // {role: 'user'|'bot', text, sources, looked, logId}
  const [conversationId, setConversationId] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const bodyRef = useRef(null)

  const menu = firstSegment(location.pathname)
  const examples = EXAMPLES[menu] || DEFAULT_EXAMPLES

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, sending])

  useEffect(() => {
    if (!open || tab !== 'history') return
    let alive = true
    apiClient.get('/ask/history')
      .then(res => { if (alive) setHistory(res.data) })
      .catch(console.error)
      .finally(() => { if (alive) setHistoryLoading(false) })
    return () => { alive = false }
  }, [open, tab])

  if (!user) return null

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setSending(true)
    try {
      const res = await apiClient.post('/ask', { question, conversation_id: conversationId, page: location.pathname })
      setConversationId(res.data.conversation_id)
      setMessages(m => [...m, {
        role: 'bot', text: res.data.answer, sources: res.data.sources, looked: res.data.looked, logId: res.data.log_id,
      }])
    } catch (err) {
      console.error(err)
      setMessages(m => [...m, { role: 'bot', text: '질문을 보내지 못했어요. 잠시 뒤에 다시 해 주세요.' }])
    } finally {
      setSending(false)
    }
  }

  const openSource = (msg, src) => {
    apiClient.post(`/ask/${msg.logId}/click`, { label: src.label, path: src.path }).catch(() => {})
    navigate(src.path)
  }

  const newChat = () => { setMessages([]); setConversationId(null); setTab('chat') }

  const showHistory = () => { setHistoryLoading(true); setTab('history') }

  // 기록에서 대화를 골라 이어서 묻기
  const continueConversation = (convId) => {
    const turns = history.filter(h => h.conversation_id === convId).reverse()
    setMessages(turns.flatMap(h => [
      { role: 'user', text: h.question },
      { role: 'bot', text: h.answer, sources: h.sources, logId: h.id },
    ]))
    setConversationId(convId)
    setTab('chat')
  }

  return (
    <>
      {open && (
        <div className="ask-panel" role="dialog" aria-label="물어보기">
          <div className="ask-head">
            <div className="tabs">
              <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>💬 물어보기</button>
              <button className={tab === 'history' ? 'on' : ''} onClick={showHistory}>내 질문 기록</button>
            </div>
            <div className="actions">
              {tab === 'chat' && messages.length > 0 && <button onClick={newChat}>새 대화</button>}
              <button onClick={() => setOpen(false)} aria-label="닫기">✕</button>
            </div>
          </div>

          {tab === 'chat' ? (
            <>
              <div className="ask-body" ref={bodyRef}>
                {messages.length === 0 && (
                  <div className="ask-intro">
                    <p>Buypedia, 맛집 리뷰, 주류 기록에서 찾아 드려요.{MENU_LABEL[menu] && ` 지금은 ${MENU_LABEL[menu]} 화면이라 이쪽부터 볼게요.`}</p>
                    <div className="examples">
                      {examples.map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`msg ${m.role}`}>
                    <div className="bubble">{m.text}</div>
                    {m.role === 'bot' && (m.looked?.length > 0 || m.sources?.length > 0) && (
                      <div className="src">
                        {m.looked?.length > 0 && <div className="looked">본 기록: {m.looked.join(', ')}</div>}
                        {m.sources?.map(s => (
                          <button key={s.id} className="chip" onClick={() => openSource(m, s)}>{s.label} ›</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {sending && <div className="msg bot"><div className="bubble typing">찾아보는 중…</div></div>}
              </div>
              <form className="ask-input" onSubmit={e => { e.preventDefault(); send() }}>
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="궁금한 걸 물어보세요" disabled={sending} />
                <button type="submit" disabled={sending || !input.trim()}>보내기</button>
              </form>
            </>
          ) : (
            <div className="ask-body history">
              {historyLoading ? <p className="muted">불러오는 중...</p>
                : history.length === 0 ? <p className="muted">아직 물어본 게 없어요.</p>
                : history.map(h => (
                  <div key={h.id} className={`hist ${expanded === h.id ? 'open' : ''}`}>
                    <button className="q" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                      <span className="time">{fmtTime(h.created_at)}</span>
                      <span className="text">{h.question}</span>
                    </button>
                    {expanded === h.id && (
                      <div className="a">
                        <p>{h.answer}</p>
                        <button className="link" onClick={() => continueConversation(h.conversation_id)}>이 대화 이어서 묻기 ›</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      <button className="ask-fab" onClick={() => setOpen(o => !o)} aria-label={open ? '물어보기 닫기' : '물어보기 열기'}>
        {open ? '✕' : '💬'}
      </button>
    </>
  )
}

export default AskWidget
