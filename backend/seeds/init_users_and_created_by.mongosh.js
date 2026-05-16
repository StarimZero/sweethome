// =====================================================================
// 사용자 추가(husband/wife) + 모든 기존 데이터의 created_by를 husband로
// =====================================================================
// 사용법: Compass mongosh에서 use sweethome 후 이 스크립트 통째로 붙여넣기.
// 멱등: 여러 번 실행해도 안전 (이미 있는 사용자는 건너뜀, created_by가 있는 데이터는 안 덮어씀)
// =====================================================================

// === 0. holango를 admin으로 (이미 admin이면 noop)
db.users.updateOne(
  { username: "holango" },
  { $set: { role: "admin", is_active: true } }
);

// === 1. husband / wife 계정 추가 (이미 있으면 건너뜀)
//   비밀번호는 임시로 holango와 동일하게 설정 (로그인 후 사용자 관리에서 변경 권장)
const sharedHash = "$2b$12$MV7TP/QrbhVAIwmKGxxO1uVvR49APdy.1SQhH/G8Z6aIJScQOCdkG";

db.users.updateOne(
  { username: "younghun91" },
  { $setOnInsert: {
      username: "younghun91",
      password_hash: sharedHash,
      nickname: "남편",
      role: "member",
      is_active: true,
      created_at: new Date()
  }},
  { upsert: true }
);

db.users.updateOne(
  { username: "joyi96" },
  { $setOnInsert: {
      username: "joyi96",
      password_hash: sharedHash,
      nickname: "아내",
      role: "member",
      is_active: true,
      created_at: new Date()
  }},
  { upsert: true }
);

// === 2. husband의 _id 확보
const husband = db.users.findOne({ username: "younghun91" });
if (!husband) {
  throw new Error("husband 계정을 찾을 수 없습니다.");
}
print("husband._id = " + husband._id);

// === 3. 모든 데이터 컬렉션에 created_by 채우기 (없는 것만 덮어씀)
const collections = [
  "recipes",           // 요리
  "reviews",           // 리뷰
  "travels",           // 여행
  "places",            // 여행지
  "liquor_reviews",    // 주류
  "bucketlist",        // 버킷리스트
  "diaries",           // 일기
  "calendar_events",   // 캘린더
  "family_members",    // 가계도
  "culture_reviews",   // 문화생활
  "knitting_records",  // 뜨개록
];

print("");
print("--- 일괄 created_by 채우기 ---");
let total = 0;
for (const col of collections) {
  const r = db.getCollection(col).updateMany(
    { created_by: { $exists: false } },
    { $set: { created_by: husband._id } }
  );
  print("  " + col + ": " + r.modifiedCount + "건 업데이트");
  total += r.modifiedCount;
}

print("");
print("✅ 완료: 총 " + total + "건의 데이터에 husband로 created_by 설정됨");
