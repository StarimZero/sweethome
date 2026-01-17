import { useState, useEffect } from 'react';
import apiClient from '../api';

// 버킷리스트 관련 코드를 불러오는 커스텀 훅
const useBucketCodes = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 상태/담당은 고정값
  const statuses = [
    { code_id: 'not_started', code_name: '미진행' },
    { code_id: 'active', code_name: '진행중' },
    { code_id: 'completed', code_name: '완료' }
  ];

  const owners = [
    { code_id: 'together', code_name: '👫 함께' },
    { code_id: 'husband', code_name: '🙋‍♂️ 남편' },
    { code_id: 'wife', code_name: '🙋‍♀️ 아내' }
  ];

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const catRes = await apiClient.get('/code/group/BKT_CAT');
        setCategories(catRes.data);
      } catch (err) {
        console.error('코드 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, []);

  // code_id로 code_name 찾기
  const getCategoryLabel = (codeId) => {
    const found = categories.find(c => c.code_id === codeId);
    return found?.code_name || codeId;
  };

  const getStatusLabel = (codeId) => {
    const found = statuses.find(c => c.code_id === codeId);
    return found?.code_name || codeId;
  };

  const getOwnerLabel = (codeId) => {
    const found = owners.find(c => c.code_id === codeId);
    return found?.code_name || codeId;
  };

  return {
    categories,
    statuses,
    owners,
    loading,
    getCategoryLabel,
    getStatusLabel,
    getOwnerLabel
  };
};

export default useBucketCodes;
