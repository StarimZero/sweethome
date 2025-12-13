import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from contextlib import asynccontextmanager
from database import init_db

# 라우터들 (기능별 API) 불러오기
from routers import dashboard, cooking, review
from routers.system import common_code
from routers import travel, liquor

app = FastAPI()

# --- [중요] Lifespan: 서버 켜질 때 실행될 로직 ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db() # MongoDB 연결 시작
    print("✅ MongoDB Connected via Beanie!")
    yield
    # 서버 꺼질 때 할 일 (있으면 작성)

app = FastAPI(lifespan=lifespan) # lifespan 등록

# --- [1. CORS 설정] (프론트엔드 5173 포트 허용) ---
origins = [
    "http://localhost:5173",
    "https://sweethome.onrender.com",  # 나중에 내 Render 주소로 변경
    "*"  # 초기 배포 성공을 위해 전체 허용 권장
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from routers import dashboard, cooking

#라우터
app.include_router(dashboard.router)
app.include_router(cooking.router) 
app.include_router(review.router) 
app.include_router(common_code.router)
app.include_router(travel.router)
app.include_router(liquor.router)

@app.get("/")
def read_root():
    return {"message": "Backend is running with SQL-managed DB!"}

# --- [수정된 부분] 프론트엔드 정적 파일 서빙 ---
# Render 빌드 과정에서 frontend/dist 의 내용물을 backend/static 폴더로 복사해올 예정입니다.
static_dir = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(static_dir):
    # /assets 경로 마운트 (React 빌드 결과물에 assets 폴더가 있음)
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return {"error": "Not Found"}
        return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
