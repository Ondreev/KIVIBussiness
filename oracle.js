// oracle.js — умный блок с прогнозом на день по выручке и трафику (независимый расчёт на основе таблицы)

const oracleUrls = {
  data: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv",
  plans: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=1774855984&single=true&output=csv"
};

const percentByWeekday = {
  "Monday":    { "09:00–12:00": 0.117, "12:00–15:00": 0.267, "15:00–18:00": 0.322, "18:00–21:00": 0.294 },
  "Tuesday":   { "09:00–12:00": 0.170, "12:00–15:00": 0.291, "15:00–18:00": 0.319, "18:00–21:00": 0.220 },
  "Wednesday": { "09:00–12:00": 0.177, "12:00–15:00": 0.248, "15:00–18:00": 0.252, "18:00–21:00": 0.316 },
  "Thursday":  { "09:00–12:00": 0.123, "12:00–15:00": 0.242, "15:00–18:00": 0.330, "18:00–21:00": 0.304 },
  "Friday":    { "09:00–12:00": 0.155, "12:00–15:00": 0.215, "15:00–18:00": 0.318, "18:00–21:00": 0.305 },
  "Saturday":  { "09:00–12:00": 0.182, "12:00–15:00": 0.333, "15:00–18:00": 0.293, "18:00–21:00": 0.192 },
  "Sunday":    { "09:00–12:00": 0.134, "12:00–15:00": 0.389, "15:00–18:00": 0.306, "18:00–21:00": 0.170 }
};

async function loadCSVOracle(url) {
  const res = await fetch(url);
  const text = await res.text();
  return Papa.parse(text, { header: true }).data;
}

function clean(val) {
  return parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));
}

async function runOracleSmart() {
  const [data, plans] = await Promise.all([
    loadCSVOracle(oracleUrls.data),
    loadCSVOracle(oracleUrls.plans)
  ]);

  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const thisMonthRows = data.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"]?.startsWith(ym) && d < now && r["ТО"];
  });

  const avgTo = Math.round(
    thisMonthRows.reduce((sum, r) => sum + clean(r["ТО"]), 0) / (thisMonthRows.length || 1)
  );
  const avgTr = Math.round(
    thisMonthRows.reduce((sum, r) => sum + parseInt(r["ТР"] || 0), 0) / (thisMonthRows.length || 1)
  );

  const planRow = plans.find(r => r["Месяц"] === ym);
  const planTo = Math.max(avgTo, parseInt(planRow?.["План по выручке"] || 0));
  const planTr = Math.max(avgTr, parseInt(planRow?.["План по трафику"] || 0));

  const weekdayEn = now.toLocaleDateString('en-US', { weekday: 'long' });
  const weekdayRu = now.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dayPercents = percentByWeekday[weekdayEn];
  if (!dayPercents) return;

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

  let html = `<div style='font-weight:900; font-size:24px; text-align:center; margin-bottom:12px;'>📌 Сегодня ${weekdayRu.charAt(0).toUpperCase() + weekdayRu.slice(1)}</div>`;
  html += `<div style='margin-bottom:20px; text-align:center; font-size:16px;'>Цель на день: <span style='font-size:20px; font-weight:700;'>${planTo.toLocaleString("ru-RU")}₽</span>, трафик: <b>${planTr}</b></div>`;

  const max = Math.max(...Object.values(dayPercents));
  let cumulativeTo = 0;
  let cumulativeTr = 0;

  Object.entries(dayPercents).forEach(([p, share]) => {
    const periodTo = Math.round(planTo * share);
    const periodTr = Math.round(planTr * share);
    cumulativeTo += periodTo;
    cumulativeTr += periodTr;

    const isPeak = share === max;
    const isNow = now.getHours() >= parseInt(p.split(":")[0]) && now.getHours() < parseInt(p.split("–")[1]);
    const bg = isPeak ? (isNow ? "#ffd200" : "#ffee99") : (isNow ? "#ff70a1" : "#ffc2d1");
    const border = isNow ? "3px solid white" : "none";

    html += `
      <div style="background:${bg}; margin-bottom:12px; padding:12px 16px; border-radius:12px; border:${border}; display:flex; justify-content:space-between; align-items:center; color:#000;">
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; width:100%; font-size:15px;">
          <div style="font-weight:600">${p}</div>
          <div>
            <div>${periodTo.toLocaleString('ru-RU')}₽</div>
            <div style="text-decoration: underline; font-size:13px;">${cumulativeTo.toLocaleString('ru-RU')}₽</div>
          </div>
          <div>
            <div>${periodTr} трафик</div>
            <div style="text-decoration: underline; font-size:13px;">${cumulativeTr} трафик</div>
          </div>
        </div>
        <div style="font-size:22px; padding-left:10px;">✔️</div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.body.appendChild(container);
}

document.addEventListener("DOMContentLoaded", runOracleSmart);
