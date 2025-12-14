import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from contextlib import asynccontextmanager
from database import init_db

# 라우터들
from routers import dashboard, cooking, review
from routers.system import common_code
from routers import travel, liquor
from models.user import User  # 모델 추가
from routers import auth  # 라우터 추가

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. DB 초기화
    await init_db()
    print("✅ MongoDB Connected via Beanie!")
    yield

app = FastAPI(lifespan=lifespan)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(dashboard.router)
app.include_router(cooking.router)
app.include_router(review.router)
app.include_router(common_code.router)
app.include_router(travel.router)
app.include_router(liquor.router)
app.include_router(auth.router)

# --- 프론트엔드 연결 ---
# 정적 파일 경로 설정 (Render 빌드 시 backend/static 으로 복사됨)
static_dir = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(static_dir):
    # assets 폴더 마운트
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # [핵심] SPA 라우팅 처리
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # API나 문서 관련 경로는 제외
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return {"error": "Not Found"}
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    # 루트 경로 접속 처리
    @app.get("/")
    async def read_root():
        return FileResponse(os.path.join(static_dir, "index.html"))

else:
    # 로컬 개발이나 빌드 실패 시 안내
    @app.get("/")
    def read_root():
        return {"message": "Frontend static files not found. Please run build command."}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
