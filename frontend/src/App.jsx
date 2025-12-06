import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './components/Home'
// 요리 관련 3총사
import CookingPage from './components/cooking/CookingPage'
import CookingInsertPage from './components/cooking/CookingInsertPage'
import CookingDetailPage from './components/cooking/CookingDetailPage'
import './App.css' 
// 리뷰 관련 3총사
import ReviewPage from './components/review/ReviewPage'
import ReviewInsertPage from './components/review/ReviewInsertPage'
import ReviewDetailPage from './components/review/ReviewDetailPage'
//코드
import CodeListPage from './components/system/code/CodeListPage';
import CodeInsertPage from './components/system/code/CodeInsertPage';
import CodeDetailPage from './components/system/code/CodeDetailPage';
// 여행 관련 3총사
import TravelPage from './components/travel/TravelPage'
import TravelInsertPage from './components/travel/TravelInsertPage'
import TravelDetailPage from './components/travel/TravelDetailPage'



import SystemLayout from './components/system/SystemLayout';

function App() {
  return (
    <div>
      <Header />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cooking" element={<CookingPage />} />
          <Route path="/cooking/new" element={<CookingInsertPage />} />
          <Route path="/cooking/:id" element={<CookingDetailPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/new" element={<ReviewInsertPage />} />
          <Route path="/review/:id" element={<ReviewDetailPage />} />
          <Route path="/system" element={<SystemLayout />}>
            <Route path="code" element={<CodeListPage />} />
            <Route path="code/new" element={<CodeInsertPage />} />
            <Route path="code/:id" element={<CodeDetailPage />} />
          </Route>
          <Route path="/travel" element={<TravelPage />} />
          <Route path="/travel/new" element={<TravelInsertPage />} />
          <Route path="/travel/:id" element={<TravelDetailPage />} />
        </Routes>
      </div>
    </div>
  )
}
export default App
