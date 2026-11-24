/* ===== בחירת כיתה במשחקים + שעון לשיעור היומי ===== */
(function () {
  const GR = [[3, "ג׳"], [4, "ד׳"], [5, "ה׳"], [6, "ו׳"], [7, "ז׳"]];
  try { const v = Number(localStorage.getItem("kh_grade")); if (v >= 3 && v <= 7) window.ARCADE_GRADE = v; } catch (e) {}
  let box = null;

  function label(g) { const f = GR.find(x => x[0] === g); return f ? f[1] : ""; }
  function setGrade(g) {
    window.ARCADE_GRADE = g;
    try { localStorage.setItem("kh_grade", String(g)); } catch (e) {}
    paint();
  }
  function ensure() {
    const grid = document.getElementById("arcadeGrid");
    if (!grid) return null;
    if (!box || !box.isConnected) {
      box = document.createElement("div");
      box.className = "grade-picker";
      grid.parentNode.insertBefore(box, grid);
    }
    return box;
  }
  function paint() {
    const b = ensure();
    if (!b) return;
    b.innerHTML = "";
    const cur = Number(window.ARCADE_GRADE) || 0;
    const t = document.createElement("strong");
    t.textContent = "באיזו כיתה אתם?";
    b.appendChild(t);
    const row = document.createElement("div");
    row.className = "grade-row";
    [[0, "כל הכיתות"]].concat(GR).forEach(pair => {
      const bt = document.createElement("button");
      bt.type = "button";
      bt.className = "grade-chip" + (cur === pair[0] ? " on" : "");
      bt.textContent = pair[0] ? "כיתה " + pair[1] : pair[1];
      bt.addEventListener("click", () => setGrade(pair[0]));
      row.appendChild(bt);
    });
    b.appendChild(row);
    const note = document.createElement("p");
    note.className = "grade-note";
    note.textContent = cur
      ? "משחקי הטנקים ישאלו עכשיו רק על הסרטונים של כיתה " + label(cur) + ". אם אין מספיק שאלות לכיתה, יתווספו שאלות מכיתות סמוכות."
      : "בחרו כיתה, ומשחקי הטנקים ישאלו רק על הסרטונים של הכיתה שלכם.";
    b.appendChild(note);
  }

  const origMenu = window.arcadeMenu;
  if (typeof origMenu === "function") {
    window.arcadeMenu = function () {
      const r = origMenu.apply(this, arguments);
      paint();
      if (box) box.hidden = false;
      return r;
    };
  }
  const origPlay = window.arcadePlay;
  if (typeof origPlay === "function") {
    window.arcadePlay = function () {
      const r = origPlay.apply(this, arguments);
      if (box) box.hidden = true;
      return r;
    };
  }

  /* השיעור היומי: מתחלף בחצות לשיעור אחר, גם אם הדף נשאר פתוח, ועם שעון עד השיעור הבא */
  const origLesson = window.renderDailyLesson;
  if (typeof origLesson === "function") {
    let shownDay = null;
    let timer = null;
    const fmt = ms => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const p = n => String(n).padStart(2, "0");
      return p(Math.floor(s / 3600)) + ":" + p(Math.floor((s % 3600) / 60)) + ":" + p(s % 60);
    };
    const untilMidnight = () => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 0, 0) - n;
    };
    const tick = () => {
      if (shownDay !== null && localDayNumber() !== shownDay) { render(); return; }
      const el = document.getElementById("lessonNext");
      if (el) el.textContent = "שיעור חדש בעוד " + fmt(untilMidnight());
    };
    function render() {
      origLesson();
      shownDay = localDayNumber();
      const card = document.getElementById("lessonCard");
      if (!card || !card.lastElementChild) return;
      const d = document.createElement("div");
      d.className = "lesson-next";
      d.id = "lessonNext";
      card.lastElementChild.appendChild(d);
      tick();
      if (!timer) timer = setInterval(tick, 1000);
    }
    window.renderDailyLesson = render;
    render();
  }
})();

