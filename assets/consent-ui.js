/* ===========================================================
   하루상점 — 동의 배너
   화면 아래에 배너를 띄우고, 고른 값을 브라우저에 적어 둡니다.
   기본값(네 신호 모두 거절)은 consent.js 가 먼저 세워 둡니다.
   =========================================================== */

// 고른 값을 적어 둘 이름 - 화면이 바뀌어도 이 이름으로 다시 찾는다
const CONSENT_KEY = "haru_consent";

const Consent = {
  // 앞서 고른 값을 읽는다 - 아직 고르지 않았으면 빈 값이 나온다
  read() {
    try { return localStorage.getItem(CONSENT_KEY); }
    catch (e) { return null; }
  },

  // 고른 값을 적어 둔다 - 다음 화면부터 배너를 다시 띄우지 않게 하는 자리
  write(value) {
    try { localStorage.setItem(CONSENT_KEY, value); }
    catch (e) { /* 저장을 막아 둔 브라우저 - 이 화면에서만 살아 있게 둔다 */ }
  },

  // 적어 둔 값을 지운다 - 「동의 다시 고르기」가 쓴다
  forget() {
    try { localStorage.removeItem(CONSENT_KEY); }
    catch (e) { /* 저장을 막아 둔 브라우저 - 지울 것도 없다 */ }
  },

  // 수락 - 이 화면에서 바로 네 신호를 허락으로 바꾼다
  grant() {
    // 동의 이야기는 consent.js 가 만들어 둔 gtag 로 넣는다 - 기본값과 같은 말투라야 알아듣는다
    gtag("consent", "update", {
      // 광고에 쓰는 쿠키를 둘 수 있나
      ad_storage: "granted",
      // 분석에 쓰는 쿠키를 둘 수 있나
      analytics_storage: "granted",
      // 광고 쪽에 사용자 값을 보낼 수 있나
      ad_user_data: "granted",
      // 맞춤 광고에 쓸 수 있나
      ad_personalization: "granted"
    });
  }
};

/* --- 배너를 그린다 --- */
function paintConsentBanner() {
  // 앞서 고른 값이 있으면 배너를 띄우지 않는다 - 수락이든 거부든 한 번 골랐으면 그만 묻는다
  if (Consent.read()) return;

  const bar = document.createElement("div");
  bar.className = "consent";
  bar.id = "consent-bar";
  bar.innerHTML = `
    <div class="wrap">
      <p>이 가게는 방문 기록을 분석과 광고에 씁니다. 수락하시면 그때부터 기록합니다.</p>
      <div class="consent-buttons">
        <button class="btn ghost" id="consent-deny" type="button">거부</button>
        <button class="btn" id="consent-accept" type="button">수락</button>
      </div>
    </div>`;
  document.body.appendChild(bar);

  // 수락 - 네 신호를 허락으로 바꾸고, 고른 값을 적어 둔 뒤 배너를 치운다
  document.querySelector("#consent-accept").addEventListener("click", () => {
    Consent.grant();
    Consent.write("granted");
    bar.remove();
  });

  // 거부 - 기본값이 이미 거절이라 바꿀 것이 없다. 고른 값만 적어 두고 배너를 치운다
  document.querySelector("#consent-deny").addEventListener("click", () => {
    Consent.write("denied");
    bar.remove();
  });
}

/* --- 화면 맨 아래 「동의 다시 고르기」 --- */
function paintConsentReopen() {
  const foot = document.querySelector("footer.site .wrap");
  if (!foot) return;

  const link = document.createElement("a");
  link.className = "consent-reopen";
  link.href = "#";
  link.textContent = "동의 다시 고르기";

  // 누르면 적어 둔 값을 지우고 배너를 다시 띄운다
  link.addEventListener("click", e => {
    e.preventDefault();
    if (document.querySelector("#consent-bar")) return;
    Consent.forget();
    paintConsentBanner();
  });

  foot.appendChild(link);
}

document.addEventListener("DOMContentLoaded", () => {
  paintConsentBanner();
  paintConsentReopen();
});
