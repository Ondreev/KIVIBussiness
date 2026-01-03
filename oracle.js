// oracle.js — прогноз по тайм-слотам, средняя только ДО ВЧЕРА (как в старой логике)
(function () {
  // распределение выручки по слотам
  const percentByWeekday = {
    Monday:    { "09:00–12:00": 0.117, "12:00–15:00": 0.267, "15:00–18:00": 0.322, "18:00–21:00": 0.294 },
    Tuesday:   { "09:00–12:00": 0.170, "12:00–15:00": 0.291, "15:00–18:00": 0.319, "18:00–21:00": 0.220 },
    Wednesday: { "09:00–12:00": 0.177, "12:00–15:00": 0.248, "15:00–18:00": 0.252, "18:00–21:00": 0.316 },
    Thursday:  { "09:00–12:00": 0.123, "12:00–15:00": 0.242, "15:00–18:00": 0.330, "18:00–21:00": 0.304 },
    Friday:    { "09:00–12:00": 0.155, "12:00–15:00": 0.215, "15:00–18:00": 0.318, "18:00–21:00": 0.305 },
    Saturday:  { "09:00–12:00": 0.182, "12:00–15:00": 0.333, "15:00–18:00": 0.293, "18:00–21:00": 0.192 },
    Sunday:    { "09:00–12:00": 0.134, "12:00–15:00": 0.389, "15:00–18:00": 0.306, "18:00–21:00": 0.170 }
  };

  // локальные утилиты (без конфликтов с другими файлами)
  const ORACLE_COLS = { date: ["Дата"], revenue: ["ТО", "TO"], traffic: ["ТР", "TP", "TR"] };
  const pick  = (row, names) => names.find(n => row[n] != null) ?? null;
  const val   = (row, names) => row[pick(row, names)];
  const clean = x => parseFloat(String(x ?? "0").replace(/\s/g, "").replace(",", ".")) || 0;

  function parseYMD(str) {
    if (!str) return null;
    const s = String(str).trim().replace(/\u00A0/g, " ").replace(/[^\d-]/g, "");
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? { y:+m[1], m:+m[2], d:+m[3] } : null;
  }
  const isSameMonth = (str, Y, M) => { const p = parseYMD(str); return !!p && p.y === Y && p.m === M; };

  function isWithinPeriod(now, period) {
    const [s, e] = period.split("–");
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    const t = now.getHours()*60 + now.getMinutes();
    return t >= sh*60 + sm && t < eh*60 + em;
  }

  document.addEventListener("sheets-ready", () => {
    const data  = window.DATASETS?.data  || [];
    const plans = window.DATASETS?.plans || [];

    const now = new Date();
    const Y = now.getFullYear(), M = now.getMonth()+1, D = now.getDate();
    const ym = now.toISOString().slice(0,7);

    // --- агрегируем по дням текущего месяца ---
    const days = new Map(); // day -> {to, tr}
    let todayFactTo = 0;

    for (const r of data) {
      const ds = val(r, ORACLE_COLS.date);
      if (!isSameMonth(ds, Y, M)) continue;
      const p = parseYMD(ds);
      if (!p) continue;

      const to = clean(val(r, ORACLE_COLS.revenue));
      const tr = clean(val(r, ORACLE_COLS.traffic));

      if (p.d === D) {
        // факт за сегодня — отдельным счётчиком
        todayFactTo += to;
        continue;
      }
      if (p.d < D) {
        const prev = days.get(p.d) || { to: 0, tr: 0 };
        prev.to += to;
        prev.tr += tr;
        days.set(p.d, prev);
      }
    }

    // --- средние ТОЛЬКО по дням < сегодня ---
    const dayCount = days.size || 1;
    let sumTo = 0, sumTr = 0;
    for (const {to, tr} of days.values()) { sumTo += to; sumTr += tr; }

    const avgTo = Math.round(sumTo / dayCount);
    const avgTr = Math.round(sumTr / dayCount);

    // --- цель = max(план_на_день, средняя_до_вчера) ---
    // Берём план на день из ДАННЫХ (колонка "План на день")
    const currentMonthRows = data.filter(r => {
      const ds = val(r, ORACLE_COLS.date);
      return isSameMonth(ds, Y, M);
    });
    
    // Ищем первую строку где есть план на день
    const rowWithPlan = currentMonthRows.find(r => r["План на день"] && clean(r["План на день"]) > 0);
    const dailyPlanFromData = rowWithPlan ? clean(rowWithPlan["План на день"]) : 0;
    
    // Fallback: если нет в данных, пробуем таблицу "Планы"
    const planRow = plans.find(r => r["Месяц"] === ym) || {};
    const planTrPlan = clean(planRow["План по трафику"]) || 0;
    
    // Используем план на день из данных или fallback на таблицу
    const planToPlan = dailyPlanFromData > 0 ? dailyPlanFromData : (clean(planRow["План по выручке"]) || 0);
    
    // Цель = максимум из (план на день, средняя до вчера)
    const planTo = Math.max(planToPlan, avgTo);
    const planTr = Math.max(planTrPlan, avgTr);
    
    console.log(`📊 Oracle: план на день из данных = ${dailyPlanFromData}, средняя = ${avgTo}, цель = ${planTo}`);

    // --- отрисовка слотов ---
    const weekdayEn = now.toLocaleDateString("en-US",{weekday:"long"});
    const weekdayRu = now.toLocaleDateString("ru-RU",{weekday:"long"});
    const slots = percentByWeekday[weekdayEn];
    if (!slots) return;

    const chartContainer = document.getElementById("chartContainer");
    if (!chartContainer) return;

    document.getElementById("oracleBlock")?.remove();
    const container = document.createElement("div");
    container.id = "oracleBlock";
    container.style.cssText = "background:transparent;color:#fff;border-radius:16px;padding:16px;margin:20px auto;width:95%;max-width:600px;font-family:sans-serif;box-sizing:border-box;";

    function renderOracle() {
      const now = new Date();
      let html = `<div style="font-weight:900;font-size:24px;text-align:center;margin-bottom:12px;">📌 Сегодня ${weekdayRu[0].toUpperCase()+weekdayRu.slice(1)}</div>`;
      html += `<div style="margin-bottom:20px;text-align:center;font-size:16px;">Цель на день: <b style="font-size:20px;">${planTo.toLocaleString("ru-RU")}₽</b>, трафик: <b>${planTr}</b></div>`;

      const maxShare = Math.max(...Object.values(slots));
      const factTo = todayFactTo; // факт только за сегодня

      let cumTo = 0, cumTr = 0;
      for (const [period, share] of Object.entries(slots)) {
        const partTo = Math.round(planTo*share);
        const partTr = Math.round(planTr*share);
        cumTo += partTo; cumTr += partTr;

        const nowHere = isWithinPeriod(now, period);
        const peak    = share === maxShare;
        const met     = factTo >= cumTo;

        const bg = met ? (peak ? "#ffc400" : "#ff6e9c")
                       : (peak ? (nowHere ? "#ffd200" : "#ffee99")
                               : (nowHere ? "#ff70a1" : "#ffc2d1"));
        const border = nowHere ? "3px solid white" : "none";
        const mark   = met ? "✔️" : "—";

        html += `
          <div style="background:${bg};margin-bottom:12px;padding:12px 16px;border-radius:12px;border:${border};display:flex;justify-content:space-between;align-items:center;color:#000;width:100%;max-width:600px;box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;width:100%;font-size:15px;">
              <div style="font-weight:600">${period}</div>
              <div><div>${partTo.toLocaleString("ru-RU")}₽</div><div style="text-decoration:underline;font-size:13px;">${cumTo.toLocaleString("ru-RU")}₽</div></div>
              <div><div>${partTr} трафик</div><div style="text-decoration:underline;font-size:13px;">${cumTr} трафик</div></div>
            </div>
            <div style="font-size:22px;padding-left:10px;">${mark}</div>
          </div>`;
      }
      container.innerHTML = html;
    }

    renderOracle();
    chartContainer.insertAdjacentElement("afterend", container);
    clearInterval(window.oracleInterval);
    window.oracleInterval = setInterval(renderOracle, 5*60*1000);

    console.log("✅ Oracle: planTo =", planTo, "| avgTo (до вчера) =", avgTo, "| factToday =", todayFactTo);
  });
})();
