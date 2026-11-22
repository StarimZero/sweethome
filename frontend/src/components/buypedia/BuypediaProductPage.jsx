import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { useBuypediaCodes, fmtRating, fmtPrice, unitPrice, fmtUnitPrice, cheapestKey } from './buypediaUtils'
import RebuyBadge from './RebuyBadge'
import './Buypedia.scss'

// 제품 상세: 같은 제품의 요약 + 언제/어디서/얼마에 샀는지 기록 목록
function BuypediaProductPage() {
  const [searchParams] = useSearchParams()
  const key = searchParams.get('key') || ''
  const navigate = useNavigate()
  const toast = useToast()
  const { categoryName, buyTypeName } = useBuypediaCodes()

  const [data, setData] = useState(null)
  const [siblings, setSiblings] = useState([])  // 같은 품목의 다른 제품
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([apiClient.get('/buypedia/product', { params: { key } }), apiClient.get('/buypedia/ranking')])
      .then(([res, rk]) => {
        setData(res.data)
        const me = res.data.product
        setSiblings(me.item_type
          ? rk.data.products.filter(x => x.category === me.category && x.item_type === me.item_type)
              .sort((a, b) => b.score - a.score || b.count - a.count)
          : [])
      })
      .catch(err => {
        console.error(err)
        toast.error('제품 정보를 불러오지 못했어요.')
        setData(null)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (loading) return <div className="content-box bp-root buypedia-product-page"><div className="bp-loading"><div className="spinner" /></div></div>
  if (!data) {
    return (
      <div className="content-box bp-root buypedia-product-page">
        <div className="bp-none">제품을 찾을 수 없어요.</div>
        <button className="btn" onClick={() => navigate('/buypedia')}>목록으로</button>
      </div>
    )
  }

  const { product: p, records } = data
  const cheapSiblings = cheapestKey(siblings) || []
  // 공동 순위: 종합 점수와 구매 횟수가 같으면 같은 등수
  const siblingRanks = siblings.reduce((acc, s, i) => {
    const prev = siblings[i - 1]
    acc.push(i > 0 && prev.score === s.score && prev.count === s.count ? acc[i - 1] : i + 1)
    return acc
  }, [])

  const eatAgain = () => {
    const params = new URLSearchParams({ category: p.category, brand: p.brand, product_name: p.product_name })
    if (p.item_type) params.set('item_type', p.item_type)
    if (p.purchase_type) params.set('purchase_type', p.purchase_type)
    if (p.last_place) params.set('purchase_place', p.last_place)
    navigate(`/buypedia/new?${params}`)
  }

  return (
    <div className="content-box bp-root buypedia-product-page">
      <button className="bp-back" onClick={() => navigate(`/buypedia?cat=${p.category}`)}>‹ {categoryName(p.category)} 순위</button>

      <div className="bp-product-head">
        <div className="thumb">{p.image_url ? <img src={p.image_url} alt="" /> : <span>🛒</span>}</div>
        <div className="info">
          <div className="cat">{categoryName(p.category)}{p.item_type ? ` · ${p.item_type}` : ''}{p.purchase_type ? ` · ${buyTypeName(p.purchase_type)}` : ''}</div>
          <h1><span className="brand">{p.brand}</span> {p.product_name}</h1>
          <div className="scores">
            <div><small>남편</small><b>{fmtRating(p.avg_husband)}</b></div>
            <div><small>아내</small><b>{fmtRating(p.avg_wife)}</b></div>
            <div><small>{p.rated ? '별점' : '추정 별점'}</small><b>{fmtRating(p.rated ? p.avg : p.est_rating)}</b></div>
            <div><small>구매 {p.count}번</small><b>×{Number(p.buy_mult).toFixed(2)}</b></div>
            <div><small>가격{p.unit_price ? ` (${fmtUnitPrice(p.unit_price, p.unit_basis, p.unit_estimated)})` : ''}</small><b>×{Number(p.price_mult ?? 1).toFixed(2)}</b></div>
            <div className="avg"><small>종합</small><b>{fmtRating(p.score)}</b></div>
          </div>
          <div className="rebuys">
            <RebuyBadge value={p.rebuy_husband} who="남편" />
            <RebuyBadge value={p.rebuy_wife} who="아내" />
            {p.blacklisted && <span className="bp-black-tag">❌ 안 살 것</span>}
          </div>
        </div>
        <button className="bp-btn-add" onClick={eatAgain}>🔁 또 샀어요</button>
      </div>

      {siblings.length > 1 && (
        <div className="bp-siblings">
          <div className="bp-section-title">'{p.item_type}' 품목 비교 <span className="bp-count-sub">{siblings.length}종</span></div>
          {siblings.map((s, i) => (
            <div key={s.key} className={`bp-sibling ${s.key === p.key ? 'me' : ''} ${s.blacklisted ? 'black' : ''}`}
              onClick={() => s.key !== p.key && navigate(`/buypedia/product?key=${encodeURIComponent(s.key)}`)}>
              <span className="rank">{s.blacklisted ? '❌' : siblingRanks[i]}</span>
              <span className="name"><span className="brand">{s.brand}</span> {s.product_name}{s.key === p.key && ' (이 제품)'}</span>
              <span className="sub">🛒 {s.count}번 · {s.rated ? `⭐ ${fmtRating(s.avg)}` : '평가 전'}</span>
              <span className={`unit ${cheapSiblings.includes(s.key) ? 'cheap' : ''}`}>
                {fmtUnitPrice(s.unit_price, s.unit_basis, s.unit_estimated) || '-'}{s.price_compared === false && ' (비교 제외)'}{cheapSiblings.includes(s.key) && ' 💰'}
              </span>
              <span className="score">{fmtRating(s.score)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bp-section-title">구매 기록 {records.length}건</div>
      <div className="bp-records">
        {records.map(r => {
          const per = unitPrice(r.price, r.amount, r.unit)
          return (
            <div key={r._id} className="bp-record" onClick={() => navigate(`/buypedia/${r._id}`)}>
              <div className="date">{r.purchase_date || '날짜 없음'}</div>
              <div className="where">
                {r.purchase_place || '구매처 없음'}
                {r.purchase_type && <span className="type">{buyTypeName(r.purchase_type)}</span>}
              </div>
              <div className="money">
                {fmtPrice(r.price)}
                {r.amount ? <span className="sub"> · {r.amount}{r.unit}</span> : null}
                {per && <div className="sub">{per}</div>}
              </div>
              <div className="rate">
                <span>👨 {fmtRating(r.rating_husband)}</span>
                <span>👩 {fmtRating(r.rating_wife)}</span>
              </div>
              {(r.comment_husband || r.comment_wife) && (
                <div className="comments">
                  {r.comment_husband && <div>👨 {r.comment_husband}</div>}
                  {r.comment_wife && <div>👩 {r.comment_wife}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BuypediaProductPage
