# Holango

부부 라이프로그 웹 애플리케이션입니다.

요리 레시피, 리뷰, 여행 기록, 주류 리뷰를 관리하고 AI 소믈리에 기능을 제공합니다.

## 기술 스택

- **Frontend**: React + Vite + SCSS
- **Backend**: FastAPI + Beanie (MongoDB ODM)
- **Database**: MongoDB
- **AI**: Google Gemini API

## 설치 방법

### 1. 저장소 클론

```bash
git clone <저장소 URL>
cd holango
```

### 2. 백엔드 설정

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# 패키지 설치
pip install -r requirements.txt
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
```

### 4. 환경변수 설정

`backend/.env` 파일 생성:

```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=sweethome
SECRET_KEY=your_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## 실행 방법

### 백엔드 서버

```bash
cd backend
.\venv\Scripts\activate  # Windows
python app.py
```
- API: http://127.0.0.1:8000
- Swagger 문서: http://127.0.0.1:8000/docs

### 프론트엔드 서버

```bash
cd frontend
npm run dev
```
- 접속: http://localhost:5173

## 빌드

```bash
cd frontend
npm run build
```

빌드 결과물은 `frontend/dist/` 폴더에 생성됩니다.
