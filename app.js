const EPOCH = Date.UTC(2024, 6, 2);
const LS = {
  stats: "numberle-stats-v1",
  daily: "numberle-daily-v1",
  settings: "numberle-settings-v1",
  seenHelp: "numberle-help-v1"
};

const state = {
  mode: "daily",
  puzzleId: 0,
  dateKey: "",
  target: "",
  clues: [],
  revealed: 0,
  guesses: [],
  current: "",
  status: "playing",
  hard: false,
  dark: false,
  keyHints: {}
};

function utcDateKey(d) {
  return (d || new Date()).toISOString().slice(0, 10);
}
function puzzleIdFromDate(d) {
  d = d || new Date();
  const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((utc - EPOCH) / 86400000);
}
function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
function generateTarget(rng) {
  return String(1000 + Math.floor(rng() * 9000));
}
function buildClues(num, rng) {
  const d = num.split("").map(Number);
  const n = Number(num);
  const sum = d.reduce(function (a, b) { return a + b; }, 0);
  const prod = d.reduce(function (a, b) { return a * b; }, 1);
  const unique = new Set(d).size;
  const max = Math.max.apply(null, d);
  const min = Math.min.apply(null, d);
  const mid = d[1] + d[2];
  const pool = [
    "The digits add up to " + sum + ".",
    "The number is " + (n % 2 === 0 ? "even" : "odd") + ".",
    prod === 0 ? "The number contains a 0." : "The product of the digits is " + prod + ".",
    "The number is " + (n % 3 === 0 ? "" : "not ") + "divisible by 3.",
    "The first digit is " + (d[0] % 2 === 0 ? "even" : "odd") + ".",
    "The last digit is " + (d[3] % 2 === 0 ? "even" : "odd") + ".",
    unique === 4 ? "Every digit is different." : "There are " + unique + " unique digits.",
    "The highest digit is " + max + ".",
    "The lowest digit is " + min + ".",
    "The middle two digits add up to " + mid + "."
  ];
  return shuffle(pool, rng);
}
function scoreGuess(guess, target) {
  const result = ["absent", "absent", "absent", "absent"];
  const t = target.split("");
  const g = guess.split("");
  const used = [false, false, false, false];
  for (let i = 0; i < 4; i++) {
    if (g[i] === t[i]) { result[i] = "correct"; used[i] = true; }
  }
  for (let i = 0; i < 4; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < 4; j++) {
      if (!used[j] && g[i] === t[j]) { result[i] = "present"; used[j] = true; break; }
    }
  }
  return result;
}
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function defaultStats() {
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, lastDate: "", dist: [0, 0, 0, 0, 0, 0] };
}
function applyTheme() {
  document.documentElement.dataset.theme = state.dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", state.dark ? "#161513" : "#f6f4ef");
  document.getElementById("darkToggle").classList.toggle("on", state.dark);
}
function persistSettings() {
  saveJSON(LS.settings, { dark: state.dark, hard: state.hard });
}
function persistDaily() {
  if (state.mode !== "daily") return;
  saveJSON(LS.daily, {
    dateKey: state.dateKey,
    guesses: state.guesses,
    revealed: state.revealed,
    status: state.status
  });
}
function startPuzzle(opts) {
  const mode = opts.mode;
  const dateKey = opts.dateKey;
  const restore = opts.restore;
  state.mode = mode;
  state.dateKey = mode === "daily" ? dateKey : "practice";
  state.puzzleId = mode === "daily" ? puzzleIdFromDate(new Date(dateKey + "T00:00:00Z")) : 0;
  const seedStr = mode === "daily" ? "numberle-daily-" + dateKey : "numberle-practice-" + Date.now() + Math.random();
  const rng = mulberry32(hash32(seedStr));
  state.target = generateTarget(rng);
  state.clues = buildClues(state.target, rng);
  state.revealed = 0;
  state.guesses = [];
  state.current = "";
  state.status = "playing";
  state.keyHints = {};
  if (restore && mode === "daily") {
    const saved = loadJSON(LS.daily, null);
    if (saved && saved.dateKey === dateKey) {
      state.guesses = saved.guesses || [];
      state.revealed = saved.revealed || 0;
      state.status = saved.status || "playing";
      rebuildKeyHints();
    }
  }
  renderAll();
}
function rebuildKeyHints() {
  state.keyHints = {};
  const rank = { correct: 3, present: 2, absent: 1 };
  for (let g = 0; g < state.guesses.length; g++) {
    const guess = state.guesses[g];
    const marks = scoreGuess(guess, state.target);
    for (let i = 0; i < 4; i++) {
      const d = guess[i];
      if (!state.keyHints[d] || rank[marks[i]] > rank[state.keyHints[d]]) state.keyHints[d] = marks[i];
    }
  }
}
function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  for (let r = 0; r < 6; r++) {
    const row = document.createElement("div");
    row.className = "row";
    const guess = state.guesses[r] || (r === state.guesses.length ? state.current : "");
    const marks = state.guesses[r] ? scoreGuess(state.guesses[r], state.target) : null;
    for (let c = 0; c < 4; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      const ch = guess[c] || "";
      tile.textContent = ch;
      if (ch && !marks) tile.classList.add("filled");
      if (marks) tile.classList.add(marks[c]);
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}
function renderDossier() {
  const ul = document.getElementById("dossier");
  if (state.revealed === 0) {
    ul.innerHTML = '<li class="empty">Guess to uncover a property of the number.</li>';
    return;
  }
  ul.innerHTML = state.clues.slice(0, state.revealed).map(function (c) { return "<li>" + c + "</li>"; }).join("");
}
function renderKb() {
  const kb = document.getElementById("kb");
  const rows = [["1", "2", "3", "4", "5"], ["6", "7", "8", "9", "0"], ["Enter", "Back"]];
  kb.innerHTML = "";
  rows.forEach(function (keys) {
    const row = document.createElement("div");
    row.className = "kb-row";
    keys.forEach(function (k) {
      const b = document.createElement("button");
      b.className = "key" + (k === "Enter" || k === "Back" ? " wide" : "");
      b.dataset.key = k;
      b.textContent = k === "Back" ? "Delete" : k;
      if (k.length === 1 && state.keyHints[k]) b.classList.add(state.keyHints[k]);
      b.addEventListener("click", function () { onKey(k); });
      row.appendChild(b);
    });
    kb.appendChild(row);
  });
}
function renderMeta() {
  document.getElementById("modeLabel").textContent = state.mode === "daily" ? "Daily" : "Practice";
  document.getElementById("puzzleLabel").textContent =
    state.mode === "daily" ? "#" + state.puzzleId + " \u00b7 " + state.dateKey : "Does not affect your streak";
}
function renderAll() {
  renderMeta();
  renderBoard();
  renderDossier();
  renderKb();
  document.getElementById("hardToggle").classList.toggle("on", state.hard);
}
function flash(text, warn) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.classList.toggle("warn", !!warn);
  if (text) setTimeout(function () { if (el.textContent === text) el.textContent = ""; }, 2200);
}
function hardModeError(guess) {
  if (!state.hard || state.guesses.length === 0) return null;
  const required = [null, null, null, null];
  const mustHave = [];
  for (let p = 0; p < state.guesses.length; p++) {
    const prev = state.guesses[p];
    const marks = scoreGuess(prev, state.target);
    for (let i = 0; i < 4; i++) {
      if (marks[i] === "correct") required[i] = prev[i];
      if (marks[i] === "present") mustHave.push(prev[i]);
    }
  }
  for (let i = 0; i < 4; i++) {
    if (required[i] && guess[i] !== required[i]) return "Hard mode: position " + (i + 1) + " must be " + required[i] + ".";
  }
  const used = guess.split("");
  for (let i = 0; i < mustHave.length; i++) {
    const idx = used.indexOf(mustHave[i]);
    if (idx === -1) return "Hard mode: include " + mustHave[i] + ".";
    used[idx] = null;
  }
  return null;
}
function submit() {
  if (state.status !== "playing") return;
  if (state.current.length !== 4) return flash("Need 4 digits.", true);
  if (state.current[0] === "0") return flash("Use 1000-9999.", true);
  const err = hardModeError(state.current);
  if (err) return flash(err, true);
  const guess = state.current;
  state.guesses.push(guess);
  state.current = "";
  const marks = scoreGuess(guess, state.target);
  const rank = { correct: 3, present: 2, absent: 1 };
  for (let i = 0; i < 4; i++) {
    const d = guess[i];
    if (!state.keyHints[d] || rank[marks[i]] > rank[state.keyHints[d]]) state.keyHints[d] = marks[i];
  }
  const won = marks[0] === "correct" && marks[1] === "correct" && marks[2] === "correct" && marks[3] === "correct";
  if (won) state.status = "won";
  else {
    if (state.revealed < state.clues.length) state.revealed += 1;
    if (state.guesses.length >= 6) state.status = "lost";
  }
  persistDaily();
  if (state.mode === "daily" && (state.status === "won" || state.status === "lost")) recordStats(state.status === "won");
  renderAll();
  if (state.status !== "playing") setTimeout(function () { openStats(true); }, 450);
}
function isYesterday(prev, today) {
  const p = new Date(prev + "T00:00:00Z");
  const t = new Date(today + "T00:00:00Z");
  return (t - p) === 86400000;
}
function recordStats(win) {
  const stats = loadJSON(LS.stats, defaultStats());
  if (stats.lastDate === state.dateKey) return;
  stats.played += 1;
  if (win) {
    stats.wins += 1;
    stats.streak = (!stats.lastDate || isYesterday(stats.lastDate, state.dateKey)) ? (stats.streak || 0) + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak || 0, stats.streak);
    stats.dist[state.guesses.length - 1] += 1;
  } else {
    stats.streak = 0;
  }
  stats.lastDate = state.dateKey;
  saveJSON(LS.stats, stats);
}
function onKey(k) {
  if (k === "Enter") return submit();
  if (state.status !== "playing") return;
  if (k === "Back") state.current = state.current.slice(0, -1);
  else if (/^[0-9]$/.test(k) && state.current.length < 4) state.current += k;
  renderBoard();
}
function shareText() {
  const rows = state.guesses.map(function (g) {
    return scoreGuess(g, state.target).map(function (m) {
      return m === "correct" ? "\uD83D\uDFE9" : m === "present" ? "\uD83D\uDFE8" : "\u2B1B";
    }).join("");
  }).join("\n");
  const score = state.status === "won" ? String(state.guesses.length) : "X";
  const head = state.mode === "daily" ? "Numberle " + state.puzzleId + " " + score + "/6" : "Numberle Practice " + score + "/6";
  return head + "\n" + rows + "\nhttps://gundaif.github.io/Numberle/";
}
async function share() {
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ text: text });
    else {
      await navigator.clipboard.writeText(text);
      flash("Result copied.");
    }
  } catch (e) {
    try {
      await navigator.clipboard.writeText(text);
      flash("Result copied.");
    } catch (e2) {
      flash("Could not copy.", true);
    }
  }
}
function renderStats() {
  const stats = loadJSON(LS.stats, defaultStats());
  const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  document.getElementById("statsTitle").textContent =
    state.status === "won" ? "Code broken" : state.status === "lost" ? "It was " + state.target : "Statistics";
  document.getElementById("statsGrid").innerHTML = [
    [stats.played, "Played"],
    [pct, "Win %"],
    [stats.streak, "Streak"],
    [stats.maxStreak, "Max"]
  ].map(function (pair) {
    return '<div class="stat"><b>' + pair[0] + "</b><span>" + pair[1] + "</span></div>";
  }).join("");
  const max = Math.max(1, stats.dist[0], stats.dist[1], stats.dist[2], stats.dist[3], stats.dist[4], stats.dist[5]);
  document.getElementById("bars").innerHTML = stats.dist.map(function (n, i) {
    const winBar = state.status === "won" && state.mode === "daily" && state.guesses.length === i + 1;
    return '<div class="bar-row"><span>' + (i + 1) + '</span><div class="bar' + (winBar ? " win" : "") + '" style="width:' + Math.max(8, (n / max) * 100) + '%">' + n + "</div></div>";
  }).join("");
  tickCountdown();
}
function nextMidnightUtc() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}
function tickCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;
  if (state.mode !== "daily" || state.status === "playing") {
    el.textContent = state.mode === "practice" ? "Practice games do not affect streaks." : "";
    return;
  }
  const ms = Math.max(0, nextMidnightUtc() - Date.now());
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  el.textContent = "Next Numberle in " + h + ":" + m + ":" + s;
}
function openStats() {
  renderStats();
  document.getElementById("shareBtn").style.display = state.status === "playing" ? "none" : "block";
  document.getElementById("statsDlg").showModal();
}

document.getElementById("helpBtn").onclick = function () { document.getElementById("helpDlg").showModal(); };
document.getElementById("helpClose").onclick = function () { document.getElementById("helpDlg").close(); };
document.getElementById("statsBtn").onclick = function () { openStats(); };
document.getElementById("shareBtn").onclick = share;
document.getElementById("setBtn").onclick = function () { document.getElementById("setDlg").showModal(); };
document.getElementById("setClose").onclick = function () { document.getElementById("setDlg").close(); };
document.getElementById("darkToggle").onclick = function () {
  state.dark = !state.dark; applyTheme(); persistSettings();
};
document.getElementById("hardToggle").onclick = function () {
  if (state.mode === "daily" && state.guesses.length > 0 && state.status === "playing") {
    return flash("Hard mode locks after the first guess.", true);
  }
  state.hard = !state.hard; persistSettings(); renderAll();
};
document.getElementById("practiceBtn").onclick = function () {
  document.getElementById("statsDlg").close();
  startPuzzle({ mode: "practice" });
  flash("Practice board.");
};
document.getElementById("dailyBtn").onclick = function () {
  document.getElementById("setDlg").close();
  startPuzzle({ mode: "daily", dateKey: utcDateKey(), restore: true });
};
document.addEventListener("keydown", function (e) {
  if (document.querySelector("dialog[open]")) {
    if (e.key === "Escape") document.querySelector("dialog[open]").close();
    return;
  }
  if (e.key === "Enter") onKey("Enter");
  else if (e.key === "Backspace") { e.preventDefault(); onKey("Back"); }
  else if (/^[0-9]$/.test(e.key)) onKey(e.key);
});
setInterval(tickCountdown, 1000);
(function init() {
  const settings = loadJSON(LS.settings, {});
  state.dark = typeof settings.dark === "boolean" ? settings.dark : window.matchMedia("(prefers-color-scheme: dark)").matches;
  state.hard = !!settings.hard;
  applyTheme();
  startPuzzle({ mode: "daily", dateKey: utcDateKey(), restore: true });
  if (!localStorage.getItem(LS.seenHelp)) {
    document.getElementById("helpDlg").showModal();
    localStorage.setItem(LS.seenHelp, "1");
  }
})();
