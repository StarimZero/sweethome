import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api';
import './Knitting.scss';

const todayStr = () => new Date().toISOString().slice(0, 10);

const blankRecord = () => ({
  name: '',
  category: '',
  status: 'WAIT',
  size: '',
  start_date: '',
  end_date: '',
  difficulty: '',

  pattern: { name: '', designer: '', source: '' },

  orig_needles: [''],
  my_needles: [''],
  orig_gauge: { stitches: '', rows: '' },
  my_gauge_before: { stitches: '', rows: '' },
  my_gauge_after:  { stitches: '', rows: '' },
  current_row: '',
  frog_count: '',

  yarns: [{ name: '', lot: '', amount: '', unit: 'BALL' }],
  size_before_wash: '',
  size_after_wash: '',
  wash_method: '',

  techniques: [],
  tags: '',

  work_logs: [{ date: todayStr(), memo: '' }],

  ref_urls: [''],
  image_urls: [''],

  purpose: '',
  wear_freq: '',
  pattern_cost: { amount: '', currency: 'KRW' },
  yarn_cost: { amount: '', currency: 'KRW' },

  wife_comment: '',
  husband_comment: '',
  wife_rating: '',
  husband_rating: '',
  redo_note: '',
});

function StarPreview({ value }) {
  const num = parseFloat(value);
  const safe = isNaN(num) ? 0 : Math.max(0, Math.min(5, num));
  const pct = (safe / 5) * 100;
  return (
    <div className="star-preview">
      <span className="filled" style={{ width: `${pct}%` }} />
      <span className="num">{safe.toFixed(1)}</span>
    </div>
  );
}

function clampRating(v) {
  let s = String(v).replace(/[^0-9.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  if (parts[1] && parts[1].length > 1) s = parts[0] + '.' + parts[1][0];
  const num = parseFloat(s);
  if (!isNaN(num) && num > 5) s = '5.0';
  if (!isNaN(num) && num < 0) s = '0.0';
  return s;
}

function KnittingInsertPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(blankRecord());
  const [codes, setCodes] = useState({
    category: [], technique: [], purpose: [], wear_freq: [], unit: [], currency: [],
  });

  useEffect(() => {
    const groups = [
      ['KNITTING_CATEGORY',  'category'],
      ['KNITTING_TECHNIQUE', 'technique'],
      ['KNITTING_PURPOSE',   'purpose'],
      ['KNITTING_WEAR_FREQ', 'wear_freq'],
      ['YARN_UNIT',          'unit'],
      ['CURRENCY',           'currency'],
    ];
    Promise.all(groups.map(([g]) => apiClient.get(`/code/group/${g}`)))
      .then(results => {
        const next = {};
        results.forEach((res, i) => { next[groups[i][1]] = res.data; });
        setCodes(next);
      })
      .catch(err => console.error('코드 로딩 실패:', err));
  }, []);

  // 수정 모드: 기존 데이터 불러와서 폼 채우기
  useEffect(() => {
    if (!isEdit) return;
    apiClient.get(`/knitting/${id}`)
      .then(res => {
        const r = res.data;
        const blank = blankRecord();
        setForm({
          ...blank,
          ...r,
          // 빈 객체/배열 안전 보정
          pattern:          { ...blank.pattern,          ...(r.pattern || {}) },
          orig_gauge:       { ...blank.orig_gauge,       ...(r.orig_gauge || {}) },
          my_gauge_before:  { ...blank.my_gauge_before,  ...(r.my_gauge_before || {}) },
          my_gauge_after:   { ...blank.my_gauge_after,   ...(r.my_gauge_after || {}) },
          pattern_cost:     { ...blank.pattern_cost,     ...(r.pattern_cost || {}) },
          yarn_cost:        { ...blank.yarn_cost,        ...(r.yarn_cost || {}) },
          orig_needles:     r.orig_needles && r.orig_needles.length ? r.orig_needles : [''],
          my_needles:       r.my_needles   && r.my_needles.length   ? r.my_needles   : [''],
          yarns:            r.yarns        && r.yarns.length        ? r.yarns        : blank.yarns,
          work_logs:        r.work_logs    && r.work_logs.length    ? r.work_logs    : blank.work_logs,
          ref_urls:         r.ref_urls     && r.ref_urls.length     ? r.ref_urls     : [''],
          image_urls:       r.image_urls   && r.image_urls.length   ? r.image_urls   : [''],
          techniques:       r.techniques || [],
          // 숫자 필드는 input value 로 쓰려고 문자열로
          difficulty:       r.difficulty   ?? '',
          wife_rating:      r.wife_rating  ?? '',
          husband_rating:   r.husband_rating ?? '',
          frog_count:       r.frog_count   ?? '',
          // tags 배열 → 쉼표 문자열로 (편집 편의)
          tags: Array.isArray(r.tags) ? r.tags.join(', ') : (r.tags || ''),
        });
      })
      .catch(err => {
        console.error(err);
        alert('데이터 불러오기 실패');
      });
  }, [id, isEdit]);

  const setField = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const setNested = (parent, key, value) =>
    setForm(p => ({ ...p, [parent]: { ...p[parent], [key]: value } }));
  const setArrayItem = (key, i, value) =>
    setForm(p => {
      const arr = [...p[key]];
      arr[i] = value;
      return { ...p, [key]: arr };
    });
  const setArrayObjField = (key, i, field, value) =>
    setForm(p => {
      const arr = [...p[key]];
      arr[i] = { ...arr[i], [field]: value };
      return { ...p, [key]: arr };
    });
  const addArrayItem = (key, init) =>
    setForm(p => ({ ...p, [key]: [...p[key], init] }));
  const removeArrayItem = (key, i) =>
    setForm(p => ({ ...p, [key]: p[key].filter((_, idx) => idx !== i) }));

  const onStatusChange = (status) => {
    setForm(p => {
      const next = { ...p, status };
      if (status === 'FO' && !p.end_date) next.end_date = todayStr();
      return next;
    });
  };

  const toggleTechnique = (codeId) => {
    setForm(p => {
      const has = p.techniques.includes(codeId);
      return { ...p, techniques: has
        ? p.techniques.filter(x => x !== codeId)
        : [...p.techniques, codeId] };
    });
  };

  // 빈 문자열 → null (숫자/실수 필드)
  const num = (v) => (v === '' || v === null || v === undefined) ? null : Number(v);
  const intOrNull = (v) => (v === '' || v === null || v === undefined) ? null : parseInt(v, 10);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('작품 이름은 필수입니다.');
      return;
    }

    const payload = {
      ...form,
      difficulty: num(form.difficulty),
      wife_rating: num(form.wife_rating),
      husband_rating: num(form.husband_rating),
      frog_count: intOrNull(form.frog_count),
      orig_gauge: { stitches: intOrNull(form.orig_gauge.stitches), rows: intOrNull(form.orig_gauge.rows) },
      my_gauge_before: { stitches: intOrNull(form.my_gauge_before.stitches), rows: intOrNull(form.my_gauge_before.rows) },
      my_gauge_after:  { stitches: intOrNull(form.my_gauge_after.stitches),  rows: intOrNull(form.my_gauge_after.rows) },
      yarns: form.yarns
        .filter(y => y.name || y.lot || y.amount)
        .map(y => ({ ...y, amount: num(y.amount) })),
      pattern_cost: { amount: num(form.pattern_cost.amount), currency: form.pattern_cost.currency },
      yarn_cost:    { amount: num(form.yarn_cost.amount),    currency: form.yarn_cost.currency },
      orig_needles: form.orig_needles.filter(n => n.trim()),
      my_needles:   form.my_needles.filter(n => n.trim()),
      ref_urls:     form.ref_urls.filter(u => u.trim()),
      image_urls:   form.image_urls.filter(u => u.trim()),
      work_logs:    form.work_logs.filter(l => l.memo || l.date),
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : form.tags,
    };

    try {
      if (isEdit) {
        await apiClient.put(`/knitting/${id}`, payload);
        alert('수정 완료!');
        navigate(`/knitting/${id}`);
      } else {
        await apiClient.post('/knitting', payload);
        alert('등록 완료!');
        navigate('/knitting');
      }
    } catch (err) {
      console.error(err);
      alert('오류 발생');
    }
  };

  return (
    <div className="content-box knitting-insert-page">
      <h1>🧶 뜨개록 {isEdit ? '수정' : '등록'}</h1>
      <form onSubmit={handleSubmit}>

        {/* === 기본 정보 === */}
        <div className="section-title">기본 정보</div>
        <div className="form-grid">
          <label>작품 이름 <span className="req">*</span>
            <input type="text" value={form.name}
                   onChange={e => setField('name', e.target.value)}
                   placeholder="예: 아란 스웨터" required />
          </label>
          <label>카테고리
            <select value={form.category} onChange={e => setField('category', e.target.value)}>
              <option value="">-- 선택 --</option>
              {codes.category.map(c => (
                <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
              ))}
            </select>
          </label>

          <label>상태 <span className="req">*</span>
            <select value={form.status} onChange={e => onStatusChange(e.target.value)}>
              <option value="WAIT">대기</option>
              <option value="CO">CO (시작)</option>
              <option value="WIP">WIP (진행중)</option>
              <option value="FO">FO (완성)</option>
            </select>
          </label>
          <label>사이즈
            <input type="text" value={form.size}
                   onChange={e => setField('size', e.target.value)}
                   placeholder="예: M, 90cm, 250mm 등" />
          </label>

          <label>시작 날짜
            <input type="date" value={form.start_date}
                   onChange={e => setField('start_date', e.target.value)} />
          </label>
          <label>끝낸 날짜 {form.status === 'FO' && <span className="hint">(FO 자동)</span>}
            <input type="date" value={form.end_date}
                   onChange={e => setField('end_date', e.target.value)} />
          </label>

          <label>난이도 (0.0 ~ 5.0)
            <div className="rate-input">
              <input type="text" inputMode="decimal" maxLength={3}
                     value={form.difficulty}
                     onChange={e => setField('difficulty', clampRating(e.target.value))}
                     placeholder="예: 3.5" />
              <StarPreview value={form.difficulty} />
            </div>
          </label>
          <div></div>
        </div>

        {/* === 도안 정보 === */}
        <div className="section-title">도안 정보</div>
        <div className="form-grid">
          <label>도안 이름
            <input type="text" value={form.pattern.name}
                   onChange={e => setNested('pattern', 'name', e.target.value)}
                   placeholder="예: Aran Pullover" />
          </label>
          <label>디자이너
            <input type="text" value={form.pattern.designer}
                   onChange={e => setNested('pattern', 'designer', e.target.value)}
                   placeholder="예: Jared Flood" />
          </label>
          <label className="full">출처 (책/사이트/지인 등)
            <input type="text" value={form.pattern.source}
                   onChange={e => setNested('pattern', 'source', e.target.value)}
                   placeholder="예: Ravelry, '북유럽 손뜨개' p.42" />
          </label>
        </div>

        {/* === 바늘 & 게이지 === */}
        <div className="section-title">바늘 & 게이지</div>
        <div className="form-grid">
          <div className="full">
            <h3>원작 바늘
              <button type="button" className="btn-mini"
                      onClick={() => addArrayItem('orig_needles', '')}>＋ 바늘 추가</button>
            </h3>
            <div className="row-list">
              {form.orig_needles.length === 0
                ? <div className="row-empty">＋ 바늘 추가 버튼을 눌러 입력하세요.</div>
                : form.orig_needles.map((n, i) => (
                  <div key={i} className="row needle">
                    <input type="text" value={n}
                           onChange={e => setArrayItem('orig_needles', i, e.target.value)}
                           placeholder="예: 4.0mm 줄바늘 — 본체용" />
                    <button type="button" className="btn-del"
                            onClick={() => removeArrayItem('orig_needles', i)}>삭제</button>
                  </div>
                ))}
            </div>
          </div>

          <div className="full">
            <h3>원작 게이지</h3>
            <div className="inline-pair">
              10cm × 10cm 안에
              <input type="number" value={form.orig_gauge.stitches}
                     onChange={e => setNested('orig_gauge', 'stitches', e.target.value)} placeholder="코" />
              <span className="sep">코</span>
              <input type="number" value={form.orig_gauge.rows}
                     onChange={e => setNested('orig_gauge', 'rows', e.target.value)} placeholder="단" />
              <span className="sep">단</span>
            </div>
          </div>

          <div className="full">
            <h3>나의 바늘
              <button type="button" className="btn-mini"
                      onClick={() => addArrayItem('my_needles', '')}>＋ 바늘 추가</button>
            </h3>
            <div className="row-list">
              {form.my_needles.length === 0
                ? <div className="row-empty">＋ 바늘 추가 버튼을 눌러 입력하세요.</div>
                : form.my_needles.map((n, i) => (
                  <div key={i} className="row needle">
                    <input type="text" value={n}
                           onChange={e => setArrayItem('my_needles', i, e.target.value)}
                           placeholder="예: 3.75mm 막대바늘" />
                    <button type="button" className="btn-del"
                            onClick={() => removeArrayItem('my_needles', i)}>삭제</button>
                  </div>
                ))}
            </div>
          </div>

          <div className="full">
            <h3>나의 게이지</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>세탁 전</div>
                <div className="inline-pair">
                  <input type="number" value={form.my_gauge_before.stitches}
                         onChange={e => setNested('my_gauge_before', 'stitches', e.target.value)} placeholder="코" />
                  <span className="sep">코</span>
                  <input type="number" value={form.my_gauge_before.rows}
                         onChange={e => setNested('my_gauge_before', 'rows', e.target.value)} placeholder="단" />
                  <span className="sep">단</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>세탁 후</div>
                <div className="inline-pair">
                  <input type="number" value={form.my_gauge_after.stitches}
                         onChange={e => setNested('my_gauge_after', 'stitches', e.target.value)} placeholder="코" />
                  <span className="sep">코</span>
                  <input type="number" value={form.my_gauge_after.rows}
                         onChange={e => setNested('my_gauge_after', 'rows', e.target.value)} placeholder="단" />
                  <span className="sep">단</span>
                </div>
              </div>
            </div>
          </div>

          <label>현재 진행 단 (WIP)
            <input type="text" value={form.current_row}
                   onChange={e => setField('current_row', e.target.value)}
                   placeholder="예: 84단 / 앞판 완성" />
          </label>
          <label>풀고 다시 뜬 횟수
            <input type="number" min="0" value={form.frog_count}
                   onChange={e => setField('frog_count', e.target.value)} placeholder="예: 2" />
          </label>
        </div>

        {/* === 실 정보 === */}
        <div className="section-title">실 정보</div>
        <div className="form-grid">
          <div className="full">
            <h3>사용한 실
              <button type="button" className="btn-mini"
                      onClick={() => addArrayItem('yarns', { name: '', lot: '', amount: '', unit: codes.unit[0]?.code_id || 'BALL' })}>＋ 실 추가</button>
            </h3>
            <div className="row-list">
              {form.yarns.length === 0
                ? <div className="row-empty">＋ 실 추가 버튼을 눌러 사용한 실을 입력하세요.</div>
                : form.yarns.map((y, i) => (
                  <div key={i} className="row yarn">
                    <input type="text" value={y.name}
                           onChange={e => setArrayObjField('yarns', i, 'name', e.target.value)}
                           placeholder="실 이름 (예: Drops Lima)" />
                    <input type="text" value={y.lot}
                           onChange={e => setArrayObjField('yarns', i, 'lot', e.target.value)}
                           placeholder="LOT 번호" />
                    <input type="number" step="0.1" value={y.amount}
                           onChange={e => setArrayObjField('yarns', i, 'amount', e.target.value)}
                           placeholder="수량" />
                    <select value={y.unit}
                            onChange={e => setArrayObjField('yarns', i, 'unit', e.target.value)}>
                      {codes.unit.map(u => (
                        <option key={u.code_id} value={u.code_id}>{u.code_name}</option>
                      ))}
                    </select>
                    <button type="button" className="btn-del"
                            onClick={() => removeArrayItem('yarns', i)}>삭제</button>
                  </div>
                ))}
            </div>
          </div>

          <div className="full">
            <h3>완성 후 사이즈 (세탁 전/후)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ fontSize: 12, color: '#888' }}>세탁 전
                <input type="text" value={form.size_before_wash}
                       onChange={e => setField('size_before_wash', e.target.value)}
                       placeholder="예: 너비 50 / 길이 60" />
              </label>
              <label style={{ fontSize: 12, color: '#888' }}>세탁 후
                <input type="text" value={form.size_after_wash}
                       onChange={e => setField('size_after_wash', e.target.value)}
                       placeholder="예: 너비 48 / 길이 58" />
              </label>
            </div>
          </div>

          <label className="full">세탁 방법
            <input type="text" value={form.wash_method}
                   onChange={e => setField('wash_method', e.target.value)}
                   placeholder="예: 손세탁, 미온수, 평면건조" />
          </label>
        </div>

        {/* === 사용 기법 / 태그 === */}
        <div className="section-title">사용 기법 / 태그</div>
        <div className="form-grid">
          <div className="full">
            <h3>사용한 기법 (복수 선택)</h3>
            <div className="chip-group">
              {codes.technique.map(c => (
                <label key={c.code_id} className="chip">
                  <input type="checkbox"
                         checked={form.techniques.includes(c.code_id)}
                         onChange={() => toggleTechnique(c.code_id)} />
                  <span>{c.code_name}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="full">자유 태그
            <input type="text" value={form.tags}
                   onChange={e => setField('tags', e.target.value)}
                   placeholder="예: #여름실, #선물용, #첫도전 (쉼표로 구분)" />
          </label>
        </div>

        {/* === 작업 일지 === */}
        <div className="section-title">작업 일지
          <button type="button" className="btn-mini"
                  onClick={() => addArrayItem('work_logs', { date: todayStr(), memo: '' })}>＋ 로그 추가</button>
        </div>
        <div className="row-list">
          {form.work_logs.length === 0
            ? <div className="row-empty">＋ 로그 추가 버튼을 눌러 작업 기록을 남기세요.</div>
            : form.work_logs.map((l, i) => (
              <div key={i} className="row log">
                <input type="date" value={l.date}
                       onChange={e => setArrayObjField('work_logs', i, 'date', e.target.value)} />
                <textarea value={l.memo}
                          onChange={e => setArrayObjField('work_logs', i, 'memo', e.target.value)}
                          placeholder="이 날의 진행 / 메모..." />
                <button type="button" className="btn-del"
                        onClick={() => removeArrayItem('work_logs', i)}>삭제</button>
              </div>
            ))}
        </div>

        {/* === URL === */}
        <div className="section-title">참고 URL
          <button type="button" className="btn-mini"
                  onClick={() => addArrayItem('ref_urls', '')}>＋ URL 추가</button>
        </div>
        <div className="row-list">
          {form.ref_urls.length === 0
            ? <div className="row-empty">＋ URL 추가 버튼을 눌러 참고 링크를 입력하세요.</div>
            : form.ref_urls.map((u, i) => (
              <div key={i} className="row url">
                <div className="url-idx">{i + 1}</div>
                <input type="url" value={u}
                       onChange={e => setArrayItem('ref_urls', i, e.target.value)}
                       placeholder="https://..." />
                <button type="button" className="btn-del"
                        onClick={() => removeArrayItem('ref_urls', i)}>삭제</button>
              </div>
            ))}
        </div>

        <div className="section-title">이미지 URL
          <button type="button" className="btn-mini"
                  onClick={() => addArrayItem('image_urls', '')}>＋ 이미지 추가</button>
          <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>※ 첫 번째 이미지가 썸네일</span>
        </div>
        <div className="row-list">
          {form.image_urls.length === 0
            ? <div className="row-empty">＋ 이미지 추가 버튼을 눌러 이미지 URL을 입력하세요.</div>
            : form.image_urls.map((u, i) => (
              <div key={i} className="row url">
                <div className={`url-idx ${i === 0 ? 'thumb-mark' : ''}`}>
                  {i === 0 ? '썸' : i + 1}
                </div>
                <input type="url" value={u}
                       onChange={e => setArrayItem('image_urls', i, e.target.value)}
                       placeholder="https://..." />
                <button type="button" className="btn-del"
                        onClick={() => removeArrayItem('image_urls', i)}>삭제</button>
              </div>
            ))}
        </div>

        {/* === 추가 정보 === */}
        <div className="section-title">추가 정보</div>
        <div className="form-grid">
          <label>용도
            <select value={form.purpose} onChange={e => setField('purpose', e.target.value)}>
              <option value="">-- 선택 --</option>
              {codes.purpose.map(c => (
                <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
              ))}
            </select>
          </label>
          <label>착용/사용 빈도 (FO 후)
            <select value={form.wear_freq} onChange={e => setField('wear_freq', e.target.value)}>
              <option value="">-- 선택 --</option>
              {codes.wear_freq.map(c => (
                <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
              ))}
            </select>
          </label>

          <label>도안 비용
            <div className="cost-input">
              <input type="number" value={form.pattern_cost.amount}
                     onChange={e => setNested('pattern_cost', 'amount', e.target.value)}
                     placeholder="예: 8000" />
              <select value={form.pattern_cost.currency}
                      onChange={e => setNested('pattern_cost', 'currency', e.target.value)}>
                {codes.currency.map(c => (
                  <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
                ))}
              </select>
            </div>
          </label>
          <label>실 비용
            <div className="cost-input">
              <input type="number" value={form.yarn_cost.amount}
                     onChange={e => setNested('yarn_cost', 'amount', e.target.value)}
                     placeholder="예: 45000" />
              <select value={form.yarn_cost.currency}
                      onChange={e => setNested('yarn_cost', 'currency', e.target.value)}>
                {codes.currency.map(c => (
                  <option key={c.code_id} value={c.code_id}>{c.code_name}</option>
                ))}
              </select>
            </div>
          </label>

          <label>아내 평점 (0.0 ~ 5.0)
            <div className="rate-input">
              <input type="text" inputMode="decimal" maxLength={3}
                     value={form.wife_rating}
                     onChange={e => setField('wife_rating', clampRating(e.target.value))}
                     placeholder="예: 4.5" />
              <StarPreview value={form.wife_rating} />
            </div>
          </label>
          <label>남편 평점 (0.0 ~ 5.0)
            <div className="rate-input">
              <input type="text" inputMode="decimal" maxLength={3}
                     value={form.husband_rating}
                     onChange={e => setField('husband_rating', clampRating(e.target.value))}
                     placeholder="예: 4.5" />
              <StarPreview value={form.husband_rating} />
            </div>
          </label>

          <label className="full">아내 코멘트
            <textarea value={form.wife_comment}
                      onChange={e => setField('wife_comment', e.target.value)}
                      placeholder="만들면서 느낀 점, 어려웠던 부분 등..." />
          </label>
          <label className="full">남편 코멘트
            <textarea value={form.husband_comment}
                      onChange={e => setField('husband_comment', e.target.value)}
                      placeholder="받았을 때 / 봤을 때의 감상..." />
          </label>

          <label className="full">📌 다시 만든다면 (재도전 시 참고)
            <textarea value={form.redo_note}
                      onChange={e => setField('redo_note', e.target.value)}
                      placeholder="예: 한 사이즈 크게, 바늘 0.25mm 작게..." />
          </label>
        </div>

        <div className="btn-row">
          <button type="button" className="btn secondary"
                  onClick={() => navigate(isEdit ? `/knitting/${id}` : '/knitting')}>취소</button>
          <button type="submit" className="btn primary">{isEdit ? '저장' : '등록'}</button>
        </div>
      </form>
    </div>
  );
}

export default KnittingInsertPage;
