import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import apiClient from '../../api';

// --- 레이아웃 상수 ---
const NODE_W = 160;
const NODE_H = 120;
const COUPLE_GAP = 24;

const handleStyle = { background: 'transparent', border: 'none', width: 6, height: 6 };

// 커스텀 노드
const FamilyNode = ({ data }) => {
  const { member, openModalRef } = data;
  const hasParent = !!member.parent_id;
  const hasSpouse = !!member.spouse_id;
  const isSelf = member.generation === 0 && member.relation_type === '본인';
  const borderColor = member.gender === 'male' ? '#4a90d9' : '#e91e63';

  return (
    <div className="family-node-wrapper" style={{
      width: NODE_W, height: NODE_H,
      padding: '10px 8px 4px',
      border: `2px solid ${borderColor}`,
      borderRadius: '12px',
      background: isSelf ? '#fff9db' : 'white',
      textAlign: 'center',
      boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      boxSizing: 'border-box', cursor: 'pointer'
    }}>
      <Handle type="target" position={Position.Top} id="top" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Left} id="left-src" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="left-tgt" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="right-src" style={handleStyle} />
      <Handle type="target" position={Position.Right} id="right-tgt" style={handleStyle} />

      <div style={{ fontSize: '28px', lineHeight: 1 }}>{member.gender === 'male' ? '👨' : '👩'}</div>
      <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{member.name}</div>
      <div style={{ fontSize: '12px', color: '#888' }}>{member.relation_type}</div>

      <div className="family-node-actions" style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '2px' }}>
        {!hasParent && (
          <button onClick={(e) => { e.stopPropagation(); openModalRef.current('parent', member); }}
            style={actionBtn}>↑</button>
        )}
        {!hasSpouse && (
          <button onClick={(e) => { e.stopPropagation(); openModalRef.current('spouse', member); }}
            style={{ ...actionBtn, color: '#e91e63' }}>♥</button>
        )}
        <button onClick={(e) => { e.stopPropagation(); openModalRef.current('sibling', member); }}
          style={actionBtn}>±</button>
        <button onClick={(e) => { e.stopPropagation(); openModalRef.current('child', member); }}
          style={actionBtn}>↓</button>
      </div>
    </div>
  );
};

const actionBtn = {
  padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px',
  background: 'white', cursor: 'pointer', fontSize: '12px', lineHeight: '16px',
  minWidth: '28px', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  touchAction: 'manipulation'
};

// 중앙 구분선 노드
const CenterLineNode = ({ data }) => (
  <div style={{
    width: 0, height: data.height,
    borderLeft: '2px dashed #ccc',
    pointerEvents: 'none'
  }} />
);

// 부부 중간점 노드 (자녀 엣지 출발점)
const CoupleJointNode = () => (
  <div style={{ width: 1, height: 1 }}>
    <Handle type="target" position={Position.Top} id="top" style={{ ...handleStyle, opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyle, opacity: 0 }} />
  </div>
);

const nodeTypes = { familyNode: FamilyNode, centerLine: CenterLineNode, coupleJoint: CoupleJointNode };

// ====== 친가/외가 분류 (BFS 기반 — relation_type 무관, 그래프 구조만 사용) ======

function bfsDown(members, startIds, result, cls) {
  const queue = [...startIds];
  while (queue.length > 0) {
    const pid = queue.shift();
    members.forEach(m => {
      if (!result[m._id] && m.parent_id === pid) {
        result[m._id] = cls;
        queue.push(m._id);
      }
    });
  }
}

function findSiblings(members, memberId, byId) {
  const m = byId[memberId];
  if (!m) return [];
  const ids = new Set();
  // sibling_of가 이 멤버를 가리키는 멤버
  members.forEach(s => { if (s.sibling_of === memberId) ids.add(s._id); });
  // 같은 parent_id를 가진 멤버 (본인 제외)
  if (m.parent_id) {
    members.forEach(s => {
      if (s._id !== memberId && s.parent_id === m.parent_id) ids.add(s._id);
    });
  }
  // 이 멤버가 sibling_of로 가리키는 멤버
  if (m.sibling_of) ids.add(m.sibling_of);
  return [...ids];
}

function markSpouses(members, result, byId, cls) {
  members.forEach(m => {
    if (result[m._id] === cls && m.spouse_id && byId[m.spouse_id] && !result[m.spouse_id]) {
      result[m.spouse_id] = cls;
    }
  });
}

function classifyLineage(members) {
  const byId = {};
  members.forEach(m => { byId[m._id] = m; });
  const result = {};

  // ── Step 1: 본인 + 배우자 + 직계 자손 → universal ──
  members.forEach(m => {
    if (m.generation === 0 && m.relation_type === '본인') {
      result[m._id] = 'universal';
    }
  });
  // 본인의 배우자 (spouse_id 연결)
  members.forEach(m => {
    if (result[m._id] === 'universal' && m.spouse_id && byId[m.spouse_id]) {
      result[m.spouse_id] = 'universal';
    }
  });
  // 본인 부부의 모든 자손 BFS
  const selfCoupleIds = [];
  members.forEach(m => { if (result[m._id] === 'universal') selfCoupleIds.push(m._id); });
  bfsDown(members, selfCoupleIds, result, 'universal');

  // ── Step 2: 각 side별 처리 ──
  const sides = ['husband', 'wife'];
  sides.forEach(side => {
    const cls = (tag) => `${side}-${tag}`;

    // 해당 side의 본인 또는 배우자 찾기
    const selfOfSide = members.find(m =>
      result[m._id] === 'universal' && m.side === side && m.generation === 0
    );
    if (!selfOfSide) return;

    // ── 2a: 부모 → core ──
    const parentId = selfOfSide.parent_id;
    const parent = parentId ? byId[parentId] : null;
    if (parent && !result[parent._id]) {
      result[parent._id] = cls('core');
      // 부모의 배우자도 core
      if (parent.spouse_id && byId[parent.spouse_id] && !result[parent.spouse_id]) {
        result[parent.spouse_id] = cls('core');
      }
    }
    // 부모의 배우자에서 역으로도 체크 (배우자가 먼저 등록된 경우)
    const parentSpouse = parent?.spouse_id ? byId[parent.spouse_id] : null;
    if (parentSpouse && !result[parentSpouse._id]) {
      result[parentSpouse._id] = cls('core');
    }

    // ── 2b: 본인의 형제 + 형제 자손 → core ──
    // 같은 부모를 가진 gen=0 멤버 또는 sibling_of로 연결된 멤버
    const selfSiblingIds = [];
    if (parentId) {
      members.forEach(m => {
        if (!result[m._id] && m.parent_id === parentId) {
          result[m._id] = cls('core');
          selfSiblingIds.push(m._id);
        }
      });
    }
    // sibling_of로 연결된 형제
    members.forEach(m => {
      if (!result[m._id] && m.sibling_of === selfOfSide._id) {
        result[m._id] = cls('core');
        selfSiblingIds.push(m._id);
      }
    });
    // 형제의 모든 자손 → core
    bfsDown(members, selfSiblingIds, result, cls('core'));
    // 형제 + 형제 자손의 배우자 → core
    markSpouses(members, result, byId, cls('core'));

    // ── 2c: 아버지의 확대가족 → paternal ──
    const father = parent?.gender === 'male' ? parent : parentSpouse?.gender === 'male' ? parentSpouse : null;
    if (father) {
      // 할아버지/할머니 (아버지의 부모)
      const grandpaId = father.parent_id;
      const grandpa = grandpaId ? byId[grandpaId] : null;
      if (grandpa && !result[grandpa._id]) {
        result[grandpa._id] = cls('paternal');
        if (grandpa.spouse_id && byId[grandpa.spouse_id] && !result[grandpa.spouse_id]) {
          result[grandpa.spouse_id] = cls('paternal');
        }
      }
      // 아버지의 형제 (삼촌, 고모 등)
      const fatherSibIds = findSiblings(members, father._id, byId)
        .filter(id => !result[id]);
      fatherSibIds.forEach(id => { result[id] = cls('paternal'); });
      // 아버지 형제의 모든 자손 → paternal
      bfsDown(members, fatherSibIds, result, cls('paternal'));
      // 배우자 상속
      markSpouses(members, result, byId, cls('paternal'));
      // 할아버지의 부모 (증조부모)
      if (grandpa?.parent_id && byId[grandpa.parent_id] && !result[grandpa.parent_id]) {
        result[grandpa.parent_id] = cls('paternal');
        const ggp = byId[grandpa.parent_id];
        if (ggp.spouse_id && byId[ggp.spouse_id] && !result[ggp.spouse_id]) {
          result[ggp.spouse_id] = cls('paternal');
        }
      }
    }

    // ── 2d: 어머니의 확대가족 → maternal ──
    const mother = parent?.gender === 'female' ? parent : parentSpouse?.gender === 'female' ? parentSpouse : null;
    if (mother) {
      // 외할아버지/외할머니 (어머니의 부모)
      const mgpId = mother.parent_id;
      const mgp = mgpId ? byId[mgpId] : null;
      if (mgp && !result[mgp._id]) {
        result[mgp._id] = cls('maternal');
        if (mgp.spouse_id && byId[mgp.spouse_id] && !result[mgp.spouse_id]) {
          result[mgp.spouse_id] = cls('maternal');
        }
      }
      // 어머니의 형제 (외삼촌, 이모 등)
      const motherSibIds = findSiblings(members, mother._id, byId)
        .filter(id => !result[id]);
      motherSibIds.forEach(id => { result[id] = cls('maternal'); });
      // 어머니 형제의 모든 자손 → maternal
      bfsDown(members, motherSibIds, result, cls('maternal'));
      // 배우자 상속
      markSpouses(members, result, byId, cls('maternal'));
      // 외할아버지의 부모 (외증조부모)
      if (mgp?.parent_id && byId[mgp.parent_id] && !result[mgp.parent_id]) {
        result[mgp.parent_id] = cls('maternal');
        const mggp = byId[mgp.parent_id];
        if (mggp.spouse_id && byId[mggp.spouse_id] && !result[mggp.spouse_id]) {
          result[mggp.spouse_id] = cls('maternal');
        }
      }
    }
  });

  // ── Step 3: 전역 배우자 상속 + fallback ──
  members.forEach(m => {
    if (!result[m._id] && m.spouse_id && result[m.spouse_id]) {
      result[m._id] = result[m.spouse_id];
    }
  });
  members.forEach(m => {
    if (!result[m._id]) {
      result[m._id] = 'universal';
    }
  });

  return result;
}

// ====== dagre 레이아웃 (양쪽 분리 + 중앙 부부) ======
function buildDagreLayout(members, openModalRef) {
  if (!members || members.length === 0) return { nodes: [], edges: [] };

  const byId = {};
  members.forEach(m => { byId[m._id] = m; });

  // --- 본인 부부 찾기 ---
  const selfH = members.find(m => m.generation === 0 && m.side === 'husband' && m.relation_type === '본인')
    || members.find(m => m.generation === 0 && m.side === 'husband' && !m.sibling_of);
  const selfW = members.find(m => m.generation === 0 && m.side === 'wife' && m.relation_type === '본인')
    || members.find(m => m.generation === 0 && m.side === 'wife' && !m.sibling_of);
  const selfIds = new Set([selfH?._id, selfW?._id].filter(Boolean));

  // --- 본인 부부의 자손(descendants) 식별 ---
  const selfDescendants = new Set();
  const queue = [...selfIds];
  while (queue.length > 0) {
    const pid = queue.shift();
    members.forEach(m => {
      if (m.parent_id === pid && !selfIds.has(m._id) && !selfDescendants.has(m._id)) {
        selfDescendants.add(m._id);
        queue.push(m._id);
      }
    });
  }

  // --- 부부쌍 구성 (본인 부부는 분리 — 중앙 다리) ---
  const coupleOf = {};
  const couples = {};
  const paired = new Set();

  members.forEach(m => {
    if (paired.has(m._id)) return;
    const sp = m.spouse_id ? byId[m.spouse_id] : null;
    if (sp && !paired.has(sp._id) && !(selfIds.has(m._id) && selfIds.has(sp._id))) {
      const male = m.gender === 'male' ? m : sp;
      const female = m.gender === 'male' ? sp : m;
      const cid = `c-${male._id}-${female._id}`;
      couples[cid] = { left: male, right: female };
      coupleOf[male._id] = cid;
      coupleOf[female._id] = cid;
      paired.add(male._id);
      paired.add(female._id);
    }
  });
  members.forEach(m => {
    if (!coupleOf[m._id]) {
      const cid = `s-${m._id}`;
      couples[cid] = { left: m, right: null };
      coupleOf[m._id] = cid;
    }
  });

  // --- 한쪽 side dagre 실행 ---
  function layoutGroup(groupMembers) {
    const cids = [...new Set(groupMembers.map(m => coupleOf[m._id]))];
    if (cids.length === 0) return {};

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 130, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));

    const cidSet = new Set(cids);
    cids.forEach(cid => {
      const { right } = couples[cid];
      g.setNode(cid, { width: right ? NODE_W * 2 + COUPLE_GAP : NODE_W, height: NODE_H });
    });

    // birth_date 순으로 엣지 추가 → dagre가 형제 순서 반영
    const sorted = [...groupMembers].sort((a, b) => {
      const da = a.birth_date || '';
      const db = b.birth_date || '';
      if (da && db) return da.localeCompare(db);
      if (da) return -1;
      if (db) return 1;
      return 0;
    });

    const eDone = new Set();
    sorted.forEach(m => {
      if (!m.parent_id || !byId[m.parent_id]) return;
      const pc = coupleOf[m.parent_id];
      const mc = coupleOf[m._id];
      if (!cidSet.has(pc) || !cidSet.has(mc) || pc === mc) return;
      const ek = `${pc}->${mc}`;
      if (eDone.has(ek)) return;
      eDone.add(ek);
      g.setEdge(pc, mc);
    });

    // sibling_of 처리: 형제를 같은 부모 아래에 연결
    sorted.forEach(m => {
      if (!m.sibling_of || m.parent_id || !byId[m.sibling_of]) return;
      const ref = byId[m.sibling_of];
      const mc = coupleOf[m._id];

      if (ref.parent_id && byId[ref.parent_id]) {
        const pc = coupleOf[ref.parent_id];
        if (cidSet.has(pc) && cidSet.has(mc) && pc !== mc) {
          const ek = `${pc}->${mc}`;
          if (!eDone.has(ek)) { eDone.add(ek); g.setEdge(pc, mc); }
        }
      } else {
        const refCid = coupleOf[ref._id];
        const vpId = `vp-${ref._id}`;
        if (!g.hasNode(vpId)) {
          g.setNode(vpId, { width: 1, height: 1 });
          if (cidSet.has(refCid)) g.setEdge(vpId, refCid);
        }
        if (cidSet.has(mc)) g.setEdge(vpId, mc);
      }
    });

    dagre.layout(g);

    const pos = {};
    const groupMemberIds = new Set(groupMembers.map(m => m._id));
    g.nodes().forEach(cid => {
      if (cid.startsWith('vp-')) return;
      const dn = g.node(cid);
      const { left, right } = couples[cid];
      if (right) {
        if (groupMemberIds.has(left._id))
          pos[left._id] = { x: dn.x - NODE_W - COUPLE_GAP / 2, y: dn.y - NODE_H / 2 };
        if (groupMemberIds.has(right._id))
          pos[right._id] = { x: dn.x + COUPLE_GAP / 2, y: dn.y - NODE_H / 2 };
      } else {
        if (groupMemberIds.has(left._id))
          pos[left._id] = { x: dn.x - NODE_W / 2, y: dn.y - NODE_H / 2 };
      }
    });
    return pos;
  }

  function shiftPos(pos, dx, dy) {
    const r = {};
    Object.entries(pos).forEach(([id, p]) => { r[id] = { x: p.x + dx, y: p.y + dy }; });
    return r;
  }

  // --- cross-side 커플 보정: 본인 부부가 아닌 커플에서 배우자는 연결 있는 쪽으로 ---
  const layoutSide = {};
  members.forEach(m => { layoutSide[m._id] = m.side; });

  Object.values(couples).forEach(({ left, right }) => {
    if (!right) return;
    if (selfIds.has(left._id) || selfIds.has(right._id)) return;
    if (left.side === right.side) return;
    // 부모/형제 연결이 있는 쪽이 주인 → 배우자가 따라감
    const leftConn = left.parent_id || left.sibling_of;
    const rightConn = right.parent_id || right.sibling_of;
    if (leftConn && !rightConn) {
      layoutSide[right._id] = left.side;
    } else if (rightConn && !leftConn) {
      layoutSide[left._id] = right.side;
    }
  });

  // --- 양쪽 side 분리 (본인 자손은 별도 — 조카는 해당 side에 유지) ---
  const hMembers = members.filter(m => layoutSide[m._id] === 'husband' && !selfDescendants.has(m._id));
  const wMembers = members.filter(m => layoutSide[m._id] === 'wife' && !selfDescendants.has(m._id));
  const cMembers = members.filter(m => selfDescendants.has(m._id));

  let hPos = layoutGroup(hMembers);
  let wPos = layoutGroup(wMembers);

  // --- 남편측: 좌우 반전하여 트리가 왼쪽으로 뻗도록 ---
  if (selfH && hPos[selfH._id]) {
    const sx = hPos[selfH._id].x;
    Object.entries(hPos).forEach(([id, p]) => { p.x = -(p.x - sx) + sx; });
    // selfH는 X 그대로, 나머지는 selfH 기준 반전
  }

  // --- X 정렬: selfH(왼쪽) ← 중앙선 → selfW(오른쪽) ---
  if (selfH && selfW && hPos[selfH._id] && wPos[selfW._id]) {
    hPos = shiftPos(hPos, -hPos[selfH._id].x, 0);
    wPos = shiftPos(wPos, NODE_W + COUPLE_GAP - wPos[selfW._id].x, 0);
  } else if (selfH && hPos[selfH._id]) {
    hPos = shiftPos(hPos, -hPos[selfH._id].x, 0);
  } else if (selfW && wPos[selfW._id]) {
    wPos = shiftPos(wPos, -wPos[selfW._id].x, 0);
  }

  const allPos = { ...hPos, ...wPos };

  // --- 세대별 Y를 generation 숫자로 고정 배치 ---
  const RANK_HEIGHT = NODE_H + 100;
  const genSet = new Set();
  members.forEach(m => genSet.add(m.generation));
  const sortedGens = [...genSet].sort((a, b) => b - a);
  const genY = {};
  sortedGens.forEach((gen, idx) => { genY[gen] = idx * RANK_HEIGHT; });

  Object.entries(allPos).forEach(([id, pos]) => {
    const m = byId[id];
    if (m && genY[m.generation] !== undefined) pos.y = genY[m.generation];
  });

  // --- 중앙선 기준 X 보정: 각 side가 중앙을 넘지 않도록 ---
  const centerX = (selfH && selfW && allPos[selfH._id] && allPos[selfW._id])
    ? (allPos[selfH._id].x + NODE_W + allPos[selfW._id].x) / 2
    : NODE_W / 2;
  const MIN_GAP = 20;

  // 세대별로 중앙 넘는 노드들을 밀어냄 (본인 부부는 고정)
  const genSideGroups = {};
  Object.entries(allPos).forEach(([id, p]) => {
    if (selfIds.has(id)) return;
    const m = byId[id];
    if (!m) return;
    const key = `${m.generation}|${layoutSide[m._id] || m.side}`;
    if (!genSideGroups[key]) genSideGroups[key] = [];
    genSideGroups[key].push(id);
  });

  Object.entries(genSideGroups).forEach(([key, ids]) => {
    const side = key.split('|')[1];
    if (side === 'husband') {
      const maxRight = Math.max(...ids.map(id => allPos[id].x + NODE_W));
      if (maxRight > centerX - MIN_GAP) {
        const shift = maxRight - (centerX - MIN_GAP);
        ids.forEach(id => { allPos[id].x -= shift; });
      }
    } else if (side === 'wife') {
      const minLeft = Math.min(...ids.map(id => allPos[id].x));
      if (minLeft < centerX + MIN_GAP) {
        const shift = (centerX + MIN_GAP) - minLeft;
        ids.forEach(id => { allPos[id].x += shift; });
      }
    }
  });

  // --- 자녀(본인 부부의 자손) 배치: dagre로 X, genY로 Y ---
  if (cMembers.length > 0) {
    let centerX = 0;
    if (selfH && allPos[selfH._id] && selfW && allPos[selfW._id]) {
      centerX = (allPos[selfH._id].x + allPos[selfW._id].x + NODE_W) / 2;
    } else if (selfH && allPos[selfH._id]) {
      centerX = allPos[selfH._id].x + NODE_W / 2;
    } else if (selfW && allPos[selfW._id]) {
      centerX = allPos[selfW._id].x + NODE_W / 2;
    }

    const virtualId = '__self__';
    const allChildCids = [...new Set(cMembers.map(m => coupleOf[m._id]))];

    const cg = new dagre.graphlib.Graph();
    cg.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 130, marginx: 20, marginy: 20 });
    cg.setDefaultEdgeLabel(() => ({}));
    cg.setNode(virtualId, { width: NODE_W * 2 + COUPLE_GAP, height: 1 });

    allChildCids.forEach(cid => {
      const { right } = couples[cid];
      cg.setNode(cid, { width: right ? NODE_W * 2 + COUPLE_GAP : NODE_W, height: NODE_H });
    });

    const ceDone = new Set();
    const sortedC = [...cMembers].sort((a, b) => {
      const da = a.birth_date || '';
      const db = b.birth_date || '';
      if (da && db) return da.localeCompare(db);
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
    sortedC.forEach(m => {
      const mc = coupleOf[m._id];
      if (m.parent_id && selfIds.has(m.parent_id)) {
        const ek = `${virtualId}->${mc}`;
        if (!ceDone.has(ek)) { ceDone.add(ek); cg.setEdge(virtualId, mc); }
      } else if (m.parent_id && byId[m.parent_id]) {
        const pc = coupleOf[m.parent_id];
        if (pc !== mc) {
          const ek = `${pc}->${mc}`;
          if (!ceDone.has(ek)) { ceDone.add(ek); cg.setEdge(pc, mc); }
        }
      }
    });

    dagre.layout(cg);

    const vn = cg.node(virtualId);
    cg.nodes().forEach(cid => {
      if (cid === virtualId) return;
      const dn = cg.node(cid);
      const { left, right } = couples[cid];
      const rx = dn.x - vn.x;
      if (right) {
        allPos[left._id] = { x: centerX + rx - NODE_W - COUPLE_GAP / 2, y: genY[left.generation] };
        allPos[right._id] = { x: centerX + rx + COUPLE_GAP / 2, y: genY[right.generation] };
      } else {
        allPos[left._id] = { x: centerX + rx - NODE_W / 2, y: genY[left.generation] };
      }
    });
  }

  // --- ReactFlow 노드 생성 ---
  const rfNodes = [];
  members.forEach(m => {
    const p = allPos[m._id];
    if (!p) return;
    rfNodes.push({
      id: m._id,
      type: 'familyNode',
      position: { x: p.x, y: p.y },
      data: { member: m, openModalRef }
    });
  });

  // --- 부부 중간점 노드 생성 (자녀 엣지의 출발점) ---
  const parentCoupleJoint = {}; // member_id → jointNodeId
  const couplesDone = new Set();
  members.forEach(m => {
    if (!m.spouse_id || !byId[m.spouse_id]) return;
    const key = [m._id, m.spouse_id].sort().join('-');
    if (couplesDone.has(key)) return;
    couplesDone.add(key);
    const p1 = allPos[m._id];
    const p2 = allPos[m.spouse_id];
    if (!p1 || !p2) return;
    // 이 부부에게 자녀가 있는지 확인
    const hasChildren = members.some(c =>
      c.parent_id === m._id || c.parent_id === m.spouse_id ||
      (c.sibling_of && !c.parent_id && (c.sibling_of === m._id || c.sibling_of === m.spouse_id ||
        members.some(sib => sib._id === c.sibling_of && (sib.parent_id === m._id || sib.parent_id === m.spouse_id))))
    );
    if (!hasChildren) return;
    const jointId = `joint-${key}`;
    const [lx, rx] = p1.x <= p2.x ? [p1.x, p2.x] : [p2.x, p1.x];
    const jx = (lx + NODE_W + rx) / 2;
    const jy = Math.min(p1.y, p2.y) + NODE_H / 2;
    rfNodes.push({
      id: jointId, type: 'coupleJoint',
      position: { x: jx, y: jy },
      data: {}, selectable: false, draggable: false
    });
    parentCoupleJoint[m._id] = jointId;
    parentCoupleJoint[m.spouse_id] = jointId;
  });

  // --- 엣지 생성 ---
  const rfEdges = [];

  // 부부 엣지
  const spDone = new Set();
  members.forEach(m => {
    if (!m.spouse_id || !byId[m.spouse_id]) return;
    if (!allPos[m._id] || !allPos[m.spouse_id]) return;
    const key = [m._id, m.spouse_id].sort().join('-');
    if (spDone.has(key)) return;
    spDone.add(key);
    const p1 = allPos[m._id];
    const p2 = allPos[m.spouse_id];
    const [lid, rid] = p1.x <= p2.x ? [m._id, m.spouse_id] : [m.spouse_id, m._id];
    rfEdges.push({
      id: `sp-${key}`, source: lid, target: rid,
      sourceHandle: 'right-src', targetHandle: 'left-tgt',
      type: 'straight',
      style: { stroke: '#e91e63', strokeWidth: 2 }
    });
  });

  // 부모→자녀 엣지 (부부 중간점에서 출발)
  members.forEach(m => {
    if (!m.parent_id || !byId[m.parent_id]) return;
    if (!allPos[m._id]) return;
    const jointId = parentCoupleJoint[m.parent_id];
    if (jointId) {
      rfEdges.push({
        id: `pc-${m.parent_id}-${m._id}`,
        source: jointId, target: m._id,
        sourceHandle: 'bottom', targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#78909c', strokeWidth: 2 },
        markerEnd: { type: MarkerType.Arrow, color: '#78909c' }
      });
    } else if (allPos[m.parent_id]) {
      rfEdges.push({
        id: `pc-${m.parent_id}-${m._id}`,
        source: m.parent_id, target: m._id,
        sourceHandle: 'bottom', targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#78909c', strokeWidth: 2 },
        markerEnd: { type: MarkerType.Arrow, color: '#78909c' }
      });
    }
  });

  // sibling_of → 부모 엣지 (할아버지→삼촌 등, 부부 중간점에서 출발)
  members.forEach(m => {
    if (!m.sibling_of || m.parent_id || !byId[m.sibling_of]) return;
    const ref = byId[m.sibling_of];
    if (ref.parent_id && byId[ref.parent_id] && allPos[m._id]) {
      const jointId = parentCoupleJoint[ref.parent_id];
      if (jointId) {
        rfEdges.push({
          id: `sib-${ref.parent_id}-${m._id}`,
          source: jointId, target: m._id,
          sourceHandle: 'bottom', targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#78909c', strokeWidth: 2, strokeDasharray: '6 3' },
          markerEnd: { type: MarkerType.Arrow, color: '#78909c' }
        });
      } else if (allPos[ref.parent_id]) {
        rfEdges.push({
          id: `sib-${ref.parent_id}-${m._id}`,
          source: ref.parent_id, target: m._id,
          sourceHandle: 'bottom', targetHandle: 'top',
          type: 'smoothstep',
          style: { stroke: '#78909c', strokeWidth: 2, strokeDasharray: '6 3' },
          markerEnd: { type: MarkerType.Arrow, color: '#78909c' }
        });
      }
    } else if (allPos[m._id] && allPos[ref._id]) {
      // ref에 parent가 없는 경우: 수평 점선으로 형제 관계 표시
      const pRef = allPos[ref._id];
      const pM = allPos[m._id];
      const [leftId, rightId] = pRef.x <= pM.x ? [ref._id, m._id] : [m._id, ref._id];
      rfEdges.push({
        id: `sib-link-${ref._id}-${m._id}`,
        source: leftId, target: rightId,
        sourceHandle: 'right-src', targetHandle: 'left-tgt',
        type: 'straight',
        style: { stroke: '#78909c', strokeWidth: 1.5, strokeDasharray: '6 3' }
      });
    }
  });

  // --- 중앙 구분선 ---
  if (selfH && selfW && allPos[selfH._id] && allPos[selfW._id]) {
    const centerX = (allPos[selfH._id].x + NODE_W + allPos[selfW._id].x) / 2;
    let minY = Infinity, maxY = -Infinity;
    Object.values(allPos).forEach(p => {
      if (p.y < minY) minY = p.y;
      if (p.y + NODE_H > maxY) maxY = p.y + NODE_H;
    });
    rfNodes.push({
      id: '__centerLine__',
      type: 'centerLine',
      position: { x: centerX, y: minY - 30 },
      data: { height: maxY - minY + 60 },
      selectable: false, draggable: false
    });
  }

  return { nodes: rfNodes, edges: rfEdges };
}

// ====== 메인 컴포넌트 ======
const FamilyTree = ({ members, onRefresh, husbandLineage = 'paternal', wifeLineage = 'paternal' }) => {
  const navigate = useNavigate();
  const [addModal, setAddModal] = useState(null);
  const [newMember, setNewMember] = useState({ gender: 'male', relation_type: '' });
  const nameInputRef = useRef(null);
  const openModalRef = useRef(null);

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
    if (type === 'spouse' && gen === 0) {
      side = side === 'husband' ? 'wife' : 'husband';
    }
    const targetGen = type === 'parent' ? gen + 1 : type === 'child' ? gen - 1 : gen;
    const options = getRelationOptions(type, targetGen);
    const defaultGender = (type === 'spouse' && baseMember?.gender === 'male') ? 'female' : 'male';
    setNewMember({ gender: defaultGender, relation_type: options[0] });
    setAddModal({ type, baseMember, side, generation: targetGen, options, ...extraData });
  };

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

  const onNodeClick = useCallback((event, node) => {
    if (event.target.closest('button')) return;
    navigate(`/family/${node.id}`);
  }, [navigate]);

  const { nodes, edges } = useMemo(() => {
    if (!members || members.length === 0) return { nodes: [], edges: [] };
    const classification = classifyLineage(members);
    const filtered = members.filter(m => {
      const cls = classification[m._id];
      return cls === 'universal'
        || cls === 'husband-core'
        || cls === 'wife-core'
        || cls === `husband-${husbandLineage}`
        || cls === `wife-${wifeLineage}`;
    });
    // 필터 후 spouse_id가 필터에서 제외된 경우 정리
    const filteredIds = new Set(filtered.map(m => m._id));
    const cleaned = filtered.map(m => {
      if (m.spouse_id && !filteredIds.has(m.spouse_id)) {
        return { ...m, spouse_id: null };
      }
      return m;
    });
    return buildDagreLayout(cleaned, openModalRef);
  }, [members, husbandLineage, wifeLineage]);

  // 모달
  const Modal = () => {
    if (!addModal) return null;
    const { type, options } = addModal;
    const titles = { self: '등록', parent: '부모 추가', child: '자녀 추가', sibling: '형제 추가', spouse: '배우자 추가' };

    return (
      <div style={overlay} onClick={() => setAddModal(null)}>
        <div style={modal} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>{titles[type]}</h3>
          <input ref={nameInputRef} key={JSON.stringify(addModal)} defaultValue="" placeholder="이름" style={inputStyle} autoFocus />
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
          <select value={newMember.relation_type} onChange={e => setNewMember({...newMember, relation_type: e.target.value})} style={inputStyle}>
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
  const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', marginBottom: '6px' };
  const btnPrimary = { flex: 1, padding: '8px', background: '#20c997', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' };
  const btnSecondary = { flex: 1, padding: '8px', background: '#f1f3f5', color: '#495057', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };

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

  // 빈 lineage 처리: 양쪽 모두 해당 lineage 멤버가 없으면 안내 메시지
  const hasLineageMembers = (() => {
    const classification = classifyLineage(members);
    return members.some(m =>
      classification[m._id] === `husband-${husbandLineage}`
      || classification[m._id] === `wife-${wifeLineage}`
    );
  })();

  if (!hasLineageMembers) {
    const hLabel = husbandLineage === 'paternal' ? '친가' : '외가';
    const wLabel = wifeLineage === 'paternal' ? '친가' : '외가';
    const label = hLabel === wLabel ? hLabel : `남편측 ${hLabel} / 아내측 ${wLabel}`;
    return (
      <div style={{ width: '100%', height: '70vh', minHeight: '500px', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          minZoom={0.3}
          maxZoom={2.0}
        >
          <Background color="#ddd" gap={20} />
          <Controls />
        </ReactFlow>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.95)', padding: '24px 32px', borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)', textAlign: 'center', zIndex: 10,
          pointerEvents: 'none'
        }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>
            {label} 가족이 아직 등록되지 않았습니다.<br />
            부모의 ± 버튼으로 형제를 추가하세요.
          </p>
        </div>
        <Modal />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '70vh', minHeight: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.3}
        maxZoom={2.0}
      >
        <Background color="#ddd" gap={20} />
        <Controls />
      </ReactFlow>
      <Modal />
    </div>
  );
};

export default FamilyTree;
