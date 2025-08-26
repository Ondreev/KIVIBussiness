// profitability.js — расчёт рентабельности (EBITDA) + ASP на основе вкладок "ebitda" и "Данные"

(async () => {
  const dataUrl = SHEETS.data;     // вкладка "Данные"
  const ebitdaUrl = SHEETS.ebitda; // вкладка "ebitda"

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

  // Фильтруем строки только с заполненной выручкой и ASP
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

  const block = document.createElement("div");
  block.style.background = "white";
  block.style.color = "black";
  block.style.borderRadius = "16px";
  block.style.padding = "20px";
  block.style.marginTop = "24px";
  block.style.width = "95%";
  block.style.maxWidth = "600px";
  block.style.boxSizing = "border-box";
  block.style.fontFamily = "monospace";
  block.style.boxShadow = "0 0 16px rgba(255,255,255,0.2)";

  block.innerHTML = `<div style='font-size:18px;font-weight:bold;margin-bottom:12px;text-align:center;'>Расчёт EBITDA</div>`;
  block.innerHTML += `<div style='text-align:center;font-weight:bold;font-size:16px;margin-bottom:8px;'>ASP: ${asp}₽</div>`;
  block.innerHTML += `<div style='display:flex;justify-content:space-between;margin-bottom:6px;'><span>Средняя выручка:</span><span>${format(avgRevenue)}</span></div>`;

  rendered.forEach(r => {
    block.innerHTML += `<div style='display:flex;justify-content:space-between;margin-bottom:4px;'><span>– ${r.label}</span><span>${format(r.value)}</span></div>`;
  });

  block.innerHTML += `<hr style='border:none;border-top:1px solid #ccc;margin:12px 0;'>`;
  block.innerHTML += `<div style='display:flex;justify-content:space-between;font-weight:bold;font-size:16px;'><span>EBITDA:</span><span>${format(ebitda)}</span></div>`;

  document.body.appendChild(block);
})();
