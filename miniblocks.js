// miniblocks.js — генерирует 3 мини-блока (2 слева, 1 справа)

(async () => {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = "1fr 1.25fr";
  container.style.gap = "12px";
  container.style.marginTop = "20px";
  container.style.width = "95%";
  container.style.maxWidth = "600px";
  container.style.boxSizing = "border-box";

  document.body.appendChild(container);

  const urls = {
  data: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv",
  leaders: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=1406705679&single=true&output=csv"
};

  const cleanNumber = val => parseFloat((val || "0").replace(/\s/g, "").replace(",", "."));

  const fetchCSV = async url => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const data = await fetchCSV(urls.data);
  const leaders = await fetchCSV(urls.leaders);

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

  const makeBlock = (title, value, extra = "") => {
    const div = document.createElement("div");
    div.style.background = "white";
    div.style.color = "black";
    div.style.borderRadius = "12px";
    div.style.padding = "12px";
    div.style.boxSizing = "border-box";
    div.style.fontSize = "14px";
    div.innerHTML = `<div style='font-weight:bold;margin-bottom:8px;text-align:center;'>${title}</div>${value}`;
    if (extra) div.innerHTML += `<div style='margin-top:6px;font-size:14px;text-align:center;'>${extra}</div>`;
    return div;
  };

  const leftCol = document.createElement("div");
  leftCol.style.display = "flex";
  leftCol.style.flexDirection = "column";
  leftCol.style.gap = "12px";

  leftCol.appendChild(makeBlock("Этот месяц", `<div style='text-align:center;'>по накоплению</div><div style='font-size:22px;font-weight:bold;text-align:center;'>${factTo.toLocaleString("ru-RU")}₽</div><div style='margin-top:6px;text-align:center;'>Прогноз:</div><div style='font-size:22px;font-weight:bold;text-align:center;'>${forecast.toLocaleString("ru-RU")}₽</div>`));
  leftCol.appendChild(makeBlock("От прошл. года", `<div style='font-size:22px;font-weight:bold;text-align:center;'>${diffRub >= 0 ? "+" : ""}${diffRub.toLocaleString("ru-RU")}₽</div>`));

  const rightCol = document.createElement("div");
  rightCol.style.background = "white";
  rightCol.style.color = "black";
  rightCol.style.borderRadius = "12px";
  rightCol.style.padding = "12px";
  rightCol.style.boxSizing = "border-box";
  rightCol.style.fontSize = "14px";

  const top10 = leaders
    .filter(r => r["Лидеры продаж"])
    .map(r => r["Лидеры продаж"])
    .slice(0, 7);

  rightCol.innerHTML = `<div style='font-weight:bold;margin-bottom:8px;text-align:center;'>Лидеры продаж</div>`;
  top10.forEach(name => {
    rightCol.innerHTML += `<div style='margin-bottom:4px;'>${name}</div>`;
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);
})();
