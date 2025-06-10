// miniblocks.js — генерирует 3 мини-блока (2 слева, 1 справа)

(async () => {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = "1fr 1fr";
  container.style.gap = "12px";
  container.style.marginTop = "20px";
  container.style.width = "95%";
  container.style.maxWidth = "600px";
  container.style.boxSizing = "border-box";

  document.body.appendChild(container);

  const urls = {
    data: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv",
    leaders: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=1359385679&single=true&output=csv"
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
    div.innerHTML = `<div style='font-weight:bold;margin-bottom:8px;'>${title}</div><div>${value}</div>`;
    if (extra) div.innerHTML += `<div style='margin-top:4px;font-size:13px;color:#666;'>${extra}</div>`;
    return div;
  };

  const leftCol = document.createElement("div");
  leftCol.style.display = "flex";
  leftCol.style.flexDirection = "column";
  leftCol.style.gap = "12px";

  leftCol.appendChild(makeBlock("Прогноз по выручке", `${factTo.toLocaleString("ru-RU")}₽`, `Прогноз: ${forecast.toLocaleString("ru-RU")}₽`));
  leftCol.appendChild(makeBlock("Разница с ПГ", `${diffRub >= 0 ? "+" : ""}${diffRub.toLocaleString("ru-RU")}₽`));

  const rightCol = document.createElement("div");
  rightCol.style.background = "white";
  rightCol.style.color = "black";
  rightCol.style.borderRadius = "12px";
  rightCol.style.padding = "12px";
  rightCol.style.boxSizing = "border-box";
  rightCol.style.fontSize = "14px";

  const top10 = leaders
    .filter(r => r["Выручка"])
    .sort((a, b) => cleanNumber(b["Выручка"]) - cleanNumber(a["Выручка"]))
    .slice(0, 10);

  rightCol.innerHTML = `<div style='font-weight:bold;margin-bottom:8px;'>Лидеры продаж</div>`;
  top10.forEach(r => {
    const name = r["Название"] || "";
    const val = cleanNumber(r["Выручка"]);
    rightCol.innerHTML += `<div style='display:flex;justify-content:space-between;'><span>${name}</span><span>${val.toLocaleString("ru-RU")}₽</span></div>`;
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);
})();
