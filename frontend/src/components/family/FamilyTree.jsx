import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import apiClient from '../../api';

const FamilyTree = ({ members, onRefresh }) => {
  const navigate = useNavigate();
  const [addModal, setAddModal] = useState(null);
  const [newMember, setNewMember] = useState({ gender: 'male', relation_type: '' });
  const nameInputRef = useRef(null);

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

  // 본인들 찾기
  const husband = members.find(m => m.generation === 0 && m.side === 'husband');
  const wife = members.find(m => m.generation === 0 && m.side === 'wife');

  // 관계 옵션
  const getRelationOptions = (type, gen, side) => {
    if (type === 'self') return side === 'husband' ? ['남편'] : ['아내'];
    if (type === 'parent') {
      if (gen === 1) return side === 'husband' ? ['아버지', '어머니'] : ['장인', '장모'];
      if (gen === 2) return ['할아버지', '할머니'];
      return ['증조부', '증조모'];
    }
    if (type === 'child') return ['아들', '딸'];
    if (type === 'sibling') {
      if (gen === 0) return ['형', '오빠', '누나', '언니', '남동생', '여동생'];
      if (gen === 1) return side === 'husband' ? ['삼촌', '큰아버지', '작은아버지', '고모'] : ['외삼촌', '이모'];
      return ['형제', '자매'];
    }
    if (type === 'spouse') return ['배우자'];
    return ['가족'];
  };

  const openModal = (type, baseMember, extraData = {}) => {
    const gen = baseMember?.generation ?? extraData.generation ?? 0;
    const side = baseMember?.side || extraData.side || 'husband';
    const targetGen = type === 'parent' ? gen + 1 : type === 'child' ? gen - 1 : gen;
    const options = getRelationOptions(type, targetGen, side);
    const defaultGender = (type === 'spouse' && baseMember?.gender === 'male') ? 'female' : 'male';
    setNewMember({ gender: defaultGender, relation_type: options[0] });
    setAddModal({ type, baseMember, side, generation: targetGen, options, ...extraData });
  };

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

  // 노드/엣지 생성
  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const processedIds = new Set();

    const CENTER_X = 400;
    const CENTER_Y = 300;
    const NODE_W = 80;
    const NODE_H = 90;
    const GAP_X = 120;
    const GAP_Y = 140;

    // 노드 추가 함수
    const addNode = (member, x, y) => {
      if (!member || processedIds.has(member._id)) return;
      processedIds.add(member._id);

      nodes.push({
        id: member._id,
        type: 'familyNode',
        position: { x, y },
        data: { member, openModal, navigate }
      });
    };

    // 엣지 추가 함수
    const addEdge = (sourceId, targetId, type = 'default') => {
      if (!sourceId || !targetId) return;
      const edgeId = `${sourceId}-${targetId}`;
      if (edges.find(e => e.id === edgeId)) return;

      edges.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
        style: { stroke: type === 'spouse' ? '#e91e63' : '#999', strokeWidth: 2 },
        markerEnd: type === 'spouse' ? undefined : { type: MarkerType.Arrow }
      });
    };

    // 가족 트리 구성 (한쪽)
    const buildFamilyBranch = (member, startX, startY, side) => {
      if (!member) return;

      // 방향: 남편쪽은 왼쪽(-1), 아내쪽은 오른쪽(+1)
      const dir = side === 'husband' ? -1 : 1;
      const SPOUSE_GAP = 90;

      // 본인
      addNode(member, startX, startY);

      // 형제들
      const siblings = getSiblings(member);
      siblings.forEach((sib, i) => {
        const sibX = startX + (i + 1) * dir * GAP_X;
        addNode(sib, sibX, startY);
        // 형제의 배우자
        const sibSpouse = getSpouse(sib);
        if (sibSpouse) {
          addNode(sibSpouse, sibX + dir * 70, startY);
          addEdge(sib._id, sibSpouse._id, 'spouse');
        }
        // 형제의 자녀
        const sibChildren = getChildren(sib._id);
        sibChildren.forEach((child, ci) => {
          addNode(child, sibX + ci * dir * 80, startY + GAP_Y);
          addEdge(sib._id, child._id);
        });
      });

      // 부모
      const parent = getParent(member);
      if (parent) {
        const parentY = startY - GAP_Y;
        addNode(parent, startX, parentY);
        addEdge(parent._id, member._id);

        // 부모의 배우자
        const parentSpouse = getSpouse(parent);
        if (parentSpouse) {
          addNode(parentSpouse, startX + dir * SPOUSE_GAP, parentY);
          addEdge(parent._id, parentSpouse._id, 'spouse');
        }

        // 부모의 형제들 (삼촌, 고모 등)
        const parentSiblings = getSiblings(parent);
        parentSiblings.forEach((ps, i) => {
          const psX = startX + (i + 1) * dir * GAP_X;
          addNode(ps, psX, parentY);
          addEdge(parent.parent_id, ps._id);

          // 삼촌/고모의 배우자
          const psSpouse = getSpouse(ps);
          if (psSpouse) {
            addNode(psSpouse, psX + dir * 70, parentY);
            addEdge(ps._id, psSpouse._id, 'spouse');
          }

          // 삼촌/고모의 자녀 (사촌)
          const psChildren = getChildren(ps._id);
          psChildren.forEach((cousin, ci) => {
            addNode(cousin, psX + ci * dir * 70, parentY + GAP_Y * 0.7);
            addEdge(ps._id, cousin._id);
          });
        });

        // 조부모
        const grandparent = getParent(parent);
        if (grandparent) {
          const gpY = parentY - GAP_Y;
          addNode(grandparent, startX, gpY);
          addEdge(grandparent._id, parent._id);

          const gpSpouse = getSpouse(grandparent);
          if (gpSpouse) {
            addNode(gpSpouse, startX + dir * SPOUSE_GAP, gpY);
            addEdge(grandparent._id, gpSpouse._id, 'spouse');
          }
        }
      }
    };

    // 남편 가족 (왼쪽) - 부부가 붙어있도록 간격 좁힘
    if (husband) {
      buildFamilyBranch(husband, CENTER_X - 50, CENTER_Y, 'husband');
    }

    // 아내 가족 (오른쪽)
    if (wife) {
      buildFamilyBranch(wife, CENTER_X + 50, CENTER_Y, 'wife');
    }

    // 부부 연결
    if (husband && wife) {
      addEdge(husband._id, wife._id, 'spouse');
    }

    // 자녀들 (아래)
    const children = members.filter(m => m.generation < 0);
    children.forEach((child, i) => {
      const childX = CENTER_X + (i - children.length / 2) * 100;
      addNode(child, childX, CENTER_Y + GAP_Y);
      if (husband) addEdge(husband._id, child._id);
    });

    return { nodes, edges };
  }, [members, husband, wife]);

  // 커스텀 노드
  const FamilyNode = ({ data }) => {
    const { member, openModal, navigate } = data;
    const hasParent = !!member.parent_id;
    const hasSpouse = !!member.spouse_id;

    return (
      <div style={{
        padding: '8px',
        border: `2px solid ${member.gender === 'male' ? '#4a90d9' : '#e91e63'}`,
        borderRadius: '8px',
        background: member.generation === 0 ? '#fff9db' : 'white',
        textAlign: 'center',
        cursor: 'pointer',
        minWidth: '70px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
      onClick={() => navigate(`/family/${member._id}`)}
      >
        <div style={{ fontSize: '18px' }}>{member.gender === 'male' ? '👨' : '👩'}</div>
        <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{member.name}</div>
        <div style={{ fontSize: '8px', color: '#666' }}>{member.relation_type}</div>
        <div style={{ display: 'flex', gap: '2px', marginTop: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!hasParent && <button onClick={(e) => { e.stopPropagation(); openModal('parent', member); }} style={btnS}>↑</button>}
          {!hasSpouse && <button onClick={(e) => { e.stopPropagation(); openModal('spouse', member); }} style={{...btnS, color: '#e91e63'}}>♥</button>}
          <button onClick={(e) => { e.stopPropagation(); openModal('sibling', member); }} style={btnS}>±</button>
          <button onClick={(e) => { e.stopPropagation(); openModal('child', member); }} style={btnS}>↓</button>
        </div>
      </div>
    );
  };

  const btnS = { padding: '1px 4px', border: '1px solid #ccc', borderRadius: '3px', background: 'white', cursor: 'pointer', fontSize: '9px' };
  const nodeTypes = useMemo(() => ({ familyNode: FamilyNode }), []);

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
            👨 남편 등록
          </button>
          <button onClick={() => openModal('self', null, { side: 'wife', generation: 0 })}
            style={{ padding: '12px 20px', border: '2px solid #e91e63', borderRadius: '8px', background: 'white', color: '#e91e63', cursor: 'pointer', fontSize: '14px' }}>
            👩 아내 등록
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
