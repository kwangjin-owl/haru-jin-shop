/* ===========================================================
   하루상점 — 동의 기본값
   태그 관리자보다 먼저 읽혀야 합니다.
   그래야 태그가 움직이기 전에 「아직 허락 안 했다」가 먼저 서 있습니다.
   =========================================================== */

// 통로가 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다
window.dataLayer = window.dataLayer || [];
// 동의 이야기는 이 말투로 넣어야 태그 관리자가 알아듣는다
function gtag() { dataLayer.push(arguments); }

// 기본값 - 묻기 전에는 네 신호 모두 거절로 둔다
gtag("consent", "default", {
  // 광고에 쓰는 쿠키를 둘 수 있나
  ad_storage: "denied",
  // 분석에 쓰는 쿠키를 둘 수 있나
  analytics_storage: "denied",
  // 광고 쪽에 사용자 값을 보낼 수 있나
  ad_user_data: "denied",
  // 맞춤 광고에 쓸 수 있나
  ad_personalization: "denied"
});

// 앞서 고른 값이 브라우저에 남아 있으면 그 값을 되살린다
// 화면이 바뀌어도 고른 값이 그대로 이어지게 하는 자리
try {
  if (localStorage.getItem("haru_consent") === "granted") {
    gtag("consent", "update", {
      ad_storage: "granted",
      analytics_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted"
    });
  }
} catch (e) {
  // 브라우저가 저장을 막아 둔 경우 - 기본값(거절) 그대로 둔다
}
