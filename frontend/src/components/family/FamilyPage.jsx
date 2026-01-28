import React, { useState, useEffect } from 'react';
import apiClient from '../../api';
import FamilyTree from './FamilyTree';

function FamilyPage() {
  const [members, setMembers] = useState([]);

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

  return (
    <div className="content-box">
      <h1 style={{ marginBottom: '20px' }}>👨‍👩‍👧‍👦 가계도</h1>
      <FamilyTree members={members} onRefresh={fetchMembers} />
    </div>
  );
}

export default FamilyPage;
