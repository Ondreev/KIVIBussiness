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
  container.style.background = "#fff";
  container.style.color = "#000";
  container.style.borderRadius = "16px";
  container.style.padding = "16px";
  container.style.margin = "20px auto";
  container.style.width = "95%";
  container.style.maxWidth = "600px";
  container.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  container.style.fontFamily = "sans-serif";
  container.style.boxSizing = "border-box";

  let html = `<h3 style='margin-top:0;'>📌 Сегодня ${weekdayRu.charAt(0).toUpperCase() + weekdayRu.slice(1)}</h3>`;
  html += `<div style='margin-bottom:12px;'>Цель на день: <b>${planTo.toLocaleString("ru-RU")}₽</b>, трафик: <b>${planTraffic}</b></div>`;

  periods.forEach((p, idx) => {
    const toShare = dayPercents[p] || 0;
    const trShare = toShare;

    cumulativeTo += planTo * toShare;
    cumulativeTr += planTraffic * trShare;

    const highlight = (toShare === Math.max(...Object.values(dayPercents)))
      ? "background:#ffe082; font-weight:bold;"
      : "";

    html += `<div style='margin-bottom:8px; ${highlight} padding:4px 8px; border-radius:8px;'>` +
      `<b>${p}</b> — до ${p.split("–")[1]}: ` +
      `<b>${Math.round(cumulativeTo).toLocaleString("ru-RU")}₽</b>, ` +
      `трафик: <b>${Math.round(cumulativeTr)}</b>` +
      `</div>`;
  });

  container.innerHTML = html;
  document.querySelector("body").appendChild(container);
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
