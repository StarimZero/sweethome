# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

Holango는 부부 라이프로그 웹 애플리케이션입니다. React 프론트엔드와 FastAPI 백엔드로 구성되어 있으며, MongoDB를 Beanie ODM으로 사용합니다. 요리 레시피, 리뷰, 여행 기록, 주류 리뷰를 관리하고 Google Gemini 기반 AI 소믈리에 기능을 제공합니다.

## 개발 명령어

### 백엔드 (FastAPI)
```bash
cd backend
# 가상환경 활성화
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 개발 서버 실행
python app.py
# 또는: uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# 의존성 설치
pip install -r requirements.txt
```

### 프론트엔드 (React + Vite)
```bash
cd frontend
npm install
npm run dev      # 개발 서버 (포트 5173, /api를 백엔드로 프록시)
npm run build    # 프로덕션 빌드 (dist/)
npm run lint     # ESLint 검사
npm run preview  # 프로덕션 빌드 미리보기
```

### 로컬 개발
두 서버를 동시에 실행:
- 백엔드: `http://127.0.0.1:8000` (API + Swagger 문서는 /docs)
- 프론트엔드: `http://localhost:5173` (API 호출을 백엔드로 프록시)

## 아키텍처

### 백엔드 구조 (`backend/`)
- `app.py` - FastAPI 앱 진입점, lifespan 이벤트, 라우터 등록, SPA 서빙
- `database.py` - Motor 비동기 클라이언트로 MongoDB/Beanie 초기화
- `models/` - Beanie Document 모델 (MongoDB 컬렉션)
  - `__init__.py` - Beanie 초기화용 `__all_models__` 리스트 내보내기
  - 각 모델 파일(cooking.py, review.py, travel.py, liquor.py, user.py)에서 Beanie Document 정의
- `routers/` - `/api` 접두사를 가진 FastAPI 라우터
  - 표준 CRUD 패턴: 목록, 생성, ID로 조회, 수정, 삭제
  - `liquor.py`에 Gemini API를 이용한 백그라운드 AI 분석 포함
  - `auth.py` - JWT 기반 인증 (회원가입/로그인)
- `auth/security.py` - 비밀번호 해싱 및 JWT 토큰 유틸리티

### 프론트엔드 구조 (`frontend/src/`)
- `App.jsx` - 공개/보호 라우트가 있는 React Router 설정
- `api.js` - `/api` baseURL을 가진 Axios 클라이언트
- `context/AuthContext.jsx` - localStorage에 JWT 토큰을 저장하는 인증 상태 관리
- `components/` - 기능별 구성
  - 각 기능(cooking, review, travel, liquor)은 Page, InsertPage, DetailPage 컴포넌트 보유
  - `ProtectedRoute.jsx` - 인증된 라우트용 가드
  - `system/` - 시스템 관리 컴포넌트 (공통코드)

### 주요 패턴
- **API 라우트**: 모든 백엔드 라우트는 `/api` 접두사 사용 (예: `/api/cooking`, `/api/liquor`)
- **모델**: Settings.name으로 MongoDB 컬렉션명을 정의하는 Beanie Document
- **인증**: localStorage에 JWT 토큰 저장, Authorization 헤더로 전송
- **AI 연동**: 주류 리뷰 등록 시 Gemini API로 백그라운드 분석 수행

## 환경변수

백엔드 `.env` 파일 (커밋하지 않음):
- `MONGODB_URL` - MongoDB 연결 문자열 (기본값: `mongodb://localhost:27017`)
- `DB_NAME` - 데이터베이스 이름 (기본값: `sweethome`)
- `GEMINI_API_KEY` - AI 소믈리에 기능용 Google Gemini API 키
- `SECRET_KEY` - JWT 시크릿 키

## 데이터베이스

Beanie ODM을 사용하는 MongoDB. 모든 모델은 Beanie 초기화를 위해 `models/__init__.py`의 `__all_models__` 리스트에 등록해야 합니다.

컬렉션: recipes, reviews, travels, places, liquor_reviews, users, common_codes
