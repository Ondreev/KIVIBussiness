// profitability.js — расчёт рентабельности (EBITDA) + ASP с современным дизайном

(async () => {
  const dataUrl = SHEETS.data;
  const ebitdaUrl = SHEETS.ebitda;

  const parse = async (url) => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const clean = v => parseFloat((v || '0').toString().replace(/\s/g, '').replace(',', '.'));
  const format = v => Math.round(v).toLocaleString("ru-RU") + "₽";

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
  const rendered = costs.map(row => {
    const value = clean(row["Значение"]);
    const type = (row["Тип"] || '').toLowerCase();
    let cost = 0;

    if (type.includes("руб")) cost = value;
    else if (type.includes("%")) cost = avgRevenue * value / 100;
    else return null;

    totalCosts += cost;
    return {
      name: row["Статья"],
      value: cost,
      label: type.includes("%") ? `${row["Статья"]} (${value}%)` : row["Статья"]
    };
  }).filter(Boolean);

  const ebitda = avgRevenue - totalCosts;
  const ebitdaPercent = avgRevenue ? Math.round((ebitda / avgRevenue) * 100) : 0;

  const block = document.createElement("div");
  block.className = "card-light";

  // ASP блок
  const aspColor = asp >= 250 ? '#28a745' : asp >= 200 ? '#ffc107' : '#dc3545';

  block.innerHTML = `
    <div class='card-title'>💰 Расчёт EBITDA</div>
    
    <!-- ASP -->
    <div style='background:linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;'>
      <div style='font-size:clamp(12px, 3vw, 14px);color:#666;margin-bottom:4px;'>Средний чек (ASP)</div>
      <div style='font-size:clamp(24px, 6vw, 32px);font-weight:900;color:${aspColor};'>${asp}₽</div>
    </div>

    <!-- Выручка -->
    <div style='display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e0e0e0;'>
      <span style='font-size:clamp(13px, 3.2vw, 15px);font-weight:600;'>Средняя выручка</span>
      <span style='font-size:clamp(14px, 3.5vw, 16px);font-weight:700;color:#667eea;'>${format(avgRevenue)}</span>
    </div>

    <!-- Расходы -->
    <div style='margin:12px 0;'>
      <div style='font-size:clamp(12px, 3vw, 14px);color:#666;margin-bottom:8px;font-weight:600;'>Расходы:</div>
      ${rendered.map(r => `
        <div style='display:flex;justify-content:space-between;padding:6px 0;padding-left:12px;font-size:clamp(12px, 3vw, 13px);'>
          <span style='color:#666;'>– ${r.label}</span>
          <span style='color:#dc3545;font-weight:600;'>${format(r.value)}</span>
        </div>
      `).join('')}
    </div>

    <!-- Разделитель -->
    <div style='border-top:2px solid #667eea;margin:16px 0;'></div>

    <!-- EBITDA -->
    <div style='background:${ebitda >= 0 ? 'linear-gradient(135deg, #d4edda, #c3e6cb)' : 'linear-gradient(135deg, #f8d7da, #f5c6cb)'};border-radius:12px;padding:16px;text-align:center;'>
      <div style='font-size:clamp(13px, 3.2vw, 15px);color:#333;margin-bottom:8px;font-weight:600;'>Прибыль (EBITDA)</div>
      <div style='font-size:clamp(28px, 7vw, 36px);font-weight:900;color:${ebitda >= 0 ? '#28a745' : '#dc3545'};margin-bottom:4px;'>${format(ebitda)}</div>
      <div style='font-size:clamp(12px, 3vw, 14px);color:${ebitda >= 0 ? '#155724' : '#721c24'};font-weight:600;'>${ebitdaPercent >= 0 ? '+' : ''}${ebitdaPercent}% рентабельность</div>
    </div>
  `;

  document.querySelector('.container').appendChild(block);
})();
