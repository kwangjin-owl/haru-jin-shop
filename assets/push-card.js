/* ===========================================================
   진 빠지는 하루 — 주문을 마친 손님에게 알림을 받을지 묻는 카드
   - 주문 완료 화면과 상품 상세(바로 주문 뒤)에서만 불러 쓴다
   - 브라우저 알림 허락 창은 「알림 받기」 단추를 누른 처리 안에서만 띄운다
   - 알림 받을 주소(토큰)는 아직 받지 않는다
   =========================================================== */
const CARD_ID = "push-card";

export function hidePushCard() {
  const old = document.getElementById(CARD_ID);
  if (old) old.remove();
}

// anchor 바로 아래에 카드(또는 안내 한 줄)를 붙인다
export function showPushCard(anchor) {
  hidePushCard();
  if (!anchor || !("Notification" in window)) return;

  const box = document.createElement("div");
  box.id = CARD_ID;
  // 위 내용과 구분되도록 테두리 있는 카드로 보인다
  box.style.cssText = "margin:24px 0;padding:18px 20px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:10px;max-width:420px";

  const note = (text) => {
    const p = document.createElement("p");
    p.className = "lead";
    p.style.margin = "0";
    p.textContent = text;
    box.replaceChildren(p);
  };

  if (Notification.permission === "granted") {
    note("알림을 받고 있어요");
  } else if (Notification.permission === "denied") {
    note("브라우저 주소창 왼쪽 아이콘 → 알림에서 켤 수 있어요");
  } else {
    const title = document.createElement("p");
    title.className = "lead";
    title.style.cssText = "margin:0 0 14px;font-weight:700;color:var(--ink)";
    title.textContent = "배송이 시작되면 바로 알려 드릴까요?";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "btn";
    accept.textContent = "알림 받기";
    accept.addEventListener("click", async () => {
      // 허락 창은 이 단추를 누른 처리 안에서만 띄운다
      const result = await Notification.requestPermission();
      console.log("알림 허락 결과: " + result);
      if (result === "granted") note("알림을 받고 있어요");
      else if (result === "denied") note("브라우저 주소창 왼쪽 아이콘 → 알림에서 켤 수 있어요");
    });

    const later = document.createElement("button");
    later.type = "button";
    later.className = "btn ghost";
    later.style.marginLeft = "8px";
    later.textContent = "나중에";
    later.addEventListener("click", hidePushCard);

    box.append(title, accept, later);
  }

  anchor.insertAdjacentElement("afterend", box);
}
