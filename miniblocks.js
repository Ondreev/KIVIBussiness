// miniblocks.js — 3 мини-блока с современным дизайном

document.addEventListener('sheets-ready', async () => {
  // Проверяем что блок ещё не создан (защита от дублей)
  if (document.getElementById('miniblocksContainer')) {
    console.log('⚠️ Miniblocks уже созданы, пропускаем');
    return;
  }

  const container = document.createElement("div");
  container.id = 'miniblocksContainer';
  container.className = 'mini-grid';

  document.querySelector('.container').appendChild(container);

  const cleanNumber = val => parseFloat((val || "0").replace(/\s/g, "").replace(",", "."));

  const fetchCSV = async url => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const data = await fetchCSV(SHEETS.data);
  const leaders = await fetchCSV(SHEETS.leaders);

  const today = new Date();
  const ym = today.toISOString().slice(0, 7);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();

  const thisMonth = data.filter(r => r["Дата"]?.startsWith(ym) && new Date(r["Дата"]).getDate() <= currentDay && r["ТО"]);

  const lastYear = new Date(today);
  lastYear.setFullYear(today.getFullYear() - 1);
  const lastYm = lastYear.toISOString().slice(0, 7);
  const lastMonth = data.filter(r => r["Дата"]?.startsWith(lastYm) && new Date(r["Дата"]).getDate() <= currentDay && r["ТО"]);

  const sumTo = rows => rows.reduce((sum, r) => sum + cleanNumber(r["ТО"]), 0);

  const factTo = sumTo(thisMonth);
  const avgPerDay = factTo / (thisMonth.length || 1);
  const forecast = Math.round(avgPerDay * daysInMonth);

  const prevTo = sumTo(lastMonth);
  const diffRub = Math.round(factTo - prevTo);

  const makeBlock = (title, value) => {
    const div = document.createElement("div");
    div.className = 'mini-card';
    div.innerHTML = `
      <div class='mini-title'>${title}</div>
      ${value}
    `;
    return div;
  };

  const leftCol = document.createElement("div");
  leftCol.className = 'mini-col';

  leftCol.appendChild(makeBlock(
    "Этот месяц",
    `<div class='mini-label'>по накоплению</div>
     <div class='mini-value' style='background:linear-gradient(135deg, #6366f1, #a855f7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;'>${factTo.toLocaleString("ru-RU")}₽</div>
     <div class='mini-label' style='margin-top:8px;'>прогноз</div>
     <div class='mini-value' style='font-size:clamp(15px,4.2vw,20px);color:#475569;'>${forecast.toLocaleString("ru-RU")}₽</div>`
  ));

  leftCol.appendChild(makeBlock(
    "От прошл. года",
    `<div class='mini-value' style='color:${diffRub >= 0 ? '#10b981' : '#ef4444'};'>${diffRub >= 0 ? "+" : ""}${diffRub.toLocaleString("ru-RU")}₽</div>`
  ));

  const rightCol = document.createElement("div");
  rightCol.className = 'mini-card';

  const top10 = leaders
    .filter(r => r["Лидеры продаж"])
    .map(r => r["Лидеры продаж"])
    .slice(0, 7);

  rightCol.innerHTML = `<div class='mini-title'>🏆 Лидеры продаж</div>`;
  top10.forEach((name, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
    const topStyle = index < 3 ? 'font-weight:700;color:#0f172a;' : 'color:#64748b;';
    rightCol.innerHTML += `<div style='margin-bottom:4px;font-size:clamp(12px,3.1vw,13px);padding:4px 0;line-height:1.4;${topStyle}'>${medal} ${name}</div>`;
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);

  console.log('✅ Miniblocks созданы');
});
