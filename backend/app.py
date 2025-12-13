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

@asynccontextmanager
async def lifespan(app: FastAPI):
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

# --- [수정된 부분] 프론트엔드 연결 ---
# 1. 테스트용 @app.get("/") 코드는 지웠습니다. (JSON 응답 방지)

# 2. 정적 파일 경로 설정 (Render 빌드 시 backend/static 으로 복사됨)
static_dir = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(static_dir):
    # assets 폴더 마운트
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # [핵심] 모든 경로에 대해 index.html 반환 (SPA 라우팅)
    # 루트(/) 접속 시에도 여기가 실행되어야 화면이 나옵니다.
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # API나 문서 관련 경로는 제외
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return {"error": "Not Found"}
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    # 루트 경로 접속 처리 (위의 catch-all이 있어도 명시적으로 해주는 게 안전할 때가 있음)
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
