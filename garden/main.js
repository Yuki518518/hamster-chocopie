import { GardenModel } from "./model.js";
import { HoldControls } from "./input.js";
import { GardenSound } from "./audio.js";
import { loadAssets, GardenRenderer } from "./renderer.js";

const $ = (id) => document.getElementById(id);
const store = {
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
const model = new GardenModel();
const controls = new HoldControls($("left"), $("right"));
const sound = new GardenSound(store.get("ac-sound", "on") !== "off");
let renderer,
  last = performance.now(),
  oldState = "",
  best = Math.max(0, Number(store.get("ac-garden-best", 0)) || 0),
  toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2300);
}
function soundLabel() {
  $("sound").textContent = sound.enabled ? "♪ ON" : "♪ OFF";
  $("sound").setAttribute("aria-pressed", String(sound.enabled));
}
function sync() {
  const state = model.state;
  $("score").textContent =
    model.score < 0
      ? `−${Math.abs(model.score)}`
      : String(model.score).padStart(3, "0");
  $("time").textContent = String(Math.ceil(model.remaining)).padStart(2, "0");
  $("time").parentElement.classList.toggle("urgent", model.remaining <= 5);
  $("play-hint").hidden = state !== "PLAYING" || model.elapsed > 4;
  if (state === oldState) return;
  if (state === "RESULT") {
    const record = model.score > best;
    if (record) {
      best = model.score;
      store.set("ac-garden-best", best);
    }
    $("record-label").textContent = record ? "NEW BEST! ♡" : "BEST";
    $("result-score").textContent = model.score;
    $("result-counts").textContent =
      `いちご ${model.counts.strawberry}こ ／ パイ ${model.counts.chocopie}こ ／ おさかな ${model.counts.fish}こ`;
    $("result-message").textContent =
      model.counts.strawberry + model.counts.chocopie === 0
        ? "つぎはきっと、いっぱい食べられるよ ♡"
        : model.counts.chocopie >= 3
          ? "チョコパイも食べて、ごきげんっ！"
          : "おいしいおやつ、ごちそうさま ♡";
    sound.stop(true);
    sound.effect("end");
  }
  controls.setEnabled(state === "PLAYING");
  document.querySelector(".game-area").dataset.state = state;
  $("title").hidden = state !== "TITLE";
  $("paused").hidden = state !== "PAUSED";
  $("result").hidden = state !== "RESULT";
  $("pause").hidden = state !== "PLAYING";
  for (const id of ["best", "title-best", "result-best"])
    $(id).textContent = String(best).padStart(3, "0");
  if (oldState) {
    const target = { TITLE: "start", PAUSED: "resume", RESULT: "retry" }[state];
    if (target) $(target).focus({ preventScroll: true });
  }
  oldState = state;
}
function start() {
  if (!renderer) return;
  controls.reset();
  renderer.reset();
  model.start();
  last = performance.now();
  sound.play();
  sound.effect("button");
  sync();
}
function pause() {
  if (model.state !== "PLAYING") return;
  model.pause();
  controls.reset();
  sound.effect("button");
  sound.stop();
  sync();
}
function resume() {
  if (model.state !== "PAUSED") return;
  controls.reset();
  model.resume();
  last = performance.now();
  sound.play();
  sound.effect("button");
  sync();
}
function title() {
  model.home();
  controls.reset();
  renderer?.reset();
  sound.effect("button");
  sound.stop();
  sync();
}
$("start").addEventListener("click", start);
$("retry").addEventListener("click", start);
$("pause").addEventListener("click", pause);
$("resume").addEventListener("click", resume);
$("back-title").addEventListener("click", title);
$("result-title").addEventListener("click", title);
$("sound").addEventListener("click", () => {
  sound.toggle(!sound.enabled);
  store.set("ac-sound", sound.enabled ? "on" : "off");
  sound.effect("button");
  soundLabel();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pause();
    sound.stop();
  }
});
window.addEventListener("pagehide", () => {
  pause();
  sound.stop();
});
window.addEventListener("blur", () => {
  if (model.state === "PLAYING") pause();
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (model.state === "PLAYING") pause();
    else if (model.state === "PAUSED") resume();
  }
});
$("share").addEventListener("click", async () => {
  sound.effect("button");
  const text = `あっちゃんのおやつキャッチ！\n${model.score}点！ いちごを${model.counts.strawberry}こ、チョコパイを${model.counts.chocopie}こ食べたよ ♡\nおさかなをよけて、きみもチャレンジ！`;
  const url = location.href.split("?")[0].split("#")[0];
  try {
    if (navigator.share) {
      await navigator.share({ title: "あっちゃんのおやつキャッチ", text, url });
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast("結果とURLをコピーしたよ ♡");
  } catch {
    const area = document.createElement("textarea");
    area.value = `${text}\n${url}`;
    area.style.cssText = "position:fixed;opacity:0;top:0";
    document.body.append(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {}
    area.remove();
    toast(
      copied
        ? "結果とURLをコピーしたよ ♡"
        : "コピーできませんでした。URLを共有してね",
    );
  }
});
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  model.update(dt, controls.axis);
  for (const event of model.drainEvents())
    if (event.type === "catch") {
      renderer.caught(event);
      sound.effect(event.item);
    }
  if (model.state !== "PAUSED") renderer.update(dt);
  sync();
  renderer.draw(model, now / 1000);
  requestAnimationFrame(frame);
}
soundLabel();
sync();
loadAssets()
  .then((assets) => {
    renderer = new GardenRenderer($("garden"), assets, (width, height) =>
      model.viewport(width, height),
    );
    $("start").disabled = false;
    $("start").textContent = "お庭であそぶ ♡";
    last = performance.now();
    requestAnimationFrame(frame);
  })
  .catch(() => {
    $("start").disabled = false;
    $("start").textContent = "読み込み直す";
    $("start").onclick = () => location.reload();
    toast("おやつの画像を読み込めませんでした");
  });
