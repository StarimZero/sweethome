// src/components/Home.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import apiClient from '../api'; 

function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
  apiClient.get('/couple/home')
    .then(res => {
      console.log(res.data); // 여기에 추가
      setData(res.data);
    })
    .catch(err => console.error(err));
}, []);

  if (!data) return <p>로딩 중...</p>;

  return (
    <div className="content-box">
        <h1>{data.couple_name} 오늘도 화이팅 👋</h1>
        <p>우리가 함께한 지 <strong style={{fontSize: '1.5em'}}>{data.d_day}일</strong>째</p>
        <h1>{data.w_day}</h1>
        <p>우리가 결혼한 지 <strong style={{fontSize: '1.5em'}}>{data.Wedding}일</strong>째</p>
    </div>
  );
}

export default Home;
