import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation(); //현재위치정보

  // 1. 로딩 중일 때는 깜빡임 방지를 위해 로딩 스피너나 빈 화면 반환
  if (loading) {
    return <div>Loading...</div>; // 또는 null
  }

  // 2. 로그인이 안 된 경우 -> 로그인 페이지로 이동 (현재 위치 기억했다가 돌아오게 할 수도 있음)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. 로그인 된 경우 -> 원래 보여주려던 하위 라우트(Outlet) 렌더링
  return <Outlet />;
};

export default ProtectedRoute;
