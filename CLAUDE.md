# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

Holango는 부부 라이프로그 웹 애플리케이션입니다. React 프론트엔드와 FastAPI 백엔드로 구성되어 있으며, MongoDB를 Beanie ODM으로 사용합니다. 요리 레시피, 리뷰, 여행, 주류 리뷰, 버킷리스트, 일기, 캘린더, 가계도, 문화생활, 뜨개록, Buypedia 등 12개 영역의 기록을 관리하고 Google Gemini 기반 AI 소믈리에 기능을 제공합니다.

## 참고 문서 (로컬 전용, .gitignore 등록)

작업 전에 아래 문서를 먼저 확인하세요. GitHub에 올라가지 않는 로컬 문서입니다.

- `design.md` - UI 디자인 통일 작업 노트. 디자인 토큰(`#105A88` 포인트색), 폰트(Paperlogy), 적용 레시피, 메뉴별 진행상황. **UI/디자인 작업 전 필독.**
- `REVIEW_NOTES.md` - 검토·진단 노트. 검증된 보안 구조와 위험도 판단 기준. **보안/구조 진단 전 필독** (일반 체크리스트를 그대로 적용해 위험도를 과장하지 말 것).

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

## 기능 영역

각 기능은 프론트엔드 3종 세트(Page, InsertPage, DetailPage)와 백엔드 라우터/모델을 하나씩 가집니다.

| 기능 | 프론트 경로 | API prefix | 모델 | 컬렉션 |
|------|------------|-----------|------|--------|
| 요리 | `/cooking` | `/api/cooking` | `Recipe` | `recipes` |
| 리뷰 | `/review` | `/api/review` | `Review` | `reviews` |
| 여행 | `/travel` | `/api/travel` | `Travel`, `Place` | `travels`, `places` |
| 주류 | `/liquor` | `/api/liquor` | `LiquorReview` | `liquor_reviews` |
| 버킷리스트 | `/bucket` | `/api/bucket` | `BucketList` | `bucketlist` |
| 일기 | `/diary` | `/api/diary` | `Diary` | `diaries` |
| 캘린더 | `/calendar` | `/api/calendar` | `CalendarEvent` | `calendar_events` |
| 가계도 | `/family` | `/api/family` | `FamilyMember` | `family_members` |
| 문화생활 | `/culture` | `/api/culture` | `CultureReview` | `culture_reviews` |
| 뜨개록 | `/knitting` | `/api/knitting` | `KnittingRecord` | `knitting_records` |
| Buypedia(구매 제품 순위표) | `/buypedia` | `/api/buypedia` | `BuypediaRecord` | `buypedia_records` |
| 유행어(우리집 유행어 + 녹음) | `/buzzword` | `/api/buzzword` | `Buzzword`, `BuzzwordAudio` | `buzzwords`, `buzzword_audios` |
| 조회용 챗봇 (모든 화면 💬) | - | `/api/ask` | `AskLog` | `ask_logs` |
| 공통코드 | `/system/code` | `/api/code` | `CommonCode` | `common_codes` |
| 사용자관리 | `/system/users` | `/api/users` | `User` | `users` |

그 외 API: `/api/auth`(로그인/회원가입), `/api/couple`(홈 화면, `routers/dashboard.py`. `/stats`는 홈 사진 아래 대시보드: 메뉴별 기록 수·이번 달 추가·DB 사용량(`DB_LIMIT_MB`=512, Atlas 무료)·이번 달 챗봇 사용량)

## 아키텍처

### 백엔드 구조 (`backend/`)
- `app.py` - FastAPI 앱 진입점, lifespan 이벤트(.env 로드 → DB 초기화), 라우터 등록, SPA 서빙
- `database.py` - Motor 비동기 클라이언트로 MongoDB/Beanie 초기화
- `models/` - Beanie Document 모델 (MongoDB 컬렉션)
  - `__init__.py` - Beanie 초기화용 `__all_models__` 리스트 내보내기
  - 기능별 모델 파일 + `system/common_code.py`
- `routers/` - `/api` 접두사를 가진 FastAPI 라우터
  - 표준 CRUD 패턴: 목록, 생성, ID로 조회, 수정, 삭제
  - `liquor.py`에 Gemini API를 이용한 백그라운드 AI 분석 포함
  - `auth.py` - JWT 기반 인증 (회원가입/로그인)
  - `dashboard.py` - 홈 화면 요약 데이터 (`/api/couple`)
  - `ai.py` - 독립 AI 분석 엔드포인트. **현재 `app.py`에 등록되어 있지 않음(미사용)**
  - `buypedia.py` - 구매 기록 CRUD + `/ranking`(제품·브랜드 순위 집계), `/product`(제품별 기록), `/pending`(별점 둘 다 없는 평가 대기). 순위 기준은 `rank_sort_key` 한 곳에 모음
  - `ask.py` - 조회용 챗봇. Gemini REST + 도구 호출(LLM이 MongoDB 조회문 작성 → `ask_tools.py`가 허용 컬렉션·읽기 전용·50건 제한 검사 후 실행). 질문마다 `ask_logs`에 해석·가정·이유·조회문·검사·결과 값·원본 응답·프롬프트 전체·버전까지 남김 (나중에 Claude와 분석·개선용). 프롬프트를 바꾸면 `PROMPT_VERSION`을 올릴 것. 답변 호명: younghun91=호랭이(남편), joyi96=보구치(아내). 연결 메뉴: Buypedia·맛집 리뷰·주류·문화생활·뜨개록·요리·여행·버킷리스트·유행어 (일기·캘린더·가계도는 미연결). 메뉴마다 한줄평 칸 이름이 달라서(`wifecomment`/`wife_comment`/`comment_wife`) 서버가 조건에 쓴 칸이 실제로 있는지 확인해 LLM에 알려줌
  - `buzzword.py` - 우리집 유행어 CRUD + 녹음 올리기/듣기/삭제. 녹음은 `audio_convert.py`(PyAV, ffmpeg 내장 휠)가 어떤 형식이든 모노 AAC 24kHz 32kbps `.m4a`로 바꿔 최대 1분(약 240KB)으로 `buzzword_audios`에 바이너리 저장. 듣기는 토큰 필요라 프론트가 blob으로 받아 재생. 챗봇엔 `buzzwords`만 연결(녹음 컬렉션은 제외)
  - `system/common_code.py` - 공통코드 관리
- `auth/security.py` - 비밀번호 해싱 및 JWT 토큰 유틸리티
- `seeds/` - 초기 데이터 스크립트 (뜨개록·Buypedia 공통코드, 주류·Buypedia 기록 직접 등록 `add_liquor.py`/`add_buypedia.py`, 사용자 초기화 mongosh 스크립트)
  - `coupang_fetch.py` - 쿠팡 전용 Chrome(디버그 포트 9225, 프로필 `~/.coupang-chrome`, 사용자가 직접 로그인)에 Playwright로 붙어 주문목록의 `__NEXT_DATA__`를 읽고, 아직 안 넣은 상품만 뽑음. 분류 후 `add_buypedia.py`로 별점 없이 넣으면 평가 대기. Playwright는 `requirements-tools.txt`(배포 불필요)
- `static/` - 배포 시 프론트엔드 빌드 결과물이 복사되는 위치 (있을 때만 SPA 서빙)

### 프론트엔드 구조 (`frontend/src/`)
- `App.jsx` - React Router 설정. `ToastProvider` > `ConfirmProvider` > `AuthProvider` 순으로 감쌈
- `api.js` - `/api` baseURL을 가진 Axios 클라이언트 (JWT를 Authorization 헤더로 전송, 쿠키 미사용)
- `context/AuthContext.jsx` - localStorage에 JWT 토큰을 저장하는 인증 상태 관리
- `styles/tokens.scss` - 전역 CSS 변수(디자인 토큰). `main.jsx`에서 App보다 먼저 로드
- `hooks/` - 커스텀 훅 (`useBucketCodes.js` 등)
- `components/` - 기능별 폴더 구성
  - 각 기능 폴더(cooking, review, travel, liquor, bucket, diary, calendar, family, culture, knitting)는 Page, InsertPage, DetailPage 컴포넌트 보유
  - `buypedia/`는 순위표(Page) + 등록/수정(InsertPage) + 제품 상세(ProductPage) + 기록 상세(DetailPage) + 평가 대기함(PendingPage). 같은 카테고리+브랜드+제품명(공백 무시) 기록을 한 제품으로 묶고, 순위는 같은 **품목**(`item_type`, 예: 생수·만두·대파) 안에서만 매김. 제품이 하나뿐인 품목은 '늘 사는 것'으로 따로 표시. 품목 규칙은 `seeds/buypedia_item_types.py`
  - `common/` - 전역 UI 토대: `Toast.jsx`(알림), `ConfirmDialog.jsx`(확인 모달). **alert/confirm 대신 이것들을 사용**
  - `ProtectedRoute.jsx` - 인증된 라우트용 가드
  - `system/` - 시스템 관리 (`SystemLayout` 하위에 공통코드, 사용자관리)

### 주요 패턴
- **API 라우트**: 모든 백엔드 라우트는 `/api` 접두사 사용 (예: `/api/cooking`, `/api/liquor`)
- **모델**: Settings.name으로 MongoDB 컬렉션명을 정의하는 Beanie Document
- **인증**: localStorage에 JWT 토큰 저장, Authorization 헤더로 전송 (쿠키 미사용)
- **라우팅**: 공개 라우트는 `/`, `/login`뿐이고 나머지는 모두 `ProtectedRoute` 하위
- **AI 연동**: 주류 리뷰 등록/수정 시 `BackgroundTasks`로 Gemini(`gemini-2.5-flash`) 분석을 실행해 DB 업데이트
- **디자인**: 색상·간격은 하드코딩하지 말고 `tokens.scss`의 `var(--...)` 사용 (자세한 내용은 `design.md`)
- **공통코드**: 셀렉트 박스 등 코드성 데이터는 `common_codes` 컬렉션 기반

## 환경변수

백엔드 `.env` 파일 (커밋하지 않음):
- `MONGODB_URL` - MongoDB 연결 문자열 (기본값: `mongodb://localhost:27017`)
- `DB_NAME` - 데이터베이스 이름 (기본값: `sweethome`)
- `GEMINI_API_KEY` - AI 소믈리에 기능용 Google Gemini API 키
- `SECRET_KEY` - JWT 시크릿 키

## 데이터베이스

Beanie ODM을 사용하는 MongoDB. 모든 모델은 Beanie 초기화를 위해 `models/__init__.py`의 `__all_models__` 리스트에 등록해야 합니다.

컬렉션: `recipes`, `reviews`, `travels`, `places`, `liquor_reviews`, `users`, `common_codes`, `bucketlist`, `diaries`, `calendar_events`, `family_members`, `culture_reviews`, `knitting_records`, `buypedia_records`, `ask_logs`, `buzzwords`, `buzzword_audios`

## 배포

Render에 단일 서버로 배포됩니다. 프론트엔드 빌드 결과물을 `backend/static`으로 복사하면 `app.py`가 SPA를 직접 서빙하므로, 운영 환경에서 프론트와 API는 **동일 출처(same-origin)** 입니다. 로컬 개발도 Vite 프록시로 같은 구조입니다.
