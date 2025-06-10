// next3months.js — выводит 3 блока с показателями по выручке, трафику и СРЧ на следующие 3 месяца (прошлого года)

(async () => {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv";

  const res = await fetch(url);
  const text = await res.text();
  const data = Papa.parse(text, { header: true }).data;

  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = "repeat(3, 1fr)";
  container.style.gap = "12px";
  container.style.marginTop = "20px";
  container.style.width = "95%";
  container.style.maxWidth = "600px";
  container.style.boxSizing = "border-box";

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
    block.style.background = "white";
    block.style.color = "black";
    block.style.borderRadius = "12px";
    block.style.padding = "12px";
    block.style.boxSizing = "border-box";
    block.style.textAlign = "center";

    const monthName = new Date(2000, monthIndex).toLocaleString('ru-RU', { month: 'long' });
    block.innerHTML = `
      <div style='font-weight:600; margin-bottom:4px;'>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
      <div style='font-size:20px; font-weight:bold;'>${avgTo.toLocaleString('ru-RU')}₽</div>
      <div style='font-size:13px; margin-top:4px;'>${avgTr} • ${avgCheck}₽ СРЧ</div>
    `;

    container.appendChild(block);
  }

  document.body.appendChild(container);
})();
