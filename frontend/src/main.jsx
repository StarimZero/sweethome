import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- 추가
import './styles/tokens.scss' // 전역 디자인 토큰(색/그림자/radius) — App보다 먼저 로드
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>  {/* <--- 이렇게 App을 감싸주세요 */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
