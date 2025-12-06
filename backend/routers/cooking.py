from fastapi import APIRouter, HTTPException
from typing import List
from beanie import PydanticObjectId
# [수정] models 패키지에서 Recipe 모델 가져오기 (경로 주의!)
# models 폴더 안의 __init__.py를 통해 가져오거나, models.cooking에서 직접 가져와야 합니다.
try:
    from models import Recipe 
except ImportError:
    from models.cooking import Recipe

router = APIRouter(
    prefix="/api/cooking",
    tags=["Cooking"]
)

# 1. 목록 조회
@router.get("/", response_model=List[Recipe])
async def get_all_recipes():
    return await Recipe.find_all().to_list()

# 2. 등록
@router.post("/", response_model=Recipe)
async def add_recipe(recipe: Recipe):
    await recipe.insert()
    return recipe

# 3. 상세 조회
# PydanticObjectId는 MongoDB의 ObjectId 형식을 검증해줍니다.
@router.get("/{id}", response_model=Recipe)
async def get_recipe(id: PydanticObjectId):
    # Beanie에서는 .get() 메서드로 ID 조회가 가능합니다.
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

# 4. 수정 (Update)
@router.put("/{id}", response_model=Recipe)
async def update_recipe(id: PydanticObjectId, recipe_data: Recipe):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # 요청받은 데이터(recipe_data)로 기존 객체(recipe) 내용 갱신
    # exclude_unset=True: 클라이언트가 보낸 필드만 업데이트 (선택적 수정)
    update_query = recipe_data.dict(exclude_unset=True) 
    
    # Beanie의 update 메서드 사용 (더 안전함)
    # $set 연산자를 사용하여 MongoDB 문서 업데이트
    await recipe.set(update_query)
    
    return recipe

# 5. 삭제 (Delete)
@router.delete("/{id}")
async def delete_recipe(id: PydanticObjectId):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    await recipe.delete()
    return {"message": "Successfully deleted"}
