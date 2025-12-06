// miniblocks.js — 3 мини-блока с современным дизайном (ОПТИМИЗИРОВАНО)

document.addEventListener('sheets-ready', () => {
  // === ИСПОЛЬЗУЕМ УЖЕ ЗАГРУЖЕННЫЕ ДАННЫЕ ===
  const data = window.DATASETS?.data || [];
  const leaders = window.DATASETS?.leaders || [];

  if (!data.length) {
    console.warn('⚠️ miniblocks: нет данных');
    return;
  }

  const container = document.createElement("div");
  container.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    gap: 12px;
    margin-top: 24px;
    width: 100%;
    max-width: 640px;
  `;

  document.querySelector('.container').appendChild(container);

  const cleanNumber = val => parseFloat((val || "0").replace(/\s/g, "").replace(",", "."));

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
  const avgPerDay = factTo / thisMonth.length;
  const forecast = Math.round(avgPerDay * daysInMonth);

  const prevTo = sumTo(lastMonth);
  const diffRub = Math.round(factTo - prevTo);

  const makeBlock = (title, value) => {
    const div = document.createElement("div");
    div.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      will-change: transform;
    `;
    div.innerHTML = `
      <div style='font-weight:700;margin-bottom:12px;text-align:center;font-size:15px;'>${title}</div>
      ${value}
    `;
    
    div.addEventListener('mouseenter', () => {
      div.style.transform = 'translateY(-2px)';
      div.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
    });
    div.addEventListener('mouseleave', () => {
      div.style.transform = 'translateY(0)';
      div.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
    });
    
    return div;
  };

  const leftCol = document.createElement("div");
  leftCol.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;

  leftCol.appendChild(makeBlock(
    "Этот месяц",
    `<div style='text-align:center;font-size:13px;margin-bottom:4px;'>по накоплению</div>
     <div style='font-size:24px;font-weight:900;text-align:center;background:linear-gradient(135deg, #667eea, #764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;'>${factTo.toLocaleString("ru-RU")}₽</div>
     <div style='margin-top:8px;text-align:center;font-size:13px;'>Прогноз:</div>
     <div style='font-size:22px;font-weight:700;text-align:center;color:#555;'>${forecast.toLocaleString("ru-RU")}₽</div>`
  ));

  leftCol.appendChild(makeBlock(
    "От прошл. года",
    `<div style='font-size:24px;font-weight:900;text-align:center;color:${diffRub >= 0 ? '#28a745' : '#dc3545'};'>${diffRub >= 0 ? "+" : ""}${diffRub.toLocaleString("ru-RU")}₽</div>`
  ));

  const rightCol = document.createElement("div");
  rightCol.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    color: #333;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    will-change: transform;
  `;

  rightCol.addEventListener('mouseenter', () => {
    rightCol.style.transform = 'translateY(-2px)';
    rightCol.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
  });
  rightCol.addEventListener('mouseleave', () => {
    rightCol.style.transform = 'translateY(0)';
    rightCol.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
  });

  const top10 = leaders
    .filter(r => r["Лидеры продаж"])
    .map(r => r["Лидеры продаж"])
    .slice(0, 7);

  rightCol.innerHTML = `<div style='font-weight:700;margin-bottom:12px;text-align:center;font-size:15px;'>🏆 Лидеры продаж</div>`;
  top10.forEach((name, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
    rightCol.innerHTML += `<div style='margin-bottom:6px;font-size:13px;padding:4px 0;'>${medal} ${name}</div>`;
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);

  console.log('✅ miniblocks создан (из window.DATASETS)');
});
