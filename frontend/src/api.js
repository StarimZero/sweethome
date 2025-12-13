// frontend/src/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api', // 여기에 /api를 박아두면, 앞으로는 /cooking, /review만 쓰면 됩니다.
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
