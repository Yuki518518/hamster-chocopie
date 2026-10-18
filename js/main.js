import { Renderer } from "./renderer.js";
import { SwipeInput } from "./input.js";
import { Sound } from "./audio.js";
import { Game } from "./game.js";
const $ = (id) => document.getElementById(id);
const storage = {
  get(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {}
  },
};
let best = Math.max(0, parseInt(storage.get("ac-best", "0"), 10) || 0),
  enabled = storage.get("ac-sound", "on") !== "off",
  game,
  toastTimer,
  oldState = "",
  newBest = false;
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2400);
}
const sound = new Sound(enabled);
const input = new SwipeInput(
  $("game"),
  (...args) => game?.throw(...args),
  () => {
    if (game?.elapsed < 8) toast("下のチョコパイから、上へスワイプしてね");
  },
);
function updateSound() {
  $("sound").textContent = enabled ? "♪ ON" : "♪ OFF";
  $("sound").setAttribute("aria-pressed", String(enabled));
}
function sync(tick = false) {
  if (!game) return;
  const state = game.state;
  $("score").textContent = String(game.score).padStart(3, "0");
  $("time").textContent = String(Math.ceil(game.remaining)).padStart(2, "0");
  $("time").parentElement.classList.toggle("urgent", game.remaining <= 5);
  $("hint").hidden = state !== "PLAYING" || game.elapsed > 5 || game.ending;
  if (tick) return;
  if (state === "RESULT" && oldState !== "RESULT") {
    newBest = game.score > best;
    if (newBest) {
      best = game.score;
      storage.set("ac-best", best);
    }
    $("result-score").textContent = game.score;
    $("result-message").textContent = game.score
      ? `チョコパイを${game.score / 10}こ届けたよ！`
      : "つぎはきっと、届けられるよ ♡";
    $("record-label").textContent = newBest ? "NEW BEST! ♡" : "BEST";
  }
  $("title").hidden = state !== "TITLE";
  $("paused").hidden = state !== "PAUSED";
  $("result").hidden = state !== "RESULT";
  $("hud").hidden = !["PLAYING", "PAUSED"].includes(state);
  $("pause").hidden = state !== "PLAYING" || game.ending;
  for (const id of ["best", "title-best", "result-best"])
    $(id).textContent = String(best).padStart(3, "0");
  if (oldState && state !== oldState) {
    const id = { TITLE: "start", PAUSED: "resume", RESULT: "retry" }[state];
    if (id) $(id).focus({ preventScroll: true });
  }
  oldState = state;
}
$("sound").onclick = () => {
  enabled = !enabled;
  storage.set("ac-sound", enabled ? "on" : "off");
  sound.toggle(enabled, game?.state === "PLAYING" && !game.ending);
  sound.effect("button");
  updateSound();
};
$("start").onclick = $("retry").onclick = () => game?.start();
$("pause").onclick = () => game?.pause();
$("resume").onclick = () => game?.resume();
$("home").onclick = $("result-home").onclick = () => game?.home();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (game?.state === "PLAYING") {
      if (game.ending) {
        sound.stop();
      } else game.pause();
    } else sound.stop();
  }
});
window.addEventListener("pagehide", () => {
  if (game?.state === "PLAYING") game.pause();
  sound.stop();
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (game?.state === "PLAYING") game.pause();
    else if (game?.state === "PAUSED") game.resume();
  }
});
$("share").onclick = async () => {
  sound.effect("button");
  const text = `あっちゃんにチョコパイ！\n${game.score}点！ チョコパイを${game.score / 10}こ届けたよ ♡\nきみも30秒、おやつを届けてね。`,
    url = location.href.split("?")[0].split("#")[0];
  try {
    if (navigator.share) {
      await navigator.share({ title: "あっちゃんにチョコパイ！", text, url });
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast("結果とURLをコピーしたよ ♡");
  } catch {
    const a = document.createElement("textarea");
    a.value = `${text}\n${url}`;
    a.style.cssText = "position:fixed;top:0;opacity:0";
    document.body.append(a);
    a.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    a.remove();
    toast(
      ok
        ? "結果とURLをコピーしたよ ♡"
        : "コピーできませんでした。URLを共有してね",
    );
  }
};
async function load() {
  const assets = {};
  for (const [key, file] of Object.entries({
    hamster: "hamster",
    pie: "chocopie",
    berry: "strawberry",
  })) {
    const img = new Image();
    img.src = new URL(`../assets/images/${file}.svg`, import.meta.url);
    await img.decode();
    assets[key] = img;
  }
  const renderer = new Renderer($("game"), assets);
  game = new Game(renderer, input, sound, sync);
  sync();
}
updateSound();
load().catch(() => {
  toast("画像の読み込みに失敗しました。ページを再読み込みしてください");
  $("start").disabled = true;
});
