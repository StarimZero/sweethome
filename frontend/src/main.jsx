import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- 추가
import App from './App.jsx'
// import './index.css' <-- 아까 지우라고 했던 부분 (없어야 함)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>  {/* <--- 이렇게 App을 감싸주세요 */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
