// advisor.js — советник дня (основано на твоём файле), поддержка ТО/TO и надёжный парс дат

// авто-подбор колонок
const A_COLS = {
  date:    ["Дата"],
  revenue: ["ТО", "TO"],
  asp:     ["расчет ASP", "расчёт ASP", "ASP", "asp"]
};
const aPick = (row, names) => names.find(n => row[n] != null) ?? null;
const aVal  = (row, names) => row[aPick(row, names)];
const aClean = v => parseFloat(String(v ?? "0").replace(/\s/g,"").replace(",", ".")) || 0;

function aParseYMD(str){
  if(!str) return null;
  const s = String(str).trim().replace(/\u00A0/g," ").replace(/[^\d-]/g,"");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? {y:+m[1], m:+m[2], d:+m[3]} : null;
}
const aSameMonth = (str,Y,M)=>{const p=aParseYMD(str);return !!p&&p.y===Y&&p.m===M;};

async function runAdvisor() {
  try {
    const data  = window.DATASETS?.data   || [];
    const costs = window.DATASETS?.ebitda || [];
    if (!data.length || !costs.length) {
      console.warn("⚠️ Advisor: нет данных", {data: data.length, costs: costs.length});
      return;
    }

    const now = new Date();
    const Y = now.getFullYear(); const M = now.getMonth()+1;

    // только строки текущего месяца с валидными ТО и ASP
    const validRows = data.filter(r =>
      aSameMonth(aVal(r, A_COLS.date), Y, M) &&
      aClean(aVal(r, A_COLS.revenue)) > 0 &&
      aClean(aVal(r, A_COLS.asp)) > 0
    );

    console.log("Advisor: валидных строк:", validRows.length);
    if (!validRows.length) {
      // для быстрой диагностики покажем первые 3 строки
      console.log("Sample rows:", data.slice(0,3).map(r => ({
        date: aVal(r,A_COLS.date), to: aVal(r,A_COLS.revenue), asp: aVal(r,A_COLS.asp)
      })));
    }

    const avgRevenue  = validRows.reduce((s,r)=>s+aClean(aVal(r,A_COLS.revenue)),0) / (validRows.length||1);
    const avgAspCount = validRows.reduce((s,r)=>s+aClean(aVal(r,A_COLS.asp)),0)       / (validRows.length||1);
    const asp = avgAspCount ? Math.round(avgRevenue/avgAspCount) : 0;

    let totalCosts = 0;
    costs.forEach(row=>{
      const value = aClean(row["Значение"]);
      const type  = String(row["Тип"]||"").toLowerCase();
      if (type.includes("%"))   totalCosts += avgRevenue * value / 100;
      if (type.includes("руб")) totalCosts += value;
    });
    const ebitda = avgRevenue - totalCosts;

    let advice = "✅ Всё в порядке. Держим курс: доброжелательность, активные рекомендации, рассказываем об акциях и подписке в Телеграм.";
    if (asp < 250) {
      advice = "📊 Низкий ASP. Усиливаем апсейлы и комплекты (костюмы, наборы носков), дополняем корзину мелочами.";
    } else if (avgRevenue < 25000) {
      advice = "📉 Низкая средняя выручка. Усильте промо/визуал, активнее приветствие, рекомендации и подписка на канал — это добавит трафик.";
    } else if (ebitda < 2000) {
      advice = "🚨 Отрицательная EBITDA. Сокращаем расходы/смены, повышаем маржу. Срочно разбор (SWOT, PDCA), ищем узкое место и устраняем.";
    }

    // пересоздаём блок
    document.getElementById("advisorBlock")?.remove();
    const block = document.createElement("div");
    block.id = "advisorBlock";
    block.style.cssText = "background:#222;color:#fff;border-radius:16px;padding:20px;margin-top:24px;width:95%;max-width:600px;box-sizing:border-box;font-family:monospace;box-shadow:0 0 16px rgba(255,255,255,0.3)";
    block.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:12px;text-align:center;">🤖 Советник дня</div>
      <div style="font-size:14px;text-align:center;">${advice}</div>
      <div style="font-size:12px;margin-top:12px;opacity:.7;text-align:center;">
        ASP: ${asp}₽ | Выручка: ${Math.round(avgRevenue).toLocaleString('ru-RU')}₽ | EBITDA: ${Math.round(ebitda).toLocaleString('ru-RU')}₽
      </div>`;
    document.body.appendChild(block);

    console.log("✅ Advisor готов", {asp, avgRevenue:Math.round(avgRevenue), ebitda:Math.round(ebitda)});
  } catch (e) {
    console.error("❌ Ошибка Advisor:", e);
  }
}

document.addEventListener("sheets-ready", () => {
  console.log("🤖 Инициализируем Advisor...");
  runAdvisor();
});
