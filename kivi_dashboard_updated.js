(async function () {
  const urls = {
    data: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv",
    plans: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=1774855984&single=true&output=csv",
    records: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=143269600&single=true&output=csv"
  };

  const loadCSV = async (url) => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const today = new Date();
  const ym = today.toISOString().slice(0, 7);
  const currentDay = today.getDate();

  const [data, plans, records] = await Promise.all([
    loadCSV(urls.data),
    loadCSV(urls.plans),
    loadCSV(urls.records)
  ]);

  const cleanNumber = val => parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));

  const thisMonthRows = data.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"]?.startsWith(ym) && d.getDate() <= currentDay && r["ТО"];
  });

  const lastYearDate = new Date(today);
  lastYearDate.setFullYear(today.getFullYear() - 1);
  const lastYm = lastYearDate.toISOString().slice(0, 7);
  const lastYearRows = data.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"]?.startsWith(lastYm) && d.getDate() <= currentDay && r["ТО"];
  });

  const validDays = new Set(thisMonthRows.map(r => r["Дата"].split("-")[2]));
  const dayCount = validDays.size || 1;

  const totalTo = thisMonthRows.reduce((sum, r) => sum + cleanNumber(r["ТО"]), 0);
  const totalTr = thisMonthRows.reduce((sum, r) => sum + parseInt(r["ТР"] || 0), 0);

  const avgTo = Math.round(totalTo / dayCount);
  const avgTr = Math.round(totalTr / dayCount);
  const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

  const planRow = plans.find(r => r["Месяц"] === ym);
  const planTo = parseInt(planRow?.["План по выручке"] || 0);
  const planTr = parseInt(planRow?.["План по трафику"] || 0);
  const planAvg = planTo && planTr ? Math.round(planTo / planTr) : 0;

  document.getElementById("planTo").textContent = planTo.toLocaleString("ru-RU") + "₽";
  document.getElementById("planTraffic").textContent = planTr + " чел.";
  document.getElementById("planAvg").textContent = planAvg + "₽";

  document.getElementById("factTo").textContent = avgTo.toLocaleString("ru-RU") + "₽";
  document.getElementById("factTraffic").textContent = avgTr;
  document.getElementById("factAvg").textContent = avgCheck + "₽";

  const recTo = records.find(r => r["Показатель"]?.includes("выручка"));
  const recTr = records.find(r => r["Показатель"]?.includes("трафик"));

  document.getElementById("recordTo").textContent = parseInt((recTo?.Значение || '0').replace(/\s/g, '')).toLocaleString("ru-RU") + "₽";
  document.getElementById("recordTraffic").textContent = parseInt((recTr?.Значение || '0').replace(/\s/g, '')).toLocaleString("ru-RU");

  const prevTo = lastYearRows.reduce((s, r) => s + cleanNumber(r["ТО"]), 0);
  const currTo = thisMonthRows.reduce((s, r) => s + cleanNumber(r["ТО"]), 0);
  const diff = prevTo ? Math.round((currTo - prevTo) / prevTo * 100) : 0;

  document.getElementById("comparePrev").textContent = (diff >= 0 ? "+" : "") + diff + "%";
})();

window.addEventListener('DOMContentLoaded', () => {
  if (typeof loadChart === 'function') loadChart();
  if (typeof buildComparisonBlock === 'function') buildComparisonBlock();
});
