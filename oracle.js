// oracle.js — умный блок с прогнозом на день по выручке и трафику

function runOracle(planToDOM, planTrafficDOM) {
  const percentByWeekday = {
    "Monday":    { "09–12": 0.117, "12–15": 0.267, "15–18": 0.322, "18–21": 0.294 },
    "Tuesday":   { "09–12": 0.170, "12–15": 0.291, "15–18": 0.319, "18–21": 0.220 },
    "Wednesday": { "09–12": 0.177, "12–15": 0.248, "15–18": 0.252, "18–21": 0.316 },
    "Thursday":  { "09–12": 0.123, "12–15": 0.242, "15–18": 0.330, "18–21": 0.304 },
    "Friday":    { "09–12": 0.155, "12–15": 0.215, "15–18": 0.318, "18–21": 0.305 },
    "Saturday":  { "09–12": 0.182, "12–15": 0.333, "15–18": 0.293, "18–21": 0.192 },
    "Sunday":    { "09–12": 0.134, "12–15": 0.389, "15–18": 0.306, "18–21": 0.170 }
  };

  const today = new Date();
  const weekdayEn = today.toLocaleDateString('en-US', { weekday: 'long' });
  const weekdayRu = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dayPercents = percentByWeekday[weekdayEn];
  if (!dayPercents) return;

  const planTo = Math.max(planToDOM, parseInt(document.getElementById("factTo")?.textContent.replace(/\D/g, "") || "0"));
  const planTraffic = planTrafficDOM;

  const periods = ["09–12", "12–15", "15–18", "18–21"];
  let cumulativeTo = 0;
  let cumulativeTr = 0;

  const container = document.createElement("div");
  container.style.background = "transparent";
  container.style.color = "#000";
  container.style.borderRadius = "16px";
  container.style.padding = "16px";
  container.style.margin = "20px auto";
  container.style.width = "95%";
  container.style.maxWidth = "600px";
  container.style.fontFamily = "sans-serif";
  container.style.boxSizing = "border-box";

  let html = `<div style='font-weight:bold; font-size:18px; margin-bottom:10px;'>📌 Сегодня ${weekdayRu.charAt(0).toUpperCase() + weekdayRu.slice(1)}</div>`;
  html += `<div style='margin-bottom:12px;'>Цель на день: <b>${planTo.toLocaleString("ru-RU")}₽</b>, трафик: <b>${planTraffic}</b></div>`;

  const max = Math.max(...Object.values(dayPercents));

  periods.forEach(p => {
    const toShare = dayPercents[p] || 0;
    const trShare = toShare;
    const periodTo = Math.round(planTo * toShare);
    const periodTr = Math.round(planTraffic * trShare);
    cumulativeTo += periodTo;
    cumulativeTr += periodTr;

    const isPeak = toShare === max;
    const bg = isPeak ? "#ffe082" : "#ffc0cb";

    // Заглушка: выполнено, если период до текущего времени
    const now = new Date();
    const endHour = parseInt(p.split("–")[1]);
    const status = now.getHours() >= endHour ? '✔️' : '—';

    html += `
      <div style="background:${bg}; margin-bottom:10px; padding:12px; border-radius:12px; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:bold; font-size:16px;">${p}</div>
          <div style="font-size:18px;">${status}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:4px;">
          <div><b>${periodTo.toLocaleString('ru-RU')}₽</b><br><span style="font-size:13px;">ТО</span></div>
          <div><b>${periodTr}</b><br><span style="font-size:13px;">трафик</span></div>
        </div>
        <div style="font-size:12px; color:#333; margin-top:6px;">по накоплению: <b>${cumulativeTo.toLocaleString('ru-RU')}₽</b>, трафик: <b>${cumulativeTr}</b></div>
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
