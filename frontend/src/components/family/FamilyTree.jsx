import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import apiClient from '../../api';

// --- 모듈 레벨 상수 ---
const btnS = {
  padding: '1px 4px', border: '1px solid #ccc', borderRadius: '3px',
  background: 'white', cursor: 'pointer', fontSize: '9px'
};

const handleStyle = { background: 'transparent', border: 'none', width: 6, height: 6 };

// 커스텀 노드 (컴포넌트 외부 정의 - ReactFlow 필수)
const FamilyNode = ({ data }) => {
  const { member, openModalRef } = data;
  const hasParent = !!member.parent_id;
  const hasSpouse = !!member.spouse_id;

  return (
    <div style={{
      padding: '8px',
      border: `2px solid ${member.gender === 'male' ? '#4a90d9' : '#e91e63'}`,
      borderRadius: '8px',
      background: member.generation === 0 ? '#fff9db' : 'white',
      textAlign: 'center',
      minWidth: '70px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left-src" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-tgt" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-src" style={handleStyle} />
      <Handle type="target" position={Position.Right} id="right-tgt" style={handleStyle} />

      <div style={{ fontSize: '18px' }}>{member.gender === 'male' ? '👨' : '👩'}</div>
      <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{member.name}</div>
      <div style={{ fontSize: '8px', color: '#666' }}>{member.relation_type}</div>
      <div style={{ display: 'flex', gap: '2px', marginTop: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {!hasParent && (
          <button onClick={(e) => { e.stopPropagation(); openModalRef.current('parent', member); }} style={btnS}>↑</button>
        )}
        {!hasSpouse && (
          <button onClick={(e) => { e.stopPropagation(); openModalRef.current('spouse', member); }} style={{...btnS, color: '#e91e63'}}>♥</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); openModalRef.current('sibling', member); }} style={btnS}>±</button>
        <button onClick={(e) => { e.stopPropagation(); openModalRef.current('child', member); }} style={btnS}>↓</button>
      </div>
    </div>
  );
};

const nodeTypes = { familyNode: FamilyNode };

// --- 메인 컴포넌트 ---
const FamilyTree = ({ members, onRefresh }) => {
  const navigate = useNavigate();
  const [addModal, setAddModal] = useState(null);
  const [newMember, setNewMember] = useState({ gender: 'male', relation_type: '' });
  const nameInputRef = useRef(null);
  const openModalRef = useRef(null);

  // 헬퍼 함수
  const getMember = (id) => members.find(m => m._id === id);
  const getSpouse = (m) => m?.spouse_id ? getMember(m.spouse_id) : null;
  const getParent = (m) => m?.parent_id ? getMember(m.parent_id) : null;
  const getChildren = (id) => members.filter(m => m.parent_id === id);
  const getSiblings = (m) => {
    if (!m) return [];
    if (m.parent_id) {
      const parent = getParent(m);
      const parentSpouse = getSpouse(parent);
      return members.filter(s =>
        s._id !== m._id && s._id !== parentSpouse?._id &&
        (s.parent_id === m.parent_id || (parentSpouse && s.parent_id === parentSpouse._id))
      );
    }
    return members.filter(s => s.sibling_of === m._id);
  };

  // 본인들 찾기 (relation_type '본인' 우선, 없으면 fallback)
  const husband = members.find(m => m.generation === 0 && m.side === 'husband' && m.relation_type === '본인')
    || members.find(m => m.generation === 0 && m.side === 'husband' && !m.sibling_of);
  const wife = members.find(m => m.generation === 0 && m.side === 'wife' && m.relation_type === '본인')
    || members.find(m => m.generation === 0 && m.side === 'wife' && !m.sibling_of);

  // 관계 옵션 (양쪽 모두 본인 기준)
  const getRelationOptions = (type, gen) => {
    if (type === 'self') return ['본인'];
    if (type === 'parent') {
      if (gen === 1) return ['아버지', '어머니'];
      if (gen === 2) return ['할아버지', '할머니'];
      return ['증조부', '증조모'];
    }
    if (type === 'child') return ['아들', '딸'];
    if (type === 'sibling') {
      if (gen === 0) return ['형', '오빠', '누나', '언니', '남동생', '여동생'];
      if (gen === 1) return ['삼촌', '큰아버지', '작은아버지', '고모', '외삼촌', '이모'];
      return ['형제', '자매'];
    }
    if (type === 'spouse') return ['배우자'];
    return ['가족'];
  };

  const openModal = (type, baseMember, extraData = {}) => {
    const gen = baseMember?.generation ?? extraData.generation ?? 0;
    let side = baseMember?.side || extraData.side || 'husband';
    // 본인 세대(generation 0) 배우자 추가 시 반대쪽으로 설정
    if (type === 'spouse' && gen === 0) {
      side = side === 'husband' ? 'wife' : 'husband';
    }
    const targetGen = type === 'parent' ? gen + 1 : type === 'child' ? gen - 1 : gen;
    const options = getRelationOptions(type, targetGen);
    const defaultGender = (type === 'spouse' && baseMember?.gender === 'male') ? 'female' : 'male';
    setNewMember({ gender: defaultGender, relation_type: options[0] });
    setAddModal({ type, baseMember, side, generation: targetGen, options, ...extraData });
  };

  // openModalRef를 통해 외부 FamilyNode에서 접근 (useMemo 의존성 제거)
  openModalRef.current = openModal;

  const handleAdd = async () => {
    const name = nameInputRef.current?.value?.trim();
    if (!name) return alert('이름을 입력하세요');
    const { type, baseMember, side, generation } = addModal;

    const data = {
      name,
      gender: newMember.gender,
      side,
      generation,
      relation_type: newMember.relation_type,
      parent_id: type === 'child' ? baseMember?._id : (type === 'sibling' ? baseMember?.parent_id : null),
      sibling_of: type === 'sibling' && !baseMember?.parent_id ? baseMember?._id : null,
      spouse_id: type === 'spouse' ? baseMember?._id : null,
      birth_date: null,
      memo: null
    };

    try {
      const res = await apiClient.post('/family', data);
      if (type === 'parent' && baseMember) {
        await apiClient.patch(`/family/${baseMember._id}`, { parent_id: res.data._id });
      }
      if (type === 'spouse' && baseMember) {
        await apiClient.patch(`/family/${baseMember._id}`, { spouse_id: res.data._id });
      }
      setAddModal(null);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert('등록 실패');
    }
  };

  // 노드 클릭 → 상세 페이지 이동 (버튼 클릭 제외)
  const onNodeClick = useCallback((event, node) => {
    if (event.target.closest('button')) return;
    navigate(`/family/${node.id}`);
  }, [navigate]);

  // 노드/엣지 생성 (데이터 기반 - 모든 멤버 무조건 표시)
  const { nodes, edges } = useMemo(() => {
    const nodeList = [];
    const edgeList = [];
    const processedIds = new Set();
    const nodePositions = {};

    const CENTER_X = 400;
    const CENTER_Y = 300;
    const GAP_Y = 150;
    const UNIT_GAP = 140;
    const SPOUSE_GAP = 95;

    // --- 헬퍼 ---
    const addNode = (member, x, y) => {
      if (!member || processedIds.has(member._id)) return;
      processedIds.add(member._id);
      nodePositions[member._id] = { x, y };
      nodeList.push({
        id: member._id,
        type: 'familyNode',
        position: { x, y },
        data: { member, openModalRef }
      });
    };

    const addParentChildEdge = (parentId, childId) => {
      if (!parentId || !childId) return;
      const edgeId = `pc-${parentId}-${childId}`;
      if (edgeList.find(e => e.id === edgeId)) return;
      edgeList.push({
        id: edgeId, source: parentId, target: childId,
        sourceHandle: 'bottom', targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#999', strokeWidth: 2 },
        markerEnd: { type: MarkerType.Arrow }
      });
    };

    const addSpouseEdge = (id1, id2) => {
      if (!id1 || !id2) return;
      const edgeId = `sp-${[id1, id2].sort().join('-')}`;
      if (edgeList.find(e => e.id === edgeId)) return;
      const pos1 = nodePositions[id1];
      const pos2 = nodePositions[id2];
      if (!pos1 || !pos2) return;
      const [leftId, rightId] = pos1.x <= pos2.x ? [id1, id2] : [id2, id1];
      edgeList.push({
        id: edgeId, source: leftId, target: rightId,
        sourceHandle: 'right-src', targetHandle: 'left-tgt',
        type: 'smoothstep',
        style: { stroke: '#e91e63', strokeWidth: 2 }
      });
    };

    // --- 직계 조상 ID 수집 (정렬 우선순위용) ---
    const getAncestorIds = (start) => {
      const ids = new Set();
      let cur = start;
      while (cur) {
        ids.add(cur._id);
        cur = cur.parent_id ? getMember(cur.parent_id) : null;
      }
      return ids;
    };
    const husbandAncestors = husband ? getAncestorIds(husband) : new Set();
    const wifeAncestors = wife ? getAncestorIds(wife) : new Set();

    // --- 본인 부부의 직계 자녀/손자녀 찾기 (중앙 배치) ---
    const centerIds = new Set();
    const queue = [];
    if (husband) queue.push(husband._id);
    if (wife) queue.push(wife._id);
    while (queue.length > 0) {
      const pid = queue.shift();
      members.forEach(m => {
        if (m.parent_id === pid && m.generation < 0 && !centerIds.has(m._id)) {
          centerIds.add(m._id);
          queue.push(m._id);
        }
      });
    }

    // --- side별 그룹핑 (중앙 자녀 제외) ---
    const sideGroups = { husband: {}, wife: {} };
    members.forEach(m => {
      if (centerIds.has(m._id)) return;
      if (m._id === husband?._id || m._id === wife?._id) return; // gen0 별도 처리
      const s = m.side === 'wife' ? 'wife' : 'husband';
      const g = m.generation;
      if (!sideGroups[s][g]) sideGroups[s][g] = [];
      sideGroups[s][g].push(m);
    });

    // --- 그룹 내 정렬: 직계→배우자→형제→기타 ---
    const sortGroup = (group, ancestorIds) => {
      return [...group].sort((a, b) => {
        const pri = (m) => {
          if (ancestorIds.has(m._id)) return 0;
          if (m.spouse_id && ancestorIds.has(m.spouse_id)) return 1;
          const anc = group.find(g => ancestorIds.has(g._id));
          if (anc && m.parent_id && m.parent_id === anc.parent_id) return 2;
          if (anc?.spouse_id) {
            const ancSpouse = group.find(g => g._id === anc.spouse_id);
            if (ancSpouse && m.parent_id && m.parent_id === ancSpouse.parent_id) return 3;
          }
          return 4;
        };
        return pri(a) - pri(b);
      });
    };

    // --- 배우자 쌍 묶기 ---
    const makeSlots = (group) => {
      const slots = [];
      const used = new Set();
      group.forEach(m => {
        if (used.has(m._id)) return;
        used.add(m._id);
        const spouse = m.spouse_id ? group.find(s => s._id === m.spouse_id) : null;
        if (spouse && !used.has(spouse._id)) {
          used.add(spouse._id);
          slots.push(m.gender === 'male' ? [m, spouse] : [spouse, m]);
        } else {
          slots.push([m]);
        }
      });
      return slots;
    };

    // --- 한 side 배치 ---
    const placeSide = (genGroups, ancestorIds, baseX, dir) => {
      Object.keys(genGroups).map(Number).sort((a, b) => b - a).forEach(gen => {
        const y = CENTER_Y - gen * GAP_Y;
        const sorted = sortGroup(genGroups[gen], ancestorIds);
        const slots = makeSlots(sorted);

        let x = baseX;
        // generation 0은 본인이 이미 baseX에 배치되어 있으므로 한 칸 옆에서 시작
        if (gen === 0) x += UNIT_GAP * dir;
        slots.forEach((slot, i) => {
          if (i > 0) x += UNIT_GAP * dir;
          addNode(slot[0], x, y);
          if (slot[1]) {
            addNode(slot[1], x + SPOUSE_GAP * dir, y);
          }
        });
      });
    };

    // --- 본인 부부 배치 ---
    if (husband) addNode(husband, CENTER_X - 50, CENTER_Y);
    if (wife) addNode(wife, CENTER_X + 50, CENTER_Y);

    // --- 양쪽 가족 배치 ---
    placeSide(sideGroups.husband, husbandAncestors, CENTER_X - 50, -1);
    placeSide(sideGroups.wife, wifeAncestors, CENTER_X + 50, 1);

    // --- 중앙 자녀/손자녀 배치 ---
    const centerByGen = {};
    members.filter(m => centerIds.has(m._id)).forEach(m => {
      if (!centerByGen[m.generation]) centerByGen[m.generation] = [];
      centerByGen[m.generation].push(m);
    });

    Object.keys(centerByGen).map(Number).sort((a, b) => b - a).forEach(gen => {
      const group = centerByGen[gen];
      const slots = makeSlots(group);
      const y = CENTER_Y - gen * GAP_Y;
      const totalSlots = slots.reduce((sum, s) => sum + (s.length > 1 ? SPOUSE_GAP : 0), 0)
        + (slots.length - 1) * UNIT_GAP;
      let x = CENTER_X - totalSlots / 2;

      slots.forEach((slot, i) => {
        if (i > 0) x += UNIT_GAP;
        addNode(slot[0], x, y);
        if (slot[1]) {
          addNode(slot[1], x + SPOUSE_GAP, y);
          x += SPOUSE_GAP;
        }
      });
    });

    // --- 모든 엣지 자동 연결 ---
    members.forEach(m => {
      if (m.parent_id && processedIds.has(m._id) && processedIds.has(m.parent_id)) {
        addParentChildEdge(m.parent_id, m._id);
      }
      if (m.spouse_id && processedIds.has(m._id) && processedIds.has(m.spouse_id)) {
        addSpouseEdge(m._id, m.spouse_id);
      }
    });

    // --- 미배치 멤버 표시 (안전장치) ---
    const unprocessed = members.filter(m => !processedIds.has(m._id));
    if (unprocessed.length > 0) {
      const upY = CENTER_Y + GAP_Y * 3;
      unprocessed.forEach((m, i) => {
        addNode(m, CENTER_X - 200 + i * UNIT_GAP, upY);
        if (m.parent_id && processedIds.has(m.parent_id)) addParentChildEdge(m.parent_id, m._id);
        if (m.spouse_id && processedIds.has(m.spouse_id)) addSpouseEdge(m._id, m.spouse_id);
      });
    }

    return { nodes: nodeList, edges: edgeList };
  }, [members]);

  // 모달
  const Modal = () => {
    if (!addModal) return null;
    const { type, options } = addModal;
    const titles = { self: '등록', parent: '부모 추가', child: '자녀 추가', sibling: '형제 추가', spouse: '배우자 추가' };

    return (
      <div style={overlay} onClick={() => setAddModal(null)}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>{titles[type]}</h3>
          <input ref={nameInputRef} key={JSON.stringify(addModal)} defaultValue="" placeholder="이름" style={input} autoFocus />
          <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
            {['male', 'female'].map(g => (
              <label key={g} style={{
                flex: 1, padding: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '12px',
                border: `2px solid ${newMember.gender === g ? (g === 'male' ? '#4a90d9' : '#e91e63') : '#ddd'}`,
                borderRadius: '6px', background: newMember.gender === g ? (g === 'male' ? '#e7f5ff' : '#fff0f6') : 'white'
              }}>
                <input type="radio" checked={newMember.gender === g} onChange={() => setNewMember({...newMember, gender: g})} style={{display:'none'}} />
                {g === 'male' ? '👨남' : '👩여'}
              </label>
            ))}
          </div>
          <select value={newMember.relation_type} onChange={e => setNewMember({...newMember, relation_type: e.target.value})} style={input}>
            {options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button onClick={handleAdd} style={btnPrimary}>등록</button>
            <button onClick={() => setAddModal(null)} style={btnSecondary}>취소</button>
          </div>
        </div>
      </div>
    );
  };

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const modal = { background: 'white', padding: '16px', borderRadius: '10px', width: '260px' };
  const input = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', marginBottom: '6px' };
  const btnPrimary = { flex: 1, padding: '8px', background: '#20c997', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
  const btnSecondary = { flex: 1, padding: '8px', background: '#f1f3f5', color: '#495057', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };

  // 빈 상태
  if (members.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
        <p style={{ color: '#888', marginBottom: '20px' }}>가계도를 시작하세요</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button onClick={() => openModal('self', null, { side: 'husband', generation: 0 })}
            style={{ padding: '12px 20px', border: '2px solid #4a90d9', borderRadius: '8px', background: 'white', color: '#4a90d9', cursor: 'pointer', fontSize: '14px' }}>
            👨 본인 등록 (남편측)
          </button>
          <button onClick={() => openModal('self', null, { side: 'wife', generation: 0 })}
            style={{ padding: '12px 20px', border: '2px solid #e91e63', borderRadius: '8px', background: 'white', color: '#e91e63', cursor: 'pointer', fontSize: '14px' }}>
            👩 본인 등록 (아내측)
          </button>
        </div>
        <Modal />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background color="#ddd" gap={20} />
        <Controls />
      </ReactFlow>
      <Modal />
    </div>
  );
};

export default FamilyTree;
