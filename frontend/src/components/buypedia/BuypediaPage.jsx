import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { useBuypediaCodes, fmtRating, fmtPrice, cheapestKey, norm } from './buypediaUtils'
import RebuyBadge from './RebuyBadge'
import './Buypedia.scss'

const MEDALS = ['🥇', '🥈', '🥉']

const productUrl = (key) => `/buypedia/product?key=${encodeURIComponent(key)}`

// 정렬: 종합(기본) / 직접 매긴 별점 / 구매 횟수. 같은 품목 안에서만 적용
const SORTS = {
  score: { label: '종합순', fn: (a, b) => b.score - a.score || b.count - a.count },
  rating: { label: '별점순', fn: (a, b) => (b.avg ?? -1) - (a.avg ?? -1) || b.score - a.score },
  buy: { label: '구매순', fn: (a, b) => b.count - a.count || b.score - a.score },
  cheap: { label: '단가순', fn: (a, b) => (a.unit_price ?? Infinity) - (b.unit_price ?? Infinity) || b.score - a.score },
}

// 공동 순위: 정렬 기준이 완전히 같으면 같은 등수 (1, 1, 3 …)
function tieRanks(items, fn) {
  const ranks = []
  items.forEach((p, i) => { ranks.push(i > 0 && fn(items[i - 1], p) === 0 ? ranks[i - 1] : i + 1) })
  return ranks
}

// 품목별로 묶기. 품목이 없는 제품은 혼자 한 품목
function groupByItem(products) {
  const map = new Map()
  products.forEach(p => {
    const key = `${p.category}|${p.item_type || `_${p.key}`}`
    if (!map.has(key)) map.set(key, { key, category: p.category, item: p.item_type || p.product_name, products: [], total: 0 })
    const g = map.get(key)
    g.products.push(p)
    g.total += p.count
  })
  return [...map.values()]
}

function ProductRow({ rank, p, categoryName, showCategory, cheapest, onClick }) {
  return (
    <div className={`bp-rank-row ${p.blacklisted ? 'black' : ''} ${p.rated ? '' : 'pending'}`} onClick={onClick}>
      <div className="col-rank">{p.blacklisted ? '❌' : rank && rank <= 3 ? MEDALS[rank - 1] : rank || '-'}</div>
      <div className="col-name">
        <div className="name">
          <span className="brand">{p.brand}</span> {p.product_name}
        </div>
        <div className="meta">
          {showCategory && <span className="cat">{categoryName(p.category)}{p.item_type ? ` · ${p.item_type}` : ''}</span>}
          {!p.rated && <span className="pending-tag">평가 전</span>}
          {cheapest && <span className="cheap-tag">💰 최저가</span>}
          <span className="buy-count">🛒 {p.count}번</span>
          {p.last_date && <span>최근 {p.last_date.slice(5).replace('-', '/')}</span>}
          {p.last_price ? <span className="last-price">{fmtPrice(p.last_price)}</span> : null}
        </div>
      </div>
      <div className="col-score h" title={p.rated ? `남편 ${fmtRating(p.avg_husband)} · 아내 ${fmtRating(p.avg_wife)}` : '별점이 없어 구매 횟수로 추정'}>
        <small>별점</small>{p.rated ? fmtRating(p.avg) : <span className="est">추정 {fmtRating(p.est_rating)}</span>}
      </div>
      <div className="col-score w" title={`${p.count}번 샀을 때 곱하는 값`}>
        <small>구매</small>×{Number(p.buy_mult).toFixed(2)}
      </div>
      <div className="col-score avg"
        title={`${p.rated ? `별점 ${fmtRating(p.avg)}` : `추정 ${fmtRating(p.est_rating)}`} × 구매 ×${Number(p.buy_mult).toFixed(2)} × 가격 ×${Number(p.price_mult ?? 1).toFixed(2)}`}>
        <small>종합</small>{fmtRating(p.score)}
      </div>
      <div className={`col-unit ${cheapest ? 'cheap' : ''}`}
        title={p.unit_estimated ? '개수로 산 걸 무게로 환산한 추정 단가 (예: 양배추 1통 ≈ 1.5kg)'
          : p.price_compared === false ? '같은 품목의 다른 제품과 단가 기준이 달라 가격 비교에서 뺐어요' : '가장 최근에 산 가격 기준'}>
        {p.unit_price
          ? <><small>{p.unit_basis}당{p.price_compared === false ? ' · 비교 제외' : ''}</small>{p.unit_estimated ? '≈' : ''}{Number(p.unit_price).toLocaleString()}원</>
          : <small>단가 -</small>}
      </div>
      <div className="col-rebuy">
        <RebuyBadge value={p.rebuy_husband} who="남" />
        <RebuyBadge value={p.rebuy_wife} who="여" />
      </div>
    </div>
  )
}

function BuypediaPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { categories, categoryName } = useBuypediaCodes()
  const [searchParams, setSearchParams] = useSearchParams()

  const [data, setData] = useState({ products: [], brands: [] })
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('score') // score | rating | buy

  const tab = searchParams.get('cat') || 'ALL'
  const setTab = (cat) => setSearchParams(cat === 'ALL' ? {} : { cat }, { replace: true })

  useEffect(() => {
    apiClient.get('/buypedia/ranking')
      .then(res => setData(res.data))
      .catch(err => { console.error(err); toast.error('순위표를 불러오지 못했습니다.') })
      .finally(() => setLoading(false))
    apiClient.get('/buypedia/pending').then(res => setPendingCount(res.data.length)).catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groups = useMemo(() => groupByItem(data.products), [data.products])

  // 카테고리 칩: 제품 많은 순, 0개는 숨김
  const chips = useMemo(() => {
    const counts = {}
    data.products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1 })
    const order = categories.map(c => c.code_id)
    return Object.keys(counts)
      .map(id => ({ id, name: categoryName(id), count: counts[id] }))
      .sort((a, b) => b.count - a.count || order.indexOf(a.id) - order.indexOf(b.id))
  }, [data.products, categories, categoryName])

  // 전체 탭: 비교할 게 있는 품목의 1위 (= 다음에 살 때 이거) / 혼자인 품목 중 자주 사는 것
  // 1위가 2위보다 확실히 앞설 때만 1위로 보여줌. 다 똑같으면(평가 전·1번씩) '판가름 전'
  const { champions, undecided } = useMemo(() => {
    const champs = [], ties = []
    groups.filter(g => g.products.length > 1).forEach(g => {
      const live = g.products.filter(p => !p.blacklisted).sort(SORTS.score.fn)
      if (!live.length) return
      if (live.length === 1 || SORTS.score.fn(live[0], live[1]) < 0) champs.push({ g, top: live[0] })
      else ties.push(g)
    })
    const byTotal = (a, b) => (b.g || b).total - (a.g || a).total
    return { champions: champs.sort(byTotal), undecided: ties.sort(byTotal) }
  }, [groups])
  const staplesTop = useMemo(() => groups
    .filter(g => g.products.length === 1)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12), [groups])

  const q = norm(query)
  const searchResults = useMemo(() => {
    if (!q) return []
    return data.products.filter(p =>
      norm(p.brand).includes(q) || norm(p.product_name).includes(q) || norm(p.item_type).includes(q)
      || norm(categoryName(p.category)).includes(q))
  }, [q, data.products, categoryName])

  // 카테고리 탭: 비교할 품목(제품 2개 이상)과 늘 사는 것(혼자인 품목)
  const tabGroups = groups.filter(g => g.category === tab)
  const compareGroups = tabGroups.filter(g => g.products.length > 1).sort((a, b) => b.total - a.total)
  const staples = tabGroups.filter(g => g.products.length === 1).sort((a, b) => b.total - a.total)

  const renderGroup = (g) => {
    const live = g.products.filter(p => !p.blacklisted).sort(SORTS[sortBy].fn)
    const ranks = tieRanks(live, SORTS[sortBy].fn)
    const cheap = cheapestKey(g.products) || []
    const black = g.products.filter(p => p.blacklisted)
    return (
      <div key={g.key} className="bp-item-group">
        <div className="bp-item-head">
          <span className="item">{g.item}</span>
          <span className="sub">{g.products.length}종 · 🛒 {g.total}번</span>
          {g.products[0].price_priority === '우선' && <span className="price-tag first" title="맛이나 품질 차이가 크지 않아서 싼 게 위로 와요">💰 가격 우선</span>}
          {g.products[0].price_priority === '무관' && <span className="price-tag ignore" title="제품마다 개성이 달라서 가격은 순위에 넣지 않아요">🎨 가격 무관</span>}
        </div>
        <div className="bp-rank-list">
          {live.map((p, i) => (
            <ProductRow key={p.key} rank={ranks[i]} p={p} categoryName={categoryName} cheapest={cheap.includes(p.key)}
              onClick={() => navigate(productUrl(p.key))} />
          ))}
          {black.map(p => (
            <ProductRow key={p.key} p={p} categoryName={categoryName} onClick={() => navigate(productUrl(p.key))} />
          ))}
        </div>
      </div>
    )
  }

  const renderStaple = (g) => {
    const p = g.products[0]
    return (
      <button key={g.key} className={`bp-staple ${p.blacklisted ? 'black' : ''}`} onClick={() => navigate(productUrl(p.key))}>
        <span className="name">{p.blacklisted && '❌ '}<span className="brand">{p.brand}</span> {p.product_name}</span>
        <span className="sub">🛒 {p.count}번{p.rated ? ` · ⭐ ${fmtRating(p.avg)}` : ''}</span>
      </button>
    )
  }

  return (
    <div className="content-box bp-root buypedia-page">
      <div className="bp-header">
        <div>
          <h1>📚 Buypedia</h1>
          <p className="bp-sub">우리가 산 것들을 모아두고, 다음에 살 때 골라 보는 곳</p>
        </div>
        <button className="bp-btn-add" onClick={() => navigate('/buypedia/new')}>+ 기록하기</button>
      </div>

      <div className="bp-search">
        <span className="icon">🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="품목, 브랜드, 제품명으로 찾기 (예: 생수, 만두, 비비고)"
        />
        {query && <button className="clear" onClick={() => setQuery('')} aria-label="검색어 지우기">✕</button>}
      </div>

      {pendingCount > 0 && (
        <button className="bp-pending-banner" onClick={() => navigate('/buypedia/pending')}>
          <span>⭐ 별점을 아직 안 매긴 기록이 <b>{pendingCount}건</b> 있어요. 써본 것부터 매겨 주세요</span>
          <span>›</span>
        </button>
      )}

      {loading ? (
        <div className="bp-loading"><div className="spinner" /></div>
      ) : data.products.length === 0 ? (
        <div className="bp-empty">
          <div className="emoji">🛒</div>
          <h3>첫 제품을 기록해보세요</h3>
          <p>만두, 치킨, 라면처럼 사 먹은 걸 남겨두면 다음에 살 때 순위로 바로 볼 수 있어요.</p>
          <button className="bp-btn-add" onClick={() => navigate('/buypedia/new')}>+ 첫 기록 남기기</button>
        </div>
      ) : q ? (
        <section>
          <div className="bp-section-title">'{query}' 검색 결과 {searchResults.length}개</div>
          {searchResults.length === 0
            ? <div className="bp-none">찾는 제품이 없어요. 처음 산 거라면 기록해 보세요.</div>
            : <div className="bp-rank-list">
                {[...searchResults].sort(SORTS.score.fn).map(p => (
                  <ProductRow key={p.key} p={p} showCategory categoryName={categoryName}
                    onClick={() => navigate(productUrl(p.key))} />
                ))}
              </div>}
        </section>
      ) : (
        <>
          <div className="bp-chips">
            <button className={`bp-chip ${tab === 'ALL' ? 'on' : ''}`} onClick={() => setTab('ALL')}>전체</button>
            {chips.map(c => (
              <button key={c.id} className={`bp-chip ${tab === c.id ? 'on' : ''}`} onClick={() => setTab(c.id)}>
                {c.name} <span className="cnt">{c.count}</span>
              </button>
            ))}
          </div>

          {tab === 'ALL' ? (
            <>
              <section>
                <div className="bp-section-title">🏆 다음에 살 때는 이걸로</div>
                {champions.length === 0
                  ? <div className="bp-none">비교할 제품이 2개 이상인 품목이 아직 없어요.</div>
                  : <div className="bp-champions">
                      {champions.map(({ g, top }) => (
                        <div key={g.key} className="bp-champion" onClick={() => navigate(productUrl(top.key))}>
                          <div className="thumb">
                            {top.image_url ? <img src={top.image_url} alt="" /> : <span>🥇</span>}
                          </div>
                          <div className="body">
                            <div className="cat" onClick={e => { e.stopPropagation(); setTab(g.category) }}>
                              {g.item} 1위 · {g.products.length}종 중 ›
                            </div>
                            <div className="name"><span className="brand">{top.brand}</span> {top.product_name}</div>
                            <div className="meta">종합 {fmtRating(top.score)} · 🛒 {top.count}번{top.rated ? ` · ⭐ ${fmtRating(top.avg)}` : ' · 평가 전'}</div>
                          </div>
                        </div>
                      ))}
                    </div>}
              </section>

              {undecided.length > 0 && (
                <section className="bp-staples-section">
                  <div className="bp-section-title">🤔 아직 판가름 전 <span className="bp-count-sub">같은 품목 제품끼리 점수가 같아서 아직 순위가 안 갈렸어요. 별점을 매기면 정해져요</span></div>
                  <div className="bp-staples">
                    {undecided.map(g => (
                      <button key={g.key} className="bp-staple" onClick={() => setTab(g.category)}>
                        <span className="name">{g.item}</span>
                        <span className="sub">{g.products.length}종 · 🛒 {g.total}번</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {staplesTop.length > 0 && (
                <section className="bp-staples-section">
                  <div className="bp-section-title">🔁 늘 사는 것</div>
                  <div className="bp-staples">{staplesTop.map(renderStaple)}</div>
                </section>
              )}
            </>
          ) : (
            <section>
              <div className="bp-table-head">
                <div className="bp-section-title">{categoryName(tab)} 품목별 비교</div>
                {compareGroups.length > 0 && (
                  <div className="bp-toggle">
                    {Object.entries(SORTS).map(([k, v]) => (
                      <button key={k} className={sortBy === k ? 'on' : ''} onClick={() => setSortBy(k)}>{v.label}</button>
                    ))}
                  </div>
                )}
              </div>

              {compareGroups.length === 0
                ? <div className="bp-none">이 카테고리엔 서로 비교할 제품이 아직 없어요.</div>
                : compareGroups.map(renderGroup)}

              {compareGroups.length > 0 && (
                <p className="bp-score-note">
                  순위는 같은 품목 안에서만 매겨요. 종합 = 별점 × 구매 배수 × 가격 배수 (5점 만점으로 환산).
                  구매 배수는 1번 ×1.00 · 2번 ×1.19 · 5번 ×1.31 · 10번 ×1.35. 별점이 없으면 구매 횟수로 추정해요.
                  가격 배수는 같은 품목에서 가장 싼 단가와 비교해서 정해요. 💰 가격 우선 품목(생수·달걀처럼 맛 차이가 작은 것)은 강하게,
                  🎨 가격 무관 품목(과자처럼 제품마다 개성이 다른 것)은 넣지 않고, 나머지는 조금만 반영해요.
                  단가는 가장 최근에 산 가격 기준이고, 쿠폰이나 카드 할인은 빠져 있어요. 종합 점수에 마우스를 올리면 어떻게 계산했는지 보여요.
                </p>
              )}

              {staples.length > 0 && (
                <div className="bp-staples-section">
                  <div className="bp-section-title">🔁 늘 사는 것 <span className="bp-count-sub">{staples.length}개 · 비교할 제품이 없어 순위는 안 매겨요</span></div>
                  <div className="bp-staples">{staples.map(renderStaple)}</div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default BuypediaPage
