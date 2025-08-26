// advisor.js — Советник дня (анализ ASP, трафика, закупки и рентабельности)

(async () => {
  const dataUrl = SHEETS.data;     // лист "Данные"
const ebitdaUrl = SHEETS.ebitda; // лист "ebitda"

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
  let advice = "✅ Всё в порядке. Все показатели выполняются! Вы молодцы!!! Продолжаем удерживать курс. Не забываем про наши ценности: Улыбчивость, добродушный ЗАБОТЛИВЫЙ тон. Напоминаем про подписку в Телеграм. Подарки делаем от души, в руки, с улыбкой, смотря прямо в глаза Покупателю. Не будьте грубыми и равнодушными. Этот негативный фактор может разрушить динамику роста!";

  if (asp < 250) {
    advice = "📊 ASP слишком низкий. Рекомендуется: апсейлы, увеличение ассортимента, комплекты. Продаем больше костюмов, комплекты носков, усиливаем средний чек!";
  } else if (avgRevenue < 25000) {
    advice = "📉 Средняя выручка ниже нормы. Усильте промо и визуал в ключевые дни, активно подписываем на наш канал в Телеграмм, это увеличит трафик и решит проблему. Реагируем на посетителей более активно, увеличиваем средний чек. Помним про наши ценности: улыбка, доброжелательность, дружеский тон. Слушайте себя, как вы общаетесь с Покупателями! Не допускайте равнодушия или грубости! Активно рассказывайте про наши акции с воодушевлением в голосе";
  } else if (ebitda < 2000) {
    advice = "🚨 EBITDA отрицательная. Необходимо сократить % расходов или повысить наценку, это КРИТИЧЕСКИЙ ФАКТОР. Снижаем смены сотрудникам, убираем допсмены, вызываем промоутеров. Если сейчас все пустить на самоток, потом будет поздно. Поинтересуйтесь, почему люди уходят. Включите режим ОСОБЕННОЙ ЗАБОТЫ о постетителях Магазина. Бизнес требует радикального вмешательства в процесс! Все учредители должны работать вместе. Проведите SWOT-аналиг. Определите ключевую причину падения прибыли и поставьте план на PDCA основу. Проведите анализ с ИИ. Соберите собрание и обсудите эту проблему в ближайшее время!";
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
