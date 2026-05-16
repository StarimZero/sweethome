from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId
from beanie.operators import RegEx
from fastapi import APIRouter, Depends, HTTPException

from models.user import User, UserCreate, UserUpdate, PasswordReset
from auth.security import get_current_admin, get_current_user, get_password_hash


router = APIRouter(
    prefix="/api/users",
    tags=["Users"],
)


def to_view(u: User) -> dict:
    return {
        "_id": str(u.id),
        "username": u.username,
        "nickname": getattr(u, "nickname", "") or "",
        "role": getattr(u, "role", "member"),
        "is_active": getattr(u, "is_active", True),
        "created_at": getattr(u, "created_at", None),
    }


@router.get("")
async def get_users(
    q: Optional[str] = None,
    role: Optional[str] = None,
    _user: User = Depends(get_current_user),  # 닉네임 매핑용 - 인증된 사용자 누구나 조회 가능
):
    expressions = []
    if q:
        expressions.append(
            RegEx(User.username, q, "i")
        )
    if role and role != "all":
        expressions.append(User.role == role)

    if expressions:
        users = await User.find(*expressions).to_list()
    else:
        users = await User.find_all().to_list()

    # nickname 검색은 클라이언트단에서 가능하지만, 간단히 username 검색만 서버에서.
    # (현재 사용자 수가 적어 추가 인덱싱 불필요)
    if q:
        ql = q.lower()
        users = [u for u in users if ql in u.username.lower() or ql in (getattr(u, "nickname", "") or "").lower()]

    return [to_view(u) for u in users]


@router.post("")
async def create_user(
    payload: UserCreate,
    _admin: User = Depends(get_current_admin),
):
    if not payload.username.strip():
        raise HTTPException(status_code=400, detail="username은 필수입니다.")
    if len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")
    if payload.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="role은 admin 또는 member여야 합니다.")

    exists = await User.find_one(User.username == payload.username)
    if exists:
        raise HTTPException(status_code=400, detail="이미 존재하는 username입니다.")

    user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        nickname=payload.nickname or "",
        role=payload.role,
        is_active=True,
        created_at=datetime.now(),
    )
    await user.insert()
    return to_view(user)


@router.get("/{id}")
async def get_user(id: PydanticObjectId, _admin: User = Depends(get_current_admin)):
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return to_view(user)


@router.put("/{id}")
async def update_user(
    id: PydanticObjectId,
    payload: UserUpdate,
    admin: User = Depends(get_current_admin),
):
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    # 본인의 admin 권한을 스스로 박탈하지 못하게 (마지막 admin 보호)
    if (
        str(user.id) == str(admin.id)
        and payload.role is not None
        and payload.role != "admin"
    ):
        raise HTTPException(status_code=400, detail="본인의 admin 권한은 스스로 해제할 수 없습니다.")

    update_data = {}
    if payload.nickname is not None:
        update_data["nickname"] = payload.nickname
    if payload.role is not None:
        if payload.role not in ("admin", "member"):
            raise HTTPException(status_code=400, detail="role은 admin 또는 member여야 합니다.")
        update_data["role"] = payload.role
    if payload.is_active is not None:
        # 본인 비활성화 방지
        if str(user.id) == str(admin.id) and payload.is_active is False:
            raise HTTPException(status_code=400, detail="본인 계정은 비활성화할 수 없습니다.")
        update_data["is_active"] = payload.is_active

    if update_data:
        await user.set(update_data)
    return to_view(user)


@router.post("/{id}/password")
async def reset_password(
    id: PydanticObjectId,
    payload: PasswordReset,
    _admin: User = Depends(get_current_admin),
):
    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    await user.set({"password_hash": get_password_hash(payload.new_password)})
    return {"message": "비밀번호가 재설정되었습니다."}


@router.delete("/{id}")
async def delete_user(
    id: PydanticObjectId,
    admin: User = Depends(get_current_admin),
):
    if str(id) == str(admin.id):
        raise HTTPException(status_code=400, detail="본인 계정은 삭제할 수 없습니다.")
    user = await User.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    await user.delete()
    return {"message": "삭제되었습니다."}
