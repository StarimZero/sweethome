import React, { useState, useEffect } from 'react';
import apiClient from '../../api';
import FamilyTree from './FamilyTree';

function FamilyPage() {
  const [members, setMembers] = useState([]);
  const [husbandLineage, setHusbandLineage] = useState('paternal');
  const [wifeLineage, setWifeLineage] = useState('paternal');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await apiClient.get('/family');
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const tabStyle = (active, color = '#20c997') => ({
    padding: '6px 14px',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 'bold' : 'normal',
    background: active ? color : '#f1f3f5',
    color: active ? 'white' : '#495057',
    transition: 'all 0.2s'
  });

  return (
    <div className="content-box">
      <h1 style={{ marginBottom: '12px' }}>👨‍👩‍👧‍👦 가계도</h1>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: '#4a90d9', fontWeight: 'bold' }}>남편측</span>
          <button style={tabStyle(husbandLineage === 'paternal', '#4a90d9')} onClick={() => setHusbandLineage('paternal')}>친가</button>
          <button style={tabStyle(husbandLineage === 'maternal', '#4a90d9')} onClick={() => setHusbandLineage('maternal')}>외가</button>
        </div>
        <div style={{ width: '1px', height: '24px', background: '#ddd' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: '#e91e63', fontWeight: 'bold' }}>아내측</span>
          <button style={tabStyle(wifeLineage === 'paternal', '#e91e63')} onClick={() => setWifeLineage('paternal')}>친가</button>
          <button style={tabStyle(wifeLineage === 'maternal', '#e91e63')} onClick={() => setWifeLineage('maternal')}>외가</button>
        </div>
      </div>
      <FamilyTree members={members} onRefresh={fetchMembers} husbandLineage={husbandLineage} wifeLineage={wifeLineage} />
    </div>
  );
}

export default FamilyPage;
