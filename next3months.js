// next3months.js — следующие 3 месяца по данным прошлого года
// Десктоп: 3 колонки, мобильная: 3 компактные строки (ничего не выходит за края)

(async () => {
  const url = SHEETS.data;
  const res = await fetch(url);
  const text = await res.text();
  const data = Papa.parse(text, { header: true }).data;

  const card = document.createElement("div");
  card.className = "card-light";
  card.innerHTML = `
    <div class="card-title">🗓️ Следующие 3 месяца</div>
    <div class="card-subtitle">средние показатели за прошлый год</div>
  `;

  const grid = document.createElement("div");
  grid.className = "next3-grid";

  const today = new Date();
  const currentYear = today.getFullYear() - 1;
  const currentMonth = today.getMonth();
  const clean = val => parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));

  for (let i = 1; i <= 3; i++) {
    const monthIndex = (currentMonth + i) % 12;
    const year = (currentMonth + i) >= 12 ? currentYear + 1 : currentYear;

    const rows = data.filter(r => {
      const d = new Date(r["Дата"]);
      return d.getFullYear() === year && d.getMonth() === monthIndex && r["ТО"] && r["ТР"];
    });

    const sumTo = rows.reduce((s, r) => s + clean(r["ТО"]), 0);
    const sumTr = rows.reduce((s, r) => s + clean(r["ТР"]), 0);
    const avgTo = rows.length ? Math.round(sumTo / rows.length) : 0;
    const avgTr = rows.length ? Math.round(sumTr / rows.length) : 0;
    const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

    const monthName = new Date(2000, monthIndex).toLocaleString('ru-RU', { month: 'long' });

    const item = document.createElement("div");
    item.className = `next3-item next3-item--${i}`;
    item.innerHTML = `
      <div class="next3-month">${monthName}</div>
      <div class="next3-meta">
        <div class="next3-value">${avgTo ? avgTo.toLocaleString('ru-RU') + '₽' : '—'}</div>
        <div class="next3-sub">${avgTr ? `${avgTr} чел • ср. чек ${avgCheck}₽` : 'нет данных'}</div>
      </div>
    `;
    grid.appendChild(item);
  }

  card.appendChild(grid);
  document.querySelector('.container').appendChild(card);
})();
