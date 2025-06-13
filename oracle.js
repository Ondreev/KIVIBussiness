// oracle.js — умный блок с прогнозом на день по выручке и трафику

function runOracle(planToDOM, planTrafficDOM) {
  const percentByWeekday = {
    "Monday":    { "09:00–12:00": 0.117, "12:00–15:00": 0.267, "15:00–18:00": 0.322, "18:00–21:00": 0.294 },
    "Tuesday":   { "09:00–12:00": 0.170, "12:00–15:00": 0.291, "15:00–18:00": 0.319, "18:00–21:00": 0.220 },
    "Wednesday": { "09:00–12:00": 0.177, "12:00–15:00": 0.248, "15:00–18:00": 0.252, "18:00–21:00": 0.316 },
    "Thursday":  { "09:00–12:00": 0.123, "12:00–15:00": 0.242, "15:00–18:00": 0.330, "18:00–21:00": 0.304 },
    "Friday":    { "09:00–12:00": 0.155, "12:00–15:00": 0.215, "15:00–18:00": 0.318, "18:00–21:00": 0.305 },
    "Saturday":  { "09:00–12:00": 0.182, "12:00–15:00": 0.333, "15:00–18:00": 0.293, "18:00–21:00": 0.192 },
    "Sunday":    { "09:00–12:00": 0.134, "12:00–15:00": 0.389, "15:00–18:00": 0.306, "18:00–21:00": 0.170 }
  };

  const today = new Date();
  const weekdayEn = today.toLocaleDateString('en-US', { weekday: 'long' });
  const weekdayRu = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dayPercents = percentByWeekday[weekdayEn];
  if (!dayPercents) return;

  const planTo = Math.max(planToDOM, parseInt(document.getElementById("factTo")?.textContent.replace(/\D/g, "") || "0"));
  const planTraffic = planTrafficDOM;

  const periods = Object.keys(dayPercents);
  let cumulativeTo = 0;
  let cumulativeTr = 0;

  const container = document.createElement("div");
  container.style.background = "transparent";
  container.style.color = "#fff";
  container.style.borderRadius = "16px";
  container.style.padding = "16px";
  container.style.margin = "20px auto";
  container.style.width = "95%";
  container.style.maxWidth = "600px";
  container.style.fontFamily = "sans-serif";
  container.style.boxSizing = "border-box";

  let html = `<div style='font-weight:900; font-size:20px; margin-bottom:10px;'>📌 Сегодня ${weekdayRu.charAt(0).toUpperCase() + weekdayRu.slice(1)}</div>`;
  html += `<div style='margin-bottom:18px; font-size:16px;'>Цель на день:<br><span style='font-size:22px; font-weight:900;'>${planTo.toLocaleString("ru-RU")}₽</span><br>трафик: <b>${planTraffic}</b></div>`;

  const max = Math.max(...Object.values(dayPercents));
  const now = new Date();

  periods.forEach(p => {
    const toShare = dayPercents[p] || 0;
    const trShare = toShare;
    const periodTo = Math.round(planTo * toShare);
    const periodTr = Math.round(planTraffic * trShare);
    cumulativeTo += periodTo;
    cumulativeTr += periodTr;

    const isPeak = toShare === max;
    const bg = isPeak ? "#ffe082" : "#ff8fb1";
    const endHour = parseInt(p.split(":")[0]);
    const status = now.getHours() >= endHour ? '✔️' : '—';

    html += `
      <div style="background:${bg}; margin-bottom:10px; padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="flex: 1;">
          <div style="font-weight:700; font-size:15px;">${p}</div>
          <div style="display: flex; gap: 18px; margin-top: 6px; font-size: 18px; font-weight: 800;">
            <div>${periodTo.toLocaleString('ru-RU')}₽</div>
            <div>${periodTr} трафик</div>
          </div>
          <div style="margin-top: 6px; font-size: 12px;">по накоплению: <b>${cumulativeTo.toLocaleString('ru-RU')}₽</b>, трафик: <b>${cumulativeTr}</b></div>
        </div>
        <div style="font-size:24px; padding-left:10px;">${status}</div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.body.appendChild(container);
}

function waitForPlanData(retries = 10) {
  const toEl = document.getElementById("planTo");
  const trEl = document.getElementById("planTraffic");
  if (!toEl || !trEl) return;

  const to = parseInt(toEl.textContent.replace(/\D/g, "")) || 0;
  const tr = parseInt(trEl.textContent.replace(/\D/g, "")) || 0;

  if (to > 0 && tr > 0) {
    runOracle(to, tr);
  } else if (retries > 0) {
    setTimeout(() => waitForPlanData(retries - 1), 300);
  }
}

waitForPlanData();
