import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/ConfirmDialog'
import { useBuypediaCodes, fmtPrice } from './buypediaUtils'
import PersonEval from './PersonEval'
import './Buypedia.scss'

const EMPTY_EVAL = {
  rating_husband: null, rating_wife: null, rebuy_husband: null, rebuy_wife: null,
  comment_husband: '', comment_wife: '',
}

// 평가 대기함: 별점이 아직 없는 기록 (쿠팡에서 가져온 것 등). 먹어본 뒤 평가만 빠르게 넣음.
function BuypediaPendingPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { categoryName } = useBuypediaCodes()

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)
  const [evalForm, setEvalForm] = useState(EMPTY_EVAL)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.get('/buypedia/pending')
      .then(res => setRecords(res.data))
      .catch(err => { console.error(err); toast.error('평가 대기 목록을 불러오지 못했습니다.') })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (r) => {
    if (openId === r._id) { setOpenId(null); return }
    setOpenId(r._id)
    setEvalForm({ ...EMPTY_EVAL, rebuy_husband: r.rebuy_husband, rebuy_wife: r.rebuy_wife })
  }

  const setField = (who) => (k, v) => setEvalForm(f => ({ ...f, [`${k}_${who}`]: v }))

  const save = async (r) => {
    if (evalForm.rating_husband === null && evalForm.rating_wife === null) {
      toast.error('한 사람이라도 별점을 넣어주세요.')
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await apiClient.put(`/buypedia/${r._id}`, {
        category: r.category, brand: r.brand, product_name: r.product_name, ...evalForm,
      })
      setRecords(list => list.filter(x => x._id !== r._id))
      setOpenId(null)
      toast.success(`${r.brand} ${r.product_name} 평가 완료!`)
    } catch (err) {
      console.error(err)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r) => {
    const ok = await confirm({ title: '기록 삭제', message: `'${r.brand} ${r.product_name}' 기록을 삭제할까요?`, danger: true })
    if (!ok) return
    try {
      await apiClient.delete(`/buypedia/${r._id}`)
      setRecords(list => list.filter(x => x._id !== r._id))
      toast.success('삭제되었습니다.')
    } catch (err) {
      console.error(err)
      toast.error('삭제에 실패했습니다.')
    }
  }

  return (
    <div className="content-box bp-root buypedia-pending-page">
      <button className="bp-back" onClick={() => navigate('/buypedia')}>‹ 순위표</button>
      <div className="bp-header">
        <div>
          <h1>⭐ 별점 안 매긴 기록</h1>
          <p className="bp-sub">순위표에는 이미 올라가 있어요. 써보거나 먹어본 것부터 별점을 매기면 순위가 더 정확해져요.</p>
        </div>
      </div>

      {loading ? (
        <div className="bp-loading"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="bp-none">별점을 다 매겼어요. 🎉</div>
      ) : (
        <div className="bp-pending-list">
          {records.map(r => (
            <div key={r._id} className={`bp-pending-item ${openId === r._id ? 'open' : ''}`}>
              <div className="summary" onClick={() => toggle(r)}>
                <div className="thumb">{r.image_urls?.[0] ? <img src={r.image_urls[0]} alt="" /> : <span>🛒</span>}</div>
                <div className="info">
                  <div className="cat">{categoryName(r.category)}</div>
                  <div className="name"><span className="brand">{r.brand}</span> {r.product_name}</div>
                  <div className="meta">
                    {r.purchase_date} · {r.purchase_place || '구매처 없음'} · {fmtPrice(r.price)}
                  </div>
                </div>
                <span className="go">{openId === r._id ? '닫기' : '평가하기'}</span>
              </div>

              {openId === r._id && (
                <div className="eval">
                  <div className="grid-2">
                    <PersonEval who="남편" icon="👨" rating={evalForm.rating_husband} rebuy={evalForm.rebuy_husband}
                      comment={evalForm.comment_husband} onChange={setField('husband')} />
                    <PersonEval who="아내" icon="👩" rating={evalForm.rating_wife} rebuy={evalForm.rebuy_wife}
                      comment={evalForm.comment_wife} onChange={setField('wife')} />
                  </div>
                  <div className="actions">
                    <button className="btn" onClick={() => navigate(`/buypedia/${r._id}/edit`)}>제품 정보 고치기</button>
                    <button className="btn" onClick={() => remove(r)}>삭제</button>
                    <button className="btn primary" onClick={() => save(r)} disabled={saving}>
                      {saving ? '저장 중...' : '평가 저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BuypediaPendingPage
