# **Holango 🥰 우리 부부의 여행 웹사이트**

![Demo GIF](https://via.placeholder.com/800x400/26DCD6/FFFFFF?text=%F0%9F%9A%80+%EB%B2%A4%ED%86%A0%EA%B7데모 GIF 예정)*

> **우리 부부만의 특별한 여행 기록 💕**  
> 트리플 앱처럼 멋진 UI + 벤토 그리드 완성!

***

## ✨ **주요 기능**

| 기능 | 설명 |
|------|------|
| **🎨 벤토 그리드** | 다가오는 여행(`D-`) **2x2 대형카드**, 지난 여행(`D+`) **다양한 크기** |
| **📱 일정 관리** | **Day 1, Day 2** 탭 전환 + 타임라인 보기 |
| **🌈 색상 선택** | 썸네일 배경에 맞춰 **제목 색상** 직접 설정 |
| **📊 D-Day** | 자동 계산 (`D-30`, `D-Day`, `D+100`) |
| **🔄 CRUD** | 여행 등록/수정/삭제 완벽 지원 |

***

## 🚀 **우리 집에서 실행하는 법 (3분)**

```bash
# 1. 클론
git clone https://github.com/StarimZero/sweethome.git
cd sweethome

# 2. MongoDB 켜기 (Docker)
docker run -d -p 27017:27017 --name 우리-mongo mongo:latest

# 3. 백엔드
cd backend
python -m venv venv
venv\Scripts\activate  # 윈도우
pip install -r requirements.txt
python app.py
# http://localhost:8000 확인!

# 4. 프론트엔드 (새 터미널)
cd ../frontend
npm install
npm run dev
# http://localhost:5173 접속!
```

```
🌐 백엔드: http://localhost:8000
🌐 프론트엔드: http://localhost:5173  
📚 API 문서: http://localhost:8000/docs
```

***

## 🛠️ **어떻게 만들었나요?**

```
Frontend: React 19 + Vite (빨라요!)
Backend: FastAPI + MongoDB (안정적!)
UI: 벤토 그리드 (2024 트렌드 🔥)
```

***

## 📱 **화면 미리보기**

| 여행 리스트 | 일정 상세 |
|-------------|-----------|
| ![리스트](https://via.placeholder.com/400x300/26DCD6/FFFFFF?text=%F0%9F%9A%80+D-30+%7C+D%2B100  | ![상세](https://via.placeholder.com/400x300/26DCD6/FFFFFF?text=Day+1+%F0%9F%93%8F  |

***

## 👫 **우리 부부만의 특별함**

- **다가오는 여행**은 크게 보여서 잊지 않음 ✅
- **지난 여행**은 앨범처럼 다양하게 배치 ✅  
- **색상**으로 분위기 맞춤 ✅
- **D-Day**로 언제 출발하는지 한눈에 ✅

***

## 📈 **앞으로 할 일**

- [x] **벤토 그리드** ✅
- [x] **여행 CRUD** ✅
- [x] **색상 설정** ✅
- [ ] **구글 지도** 추가 ⏳
- [ ] **모바일 앱처럼** 만들기 ⏳
- [ ] **부부간 공유** 기능 ⏳

***

## 🙌 **함께 만들기**

```
1. git clone https://github.com/StarimZero/sweethome.git
2. 작업하고 PR!
3. 부부 웹사이트 완성 💕
```

***

<div align="center">
  <img src="https://via.placeholder.com/600x100/26DCD6/FFFFFF?text=%F0%9F%9A%80+%EC%9A%B0%EB%A6%AC+%EB%B6%80%EB%B6%80%EC%9D%98+%EC%97%AC%ED%96%89%EA%B8%B0%EB%A1%9D" />
  <br><sub>Made with ❤️ by 우리 부부</sub>
</div>

***

**GitHub에서 `README.md` 편집 → 위 내용 붙여넣기 → 저장!** 🎉

**우리 부부 웹사이트 완벽하게 문서화!** 💕