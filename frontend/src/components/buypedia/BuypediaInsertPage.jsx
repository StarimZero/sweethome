import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import apiClient from '../../api'
import { useToast } from '../common/Toast'
import { useBuypediaCodes, findSimilar, norm, unitPrice, UNITS } from './buypediaUtils'
import PersonEval from './PersonEval'
import './Buypedia.scss'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const EMPTY = {
  category: '', brand: '', product_name: '', item_type: '', purchase_type: '',
  purchase_date: today(), purchase_place: '', price: '', amount: '', unit: 'g',
  rating_husband: null, rating_wife: null, comment_husband: '', comment_wife: '',
  rebuy_husband: null, rebuy_wife: null, image_urls: [''],
}

function SimilarHint({ value, candidates, label, onPick }) {
  const similar = findSimilar(value, candidates)
  if (!similar) return null
  return (
    <div className="bp-similar">
      혹시 이미 있는 {label} <button type="button" onClick={() => onPick(similar)}>'{similar}'</button> 인가요?
    </div>
  )
}

function BuypediaInsertPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { categories, buyTypes, addCategory } = useBuypediaCodes()

  const [form, setForm] = useState(() => ({
    ...EMPTY,
    // [또 먹었어요]로 들어오면 제품 정보가 채워져 있음
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    product_name: searchParams.get('product_name') || '',
    item_type: searchParams.get('item_type') || '',
    purchase_type: searchParams.get('purchase_type') || '',
    purchase_place: searchParams.get('purchase_place') || '',
  }))
  const [products, setProducts] = useState([])
  const [newCat, setNewCat] = useState(null) // null = 닫힘, '' 이상 = 입력 중
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // 자동완성용 기존 제품 목록
  useEffect(() => {
    apiClient.get('/buypedia/ranking').then(res => setProducts(res.data.products)).catch(console.error)
  }, [])

  // 수정 모드: 기존 기록 불러오기
  useEffect(() => {
    if (!isEdit) return
    apiClient.get(`/buypedia/${id}`)
      .then(res => {
        const r = res.data
        setForm({
          ...EMPTY, ...r,
          price: r.price ?? '', amount: r.amount ?? '', unit: r.unit || 'g',
          purchase_type: r.purchase_type || '',
          image_urls: r.image_urls?.length ? r.image_urls : [''],
        })
      })
      .catch(err => { console.error(err); toast.error('기록을 불러오지 못했습니다.') })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // 새 기록이면 첫 번째 카테고리를 기본 선택
  useEffect(() => {
    if (!isEdit && !form.category && categories.length) {
      setForm(f => ({ ...f, category: f.category || categories[0].code_id }))
    }
  }, [categories, isEdit, form.category])

  const set = (name, value) => setForm(f => ({ ...f, [name]: value }))
  const onInput = (e) => set(e.target.name, e.target.value)

  // 브랜드: 같은 카테고리 브랜드 먼저, 그 다음 나머지
  const brandOptions = useMemo(() => {
    const seen = new Set(); const out = []
    const push = (b) => { if (!seen.has(norm(b))) { seen.add(norm(b)); out.push(b) } }
    products.filter(p => p.category === form.category).forEach(p => push(p.brand))
    products.forEach(p => push(p.brand))
    return out
  }, [products, form.category])

  const productOptions = useMemo(() => products
    .filter(p => p.category === form.category && norm(p.brand) === norm(form.brand))
    .map(p => p.product_name), [products, form.category, form.brand])

  // 품목: 같은 카테고리에서 쓰인 품목들. 같은 제품을 예전에 넣었으면 그 품목을 제안
  const itemOptions = useMemo(() => [...new Set(products
    .filter(p => p.category === form.category && p.item_type).map(p => p.item_type))], [products, form.category])
  const knownItem = useMemo(() => products.find(p => p.category === form.category
    && norm(p.brand) === norm(form.brand) && norm(p.product_name) === norm(form.product_name))?.item_type, [products, form])

  const isDelivery = form.purchase_type === 'DELIVERY'
  const perUnit = unitPrice(Number(form.price), Number(form.amount), form.unit)
  const catNames = categories.map(c => c.code_name)

  const handleAddCategory = async () => {
    const name = (newCat || '').trim()
    if (!name) { toast.error('카테고리 이름을 입력하세요.'); return }
    const exists = categories.find(c => norm(c.code_name) === norm(name))
    if (exists) { set('category', exists.code_id); setNewCat(null); return }
    try {
      const code = await addCategory(name)
      set('category', code.code_id)
      setNewCat(null)
      toast.success(`'${name}' 카테고리를 추가했어요.`)
    } catch (err) {
      console.error(err)
      toast.error('카테고리 추가에 실패했습니다.')
    }
  }

  const handleSubmit = async () => {
    if (!form.category) { toast.error('카테고리를 선택하세요.'); return }
    if (!form.brand.trim()) { toast.error('브랜드를 입력하세요.'); return }
    if (!form.product_name.trim()) { toast.error('제품명을 입력하세요.'); return }
    if (submitting) return

    const payload = {
      ...form,
      purchase_type: form.purchase_type || null,
      price: form.price === '' ? null : Number(form.price),
      amount: form.amount === '' ? null : Number(form.amount),
      unit: form.amount === '' ? null : form.unit,
      image_urls: form.image_urls.filter(u => u.trim()),
    }
    delete payload._id; delete payload.id; delete payload.revision_id
    delete payload.created_at; delete payload.updated_at; delete payload.created_by

    setSubmitting(true)
    try {
      const res = isEdit
        ? await apiClient.put(`/buypedia/${id}`, payload)
        : await apiClient.post('/buypedia', payload)
      toast.success(isEdit ? '수정되었습니다!' : '기록되었습니다!')
      navigate(`/buypedia/${res.data._id || id}`, { replace: true })
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.detail || '저장에 실패했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) return <div className="content-box bp-root buypedia-insert-page"><div className="bp-loading"><div className="spinner" /></div></div>

  return (
    <div className="content-box bp-root buypedia-insert-page">
      <div className="form-header">
        <h1>{isEdit ? '✏️ 기록 수정' : '📚 Buypedia 기록하기'}</h1>
        <div className="btn-group">
          <button className="btn primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </button>
          <button className="btn" onClick={() => navigate(-1)} disabled={submitting}>취소</button>
        </div>
      </div>

      <div className="form-section">
        <div className="section-title">제품 정보</div>

        <div className="form-group">
          <label>카테고리 *</label>
          <div className="bp-chips wrap">
            {categories.map(c => (
              <button key={c.code_id} type="button"
                className={`bp-chip ${form.category === c.code_id ? 'on' : ''}`}
                onClick={() => set('category', c.code_id)}>{c.code_name}</button>
            ))}
            {newCat === null && (
              <button type="button" className="bp-chip add" onClick={() => setNewCat('')}>+ 새 카테고리</button>
            )}
          </div>
          {newCat !== null && (
            <div className="bp-newcat">
              <input
                autoFocus value={newCat} placeholder="예: 돈까스"
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setNewCat(null) }}
              />
              <button type="button" className="btn primary" onClick={handleAddCategory}>추가</button>
              <button type="button" className="btn" onClick={() => setNewCat(null)}>닫기</button>
              <SimilarHint value={newCat} candidates={catNames} label="카테고리"
                onPick={name => { set('category', categories.find(c => c.code_name === name).code_id); setNewCat(null) }} />
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>브랜드 *</label>
            <input name="brand" value={form.brand} onChange={onInput} list="bp-brands" placeholder="예: 비비고, BBQ" autoComplete="off" />
            <datalist id="bp-brands">{brandOptions.map(b => <option key={b} value={b} />)}</datalist>
            <SimilarHint value={form.brand} candidates={brandOptions} label="브랜드" onPick={v => set('brand', v)} />
          </div>
          <div className="form-group">
            <label>제품명 *</label>
            <input name="product_name" value={form.product_name} onChange={onInput} list="bp-products" placeholder="예: 왕교자, 황금올리브" autoComplete="off" />
            <datalist id="bp-products">{productOptions.map(p => <option key={p} value={p} />)}</datalist>
            <SimilarHint value={form.product_name} candidates={productOptions} label="제품" onPick={v => set('product_name', v)} />
          </div>
        </div>

        <div className="form-group">
          <label>품목 <span className="hint">※ 서로 바꿔 살 수 있는 것끼리 같은 품목으로 묶어요 (예: 생수, 만두, 대파). 순위는 같은 품목끼리만 매겨요</span></label>
          <input name="item_type" value={form.item_type || ''} onChange={onInput} list="bp-items" placeholder="예: 만두" autoComplete="off" />
          <datalist id="bp-items">{itemOptions.map(i => <option key={i} value={i} />)}</datalist>
          {knownItem && !form.item_type && (
            <div className="bp-similar">이 제품은 예전에 <button type="button" onClick={() => set('item_type', knownItem)}>'{knownItem}'</button> 품목이었어요.</div>
          )}
          <SimilarHint value={form.item_type} candidates={itemOptions} label="품목" onPick={v => set('item_type', v)} />
        </div>

        <div className="form-group">
          <label>구매 방식</label>
          <div className="bp-chips wrap">
            {buyTypes.map(b => (
              <button key={b.code_id} type="button"
                className={`bp-chip ${form.purchase_type === b.code_id ? 'on' : ''}`}
                onClick={() => set('purchase_type', form.purchase_type === b.code_id ? '' : b.code_id)}>{b.code_name}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-title">구매 정보</div>
        <div className="grid-2">
          <div className="form-group">
            <label>구매일</label>
            <input type="date" name="purchase_date" value={form.purchase_date} onChange={onInput} />
          </div>
          <div className="form-group">
            <label>{isDelivery ? '지점명' : '구매처'}</label>
            <input name="purchase_place" value={form.purchase_place} onChange={onInput}
              placeholder={isDelivery ? '예: BBQ 강남역점' : '예: 코스트코 양재점, 쿠팡'} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label>가격 (원)</label>
            <input type="number" name="price" value={form.price} onChange={onInput} min="0" placeholder="예: 12900" />
          </div>
          <div className="form-group">
            <label>용량</label>
            <div className="bp-amount">
              <input type="number" name="amount" value={form.amount} onChange={onInput} min="0" placeholder="예: 1400" />
              <select name="unit" value={form.unit} onChange={onInput}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {perUnit && <div className="bp-perunit">💡 {perUnit}</div>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-title">우리 평가</div>
        <p className="hint">안 먹은 사람은 별점을 '안 먹음'으로 두면 평균에서 빠져요. 나중에 수정해서 채워도 돼요.</p>
        <div className="grid-2">
          <PersonEval who="남편" icon="👨" rating={form.rating_husband} rebuy={form.rebuy_husband} comment={form.comment_husband}
            onChange={(k, v) => set(`${k}_husband`, v)} />
          <PersonEval who="아내" icon="👩" rating={form.rating_wife} rebuy={form.rebuy_wife} comment={form.comment_wife}
            onChange={(k, v) => set(`${k}_wife`, v)} />
        </div>
      </div>

      <div className="form-section">
        <div className="section-title">사진</div>
        <div className="form-group">
          <label>이미지 URL <span className="hint">※ 첫 번째가 대표 이미지</span></label>
          {form.image_urls.map((url, i) => (
            <div key={i} className="input-row">
              {url && <img key={url} className="bp-img-preview" src={url} alt="" onError={e => { e.target.style.display = 'none' }} />}
              <input value={url} placeholder={`이미지 URL #${i + 1}`}
                onChange={e => set('image_urls', form.image_urls.map((u, j) => (j === i ? e.target.value : u)))} />
              {form.image_urls.length > 1 && (
                <button type="button" className="btn-del" onClick={() => set('image_urls', form.image_urls.filter((_, j) => j !== i))}>X</button>
              )}
            </div>
          ))}
          <button type="button" className="btn-add-sub" onClick={() => set('image_urls', [...form.image_urls, ''])}>+ 이미지 추가</button>
        </div>
      </div>
    </div>
  )
}

export default BuypediaInsertPage
