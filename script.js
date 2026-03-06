// ====== AYARLAR ======
const SHEET_ID = "1H0CHwZDOZ-TgvjJzrwSiDzgYTpn7J7kZZCNUbHFTag8";

async function fetchSheet(sheetName){
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${sheetName}`;
  const res = await fetch(url);
  return await res.json();
}

// Sekme adların (Sheets'tekiyle bire bir aynı olmalı)
const TASK_SHEETS = [
  { task: 1, name: "Form Yanıtları 1" },
  { task: 2, name: "Form Yanıtları 2" },
  { task: 3, name: "Form Yanıtları 3" },
  { task: 4, name: "Form Yanıtları 4" },
  { task: 5, name: "Form Yanıtları 5" },
];

 let winnerShown = false;

 if(winner && !winnerShown){

winnerShown = true;

showWinner(winner.team, winTime);

}

// Sütun başlığı (Sheets'te görünen yazıyla bire bir aynı olmalı)
const TEAM_COL = "Takım adınızı giriniz.";

// Puanlama
const TASK_POINTS = {
  1: 100,
  2: 50,
  3: 100,
  4: 100,
  5: 150
};

// Timer başlangıcı (bunu etkinlik günü değiştir)
// Örnek: 2026-03-06 14:00:00
const START_TIME = new Date("2026-03-06T14:00:00"); // !!!!Yarışma günü revize edilecek!!!!

// Kaç saniyede bir güncellensin
const REFRESH_MS = 5000;


// ====== TIMER (GEÇEN SÜRE) ======
function startElapsedTimer(){
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


// ====== GOOGLE SHEETS JSON OKUMA ======
async function fetchSheet(sheetName){
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Sheet okunamadı: ${sheetName}`);
  return await res.json();
}

async function loadScores(){

  const data = await fetchSheet("Form Yanıtları 1");
  console.log(data);

  const table = document.getElementById("leaderboardRows");

  table.innerHTML = "";

  data.forEach((row, index) => {

    const team = row["Takım adınızı giriniz"];

    table.innerHTML += `
      <div class="row">
        <div class="rank">${index+1}</div>
        <div class="team">${team}</div>
        <div class="missions">G1</div>
        <div class="points">100</div>
        <div class="status">Devam</div>
      </div>
    `;

  });

}


// ====== TIMESTAMP PARSE (Türkçe formatlara dayanıklı) ======
function parseTimestamp(ts){
  // Opensheet genelde "YYYY-MM-DD HH:MM:SS" gibi verir, bazen "DD.MM.YYYY HH:MM:SS" olabilir.
  if(!ts) return null;

  // ISO gibi görünüyorsa:
  let d = new Date(ts);
  if(!isNaN(d.getTime())) return d;

  // "DD.MM.YYYY HH:MM:SS" veya "DD/MM/YYYY HH:MM:SS"
  const m = ts.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m){
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yy = Number(m[3]);
    const hh = Number(m[4] || 0);
    const mi = Number(m[5] || 0);
    const ss = Number(m[6] || 0);
    const dt = new Date(yy, mm, dd, hh, mi, ss);
    if(!isNaN(dt.getTime())) return dt;
  }

  return null;
}


// ====== SKOR HESAPLAMA + KAZANAN ======
async function computeScores(){
  // teamData[team] = { done:Set, times: {task: earliestDate}, finishTime: Date|null }
  const teamData = {};

  for(const t of TASK_SHEETS){
    const rows = await fetchSheet(t.name);

    for(const row of rows){
      const team = (row[TEAM_COL] || "").trim();
      if(!team) continue;

      // zaman damgası kolonunu otomatik bulmaya çalışalım:
      // görüntünde "Zaman damgası" var.
      const ts = row["Zaman damgası"] || row["Timestamp"] || row["Zaman damgası "] || null;
      const dt = parseTimestamp(ts);

      if(!teamData[team]){
        teamData[team] = { done: new Set(), times: {}, finishTime: null, score: 0 };
      }

      // görev tamamlanmış say
      teamData[team].done.add(t.task);

      // o görev için en erken timestamp'ı tut
      if(dt){
        const prev = teamData[team].times[t.task];
        if(!prev || dt < prev) teamData[team].times[t.task] = dt;
      } else {
        // timestamp gelmezse yine de done say, ama winner hesabında zayıf kalır.
        if(!teamData[team].times[t.task]) teamData[team].times[t.task] = null;
      }
    }
  }

  // puan ve finishTime hesapla
  const results = [];
  for(const [team, info] of Object.entries(teamData)){
    const doneCount = info.done.size;
    info.score = Array.from(info.done)
  .reduce((total, task) => total + TASK_POINTS[task], 0);

    // Bitirme zamanı: 5 görevin hepsinin EN ERKEN kayıtları varsa,
    // finishTime = bu 5 zamanın MAX'ı (son görevin bitişi)
    const needed = [1,2,3,4,5];
    const allDone = needed.every(k => info.done.has(k));

    if(allDone){
      const times = needed.map(k => info.times[k]).filter(x => x instanceof Date);
      if(times.length === 5){
        info.finishTime = new Date(Math.max(...times.map(d => d.getTime())));
      } else {
        // timestamp eksikse finishTime null kalır (yine de allDone true)
        info.finishTime = null;
      }
    }

    results.push({
      team,
      score: info.score,
      done: Array.from(info.done).sort((a,b)=>a-b),
      finishTime: info.finishTime
    });
  }

  // Winner: önce "tüm görevleri tamamlayan"lar, sonra finishTime en küçük
  const finishers = results.filter(r => r.score >= 500);
  let winner = null;

  const withTime = finishers.filter(f => f.finishTime instanceof Date)
    .sort((a,b)=>a.finishTime - b.finishTime);

  if(withTime.length > 0){
    winner = withTime[0];
  } else if(finishers.length > 0){
    // timestamp yoksa yine de bitiren var: puanı yüksek olan + alfabetik
    winner = finishers.sort((a,b)=> b.score - a.score || a.team.localeCompare(b.team))[0];
  }

  // Leaderboard sıralaması: puan desc, sonra finishTime asc (varsa), sonra takım adı
  results.sort((a,b)=>{
    if(b.score !== a.score) return b.score - a.score;
    const at = a.finishTime ? a.finishTime.getTime() : Infinity;
    const bt = b.finishTime ? b.finishTime.getTime() : Infinity;
    if(at !== bt) return at - bt;
    return a.team.localeCompare(b.team);
  });
return { results, winner };

}


// ====== UI'YA BASMA (Senin dashboard layout'unla uyumlu) ======
function rankClass(i){
  if(i===0) return "gold";
  if(i===1) return "silver";
  if(i===2) return "bronze";
  return "";
}
function pointsClass(i){
  if(i===0) return "gold";
  if(i===1) return "blue";
  if(i===2) return "purple";
  return "";
}

function renderLeaderboard(results, winner){
    // leaderboard çiziliyor

      const el = document.getElementById("leaderboardRows");
  if(!el) return;
}

function showWinner(team,time){


  const el = document.getElementById("leaderboardRows");
  if(!el) return;
}

document.getElementById("winnerName").textContent = team
document.getElementById("winnerTime").textContent = "Süre: " + time

document.getElementById("winnerPopup").classList.remove("hidden")

launchConfetti()
  
  el.innerHTML = "";

  results.forEach((r, i) => {
    const missions = [1,2,3,4,5].map(g => {
      const done = r.done.includes(g) ? "done" : "";
      return `<span class="m ${done}">G${g}</span>`;
    }).join("");

    const isWinner = winner && winner.team === r.team;
    const statusText = isWinner ? "KAZANAN" : (r.done.length === 5 ? "BİTİRDİ" : "Devam Ediyor");
    const statusLeader = isWinner ? "leader" : "";
    const crown = isWinner ? `<span class="crown">👑</span>` : "";

    el.innerHTML += `
      <div class="row score-flash">
        <div class="rank ${rankClass(i)}">${i+1}</div>

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

  // ticker
  const ticker = document.getElementById("tickerText");
  if(ticker){
    if(winner){

let winTime = ""

if(winner.finishTime){

const sec = Math.floor((winner.finishTime - START_TIME)/1000)

let h = String(Math.floor(sec/3600)).padStart(2,"0")
let m = String(Math.floor((sec%3600)/60)).padStart(2,"0")
let s = String(sec%60).padStart(2,"0")

winTime = `${h}:${m}:${s}`

}

showWinner(winner.team, winTime)

}
      let winTimeText = "";
      if(winner.finishTime instanceof Date){
        const sec = Math.floor((winner.finishTime - START_TIME)/1000);
        const h = String(Math.floor(sec/3600)).padStart(2,"0");
        const m = String(Math.floor((sec%3600)/60)).padStart(2,"0");
        const s = String(sec%60).padStart(2,"0");
        winTimeText = ` — SÜRE: ${h}:${m}:${s}`;
      }
      ticker.textContent = `🏁 KAZANAN: ${winner.team}${winTimeText}`;
    } else {
      ticker.textContent = `⚡ Yeni görev tamamlandı! Skorlar güncellendi`;
    }


// ====== DÖNGÜ ======
async function tick(){
  try{
    const { results, winner } = await computeScores();
    renderLeaderboard(results, winner);
  } catch(e){
    const ticker = document.getElementById("tickerText");
    if(ticker) ticker.textContent = "Veri okunamadı. Sheets paylaşımını kontrol et.";
    console.error(e);
  }
}

startElapsedTimer();
tick();
setInterval(tick, REFRESH_MS);

loadScores();
setInterval(loadScores, 10000);