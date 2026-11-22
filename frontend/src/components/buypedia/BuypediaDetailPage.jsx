import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { useConfirm } from '../common/ConfirmDialog'
import { useBuypediaCodes, fmtRating, fmtPrice, unitPrice, norm } from './buypediaUtils'
import RebuyBadge from './RebuyBadge'
import './Buypedia.scss'

// 기록 상세: 한 번 산 기록. 수정/삭제는 기록 단위.
function BuypediaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { categoryName, buyTypeName } = useBuypediaCodes()

  const [r, setR] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiClient.get(`/buypedia/${id}`)
      .then(res => setR(res.data))
      .catch(err => { console.error(err); toast.error('기록을 불러오지 못했습니다.') })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <div className="content-box bp-root buypedia-detail-page"><div className="bp-loading"><div className="spinner" /></div></div>
  if (!r) {
    return (
      <div className="content-box bp-root buypedia-detail-page">
        <div className="bp-none">기록을 찾을 수 없어요.</div>
        <button className="btn" onClick={() => navigate('/buypedia')}>목록으로</button>
      </div>
    )
  }

  const productKey = `${r.category}|${norm(r.brand)}|${norm(r.product_name)}`
  const productUrl = `/buypedia/product?key=${encodeURIComponent(productKey)}`
  const per = unitPrice(r.price, r.amount, r.unit)

  const handleDelete = async () => {
    if (deleting) return
    const ok = await confirm({ title: '기록 삭제', message: '이 구매 기록을 삭제할까요?', danger: true })
    if (!ok) return
    setDeleting(true)
    try {
      await apiClient.delete(`/buypedia/${id}`)
      toast.success('삭제되었습니다.')
      // 같은 제품의 다른 기록이 남아 있으면 제품 상세로, 없으면 순위표로
      try {
        await apiClient.get('/buypedia/product', { params: { key: productKey } })
        navigate(productUrl, { replace: true })
      } catch {
        navigate(`/buypedia?cat=${r.category}`, { replace: true })
      }
    } catch (err) {
      console.error(err)
      toast.error('삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  return (
    <div className="content-box bp-root buypedia-detail-page">
      <div className="bp-detail-top">
        <button className="bp-back" onClick={() => navigate(productUrl)}>‹ 이 제품 구매 기록</button>
        <div className="btn-group">
          <button className="btn primary" onClick={() => navigate(`/buypedia/${id}/edit`)} disabled={deleting}>수정</button>
          <button className="btn danger" onClick={handleDelete} disabled={deleting}>{deleting ? '삭제 중...' : '삭제'}</button>
        </div>
      </div>

      <div className="bp-detail-title">
        <div className="cat">{categoryName(r.category)}{r.purchase_type ? ` · ${buyTypeName(r.purchase_type)}` : ''}</div>
        <h1><span className="brand">{r.brand}</span> {r.product_name}</h1>
      </div>

      {r.image_urls?.length > 0 && (
        <div className="bp-gallery">
          {r.image_urls.map(u => <img key={u} src={u} alt="" />)}
        </div>
      )}

      <div className="bp-facts">
        <div><small>구매일</small>{r.purchase_date || '-'}</div>
        <div><small>{r.purchase_type === 'DELIVERY' ? '지점명' : '구매처'}</small>{r.purchase_place || '-'}</div>
        <div><small>가격</small>{fmtPrice(r.price)}</div>
        <div><small>용량</small>{r.amount ? `${r.amount}${r.unit}` : '-'}{per && <span className="sub">{per}</span>}</div>
      </div>

      <div className="bp-evals">
        {[
          { who: '남편', icon: '👨', rating: r.rating_husband, rebuy: r.rebuy_husband, comment: r.comment_husband, cls: 'h' },
          { who: '아내', icon: '👩', rating: r.rating_wife, rebuy: r.rebuy_wife, comment: r.comment_wife, cls: 'w' },
        ].map(e => (
          <div key={e.who} className={`bp-eval ${e.cls}`}>
            <div className="head">
              <span>{e.icon} {e.who}</span>
              <span className="star">{e.rating === null || e.rating === undefined ? '안 먹음' : `⭐ ${fmtRating(e.rating)}`}</span>
            </div>
            <RebuyBadge value={e.rebuy} />
            <p>{e.comment || '한줄평 없음'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BuypediaDetailPage
