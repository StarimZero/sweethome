from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from beanie import PydanticObjectId
from beanie.operators import RegEx
from models.cooking import Recipe
from models.user import User
from auth.security import get_current_user, assert_owner_or_admin

router = APIRouter(
    prefix="/api/cooking",
    tags=["Cooking"]
)


@router.get("", response_model=List[Recipe])
async def get_all_recipes(
    name: Optional[str] = None,
    description: Optional[str] = None,
    created_by: Optional[str] = None,
    cooking_type: Optional[str] = None,
):
    expressions = []

    if name:
        expressions.append(RegEx(Recipe.name, name, "i"))
    if description:
        expressions.append(RegEx(Recipe.description, description, "i"))
    if created_by and created_by != 'all':
        try:
            expressions.append(Recipe.created_by == PydanticObjectId(created_by))
        except Exception:
            pass
    if cooking_type and cooking_type != "전체":
        expressions.append(Recipe.cooking_type == cooking_type)

    if expressions:
        return await Recipe.find(*expressions).to_list()
    return await Recipe.find_all().to_list()


@router.post("", response_model=Recipe)
async def add_recipe(recipe: Recipe, current_user: User = Depends(get_current_user)):
    recipe.created_by = current_user.id
    await recipe.insert()
    return recipe


@router.get("/{id}", response_model=Recipe)
async def get_recipe(id: PydanticObjectId):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.put("/{id}", response_model=Recipe)
async def update_recipe(
    id: PydanticObjectId,
    recipe_data: Recipe,
    current_user: User = Depends(get_current_user),
):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    assert_owner_or_admin(recipe, current_user)

    update_query = recipe_data.dict(exclude_unset=True)
    update_query.pop("created_by", None)  # 작성자 보존
    await recipe.set(update_query)
    return recipe


@router.delete("/{id}")
async def delete_recipe(
    id: PydanticObjectId,
    current_user: User = Depends(get_current_user),
):
    recipe = await Recipe.get(id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    assert_owner_or_admin(recipe, current_user)
    await recipe.delete()
    return {"message": "Successfully deleted"}
