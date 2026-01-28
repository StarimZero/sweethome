import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './components/Home'
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
// 요리 관련 3총사
import CookingPage from './components/cooking/CookingPage'
import CookingInsertPage from './components/cooking/CookingInsertPage'
import CookingDetailPage from './components/cooking/CookingDetailPage'
import './App.scss' 
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
//주류 리뷰 3총사
import LiquorPage from './components/liquor/LiquorPage'
import LiquorInsertPage from './components/liquor/LiquorInsertPage'
import LiquorDetailPage from './components/liquor/LiquorDetailPage'
// 버킷리스트 3총사
import BucketPage from './components/bucket/BucketPage'
import BucketInsertPage from './components/bucket/BucketInsertPage'
import BucketDetailPage from './components/bucket/BucketDetailPage'
// 일기 3총사
import DiaryPage from './components/diary/DiaryPage'
import DiaryInsertPage from './components/diary/DiaryInsertPage'
import DiaryDetailPage from './components/diary/DiaryDetailPage'
// 캘린더 3총사
import CalendarPage from './components/calendar/CalendarPage'
import CalendarInsertPage from './components/calendar/CalendarInsertPage'
import CalendarDetailPage from './components/calendar/CalendarDetailPage'
// 가계도 3총사
import FamilyPage from './components/family/FamilyPage'
import FamilyInsertPage from './components/family/FamilyInsertPage'
import FamilyDetailPage from './components/family/FamilyDetailPage'
//로그인관련
import Login from './components/Login';



import SystemLayout from './components/system/SystemLayout';

function App() {
  return (
    <AuthProvider>
      <Header />
      <div className="container">
        <Routes>
          {/* 1. 공개 라우트 (누구나 접근 가능) */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* 2. 보호된 라우트 (로그인 필수) - 여기서부터는 ProtectedRoute가 감시함 */}
          <Route element={<ProtectedRoute />}>
            
            {/* 요리 (Cooking) */}
            <Route path="/cooking" element={<CookingPage />} />
            <Route path="/cooking/new" element={<CookingInsertPage />} />
            <Route path="/cooking/:id" element={<CookingDetailPage />} />

            {/* 리뷰 (Review) */}
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/review/new" element={<ReviewInsertPage />} />
            <Route path="/review/:id" element={<ReviewDetailPage />} />

            {/* 여행 (Travel) */}
            <Route path="/travel" element={<TravelPage />} />
            <Route path="/travel/new" element={<TravelInsertPage />} />
            <Route path="/travel/:id" element={<TravelDetailPage />} />

            {/* 주류 (Liquor) */}
            <Route path="/liquor" element={<LiquorPage />} />
            <Route path="/liquor/new" element={<LiquorInsertPage />} />
            <Route path="/liquor/:id" element={<LiquorDetailPage />} />

            {/* 버킷리스트 (Bucket) */}
            <Route path="/bucket" element={<BucketPage />} />
            <Route path="/bucket/new" element={<BucketInsertPage />} />
            <Route path="/bucket/:id" element={<BucketDetailPage />} />

            {/* 일기 (Diary) */}
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/diary/new" element={<DiaryInsertPage />} />
            <Route path="/diary/:id" element={<DiaryDetailPage />} />

            {/* 캘린더 (Calendar) */}
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/calendar/new" element={<CalendarInsertPage />} />
            <Route path="/calendar/:id" element={<CalendarDetailPage />} />

            {/* 가계도 (Family) */}
            <Route path="/family" element={<FamilyPage />} />
            <Route path="/family/new" element={<FamilyInsertPage />} />
            <Route path="/family/:id" element={<FamilyDetailPage />} />

            {/* 시스템 (System) */}
            <Route path="/system" element={<SystemLayout />}>
               {/* SystemLayout 내부의 자식 라우트들도 자동으로 보호됨 */}
               <Route path="code" element={<CodeListPage />} />
               <Route path="code/new" element={<CodeInsertPage />} />
               <Route path="code/:id" element={<CodeDetailPage />} />
            </Route>

          </Route> {/* End of ProtectedRoute */}

        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;