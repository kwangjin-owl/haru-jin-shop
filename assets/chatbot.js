/* ===========================================================
   진 빠지는 하루 — 첫 화면 챗봇
   - 오른쪽 아래 동그란 버튼을 누르면 작은 대화 창이 열린다
   - 질문 하나를 askShopBot 으로 보내고, 돌아온 답 하나를 창에 보여 준다 (앞 대화는 보내지 않는다)
   - Gemini 키는 서버(Secret Manager)에만 있고, 이 파일에는 없다
   - Firebase 앱은 auth.js 가 만든 것을 그대로 씁니다
   =========================================================== */
import { app } from "./auth.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";

const auth = getAuth(app);
const askShopBot = httpsCallable(getFunctions(app, "us-central1"), "askShopBot");
const NEED_LOGIN = "[로그인한 뒤에 물어볼 수 있어요]";

let user = null;
onAuthStateChanged(auth, (u) => { user = u; });

const fab = document.createElement("button");
fab.type = "button";
fab.className = "bot-fab";
fab.setAttribute("aria-label", "챗봇 열기");
fab.textContent = "💬";

const win = document.createElement("div");
win.className = "bot-win";
win.hidden = true;
win.innerHTML =
  '<div class="bot-head">하루상점 도우미</div>' +
  '<div class="bot-log" role="log" aria-live="polite"></div>' +
  '<form class="bot-form"><input type="text" maxlength="300" placeholder="궁금한 것을 물어보세요" aria-label="질문"><button class="btn" type="submit">보내기</button></form>';
document.body.append(fab, win);

const log = win.querySelector(".bot-log");
const form = win.querySelector(".bot-form");
const input = form.querySelector("input");
const send = form.querySelector("button");

function add(kind, text) {
  const p = document.createElement("p");
  p.className = kind;
  p.textContent = text;
  log.append(p);
  log.scrollTop = log.scrollHeight;
  return p;
}

fab.addEventListener("click", () => {
  win.hidden = !win.hidden;
  if (!win.hidden) input.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  add("me", question);
  input.value = "";
  if (!user) { add("bot", NEED_LOGIN); return; }
  send.disabled = true;
  const wait = add("bot", "…");
  try {
    const res = await askShopBot({ question });
    wait.textContent = res.data.answer;
  } catch (err) {
    wait.textContent = "실패: " + (err && err.code ? err.code + " — " : "") + (err && err.message ? err.message : String(err));
  }
  send.disabled = false;
  log.scrollTop = log.scrollHeight;
});
