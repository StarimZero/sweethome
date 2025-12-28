from fastapi import APIRouter, HTTPException
from typing import List, Optional
from beanie import PydanticObjectId
from beanie.operators import RegEx
from models.cooking import Recipe

router = APIRouter(
    prefix="/api/cooking",
    tags=["Cooking"]
)

@router.get("", response_model=List[Recipe])
async def get_all_recipes(
    name: Optional[str] = None,          # [수정] 이름 검색 파라미터
    description: Optional[str] = None,   # [수정] 내용(설명) 검색 파라미터
    chef: Optional[str] = None,
    cooking_type: Optional[str] = None
):
    expressions = []
    
    # 1. 이름 검색 (정규식 부분 일치)
    if name:
        expressions.append(RegEx(Recipe.name, name, "i"))
        
    # 2. 설명 검색 (정규식 부분 일치)
    if description:
        expressions.append(RegEx(Recipe.description, description, "i"))
    
    # 3. 요리사 필터
    if chef and chef != 'all':
        expressions.append(Recipe.chef == chef)
        
    # 4. 요리 종류 필터
    if cooking_type and cooking_type != "전체":
        expressions.append(Recipe.cooking_type == cooking_type)
            
    # 모든 조건이 AND로 결합되어 검색됨
    if expressions:
        return await Recipe.find(*expressions).to_list()
    else:
        return await Recipe.find_all().to_list()

# ... (나머지 CRUD 코드는 기존 유지)
@router.post("", response_model=Recipe)
async def add_recipe(recipe: Recipe):
    await recipe.insert()
    return recipe

@router.get("/{id}", response_model=Recipe)
async def get_recipe(id: PydanticObjectId):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe

@router.put("/{id}", response_model=Recipe)
async def update_recipe(id: PydanticObjectId, recipe_data: Recipe):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    update_query = recipe_data.dict(exclude_unset=True)
    await recipe.set(update_query)
    return recipe

@router.delete("/{id}")
async def delete_recipe(id: PydanticObjectId):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    await recipe.delete()
    return {"message": "Successfully deleted"}
