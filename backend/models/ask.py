from beanie import Document, PydanticObjectId
from typing import Optional, List, Any, Dict
from datetime import datetime


# 조회용 챗봇 질문 로그. 질문 1건 = 문서 1개(트레이스).
# 목적: 답변만이 아니라 "LLM이 질문을 어떻게 해석했고, 어떤 조회문을 왜 만들었고, 무엇을 보고 답했는지"를
# 나중에 Claude가 분석·재현·개선(프롬프트 예시, 파인튜닝)할 수 있게 전부 남긴다.
class AskLog(Document):
    # --- 누가, 어디서 ---
    user_id: Optional[PydanticObjectId] = None
    username: str = ""
    call_name: str = ""                      # 답변에서 부른 이름 (호랭이 / 보구치 / 관리자)
    conversation_id: str = ""                # 이어지는 질문 묶음
    turn_index: int = 0                      # 대화 안에서 몇 번째 질문인지 (0부터)
    previous_log_id: Optional[PydanticObjectId] = None
    page: str = ""                           # 질문한 화면 경로 (예: /buypedia)
    question: str = ""

    # --- 재현에 필요한 것 ---
    app_version: str = ""                    # 배포 커밋
    prompt_version: str = ""
    model: str = ""
    generation_config: Dict[str, Any] = {}
    system_prompt: str = ""                  # 보낸 시스템 프롬프트 전체 (스키마 설명·규칙 포함)
    history_sent: List[Dict[str, Any]] = []  # 함께 보낸 앞 대화
    today: str = ""                          # '올해', '요즘' 해석 기준 날짜

    # --- 단계별 과정 ---
    # 각 단계: {index, request_contents, raw_response, text, tool_calls: [{name, args(이유·가정·해석 포함),
    #   validation: {ok, errors}, executed, result_count, result_truncated, result_rows, data_gaps, duration_ms, error}],
    #   usage, duration_ms, http_status}
    steps: List[Dict[str, Any]] = []

    # --- 결과 ---
    answer: str = ""
    answer_raw: str = ""                     # 모델이 낸 원래 답 (서버가 고치기 전)
    answer_fixes: List[str] = []             # 서버가 고친 내용 (예: '남편'→'호랭이님') — 모델이 규칙을 안 지킨 횟수 분석용
    sources: List[Dict[str, Any]] = []       # 답변 아래 보여준 기록 {collection, id, label, path}
    numbers_in_answer: List[str] = []
    numbers_unverified: List[str] = []       # 답변에 나왔지만 조회 결과에서 못 찾은 숫자 (지어냈을 가능성)
    said_unknown: bool = False
    unsupported: List[Dict[str, Any]] = []   # 연결 안 된 메뉴·데이터를 물었을 때 {topic, reason}
    error: Optional[str] = None
    quota_exceeded: bool = False

    # --- 사용 행동 (나중에 채워짐) ---
    source_clicks: List[Dict[str, Any]] = []
    next_question_after_ms: Optional[int] = None   # 같은 대화에서 다음 질문까지 걸린 시간 (바로 다시 물었는지)

    # --- 비용 ---
    total_duration_ms: int = 0
    total_tokens: int = 0

    created_at: datetime = datetime.now()

    class Settings:
        name = "ask_logs"
