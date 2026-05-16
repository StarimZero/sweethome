import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api';
import { useAuth } from '../../context/AuthContext';
import './Knitting.scss';

const STATUS_LABEL = { WAIT: '대기', CO: 'CO', WIP: 'WIP', FO: 'FO' };

function StarPreview({ value }) {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return <span style={{ color: '#aaa', fontSize: 13 }}>—</span>;
  const safe = Math.max(0, Math.min(5, num));
  const pct = (safe / 5) * 100;
  return (
    <div className="star-preview">
      <span className="filled" style={{ width: `${pct}%` }} />
      <span className="num">{safe.toFixed(1)}</span>
    </div>
  );
}

function fmtCost(c) {
  if (!c || c.amount === null || c.amount === undefined || c.amount === '') return '—';
  return `${Number(c.amount).toLocaleString()} ${c.currency || ''}`.trim();
}

function fmtGauge(g) {
  if (!g) return '—';
  const s = g.stitches, r = g.rows;
  if ((s === null || s === '' || s === undefined) && (r === null || r === '' || r === undefined)) return '—';
  return `10×10cm 안에 ${s ?? '?'}코 × ${r ?? '?'}단`;
}

function KnittingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthorName } = useAuth();
  const [record, setRecord] = useState(null);
  const [codes, setCodes] = useState({
    category: [], technique: [], purpose: [], wear_freq: [], unit: [], currency: [],
  });
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    apiClient.get(`/knitting/${id}`)
      .then(res => setRecord(res.data))
      .catch(() => alert('불러오기 실패'));

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
      });
  }, [id]);

  const codeName = (group, codeId) =>
    codes[group]?.find(c => c.code_id === codeId)?.code_name || codeId || '—';

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/knitting/${id}`);
      alert('삭제되었습니다.');
      navigate('/knitting');
    } catch {
      alert('삭제 실패');
    }
  };

  if (!record) {
    return <div className="content-box knitting-detail-page"><h1>불러오는 중...</h1></div>;
  }

  const period = record.start_date
    ? `${record.start_date} ~ ${record.end_date || '진행중'}`
    : '미시작';

  return (
    <div className="content-box knitting-detail-page">
      <h1>
        {record.name}
        <span className={`knitting-status-tag s-${record.status}`}>{STATUS_LABEL[record.status] || record.status}</span>
      </h1>

      <div className="detail-header">
        <div className="image-area">
          <div className="main-thumb">
            {record.image_urls && record.image_urls.length > 0
              ? <img src={record.image_urls[activeImg]} alt={record.name} />
              : '🧶'}
          </div>
          {record.image_urls && record.image_urls.length > 1 && (
            <div className="thumb-strip">
              {record.image_urls.map((u, i) => (
                <div key={i} className={`mini-thumb ${i === activeImg ? 'active' : ''}`}
                     onClick={() => setActiveImg(i)}>
                  <img src={u} alt={`#${i + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="summary">
          <div className="detail-row"><div className="key">작성자</div><div>👤 {getAuthorName(record.created_by)}</div></div>
          <div className="detail-row"><div className="key">카테고리</div><div>{codeName('category', record.category)}</div></div>
          <div className="detail-row"><div className="key">시작 / 끝</div><div>{period}</div></div>
          <div className="detail-row"><div className="key">사이즈</div><div>{record.size || '—'}</div></div>
          <div className="detail-row"><div className="key">난이도</div><div><StarPreview value={record.difficulty} /></div></div>
          <div className="detail-row"><div className="key">용도 / 빈도</div>
            <div>{codeName('purpose', record.purpose)}
                 {record.wear_freq ? ` · ${codeName('wear_freq', record.wear_freq)}` : ''}</div>
          </div>
          <div className="detail-row"><div className="key">총 비용</div>
            <div>도안 {fmtCost(record.pattern_cost)} + 실 {fmtCost(record.yarn_cost)}</div>
          </div>
          {record.tags && record.tags.length > 0 && (
            <div className="detail-row"><div className="key">태그</div>
              <div>{record.tags.map((t, i) => <span key={i} className="tag-pill">#{t.replace(/^#/, '')}</span>)}</div>
            </div>
          )}
        </div>
      </div>

      {/* 도안 정보 */}
      {(record.pattern?.name || record.pattern?.designer || record.pattern?.source || (record.ref_urls && record.ref_urls.length > 0)) && (
        <>
          <div className="section-title">도안 정보</div>
          {record.pattern?.name &&     <div className="detail-row"><div className="key">도안 이름</div><div>{record.pattern.name}</div></div>}
          {record.pattern?.designer && <div className="detail-row"><div className="key">디자이너</div><div>{record.pattern.designer}</div></div>}
          {record.pattern?.source &&   <div className="detail-row"><div className="key">출처</div><div>{record.pattern.source}</div></div>}
          {record.ref_urls && record.ref_urls.length > 0 && (
            <div className="detail-row">
              <div className="key">참고 URL</div>
              <div className="ref-links">
                {record.ref_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noopener noreferrer">{u}</a>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 바늘 & 게이지 */}
      <div className="section-title">바늘 / 게이지</div>
      <div className="detail-row"><div className="key">원작 바늘</div>
        <div>{record.orig_needles && record.orig_needles.length > 0 ? record.orig_needles.join(' · ') : '—'}</div>
      </div>
      <div className="detail-row"><div className="key">원작 게이지</div><div>{fmtGauge(record.orig_gauge)}</div></div>
      <div className="detail-row"><div className="key">나의 바늘</div>
        <div>{record.my_needles && record.my_needles.length > 0 ? record.my_needles.join(' · ') : '—'}</div>
      </div>
      <div className="detail-row"><div className="key">나의 게이지 (세탁 전)</div><div>{fmtGauge(record.my_gauge_before)}</div></div>
      <div className="detail-row"><div className="key">나의 게이지 (세탁 후)</div><div>{fmtGauge(record.my_gauge_after)}</div></div>
      {record.current_row && <div className="detail-row"><div className="key">현재 진행 단</div><div>{record.current_row}</div></div>}
      {(record.frog_count !== null && record.frog_count !== undefined) &&
        <div className="detail-row"><div className="key">풀기 횟수</div><div>{record.frog_count}회</div></div>}

      {/* 실 정보 */}
      {record.yarns && record.yarns.length > 0 && (
        <>
          <div className="section-title">사용한 실</div>
          <table className="yarn-table">
            <thead>
              <tr><th>실 이름</th><th>LOT 번호</th><th>사용량</th></tr>
            </thead>
            <tbody>
              {record.yarns.map((y, i) => (
                <tr key={i}>
                  <td>{y.name || '—'}</td>
                  <td>{y.lot || '—'}</td>
                  <td>{y.amount != null && y.amount !== '' ? `${y.amount} ${codeName('unit', y.unit)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(record.size_before_wash || record.size_after_wash || record.wash_method) && (
        <>
          <div className="section-title">완성 사이즈 & 세탁</div>
          {record.size_before_wash && <div className="detail-row"><div className="key">세탁 전 사이즈</div><div>{record.size_before_wash}</div></div>}
          {record.size_after_wash &&  <div className="detail-row"><div className="key">세탁 후 사이즈</div><div>{record.size_after_wash}</div></div>}
          {record.wash_method &&      <div className="detail-row"><div className="key">세탁 방법</div><div>{record.wash_method}</div></div>}
        </>
      )}

      {record.techniques && record.techniques.length > 0 && (
        <>
          <div className="section-title">사용 기법</div>
          <div style={{ padding: '6px 0' }}>
            {record.techniques.map(t => (
              <span key={t} className="tag-pill primary">{codeName('technique', t)}</span>
            ))}
          </div>
        </>
      )}

      {record.work_logs && record.work_logs.length > 0 && (
        <>
          <div className="section-title">작업 일지</div>
          <div className="log-history">
            {record.work_logs.map((l, i) => (
              <div key={i} className="log-item">
                <div className="log-date">{l.date || '—'}</div>
                <div className="log-memo">{l.memo || '—'}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {(record.wife_comment || record.husband_comment || record.wife_rating || record.husband_rating) && (
        <>
          <div className="section-title">코멘트 & 평점</div>
          {(record.wife_comment || record.wife_rating) && (
            <div className="comment-block">
              <div className="who">👩 아내 <StarPreview value={record.wife_rating} /></div>
              {record.wife_comment || '—'}
            </div>
          )}
          {(record.husband_comment || record.husband_rating) && (
            <div className="comment-block husband">
              <div className="who">👨 남편 <StarPreview value={record.husband_rating} /></div>
              {record.husband_comment || '—'}
            </div>
          )}
        </>
      )}

      {record.redo_note && (
        <>
          <div className="section-title">📌 다시 만든다면</div>
          <div className="redo-note">{record.redo_note}</div>
        </>
      )}

      <div className="btn-row">
        <button className="btn secondary" onClick={() => navigate('/knitting')}>목록</button>
        <button className="btn primary" onClick={() => navigate(`/knitting/${id}/edit`)}>수정</button>
        <button className="btn danger" onClick={handleDelete}>삭제</button>
      </div>
    </div>
  );
}

export default KnittingDetailPage;
