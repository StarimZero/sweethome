from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager
from database import init_db

# 라우터들 (기능별 API) 불러오기
from routers import dashboard, cooking, review
from routers.system import common_code
from routers import travel

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

@app.get("/")
def read_root():
    return {"message": "Backend is running with SQL-managed DB!"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
