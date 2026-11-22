"""조회용 챗봇 (/api/ask).

Gemini 를 REST 로 직접 불러서(요청·응답 원문을 그대로 로그에 남기려고) 도구 호출 방식으로 답한다.
LLM 은 조회문을 직접 쓰지만, 서버가 검사(ask_tools.validate_query)한 뒤에만 실행한다.
질문 1건마다 AskLog 에 해석·이유·조회문·검사·결과·답변·원문 응답까지 남긴다 → 나중에 Claude 와 같이 분석·개선.
"""
import asyncio
import json
import os
import re
import subprocess
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import requests
from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.security import get_current_user
from models.ask import AskLog
from models.buypedia import BuypediaRecord
from models.system.common_code import CommonCode
from models.user import User
from routers import ask_tools
from routers.buypedia import _group_by_product, apply_price_scores, rank_sort_key, summarize_product

router = APIRouter(prefix="/api/ask", tags=["Ask"])

PROMPT_VERSION = "ask-v2"  # v2: 이름 호명 강화, 순위 공동 표시, find 에 _id 항상 포함
MODEL = os.getenv("ASK_MODEL", "gemini-3.5-flash-lite")
GENERATION_CONFIG = {"temperature": 0.1, "maxOutputTokens": 1024}
MAX_STEPS = 5           # 모델 호출 최대 횟수 (도구 호출 반복 포함)
HISTORY_TURNS = 6       # 함께 보낼 앞 대화 수
KST = timezone(timedelta(hours=9))

# 답변에서 부를 이름 (2026-11-22 사용자 지정). 남편 = 호랭이, 아내 = 보구치
CALL_NAMES = {"younghun91": "호랭이", "joyi96": "보구치"}
HUSBAND_NAME, WIFE_NAME = "호랭이", "보구치"


def utc_now() -> datetime:
    """로그 시각은 항상 UTC 로 저장 (Render 는 UTC, 이 PC 는 한국 시간이라 섞이지 않게). 화면에서 한국 시간으로 바꿔 보여줌."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds") + "Z"


def _app_version() -> str:
    if os.getenv("RENDER_GIT_COMMIT"):
        return os.getenv("RENDER_GIT_COMMIT")[:7]
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True,
                              timeout=3, cwd=os.path.dirname(__file__)).stdout.strip() or "unknown"
    except Exception:
        return "unknown"


APP_VERSION = _app_version()


def call_name_of(user: User) -> str:
    if user.username in CALL_NAMES:
        return CALL_NAMES[user.username]
    if getattr(user, "role", "") == "admin" and not user.nickname:
        return "관리자"
    return user.nickname or user.username


# ---------------------------------------------------------------
# 시스템 프롬프트 (스키마 설명 + 규칙). 통째로 로그에 남김
# ---------------------------------------------------------------

async def _code_table(group: str) -> str:
    codes = await CommonCode.find(CommonCode.group_code == group).sort("+sort_order").to_list()
    return ", ".join(f"{c.code_id}={c.code_name}" for c in codes) or "(없음)"


async def build_system_prompt(call_name: str, page: str, today: str) -> str:
    food, sul, wine, bp_cat, bp_buy = await asyncio.gather(
        _code_table("FOOD"), _code_table("SUL"), _code_table("WINE_C"),
        _code_table("BUYPEDIA_CAT"), _code_table("BUYPEDIA_BUY"))
    return f"""너는 부부가 함께 쓰는 생활 기록 사이트 '호랭이연고'의 조회 도우미야.
지금 질문한 사람은 {call_name}님이야. 답할 때 "{call_name}님"이라고 불러.
이 집의 남편은 {HUSBAND_NAME}님, 아내는 {WIFE_NAME}님이야.
답변에서 '남편', '아내'라는 말은 쓰지 말고 반드시 {HUSBAND_NAME}님, {WIFE_NAME}님이라고 불러. (husband_* 칸 = {HUSBAND_NAME}님, wife_* 칸 = {WIFE_NAME}님)
오늘 날짜는 {today}(한국 시간)이야. '올해', '이번 달', '요즘' 같은 말은 이 날짜 기준으로 해석해.
질문한 화면: {page or '알 수 없음'} (이 화면의 메뉴를 먼저 생각하되, 질문이 다른 메뉴 얘기면 그 메뉴를 조회해)

[규칙]
1. 사실은 반드시 도구로 조회해서 답해. 기억이나 추측으로 숫자·이름을 만들지 마.
2. 답에 쓰는 숫자는 조회 결과에 있는 값만 써. 계산이 필요하면 집계(aggregate)로 서버에서 계산해.
3. 도구를 부를 때 reason(왜 이렇게 조회하는지), assumptions(애매한 말을 어떻게 정했는지), interpretation(대상·기간·셀 것·정렬)을 꼭 채워.
   예: '많이 산' → 주문 횟수로 셈, '요즘' → 최근 3개월.
4. 연결된 메뉴는 Buypedia(구매 기록), 맛집 리뷰, 주류 세 가지야. 다른 메뉴(여행, 소곤소곤, 캘린더 등)나 없는 데이터를 물으면 unsupported_request 를 부르고, 아직 볼 수 없다고 답해.
5. 결과가 없으면 없다고 솔직히 말해.
6. 답은 자연스러운 한국어 존댓말(~해요)로 2~5문장. 목록이 필요하면 상위 몇 개만. 줄표(—)나 번역투는 쓰지 마.
7. Buypedia 에서 '1위', '제일 괜찮은', '뭘 사야' 같은 순위 질문은 buypedia_ranking 을 써. 이 사이트의 종합 점수 공식이 들어 있어.
   순위 결과에 '공동순위'가 같으면 우열이 없는 거야. 그럴 땐 한 제품을 1위라고 하지 말고 아직 차이가 없다고 말해 (보통 별점이 없어서 그래).

[컬렉션 설명]
1) buypedia_records: 산 제품 기록. 1건 = 한 번 산 것 (쿠팡 주문 대부분)
   - category: 카테고리 코드 ({bp_cat})
   - item_type: 품목 (예: 생수, 만두, 대파). 서로 바꿔 살 수 있는 것끼리 같은 품목
   - brand, product_name: 브랜드, 제품명 / coupang_name: 쿠팡 원래 상품명(옵션 포함)
   - purchase_type: 구매 방식 코드 ({bp_buy}) / purchase_place: 구매처(쿠팡, 지점명 등)
   - purchase_date: 구매일 문자열 'YYYY-MM-DD' / price: 1개 가격(원, 쿠폰 할인 제외)
   - amount, unit: 용량 (unit 은 g, ml, 개)
   - rating_husband, rating_wife: 별점 0~5, 없으면 null(아직 안 매김) / comment_husband, comment_wife: 한줄평
   - rebuy_husband, rebuy_wife: 재구매 의사 YES(또 산다)/SOSO(보통)/NO(안 산다)
   - 같은 제품 = 같은 category + brand + product_name. '몇 번 샀나'는 기록 수(주문 단위)로 세.
2) reviews: 맛집 리뷰. 1건 = 식당 방문 1번
   - restaurant_name: 식당 이름 / location: 위치(예: 망포, 홍대) / category: 음식 종류 코드 ({food})
   - visit_date: 방문일 'YYYY-MM-DD' / husband_rating, wife_rating: 별점(소수점 가능)
   - husbandcomment, wifecomment: 한줄평 / naver_url: 네이버 지도 링크
3) liquor_reviews: 주류 리뷰. 1건 = 술 1병
   - name: 술 이름 / category: 종류 코드 ({sul}) / wine_type: 와인 나라 코드 ({wine})
   - purchase_place: 구매처 / price: 가격(원) / visit_date: 구매·시음일 'YYYY-MM-DD'
   - pairing_foods: 함께 먹은 음식 목록 / rating_husband, rating_wife: 별점 / rating: 둘의 평균
   - comment_husband, comment_wife: 한줄평 / ai_note: AI 소믈리에 분석 (description, taste, aroma, variety, pairing)

[조회 도구 사용법]
- query_records: collection, operation(find/count/aggregate)과 JSON 문자열(filter_json, pipeline_json, projection_json, sort_json)을 넘겨.
  허용 연산자는 조회·집계용($match, $group, $sort, $sum, $avg, $regex 등)뿐이고, 결과는 최대 50건이야.
  문자열 부분 검색은 {{"brand": {{"$regex": "비비고", "$options": "i"}}}} 처럼.
- buypedia_ranking: 품목(item_type)이나 카테고리 이름으로 이 사이트의 순위를 그대로 받아.
- unsupported_request: 볼 수 없는 데이터를 물었을 때.
"""


# ---------------------------------------------------------------
# 도구 정의 (Gemini function declarations)
# ---------------------------------------------------------------

_REASON_PROPS = {
    "reason": {"type": "STRING", "description": "이 조회를 왜 이렇게 만들었는지 한두 문장"},
    "assumptions": {"type": "ARRAY", "items": {"type": "STRING"},
                    "description": "질문의 애매한 말을 어떻게 정했는지. 예: '많이 산 → 주문 횟수로 셈'"},
    "interpretation": {"type": "OBJECT", "description": "질문 해석", "properties": {
        "menu": {"type": "STRING", "description": "어느 메뉴"},
        "period": {"type": "STRING", "description": "기간 (예: 2026-01-01 이후, 전체)"},
        "measure": {"type": "STRING", "description": "무엇을 세거나 볼지"},
        "order": {"type": "STRING", "description": "정렬 기준"},
    }},
}

TOOLS = [{"functionDeclarations": [
    {
        "name": "query_records",
        "description": "Buypedia·맛집 리뷰·주류 기록을 MongoDB 조회문으로 읽는다 (읽기 전용, 최대 50건).",
        "parameters": {"type": "OBJECT", "properties": {
            "collection": {"type": "STRING", "enum": list(ask_tools.ALLOWED_COLLECTIONS)},
            "operation": {"type": "STRING", "enum": ["find", "count", "aggregate"]},
            "filter_json": {"type": "STRING", "description": "find/count 조건 (JSON 객체 문자열)"},
            "pipeline_json": {"type": "STRING", "description": "aggregate 단계 (JSON 배열 문자열)"},
            "projection_json": {"type": "STRING", "description": "find 에서 가져올 칸 (JSON 객체 문자열)"},
            "sort_json": {"type": "STRING", "description": "find 정렬 (JSON 객체 문자열, 예: {\"price\": -1})"},
            "limit": {"type": "INTEGER", "description": "find 최대 개수 (최대 50)"},
            **_REASON_PROPS,
        }, "required": ["collection", "operation", "reason"]},
    },
    {
        "name": "buypedia_ranking",
        "description": "Buypedia 순위(이 사이트의 종합 점수 = 별점 × 구매 배수 × 가격 배수)를 품목이나 카테고리로 받는다.",
        "parameters": {"type": "OBJECT", "properties": {
            "item_type": {"type": "STRING", "description": "품목 (예: 생수, 만두). 부분 일치"},
            "category_name": {"type": "STRING", "description": "카테고리 이름 (예: 채소, 과자)"},
            **_REASON_PROPS,
        }, "required": ["reason"]},
    },
    {
        "name": "unsupported_request",
        "description": "연결되지 않은 메뉴나 없는 데이터를 물었을 때 부른다.",
        "parameters": {"type": "OBJECT", "properties": {
            "topic": {"type": "STRING", "description": "무엇을 물었는지 (예: 여행 기록)"},
            "reason": {"type": "STRING", "description": "왜 답할 수 없는지"},
        }, "required": ["topic", "reason"]},
    },
]}]


# ---------------------------------------------------------------
# 도구 실행
# ---------------------------------------------------------------

async def _db():
    return BuypediaRecord.get_pymongo_collection().database


async def _run_ranking(args: Dict[str, Any]) -> Dict[str, Any]:
    started = time.perf_counter()
    records = await BuypediaRecord.find_all().to_list()
    products = [summarize_product(rs) for rs in _group_by_product(records).values()]
    codes = await CommonCode.find(CommonCode.group_code == "BUYPEDIA_CAT").to_list()
    names = {c.code_id: c.code_name for c in codes}
    apply_price_scores(products, names)
    item = (args.get("item_type") or "").strip()
    cat = (args.get("category_name") or "").strip()
    picked = [p for p in products
              if (not item or item in (p.get("item_type") or ""))
              and (not cat or cat in names.get(p["category"], ""))]
    picked.sort(key=rank_sort_key)
    ranks = []  # 종합 점수와 구매 횟수가 같으면 공동 순위
    for i, p in enumerate(picked):
        same = i > 0 and p["score"] == picked[i - 1]["score"] and p["count"] == picked[i - 1]["count"]
        ranks.append(ranks[-1] if same else i + 1)
    rows = [{
        "순위": i + 1, "공동순위": ranks[i], "품목": p.get("item_type"), "카테고리": names.get(p["category"], p["category"]),
        "브랜드": p["brand"], "제품명": p["product_name"], "종합점수": p["score"], "구매횟수": p["count"],
        "평균별점": p["avg"], f"{HUSBAND_NAME}_별점": p["avg_husband"], f"{WIFE_NAME}_별점": p["avg_wife"],
        "단가": p.get("unit_price"), "단가기준": p.get("unit_basis"), "가격중요도": p.get("price_priority"),
        "안살것": p["blacklisted"], "최근구매일": p["last_date"],
    } for i, p in enumerate(picked[:ask_tools.MAX_ROWS])]
    return {"rows": rows, "result_count": len(rows), "result_truncated": len(picked) > ask_tools.MAX_ROWS,
            "data_gaps": {}, "duration_ms": int((time.perf_counter() - started) * 1000)}


async def execute_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """도구 1번 실행. 로그에 그대로 들어갈 기록을 돌려준다."""
    entry: Dict[str, Any] = {"name": name, "args": args}
    try:
        if name == "query_records":
            ok, errors, normalized = ask_tools.validate_query(args)
            entry["validation"] = {"ok": ok, "errors": errors}
            entry["executed"] = normalized if ok else None
            if not ok:
                entry["response"] = {"error": "조회가 거부됐어요: " + "; ".join(errors)}
                return entry
            result = await ask_tools.run_query(await _db(), normalized)
        elif name == "buypedia_ranking":
            entry["validation"] = {"ok": True, "errors": []}
            result = await _run_ranking(args)
        elif name == "unsupported_request":
            entry["validation"] = {"ok": True, "errors": []}
            entry["response"] = {"ok": True, "message": "기록했어요. 사용자에게 아직 볼 수 없다고 안내하세요."}
            return entry
        else:
            entry["validation"] = {"ok": False, "errors": [f"모르는 도구 {name}"]}
            entry["response"] = {"error": f"모르는 도구 {name}"}
            return entry
        entry.update({k: result[k] for k in ("result_count", "result_truncated", "data_gaps", "duration_ms")})
        entry["result_rows"] = result["rows"]
        entry["response"] = {"rows": result["rows"], "result_count": result["result_count"],
                             "result_truncated": result["result_truncated"],
                             "이름_안내": f"husband = {HUSBAND_NAME}님, wife = {WIFE_NAME}님 (답변엔 이 이름으로)"}
    except Exception as e:  # 실행 오류도 그대로 남김
        entry["error"] = f"{type(e).__name__}: {e}"
        entry["response"] = {"error": f"조회 중 오류: {e}"}
    return entry


# ---------------------------------------------------------------
# Gemini 호출 (REST)
# ---------------------------------------------------------------

class QuotaExceeded(Exception):
    pass


class BillingProblem(Exception):
    """402: 프로젝트가 선불 결제인데 크레딧이 떨어짐 등 결제 문제."""


def _gemini(contents: List[dict], system_prompt: str) -> Dict[str, Any]:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY 가 설정되지 않았어요.")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    body = {"systemInstruction": {"parts": [{"text": system_prompt}]}, "contents": contents,
            "tools": TOOLS, "generationConfig": GENERATION_CONFIG}
    started = time.perf_counter()
    res = requests.post(url, params={"key": key}, json=body, timeout=60)
    duration = int((time.perf_counter() - started) * 1000)
    data = res.json() if res.headers.get("content-type", "").startswith("application/json") else {"raw": res.text[:2000]}
    if res.status_code == 429:
        raise QuotaExceeded(json.dumps(data, ensure_ascii=False)[:1000])
    if res.status_code == 402:
        raise BillingProblem(json.dumps(data, ensure_ascii=False)[:1000])
    return {"status": res.status_code, "data": data, "duration_ms": duration}


# ---------------------------------------------------------------
# 답변 점검
# ---------------------------------------------------------------

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def check_numbers(answer: str, steps: List[dict]):
    """답변에 나온 숫자가 조회 결과에 실제로 있는지. 날짜·순서 표현 같은 작은 수(0~10)는 건너뜀."""
    haystack = json.dumps([[tc.get("result_rows"), tc.get("result_count")]
                           for s in steps for tc in s.get("tool_calls", [])], ensure_ascii=False)  # 건수도 근거로 인정
    hay_nums = {n.replace(",", "") for n in _NUM.findall(haystack)}
    found, unverified = [], []
    for raw in _NUM.findall(answer):
        n = raw.replace(",", "")
        found.append(raw)
        try:
            if float(n) <= 10:
                continue
        except ValueError:
            continue
        if n not in hay_nums and n.rstrip("0").rstrip(".") not in hay_nums:
            unverified.append(raw)
    return found, unverified


UNKNOWN_HINTS = ("모르", "찾지 못", "찾을 수 없", "없어요", "볼 수 없", "아직 연결")

# 모델이 '남편/아내'라고 해도 이름으로 바꿔 부름 (가벼운 모델이 규칙을 자주 놓침). 긴 표현부터
NAME_FIXES = [
    ("남편분", f"{HUSBAND_NAME}님"), ("아내분", f"{WIFE_NAME}님"),
    ("남편님", f"{HUSBAND_NAME}님"), ("아내님", f"{WIFE_NAME}님"),
    ("남편", f"{HUSBAND_NAME}님"), ("아내", f"{WIFE_NAME}님"),
]


def fix_names(text: str):
    fixes = []
    for old, new in NAME_FIXES:
        if old in text:
            fixes.append(f"{old}→{new}")
            text = text.replace(old, new)
    return text, fixes


# ---------------------------------------------------------------
# API
# ---------------------------------------------------------------

class AskIn(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    page: Optional[str] = ""


@router.post("")
async def ask(body: AskIn, current_user: User = Depends(get_current_user)):
    question = (body.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="질문을 입력해 주세요.")
    started = time.perf_counter()
    now = datetime.now(KST)
    call_name = call_name_of(current_user)
    conversation_id = body.conversation_id or uuid.uuid4().hex

    # 같은 대화의 앞 질문들 (내 것만)
    previous = await AskLog.find(AskLog.conversation_id == conversation_id,
                                 AskLog.user_id == current_user.id).sort("-created_at").to_list()
    history = [{"question": p.question, "answer": p.answer} for p in reversed(previous[:HISTORY_TURNS])]
    if previous:  # 앞 질문에 '다음 질문까지 걸린 시간' 기록 (바로 다시 물었는지 분석용)
        prev = previous[0]
        prev.next_question_after_ms = int((utc_now() - prev.created_at).total_seconds() * 1000)
        await prev.save()

    system_prompt = await build_system_prompt(call_name, body.page or "", now.strftime("%Y-%m-%d"))
    contents: List[dict] = []
    for h in history:
        contents.append({"role": "user", "parts": [{"text": h["question"]}]})
        contents.append({"role": "model", "parts": [{"text": h["answer"]}]})
    contents.append({"role": "user", "parts": [{"text": question}]})

    log = AskLog(
        user_id=current_user.id, username=current_user.username, call_name=call_name,
        conversation_id=conversation_id, turn_index=len(previous),
        previous_log_id=previous[0].id if previous else None, page=body.page or "", question=question,
        app_version=APP_VERSION, prompt_version=PROMPT_VERSION, model=MODEL, generation_config=GENERATION_CONFIG,
        system_prompt=system_prompt, history_sent=history, today=now.strftime("%Y-%m-%d"),
        created_at=utc_now(),
    )

    answer, total_tokens = "", 0
    try:
        for index in range(MAX_STEPS):
            step: Dict[str, Any] = {"index": index, "request_contents": json.loads(json.dumps(contents, ensure_ascii=False))}
            resp = await asyncio.to_thread(_gemini, contents, system_prompt)
            data = resp["data"]
            step.update({"http_status": resp["status"], "raw_response": data, "duration_ms": resp["duration_ms"],
                         "usage": data.get("usageMetadata", {})})
            total_tokens += (data.get("usageMetadata") or {}).get("totalTokenCount", 0)
            if resp["status"] != 200:
                step["error"] = json.dumps(data, ensure_ascii=False)[:1000]
                log.steps.append(step)
                raise RuntimeError(f"Gemini 오류 {resp['status']}")

            candidate = (data.get("candidates") or [{}])[0]
            model_content = candidate.get("content") or {"role": "model", "parts": []}
            parts = model_content.get("parts", [])
            calls = [p["functionCall"] for p in parts if "functionCall" in p]
            step["text"] = "".join(p.get("text", "") for p in parts if not p.get("thought"))
            step["finish_reason"] = candidate.get("finishReason")

            if not calls:
                answer = step["text"].strip()
                log.steps.append(step)
                break

            # 도구 실행 → 결과를 다시 모델에게 (모델 응답은 서명까지 그대로 돌려줘야 함)
            step["tool_calls"] = []
            response_parts = []
            for call in calls:
                entry = await execute_tool(call.get("name"), call.get("args") or {})
                step["tool_calls"].append(entry)
                if entry["name"] == "unsupported_request":
                    log.unsupported.append({"topic": entry["args"].get("topic"), "reason": entry["args"].get("reason")})
                response_parts.append({"functionResponse": {"name": call.get("name"), "response": entry["response"]}})
            log.steps.append(step)
            contents.append({"role": "model", "parts": parts})
            contents.append({"role": "user", "parts": response_parts})
        else:
            answer = "질문이 복잡해서 정리하지 못했어요. 조금 더 짧게 물어봐 주세요."
            log.error = "MAX_STEPS 초과"
    except QuotaExceeded as e:
        log.quota_exceeded = True
        log.error = f"quota: {e}"
        answer = f"{call_name}님, 오늘 질문 한도를 다 썼어요. 내일 다시 물어봐 주세요."
    except BillingProblem as e:
        log.quota_exceeded = True
        log.error = f"billing: {e}"
        answer = f"{call_name}님, 지금은 AI 사용 크레딧이 없어서 답할 수 없어요. Google AI Studio 결제 상태를 확인해 주세요."
    except Exception as e:
        log.error = log.error or f"{type(e).__name__}: {e}"
        answer = answer or "답을 만들다가 문제가 생겼어요. 잠시 뒤에 다시 물어봐 주세요."

    # 답변 점검과 '본 기록'
    log.answer_raw = answer
    answer, log.answer_fixes = fix_names(answer)
    log.answer = answer
    log.numbers_in_answer, log.numbers_unverified = check_numbers(answer, log.steps)
    log.said_unknown = bool(log.unsupported) or any(h in answer for h in UNKNOWN_HINTS)
    sources, seen = [], set()
    for s in log.steps:
        for tc in s.get("tool_calls", []):
            col = (tc.get("executed") or {}).get("collection")
            for src in ask_tools.sources_from_rows(col, tc.get("result_rows") or [], limit=20):
                key = (src["collection"], src["label"])  # 같은 제품을 여러 번 산 기록은 하나만
                if key not in seen:
                    seen.add(key); sources.append(src)
    log.sources = sources[:6]
    log.total_duration_ms = int((time.perf_counter() - started) * 1000)
    log.total_tokens = total_tokens
    await log.insert()

    looked = []
    for s in log.steps:
        for tc in s.get("tool_calls", []):
            if tc["name"] == "unsupported_request":
                continue
            menu = ask_tools.ALLOWED_COLLECTIONS.get((tc.get("executed") or {}).get("collection"), {}).get("menu") \
                or ("Buypedia 순위" if tc["name"] == "buypedia_ranking" else None)
            if menu and tc.get("result_count") is not None:
                looked.append(f"{menu} {tc['result_count']}건")
    return {"answer": answer, "conversation_id": conversation_id, "log_id": str(log.id),
            "sources": log.sources, "looked": looked, "call_name": call_name, "tokens": total_tokens}


@router.get("/usage")
async def usage(current_user: User = Depends(get_current_user)):
    """내가 쓴 토큰: 오늘 / 이번 달 / 전체 (한국 시간 기준 날짜, 아이디별)."""
    now_kst = datetime.now(KST)
    day_start = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = day_start.replace(day=1)

    async def total(since=None):
        match = {"user_id": current_user.id}
        if since is not None:
            match["created_at"] = {"$gte": since.astimezone(timezone.utc).replace(tzinfo=None)}
        rows = await AskLog.get_pymongo_collection().aggregate([
            {"$match": match}, {"$group": {"_id": None, "tokens": {"$sum": "$total_tokens"}, "questions": {"$sum": 1}}},
        ]).to_list(None)
        return rows[0] if rows else {"tokens": 0, "questions": 0}

    today, month, all_time = await asyncio.gather(total(day_start), total(month_start), total())
    out = {k: {"tokens": v["tokens"], "questions": v["questions"]}
           for k, v in (("today", today), ("month", month), ("total", all_time))}
    out["call_name"] = call_name_of(current_user)
    return out


@router.get("/history")
async def history(limit: int = 100, current_user: User = Depends(get_current_user)):
    """내 질문 기록 (아이디별)."""
    logs = await AskLog.find(AskLog.user_id == current_user.id).sort("-created_at").limit(min(limit, 300)).to_list()
    return [{"id": str(l.id), "conversation_id": l.conversation_id, "question": l.question, "answer": l.answer,
             "page": l.page, "sources": l.sources, "tokens": l.total_tokens, "created_at": utc_iso(l.created_at)}
            for l in logs]


class ClickIn(BaseModel):
    label: str = ""
    path: str = ""


@router.post("/{log_id}/click")
async def source_click(log_id: PydanticObjectId, body: ClickIn, current_user: User = Depends(get_current_user)):
    """답변 아래 '본 기록'을 눌렀다는 신호 (쓸모 있는 답이었는지 분석용)."""
    log = await AskLog.get(log_id)
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    log.source_clicks.append({"label": body.label, "path": body.path, "at": utc_iso(utc_now())})
    await log.save()
    return {"ok": True}
