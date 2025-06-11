// advisor.js — Советник дня (анализ ASP, трафика, закупки и рентабельности)

(async () => {
  const dataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv";
  const ebitdaUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=567373639&single=true&output=csv";

  const parse = async (url) => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const clean = v => parseFloat((v || '0').toString().replace(/\s/g, '').replace(',', '.'));

  const data = await parse(dataUrl);
  const costs = await parse(ebitdaUrl);

  const today = new Date();
  const ym = today.toISOString().slice(0, 7);

  const validRows = data.filter(r => {
    return r["Дата"]?.startsWith(ym) && clean(r["ТО"]) > 0 && clean(r["расчет ASP"]) > 0;
  });

  const avgRevenue = validRows.reduce((s, r) => s + clean(r["ТО"]), 0) / (validRows.length || 1);
  const avgAspCount = validRows.reduce((s, r) => s + clean(r["расчет ASP"]), 0) / (validRows.length || 1);
  const asp = avgAspCount ? Math.round(avgRevenue / avgAspCount) : 0;

  let totalCosts = 0;
  costs.forEach(row => {
    const value = clean(row["Значение"]);
    const type = (row["Тип"] || '').toLowerCase();
    if (type.includes("руб")) totalCosts += value;
    else if (type.includes("%")) totalCosts += avgRevenue * value / 100;
  });

  const ebitda = avgRevenue - totalCosts;

  // советник
  let advice = "✅ Всё в порядке. Все показатели выполняются! Вы молодцы!!! Продолжаем удерживать курс.";

  if (asp < 250) {
    advice = "📊 ASP слишком низкий. Рекомендуется: апсейлы, увеличение ассортимента, комплекты.";
  } else if (avgRevenue < 30000) {
    advice = "📉 Средняя выручка ниже нормы. Усильте промо и визуал в ключевые дни, активно подписываем на наш канал в Телеграмм, это увеличит трафик и решит проблему. Реагируем на посетителей более активно, увеличиваем средний чек.";
  } else if (ebitda < 0) {
    advice = "🚨 EBITDA отрицательная. Необходимо сократить % расходов или повысить наценку, это КРИТИЧЕСКИЙ ФАКТОР.";
  }

  // создаём блок
  const block = document.createElement("div");
  block.style.background = "#222";
  block.style.color = "#fff";
  block.style.borderRadius = "16px";
  block.style.padding = "20px";
  block.style.marginTop = "24px";
  block.style.width = "95%";
  block.style.maxWidth = "600px";
  block.style.boxSizing = "border-box";
  block.style.fontFamily = "monospace";
  block.style.boxShadow = "0 0 16px rgba(255,255,255,0.3)";

  block.innerHTML = `
    <div style='font-size:18px;font-weight:bold;margin-bottom:12px;text-align:center;'>🤖 Советник дня</div>
    <div style='font-size:14px;text-align:center;'>${advice}</div>
  `;

  document.body.appendChild(block);
})();
