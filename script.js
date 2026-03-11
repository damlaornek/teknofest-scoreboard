// ====== AYARLAR ======
const SHEET_ID = "1H0CHwZDOZ-TgvjJzrwSiDzgYTpn7J7kZZCNUbHFTag8";

const TEAM_SHEET = "Form Yanıtları 0"

const TASK_SHEETS = [
  
  { task: 1, name: "Form Yanıtları 1" },
  { task: 2, name: "Form Yanıtları 2" },
  { task: 3, name: "Form Yanıtları 3" },
  { task: 4, name: "Form Yanıtları 4" },
  { task: 5, name: "Form Yanıtları 5" }
];

const TEAM_COL = "Takım adınızı giriniz.";
const TASK_POINTS = {

  1: 100,
  2: 50,
  3: 100,
  4: 100,
  5: 150
};

const START_TIME = new Date(); // etkinlik günü değiştir
const REFRESH_MS = 5000;


// ====== TIMER (GEÇEN SÜRE) ======
function startElapsedTimer() {
  setInterval(() => {
    const now = new Date();
    let diff = Math.floor((now - START_TIME) / 1000);
    if (diff < 0) diff = 0;

    const h = String(Math.floor(diff / 3600)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
    const s = String(diff % 60).padStart(2, "0");

    const el = document.getElementById("timerValue");
    if (el) el.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

// ====== GOOGLE SHEETS OKUMA ======
async function fetchSheet(sheetName) {
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet okunamadı: ${sheetName}`);
  return await res.json();
}

// ====== TIMESTAMP PARSE ======
function parseTimestamp(ts) {
  if (!ts) return null;

  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d;

  const m = ts.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yy = Number(m[3]);
    const hh = Number(m[4] || 0);
    const mi = Number(m[5] || 0);
    const ss = Number(m[6] || 0);
    const dt = new Date(yy, mm, dd, hh, mi, ss);
    if (!isNaN(dt.getTime())) return dt;
  }

  return null;
}

// ====== SKOR HESAPLAMA ======
async function computeScores() {
  const teamData = {};

  // ===== TAKIM KAYITLARINI ÇEK =====
const teamRows = await fetchSheet("Form Yanıtları 0");

for (const row of teamRows) {

  const team = (row[TEAM_COL] || "").trim();
  if (!team) continue;

  if (!teamData[team]) {
    teamData[team] = {
      done: new Set(),
      times: {},
      finishTime: null,
      score: 0
    };
  }

}

  for (const t of TASK_SHEETS) {
    const rows = await fetchSheet(t.name);

    for (const row of rows) {
      const team = (row[TEAM_COL] || row["Takım adınızı giriniz"] || "").trim();
      if (!team) continue;

      const ts = row["Zaman damgası"] || row["Timestamp"] || row["Zaman damgası "] || null;
      const dt = parseTimestamp(ts);

      if (!teamData[team]) {
        teamData[team] = {
          done: new Set(),
          times: {},
          finishTime: null,
          score: 0
        };
      }

      teamData[team].done.add(t.task);

      if (dt) {
        const prev = teamData[team].times[t.task];
        if (!prev || dt < prev) teamData[team].times[t.task] = dt;
      } else if (!teamData[team].times[t.task]) {
        teamData[team].times[t.task] = null;
      }
    }
  }

  const results = [];

  for (const [team, info] of Object.entries(teamData)) {
    info.score = Array.from(info.done).reduce((total, task) => total + TASK_POINTS[task], 0);

    const needed = [1, 2, 3, 4, 5];
    const allDone = needed.every(k => info.done.has(k));

    if (allDone) {
      const times = needed.map(k => info.times[k]).filter(x => x instanceof Date);
      if (times.length === 5) {
        info.finishTime = new Date(Math.max(...times.map(d => d.getTime())));
      }
    }

    results.push({
      team,
      score: info.score,
      done: Array.from(info.done).sort((a, b) => a - b),
      finishTime: info.finishTime
    });
  }

  const finishers = results.filter(r => r.score >= 500);
  let winner = null;

  const withTime = finishers
    .filter(f => f.finishTime instanceof Date)
    .sort((a, b) => a.finishTime - b.finishTime);

  if (withTime.length > 0) {
    winner = withTime[0];
  } else if (finishers.length > 0) {
    winner = finishers.sort((a, b) => b.score - a.score || a.team.localeCompare(b.team))[0];
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const at = a.finishTime ? a.finishTime.getTime() : Infinity;
    const bt = b.finishTime ? b.finishTime.getTime() : Infinity;
    if (at !== bt) return at - bt;
    return a.team.localeCompare(b.team);
  });

  return { results, winner };
}

// ====== UI YARDIMCILARI ======
function rankClass(i) {
  if (i === 0) return "gold";
  if (i === 1) return "silver";
  if (i === 2) return "bronze";
  return "";
}

function pointsClass(i) {
  if (i === 0) return "gold";
  if (i === 1) return "blue";
  if (i === 2) return "purple";
  return "";
}

function launchConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.6 }
    });
  }
}

function showWinner(team, time) {
  const winnerName = document.getElementById("winnerName");
  const winnerTime = document.getElementById("winnerTime");
  const winnerPopup = document.getElementById("winnerPopup");

  if (winnerName) winnerName.textContent = team;
  if (winnerTime) winnerTime.textContent = "Süre: " + time;
  if (winnerPopup) winnerPopup.classList.remove("hidden");

  launchConfetti();
}

// ====== LEADERBOARD ÇİZİMİ ======
function renderLeaderboard(results, winner) {
  const el = document.getElementById("leaderboardRows");
  if (!el) return;

  el.innerHTML = "";

  results.forEach((r, i) => {
    const missions = [1, 2, 3, 4, 5]
      .map(g => {
        const done = r.done.includes(g) ? "done" : "";
        return `<span class="m ${done}">G${g}</span>`;
      })
      .join("");

    const isWinner = winner && winner.team === r.team;
    const statusText = isWinner ? "KAZANAN" : (r.done.length === 5 ? "BİTİRDİ" : "Devam Ediyor");
    const statusLeader = isWinner ? "leader" : "";
    const crown = isWinner ? `<span class="crown">👑</span>` : "";

    el.innerHTML += `
      <div class="row score-flash">
        <div class="rank ${rankClass(i)}">${i + 1}</div>

        <div class="team">
          <div class="badge">⚙️</div>
          <div>${r.team}</div>
        </div>

        <div class="missions">${missions}</div>

        <div class="points ${pointsClass(i)}">${r.score}</div>

        <div class="status ${statusLeader}">
          ${crown} ${statusText}
        </div>
      </div>
    `;
  });

  const ticker = document.getElementById("tickerText");
  if (!ticker) return;


  if (winner) {
    let winTimeText = "";
    let shortTime = "";

    if (winner.finishTime instanceof Date) {
      const sec = Math.floor((winner.finishTime - START_TIME) / 1000);
      const h = String(Math.floor(sec / 3600)).padStart(2, "0");
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      shortTime = `${h}:${m}:${s}`;
      winTimeText = ` — SÜRE: ${shortTime}`;
    }

    ticker.textContent = `🏁 KAZANAN: ${winner.team}${winTimeText}`;

    if (!winnerShown) {
      winnerShown = true;
      showWinner(winner.team, shortTime || "Belirsiz");
    }
  } else {
    ticker.textContent = `⚡ Yeni görev tamamlandı! Skorlar güncellendi`;
  }
}

// ====== BASİT TEST YÜKLEME ======
async function loadScores() {
  const data = await fetchSheet("Form Yanıtları 1");
  console.log("Form Yanıtları 1:", data);
}

// ====== DÖNGÜ ======
async function tick() {
  try {
    const { results, winner } = await computeScores();
    renderLeaderboard(results, winner);
  } catch (e) {
    const ticker = document.getElementById("tickerText");
    if (ticker) ticker.textContent = "Veri okunamadı. Sheets paylaşımını kontrol et.";
    console.error(e);
  }
}

startElapsedTimer();
tick();
setInterval(tick, REFRESH_MS);

loadScores();
setInterval(loadScores, 10000);