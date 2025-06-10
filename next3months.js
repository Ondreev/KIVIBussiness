(async () => {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv";
  const res = await fetch(url);
  const text = await res.text();
  const data = Papa.parse(text, { header: true }).data;

  const clean = v => parseFloat((v || '0').replace(/\s/g, '').replace(',', '.'));
  const now = new Date();
  const lastYear = now.getFullYear() - 1;
  const futureMonths = [now.getMonth() + 1, now.getMonth() + 2, now.getMonth() + 3];

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.gap = "12px";
  container.style.marginTop = "16px";
  container.style.paddingBottom = "8px";
  container.style.maxWidth = "95%";
  container.style.boxSizing = "border-box";

  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  futureMonths.forEach(m => {
    const rows = data.filter(r => {
      const d = new Date(r["Дата"]);
      return d.getFullYear() === lastYear && d.getMonth() === (m % 12) && r["ТО"];
    });

    const revenue = Math.round(rows.reduce((s, r) => s + clean(r["ТО"]), 0) / (rows.length || 1));
    const traffic = Math.round(rows.reduce((s, r) => s + parseInt(r["ТР"] || 0), 0) / (rows.length || 1));
    const avgCheck = traffic ? Math.round(revenue / traffic) : 0;

    const box = document.createElement("div");
    box.style.flex = "1 1 33.33%";
    box.style.maxWidth = "33.33%";
    box.style.boxSizing = "border-box";
    box.style.minWidth = "120px";
    box.style.background = "white";
    box.style.color = "black";
    box.style.borderRadius = "12px";
    box.style.padding = "12px";
    box.style.textAlign = "center";
    box.style.boxSizing = "border-box";

    box.innerHTML = `
      <div style="font-size:10px; font-weight:bold;">${months[m % 12]}</div>
      <div style="font-size:16px; font-weight:bold; margin:4px 0;">${revenue.toLocaleString('ru-RU')}₽</div>
      <div style="font-size:12px;">
        ${traffic} / <span style="font-weight:bold">${avgCheck.toLocaleString('ru-RU')}₽</span>
      </div>
    `;
    container.appendChild(box);
  });

  document.body.appendChild(container);
})();
