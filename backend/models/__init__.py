# 각 파일에서 클래스를 가져와서 밖으로 노출시킵니다.
from .cooking import Recipe
from .review import Review
from .system.common_code import CommonCode 
from models.travel import Travel, Place

# Beanie 초기화할 때 쓸 리스트도 여기서 관리하면 편합니다.
__all_models__ = [Recipe, Review, CommonCode, Travel, Place]
