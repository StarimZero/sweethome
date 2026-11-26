"""우리집 유행어 (/api/buzzword). 녹음은 올릴 때 서버에서 작은 m4a 로 바꿔서 buzzword_audios 에 저장."""
import asyncio
from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from auth.security import get_current_user
from models.buzzword import Buzzword, BuzzwordAudio, BuzzwordAudioRef
from models.user import User
from routers.audio_convert import AudioError, convert_to_small_m4a

router = APIRouter(prefix="/api/buzzword", tags=["Buzzword"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024   # 바꾸기 전 원본 한도 (wav 1분 ≈ 10MB)
MAX_AUDIOS_PER_WORD = 10
STATUSES = {"ACTIVE", "SOMETIMES", "RETIRED"}
EDITABLE = ("phrase", "meaning", "origin_story", "example", "started_at", "started_by",
            "status", "retired_at", "comment_husband", "comment_wife")


def _clean(data: dict) -> dict:
    out = {k: (data.get(k) or "").strip() if isinstance(data.get(k), str) else data.get(k)
           for k in EDITABLE if k in data}
    if "status" in out and out["status"] not in STATUSES:
        out["status"] = "ACTIVE"
    if "phrase" in out and not out["phrase"]:
        raise HTTPException(status_code=400, detail="유행어를 입력해 주세요.")
    return out


async def _get(id: PydanticObjectId) -> Buzzword:
    word = await Buzzword.get(id)
    if not word:
        raise HTTPException(status_code=404, detail="유행어를 찾을 수 없어요.")
    return word


@router.get("", response_model=List[Buzzword])
async def list_buzzwords(q: Optional[str] = None, status: Optional[str] = None,
                         current_user: User = Depends(get_current_user)):
    query = {}
    if q:
        query["$or"] = [{f: {"$regex": q, "$options": "i"}} for f in ("phrase", "meaning", "origin_story", "example")]
    if status in STATUSES:
        query["status"] = status
    return await Buzzword.find(query).sort("-started_at", "-created_at").to_list()


@router.post("", response_model=Buzzword)
async def create_buzzword(body: dict, current_user: User = Depends(get_current_user)):
    data = _clean(body)
    if not data.get("phrase"):
        raise HTTPException(status_code=400, detail="유행어를 입력해 주세요.")
    if not data.get("started_at"):
        data["started_at"] = datetime.now().strftime("%Y-%m")  # 생긴 때를 모르면 오늘 기준
    word = Buzzword(**data, created_by=current_user.id)
    await word.insert()
    return word


@router.get("/{id}", response_model=Buzzword)
async def get_buzzword(id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    return await _get(id)


@router.put("/{id}", response_model=Buzzword)
async def update_buzzword(id: PydanticObjectId, body: dict, current_user: User = Depends(get_current_user)):
    word = await _get(id)
    data = _clean(body)
    data["updated_at"] = datetime.now()
    await word.set(data)
    return await _get(id)


@router.delete("/{id}")
async def delete_buzzword(id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    word = await _get(id)
    await BuzzwordAudio.find(BuzzwordAudio.buzzword_id == word.id).delete()
    await word.delete()
    return {"message": "Deleted"}


# ---------------------------------------------------------------
# 녹음
# ---------------------------------------------------------------

@router.post("/{id}/audio", response_model=Buzzword)
async def upload_audio(id: PydanticObjectId, file: UploadFile = File(...), label: str = Form(""),
                       current_user: User = Depends(get_current_user)):
    word = await _get(id)
    if len(word.audios) >= MAX_AUDIOS_PER_WORD:
        raise HTTPException(status_code=400, detail=f"녹음은 한 유행어에 {MAX_AUDIOS_PER_WORD}개까지 넣을 수 있어요.")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="파일이 너무 커요. 25MB 이하로 올려 주세요.")
    if not raw:
        raise HTTPException(status_code=400, detail="빈 파일이에요.")
    try:
        result = await asyncio.to_thread(convert_to_small_m4a, raw)
    except AudioError as e:
        raise HTTPException(status_code=400, detail=str(e))

    audio = BuzzwordAudio(buzzword_id=word.id, data=result["data"], mime_type=result["mime_type"],
                          size_bytes=result["size_bytes"], original_bytes=result["original_bytes"],
                          original_name=(file.filename or "")[:200], duration_sec=result["duration_sec"],
                          created_by=current_user.id)
    await audio.insert()
    ref = BuzzwordAudioRef(audio_id=audio.id, label=label.strip()[:40], duration_sec=result["duration_sec"],
                           size_bytes=result["size_bytes"], created_by=current_user.id)
    await word.update({"$push": {"audios": ref.model_dump()}, "$set": {"updated_at": datetime.now()}})
    return await _get(id)


@router.get("/audio/{audio_id}")
async def get_audio(audio_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    doc = await BuzzwordAudio.get_pymongo_collection().find_one({"_id": audio_id}, {"data": 1, "mime_type": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="녹음을 찾을 수 없어요.")
    return Response(content=bytes(doc["data"]), media_type=doc.get("mime_type") or "audio/mp4",
                    headers={"Cache-Control": "private, max-age=86400"})


@router.delete("/{id}/audio/{audio_id}", response_model=Buzzword)
async def delete_audio(id: PydanticObjectId, audio_id: PydanticObjectId,
                       current_user: User = Depends(get_current_user)):
    word = await _get(id)
    await BuzzwordAudio.find(BuzzwordAudio.id == audio_id, BuzzwordAudio.buzzword_id == word.id).delete()
    await word.update({"$pull": {"audios": {"audio_id": audio_id}}, "$set": {"updated_at": datetime.now()}})
    return await _get(id)
