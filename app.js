/* US Citizenship quiz — 2025 civics test (128 Q). No build step. */
(function () {
  "use strict";

  var MODES = {
    standard: { total: 20, need: 12, pool: "all", label: "Standard quiz" },
    senior: { total: 10, need: 6, pool: "starred", label: "65/20 quiz" },
    weak: { total: 20, need: 12, pool: "weak", label: "Weak-spot practice" }
  };

  var STATS_KEY = "civics-stats-v1";

  var state = {
    mode: "standard",
    order: [],
    index: 0,
    correct: 0,
    wrong: 0,
    log: [], // {id, question, answers, category, starred, userCorrect}
    revealed: false,
    finishedEarly: false
  };

  function $(id) { return document.getElementById(id); }

  function bank() { return (typeof QUESTIONS !== "undefined" ? QUESTIONS : (window.QUESTIONS || [])); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- Per-question results (device only) ----------
  function loadStats() {
    try {
      var raw = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) { return {}; }
  }

  function saveStats(stats) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* private mode */ }
  }

  function recordStat(id, correct) {
    var stats = loadStats();
    var s = stats[id] || { seen: 0, correct: 0, wrong: 0, streak: 0, last: null, lastAt: null };
    s.seen++;
    if (correct) {
      s.correct++;
      s.streak = (s.streak || 0) + 1;
      s.last = "correct";
    } else {
      s.wrong++;
      s.streak = 0;
      s.last = "wrong";
    }
    s.lastAt = new Date().toISOString();
    stats[id] = s;
    saveStats(stats);
    return stats;
  }

  function statsSummary() {
    var stats = loadStats();
    var seen = 0, correctLast = 0, weak = 0;
    Object.keys(stats).forEach(function (id) {
      var s = stats[id];
      seen++;
      if (s.last === "correct") correctLast++;
      if (s.wrong > 0 && (s.last === "wrong" || s.correct === 0)) weak++;
    });
    return { stats: stats, seen: seen, correctLast: correctLast, weak: weak, total: bank().length };
  }

  function weightFor(stats, id) {
    var s = stats[id];
    if (!s) return 1.5;              // never seen: a bit more likely during weak practice
    if (s.last === "wrong") return 8; // missed last time: highest priority
    if (s.streak >= 2) return 0.5;    // known well: rare
    return 2;
  }

  function weightedSample(pool, n) {
    var stats = loadStats();
    var items = pool.slice();
    var out = [];
    while (out.length < n && items.length) {
      var total = 0;
      var weights = items.map(function (q) { var w = weightFor(stats, q.id); total += w; return w; });
      var r = Math.random() * total;
      var acc = 0, idx = items.length - 1;
      for (var i = 0; i < items.length; i++) {
        acc += weights[i];
        if (r <= acc) { idx = i; break; }
      }
      out.push(items[idx]);
      items.splice(idx, 1);
    }
    return out;
  }

  function showView(name) {
    ["home", "quiz", "results", "study"].forEach(function (v) {
      $("view-" + v).classList.toggle("hidden", v !== name);
    });
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      var target = b.getAttribute("data-nav");
      b.classList.toggle("active", target === name || (name === "quiz" && target === "home") || (name === "results" && target === "home"));
    });
    window.scrollTo(0, 0);
    if (name === "study") renderStudy();
    if (name === "home") renderHomeStats();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- Quiz ----------
  function startQuiz(mode) {
    var all = bank();
    if (!all || !all.length) {
      alert("Question bank failed to load.");
      return;
    }
    state.mode = mode;
    var cfg = MODES[mode];
    var pool;
    if (cfg.pool === "starred") {
      pool = all.filter(function (q) { return q.starred; });
      state.order = shuffle(pool).slice(0, cfg.total);
    } else if (cfg.pool === "weak") {
      // Missed questions first, then unseen, then the rest.
      var stats = loadStats();
      var weak = all.filter(function (q) {
        var s = stats[q.id];
        return s && s.wrong > 0 && (s.last === "wrong" || s.correct === 0);
      });
      var weakIds = {};
      weak.forEach(function (q) { weakIds[q.id] = true; });
      var unseen = all.filter(function (q) { return !stats[q.id] && !weakIds[q.id]; });
      var rest = all.filter(function (q) { return !weakIds[q.id] && stats[q.id]; });
      var ordered = weak.concat(shuffle(unseen)).concat(shuffle(rest));
      state.order = weightedSample(ordered, cfg.total);
    } else {
      pool = all.slice();
      state.order = shuffle(pool).slice(0, cfg.total);
    }
    state.index = 0;
    state.correct = 0;
    state.wrong = 0;
    state.log = [];
    state.finishedEarly = false;
    $("quiz-need").textContent = cfg.need;
    showView("quiz");
    renderQuestion();
  }

  function failThreshold() {
    var cfg = MODES[state.mode];
    return cfg.total - cfg.need + 1; // 9 for standard, 5 for senior
  }

  function renderQuestion() {
    var cfg = MODES[state.mode];
    var q = state.order[state.index];
    state.revealed = false;
    $("quiz-progress-text").textContent =
      cfg.label + " — Question " + (state.index + 1) + " of " + state.order.length;
    $("quiz-progress-fill").style.width = ((state.index) / state.order.length * 100) + "%";
    $("quiz-correct").textContent = state.correct;
    $("quiz-wrong").textContent = state.wrong;
    $("quiz-category").textContent = q.category + " · " + q.subcategory;
    $("quiz-starred").classList.toggle("hidden", !q.starred);
    $("quiz-qnum").textContent = "Q" + q.id + " of 128";
    $("quiz-question").textContent = q.question;
    $("quiz-answers").classList.add("hidden");
    $("quiz-answers").innerHTML = "";
    $("quiz-grade-row").classList.add("hidden");
    $("btn-reveal").classList.remove("hidden");
  }

  function revealAnswer() {
    var q = state.order[state.index];
    var box = $("quiz-answers");
    var items = q.answers.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    var note = q.dynamic
      ? '<p class="muted" style="margin:8px 0 0">⚠️ This answer can change. Verify at <a href="https://www.uscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates" target="_blank" rel="noopener">uscis.gov test updates</a>.</p>'
      : "";
    box.innerHTML = '<p class="answers-title">Accepted answer' + (q.answers.length > 1 ? "s" : "") + ' (any one is correct):</p><ul>' + items + "</ul>" + note;
    box.classList.remove("hidden");
    $("quiz-grade-row").classList.remove("hidden");
    $("btn-reveal").classList.add("hidden");
    state.revealed = true;
  }

  function grade(userCorrect) {
    if (!state.revealed) { revealAnswer(); return; }
    var q = state.order[state.index];
    state.log.push({
      id: q.id, question: q.question, answers: q.answers,
      category: q.category, starred: q.starred, userCorrect: !!userCorrect
    });
    if (userCorrect) state.correct++; else state.wrong++;
    recordStat(q.id, !!userCorrect);

    var cfg = MODES[state.mode];
    // Real-test early stop: pass at `need` correct, fail at `total-need+1` wrong.
    if (state.correct >= cfg.need || state.wrong >= failThreshold()) {
      state.finishedEarly = true;
      finishQuiz();
      return;
    }
    state.index++;
    if (state.index >= state.order.length) {
      finishQuiz();
    } else {
      renderQuestion();
    }
  }

  function finishQuiz() {
    var cfg = MODES[state.mode];
    var asked = state.log.length;
    var passed = state.correct >= cfg.need;
    $("quiz-progress-fill").style.width = "100%";

    var banner = $("result-banner");
    banner.className = "card result-banner " + (passed ? "pass" : "fail");
    var stopNote = state.finishedEarly
      ? "<p class=\"muted\">Stopped early like the real test (officer stops at " + cfg.need + " correct or " + failThreshold() + " wrong).</p>"
      : "";
    banner.innerHTML =
      "<h2 style=\"margin:0\">" + (passed ? "🎉 You passed!" : "❌ Not quite — try again") + "</h2>" +
      '<div class="result-score">' + state.correct + " / " + asked + " correct</div>" +
      "<p>Need <strong>" + cfg.need + " / " + cfg.total + "</strong> to pass" +
      (state.mode === "senior" ? " (65/20 test)." : " (2025 civics test).") + "</p>" + stopNote;

    var list = $("results-list");
    list.innerHTML = state.log.map(function (r, i) {
      var cls = r.userCorrect ? "right" : "wrong";
      var tag = r.userCorrect
        ? '<span class="verdict right">You: correct</span>'
        : '<span class="verdict wrong">You: missed</span>';
      var answers = r.answers.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
      return '<div class="review-item ' + cls + '">' +
        '<p class="review-q">' + (i + 1) + ". " + esc(r.question) + tag + "</p>" +
        '<div class="review-meta">Q' + r.id + " · " + esc(r.category) + (r.starred ? " · 65/20 *" : "") + "</div>" +
        '<ul class="review-answers">' + answers + "</ul></div>";
    }).join("");

    try {
      var key = "civics-best-" + state.mode;
      var prev = JSON.parse(localStorage.getItem(key) || "null");
      var entry = { score: state.correct, asked: asked, date: new Date().toISOString() };
      if (!prev || entry.score > prev.score) localStorage.setItem(key, JSON.stringify(entry));
      var n = parseInt(localStorage.getItem("civics-attempts") || "0", 10) + 1;
      localStorage.setItem("civics-attempts", String(n));
    } catch (e) { /* private mode */ }

    showView("results");
  }

  // ---------- Study ----------
  function renderStudy() {
    var q = ($("study-search").value || "").toLowerCase();
    var f = $("study-filter").value;
    var starredOnly = $("study-starred").checked;
    var all = bank();
    var rows = all.filter(function (item) {
      if (f !== "all" && item.category !== f) return false;
      if (starredOnly && !item.starred) return false;
      if (!q) return true;
      return (item.question + " " + item.answers.join(" ")).toLowerCase().indexOf(q) !== -1;
    });
    $("study-count").textContent = "Showing " + rows.length + " of " + all.length + " questions.";
    $("study-list").innerHTML = rows.map(function (item) {
      var answers = item.answers.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
      return '<details class="study-item" open>' +
        "<summary>Q" + item.id + ". " + esc(item.question) +
        (item.starred ? ' <span class="badge star"></span>' : "") +
        '<div class="s-meta">' + esc(item.category) + " · " + esc(item.subcategory) + (item.dynamic ? " · answer may change" : "") + "</div></summary>" +
        "<ul>" + answers + "</ul></details>";
    }).join("");
  }

  function renderHomeStats() {
    var summary = statsSummary();
    var pct = summary.total ? Math.round(summary.seen / summary.total * 100) : 0;
    $("coverage-count").textContent = summary.seen + " / " + summary.total + " seen";
    $("coverage-fill").style.width = pct + "%";
    $("coverage-bar").setAttribute("aria-valuemax", String(summary.total));
    $("coverage-bar").setAttribute("aria-valuenow", String(summary.seen));

    var attempts = "0";
    var best = null;
    try {
      attempts = localStorage.getItem("civics-attempts") || "0";
      best = JSON.parse(localStorage.getItem("civics-best-standard") || "null");
    } catch (e) { /* ignore */ }

    var bits = [];
    if (attempts === "0") {
      bits.push("No quizzes finished yet on this device.");
    } else {
      bits.push("Quizzes finished: " + attempts);
      if (best) bits.push("Best standard score: " + best.score + "/" + best.asked);
    }
    if (summary.seen) {
      bits.push("Correct on last try: " + summary.correctLast + "/" + summary.seen);
    }
    $("home-stats").textContent = bits.join(" · ");

    var weakBtn = $("btn-start-weak");
    if (weakBtn) {
      weakBtn.disabled = summary.seen === 0;
      weakBtn.textContent = summary.weak > 0
        ? "Practice " + summary.weak + " weak spot" + (summary.weak === 1 ? "" : "s")
        : "Practice weak spots";
    }
  }

  function resetProgress() {
    var ok = window.confirm("Reset all saved scores and per-question progress on this device? This cannot be undone.");
    if (!ok) return;
    try {
      localStorage.removeItem(STATS_KEY);
      localStorage.removeItem("civics-attempts");
      localStorage.removeItem("civics-best-standard");
      localStorage.removeItem("civics-best-senior");
      localStorage.removeItem("civics-best-weak");
    } catch (e) { /* ignore */ }
    renderHomeStats();
  }

  // ---------- Wire ----------
  document.addEventListener("DOMContentLoaded", function () {
    $("btn-start-standard").addEventListener("click", function () { startQuiz("standard"); });
    $("btn-start-senior").addEventListener("click", function () { startQuiz("senior"); });
    $("btn-start-weak").addEventListener("click", function () { startQuiz("weak"); });
    $("btn-reset-stats").addEventListener("click", resetProgress);
    $("btn-reveal").addEventListener("click", revealAnswer);
    $("btn-correct").addEventListener("click", function () { grade(true); });
    $("btn-wrong").addEventListener("click", function () { grade(false); });
    $("btn-quit").addEventListener("click", function () {
      if (state.log.length === 0) { showView("home"); return; }
      finishQuiz();
    });
    $("btn-retry").addEventListener("click", function () { startQuiz(state.mode); });
    $("btn-home").addEventListener("click", function () { showView("home"); });
    $("btn-review-study").addEventListener("click", function () { showView("study"); });
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.addEventListener("click", function () { showView(b.getAttribute("data-nav")); });
    });
    ["study-search", "study-filter", "study-starred"].forEach(function (id) {
      $(id).addEventListener("input", renderStudy);
      $(id).addEventListener("change", renderStudy);
    });
    renderHomeStats();
  });
})();
