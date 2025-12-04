// next3months.js — следующие 3 месяца с современным дизайном

(async () => {
  const url = SHEETS.data;
  const res = await fetch(url);
  const text = await res.text();
  const data = Papa.parse(text, { header: true }).data;

  const container = document.createElement("div");
  container.style.cssText = `
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 24px;
    width: 100%;
    max-width: 640px;
  `;

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
    const avgTo = Math.round(sumTo / rows.length);
    const avgTr = Math.round(sumTr / rows.length);
    const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

    const block = document.createElement("div");
    block.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      border-radius: 16px;
      padding: 16px 12px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      cursor: pointer;
    `;

    block.addEventListener('mouseenter', () => {
      block.style.transform = 'translateY(-4px)';
      block.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
    });
    block.addEventListener('mouseleave', () => {
      block.style.transform = 'translateY(0)';
      block.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
    });

    const monthName = new Date(2000, monthIndex).toLocaleString('ru-RU', { month: 'long' });
    block.innerHTML = `
      <div style='font-weight:700;margin-bottom:8px;font-size:14px;color:#555;'>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
      <div style='font-size:22px;font-weight:900;background:linear-gradient(135deg, #667eea, #764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;'>${avgTo.toLocaleString('ru-RU')}₽</div>
      <div style='font-size:12px;color:#777;'>${avgTr} • ${avgCheck}₽ СРЧ</div>
    `;

    container.appendChild(block);
  }

  document.querySelector('.container').appendChild(container);
})();
