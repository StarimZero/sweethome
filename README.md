<div align="center">

# 🏡 Holango

### *우리 둘만의 라이프로그*

> 함께한 모든 순간을 기록하는, 부부를 위한 작은 공간

<br/>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Beanie](https://img.shields.io/badge/Beanie_ODM-1B5E20?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

<br/>

</div>

---

## 💌 About

> *"평범한 하루도, 함께라면 특별해져요."*

**Holango**는 두 사람의 일상과 추억을 한 곳에 담는 부부 라이프로그입니다.
오늘 저녁 메뉴부터 어젯밤 마신 와인 한 잔, 다음 주 떠날 여행과 손끝에서 자라나는 뜨개질까지.
사소하지만 소중한 순간들이 차곡차곡 쌓이는 공간이에요. 🤍

<br/>

## ✨ Features

<table>
  <tr>
    <td align="center" width="33%">
      <h3>🍳</h3>
      <b>요리 레시피</b><br/>
      <sub>둘이 함께 만든<br/>오늘의 한 끼</sub>
    </td>
    <td align="center" width="33%">
      <h3>📝</h3>
      <b>맛집 리뷰</b><br/>
      <sub>다녀온 카페와<br/>식당의 기록</sub>
    </td>
    <td align="center" width="33%">
      <h3>✈️</h3>
      <b>여행 기록</b><br/>
      <sub>함께 걸은 길과<br/>장소의 풍경</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <h3>🍷</h3>
      <b>주류 리뷰 + AI 소믈리에</b><br/>
      <sub>Gemini가 분석해주는<br/>오늘의 한 잔</sub>
    </td>
    <td align="center">
      <h3>🧶</h3>
      <b>뜨개록</b><br/>
      <sub>한 코 한 코<br/>완성되는 작품</sub>
    </td>
    <td align="center">
      <h3>📅</h3>
      <b>캘린더</b><br/>
      <sub>우리의 일정과<br/>기념일 한눈에</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <h3>📖</h3>
      <b>다이어리</b><br/>
      <sub>오늘 하루의<br/>마음을 기록</sub>
    </td>
    <td align="center">
      <h3>🎬</h3>
      <b>문화생활</b><br/>
      <sub>본 영화, 읽은 책,<br/>다녀온 전시</sub>
    </td>
    <td align="center">
      <h3>🪣</h3>
      <b>버킷리스트</b><br/>
      <sub>언젠가 함께<br/>이루고 싶은 것들</sub>
    </td>
  </tr>
</table>

<br/>

## 🛠 Tech Stack

<div align="center">

| Frontend | Backend | Database | AI / Auth |
|:---:|:---:|:---:|:---:|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="48" height="48" /><br/>React | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" width="48" height="48" /><br/>FastAPI | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" width="48" height="48" /><br/>MongoDB | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" width="48" height="48" /><br/>Gemini |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="48" height="48" /><br/>Vite | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="48" height="48" /><br/>Python | <img src="https://img.shields.io/badge/-Beanie-1B5E20?style=flat-square" /><br/>Beanie ODM | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jwt/jwt-original.svg" width="48" height="48" /><br/>JWT |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg" width="48" height="48" /><br/>SCSS | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" width="48" height="48" /><br/>Uvicorn | — | — |

</div>

<br/>

## 📸 Screenshots

<div align="center">

<!-- 캡처 이미지를 docs/screenshots/ 폴더에 추가한 뒤 경로를 채워주세요 -->

| 메인 | 캘린더 |
|:---:|:---:|
| ![home](docs/screenshots/home.png) | ![calendar](docs/screenshots/calendar.png) |

| 주류 리뷰 (AI 소믈리에) | 뜨개록 |
|:---:|:---:|
| ![liquor](docs/screenshots/liquor.png) | ![knitting](docs/screenshots/knitting.png) |

</div>

<br/>

## 🌿 Project Structure

```
holango/
├── backend/              # FastAPI + Beanie ODM
│   ├── app.py            # 앱 진입점, 라우터 등록, SPA 서빙
│   ├── database.py       # MongoDB / Beanie 초기화
│   ├── models/           # Beanie Document 모델
│   ├── routers/          # /api 라우터 (CRUD + AI 분석)
│   └── auth/             # JWT 인증 유틸
│
└── frontend/             # React + Vite + SCSS
    └── src/
        ├── components/   # 기능별 페이지 (cooking, liquor, knitting, ...)
        ├── context/      # AuthContext
        ├── api.js        # Axios 클라이언트
        └── App.jsx       # React Router
```

<br/>

## 🌷 Getting Started

### 📋 Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (로컬 또는 Atlas)

### 🔧 Setup

```bash
# 1. Clone
git clone <repository-url>
cd holango

# 2. Backend
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
source venv/bin/activate         # macOS / Linux
pip install -r requirements.txt

# 3. Frontend
cd ../frontend
npm install
```

### 🔑 Environment Variables

`backend/.env`

```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=sweethome
SECRET_KEY=your_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### ▶️ Run

```bash
# Backend  →  http://127.0.0.1:8000  (Swagger: /docs)
cd backend && python app.py

# Frontend →  http://localhost:5173
cd frontend && npm run dev
```

### 📦 Build

```bash
cd frontend && npm run build
# → frontend/dist/
```

<br/>

---

<div align="center">

🤍 *Made with love, for the two of us.* 🤍

</div>
