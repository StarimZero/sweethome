// ========================================================================
//  뜨개록(Knitting) 공통코드 시드 — mongosh 스크립트
//  ------------------------------------------------------------------------
//  Compass 사용법:
//   1) Compass 실행 → "New Connection" → 운영 MONGODB_URL 붙여넣고 연결
//   2) 좌측 하단의 ">_ MONGOSH" 탭 클릭하여 mongosh 패널 열기
//   3) use sweethome     ← .env의 DB_NAME 값과 동일하게
//   4) 이 파일 내용을 통째로 복사해서 mongosh 패널에 붙여넣고 Enter
//
//  멱등성: upsert + $setOnInsert 사용. 이미 있는 코드는 건너뜀.
// ========================================================================

const KNITTING_CODE_GROUPS = [
  { group_code: "KNITTING_CATEGORY", group_name: "뜨개 카테고리", codes: [
    { code_id: "SWEATER",  code_name: "스웨터" },
    { code_id: "CARDIGAN", code_name: "가디건" },
    { code_id: "MUFFLER",  code_name: "머플러/숄" },
    { code_id: "HAT",      code_name: "모자" },
    { code_id: "GLOVES",   code_name: "장갑/벙어리" },
    { code_id: "SOCKS",    code_name: "양말" },
    { code_id: "BAG",      code_name: "가방" },
    { code_id: "DOLL",     code_name: "인형/소품" },
    { code_id: "BLANKET",  code_name: "담요" },
    { code_id: "ETC",      code_name: "기타" },
  ]},
  { group_code: "KNITTING_STATUS", group_name: "뜨개 진행 상태", codes: [
    { code_id: "WAIT", code_name: "대기" },
    { code_id: "CO",   code_name: "CO (시작)" },
    { code_id: "WIP",  code_name: "WIP (진행중)" },
    { code_id: "FO",   code_name: "FO (완성)" },
  ]},
  { group_code: "KNITTING_TECHNIQUE", group_name: "뜨개 기법", codes: [
    { code_id: "STOCKINETTE", code_name: "메리야스" },
    { code_id: "PURL",        code_name: "안뜨기" },
    { code_id: "CABLE",       code_name: "케이블" },
    { code_id: "FAIR_ISLE",   code_name: "페어아일" },
    { code_id: "INTARSIA",    code_name: "인타르시아" },
    { code_id: "BRIOCHE",     code_name: "브리오시" },
    { code_id: "LACE",        code_name: "레이스" },
    { code_id: "SHORT_ROW",   code_name: "숏로우" },
    { code_id: "MAGIC_LOOP",  code_name: "매직루프" },
    { code_id: "STEEK",       code_name: "스틱" },
  ]},
  { group_code: "KNITTING_PURPOSE", group_name: "뜨개 용도", codes: [
    { code_id: "GIFT",    code_name: "선물" },
    { code_id: "MINE",    code_name: "나의 사용" },
    { code_id: "SELL",    code_name: "판매" },
    { code_id: "DISPLAY", code_name: "전시" },
    { code_id: "ETC",     code_name: "기타" },
  ]},
  { group_code: "KNITTING_WEAR_FREQ", group_name: "착용/사용 빈도", codes: [
    { code_id: "RARELY",     code_name: "거의 안 입음" },
    { code_id: "SOMETIMES",  code_name: "가끔 입음" },
    { code_id: "OFTEN",      code_name: "자주 입음" },
    { code_id: "VERY_OFTEN", code_name: "매우 자주 입음" },
  ]},
  { group_code: "YARN_UNIT", group_name: "실 수량 단위", codes: [
    { code_id: "BALL",  code_name: "볼" },
    { code_id: "GRAM",  code_name: "g" },
    { code_id: "METER", code_name: "m" },
    { code_id: "SKEIN", code_name: "타래" },
    { code_id: "HANK",  code_name: "카세" },
  ]},
  { group_code: "CURRENCY", group_name: "통화 단위", codes: [
    { code_id: "KRW", code_name: "KRW (원)" },
    { code_id: "USD", code_name: "USD ($)" },
    { code_id: "EUR", code_name: "EUR (€)" },
    { code_id: "JPY", code_name: "JPY (¥)" },
    { code_id: "GBP", code_name: "GBP (£)" },
  ]},
];

let inserted = 0;
let skipped = 0;

for (const group of KNITTING_CODE_GROUPS) {
  let sort = 1;
  for (const c of group.codes) {
    const filter = { group_code: group.group_code, code_id: c.code_id };
    const doc = {
      group_code: group.group_code,
      group_name: group.group_name,
      code_id:    c.code_id,
      code_name:  c.code_name,
      sort_order: sort,
      use_yn:     "Y",
    };
    const result = db.common_codes.updateOne(
      filter,
      { $setOnInsert: doc },
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      inserted++;
      print(`  + [${group.group_code}] ${c.code_id} = ${c.code_name}`);
    } else {
      skipped++;
    }
    sort++;
  }
}

print("");
print(`✅ 시드 완료: 신규 등록 ${inserted}건, 기존 유지 ${skipped}건`);
