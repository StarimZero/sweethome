"""조회용 챗봇의 도구: LLM이 만든 MongoDB 조회문을 검사하고(읽기 전용, 허용 컬렉션, 개수 제한) 실행한다.
검사·실행 결과는 그대로 로그에 남겨서 나중에 '왜 그렇게 조회했나'를 분석할 수 있게 한다."""
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Tuple

from bson import ObjectId

# 챗봇에 연결한 메뉴. users(비밀번호 해시) 등은 절대 넣지 않는다. 일기·캘린더·가계도는 아직 연결 안 함
ALLOWED_COLLECTIONS = {
    "buypedia_records": {"label_fields": ("brand", "product_name"), "path": "/buypedia/{id}", "menu": "Buypedia"},
    "reviews": {"label_fields": ("restaurant_name",), "path": "/review/{id}", "menu": "맛집 리뷰"},
    "liquor_reviews": {"label_fields": ("name",), "path": "/liquor/{id}", "menu": "주류"},
    "culture_reviews": {"label_fields": ("title",), "path": "/culture/{id}", "menu": "문화생활"},
    "knitting_records": {"label_fields": ("name",), "path": "/knitting/{id}", "menu": "뜨개록"},
    "recipes": {"label_fields": ("name",), "path": "/cooking/{id}", "menu": "요리"},
    "travels": {"label_fields": ("title",), "path": "/travel/{id}", "menu": "여행"},
    "bucketlist": {"label_fields": ("title",), "path": "/bucket/{id}", "menu": "버킷리스트"},
}

MAX_ROWS = 50
MAX_TIME_MS = 3000

# 허용하는 $연산자 (조회·집계 계산용만). 쓰기·서버 실행·다른 컬렉션 접근($lookup, $out, $where 등)은 없음
ALLOWED_OPERATORS = {
    # 조건
    "$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$and", "$or", "$not", "$nor",
    "$exists", "$regex", "$options", "$elemMatch", "$size", "$type", "$all",
    # 집계 단계
    "$match", "$group", "$sort", "$limit", "$skip", "$project", "$count", "$unwind", "$addFields",
    "$set", "$sortByCount", "$bucket",
    # 집계 계산
    "$sum", "$avg", "$min", "$max", "$first", "$last", "$push", "$addToSet", "$count",
    "$add", "$subtract", "$multiply", "$divide", "$round", "$abs", "$ifNull", "$cond", "$switch",
    "$concat", "$substr", "$substrCP", "$toLower", "$toUpper", "$split", "$strLenCP", "$trim",
    "$toInt", "$toDouble", "$toString", "$arrayElemAt", "$filter", "$map", "$reduce", "$in",
    "$year", "$month", "$dayOfMonth", "$dateFromString", "$dateToString", "$literal",
    "$regexMatch", "$indexOfCP", "$let", "$mergeObjects", "$isArray", "$setUnion", "$size",
    "$cmp", "$and", "$or", "$not",
    # $group 등에 쓰는 특수 키
    "$$ROOT", "$$CURRENT",
}


def _check_operators(node: Any, path: str, errors: List[str]):
    if isinstance(node, dict):
        for key, value in node.items():
            if key.startswith("$") and key not in ALLOWED_OPERATORS:
                errors.append(f"허용하지 않는 연산자 {key} (위치: {path or '최상위'})")
            _check_operators(value, f"{path}.{key}" if path else key, errors)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            _check_operators(item, f"{path}[{i}]", errors)


def _parse_json(text: Any, kind: str, errors: List[str]):
    if text in (None, ""):
        return None
    if not isinstance(text, str):
        return text
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        errors.append(f"{kind} JSON 해석 실패: {e}")
        return None


def validate_query(args: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
    """LLM이 넘긴 조회 인자를 검사하고, 실제로 실행할 형태(normalized)를 돌려준다."""
    errors: List[str] = []
    collection = args.get("collection")
    operation = args.get("operation")
    if collection not in ALLOWED_COLLECTIONS:
        errors.append(f"허용되지 않은 컬렉션: {collection}")
    if operation not in ("find", "count", "aggregate"):
        errors.append(f"허용되지 않은 동작: {operation} (find / count / aggregate 만 가능)")
    if not (args.get("reason") or "").strip():
        errors.append("reason(이 조회를 이렇게 만든 이유)이 비어 있음")

    flt = _parse_json(args.get("filter_json"), "filter_json", errors) or {}
    pipeline = _parse_json(args.get("pipeline_json"), "pipeline_json", errors)
    projection = _parse_json(args.get("projection_json"), "projection_json", errors)
    sort = _parse_json(args.get("sort_json"), "sort_json", errors)

    if not isinstance(flt, dict):
        errors.append("filter_json 은 객체여야 함")
    if operation == "aggregate" and not isinstance(pipeline, list):
        errors.append("aggregate 에는 pipeline_json(배열)이 필요함")
    for part in (flt, pipeline, projection, sort):
        if part:
            _check_operators(part, "", errors)

    limit = args.get("limit") or MAX_ROWS
    try:
        limit = max(1, min(int(limit), MAX_ROWS))
    except (TypeError, ValueError):
        limit = MAX_ROWS

    normalized = {"collection": collection, "operation": operation}
    if operation == "aggregate" and isinstance(pipeline, list):
        normalized["pipeline"] = pipeline + [{"$limit": MAX_ROWS}]  # 마지막에 항상 개수 제한
    else:
        normalized["filter"] = flt if isinstance(flt, dict) else {}
        if operation == "find":
            if isinstance(projection, dict):
                # _id 는 항상 가져옴: 답변 아래 '본 기록' 링크와 로그 추적에 필요
                projection = {k: v for k, v in projection.items() if k != "_id"} or None
            normalized["projection"] = projection if isinstance(projection, dict) else None
            normalized["sort"] = sort if isinstance(sort, dict) else None
            normalized["limit"] = limit
    return not errors, errors, normalized


def to_jsonable(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    return value


def _data_gaps(rows: List[dict]) -> Dict[str, int]:
    """결과에서 비어 있는 값이 많은 칸 (예: 가격 없음) — 챗봇이 아니라 데이터를 고쳐야 할 신호."""
    gaps: Dict[str, int] = {}
    for row in rows:
        for key, value in row.items():
            if value in (None, "", []):
                gaps[key] = gaps.get(key, 0) + 1
    return {k: v for k, v in gaps.items() if v}


def _filter_fields(node: Any, out: set):
    """조건에 쓴 칸 이름 (점 경로의 첫 칸). $and/$or 안쪽까지."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key.startswith("$"):
                _filter_fields(value, out)
            else:
                out.add(key.split(".")[0])
    elif isinstance(node, list):
        for item in node:
            _filter_fields(item, out)


async def missing_fields(db, normalized: Dict[str, Any]) -> List[str]:
    """조건에 쓴 칸 중 이 컬렉션 어느 기록에도 없는 칸. 메뉴마다 칸 이름이 달라서
    (예: comment_wife / wife_comment / wifecomment) LLM 이 헷갈리면 결과가 0건이 되는데, 그걸 잡아낸다."""
    fields: set = set()
    if normalized.get("operation") == "aggregate":
        for stage in normalized.get("pipeline") or []:
            if isinstance(stage, dict) and "$match" in stage:
                _filter_fields(stage["$match"], fields)
    else:
        _filter_fields(normalized.get("filter") or {}, fields)
    col = db[normalized["collection"]]
    missing = []
    for f in sorted(fields - {"_id"}):
        if not await col.find_one({f: {"$exists": True}}, {"_id": 1}, max_time_ms=MAX_TIME_MS):
            missing.append(f)
    return missing


async def run_query(db, normalized: Dict[str, Any]) -> Dict[str, Any]:
    """검사를 통과한 조회를 실행. 결과 행은 JSON 으로 바꿔서 돌려준다."""
    started = time.perf_counter()
    col = db[normalized["collection"]]
    op = normalized["operation"]
    if op == "count":
        count = await col.count_documents(normalized["filter"], maxTimeMS=MAX_TIME_MS)
        rows, truncated = [{"count": count}], False
    elif op == "find":
        cursor = col.find(normalized["filter"], normalized.get("projection"), max_time_ms=MAX_TIME_MS)
        if normalized.get("sort"):
            cursor = cursor.sort(list(normalized["sort"].items()))
        raw = await cursor.limit(normalized["limit"] + 1).to_list(None)
        truncated = len(raw) > normalized["limit"]
        rows = raw[:normalized["limit"]]
    else:
        raw = await col.aggregate(normalized["pipeline"], maxTimeMS=MAX_TIME_MS).to_list(None)
        truncated = len(raw) >= MAX_ROWS
        rows = raw
    rows = to_jsonable(rows)
    return {
        "rows": rows,
        "result_count": len(rows),
        "result_truncated": truncated,
        "data_gaps": _data_gaps(rows) if rows and isinstance(rows[0], dict) else {},
        "duration_ms": int((time.perf_counter() - started) * 1000),
    }


def sources_from_rows(collection: str, rows: List[dict], limit: int = 5) -> List[dict]:
    """조회 결과 중 원본 기록(_id 있는 것)을 답변 아래 '본 기록'으로 보여줄 형태로."""
    spec = ALLOWED_COLLECTIONS.get(collection)
    out = []
    for row in rows:
        rid = row.get("_id") if isinstance(row, dict) else None
        if not spec or not isinstance(rid, str) or len(rid) != 24:
            continue
        label = " ".join(str(row.get(f)) for f in spec["label_fields"] if row.get(f))
        if label:
            out.append({"collection": collection, "id": rid, "label": label, "path": spec["path"].format(id=rid)})
        if len(out) >= limit:
            break
    return out
