// purchase.js — Рекомендованная сумма закупки

(async () => {
  const dataUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv";

  const parse = async (url) => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const clean = v => parseFloat((v || '0').toString().replace(/\s/g, '').replace(',', '.'));

  const data = await parse(dataUrl);
  const today = new Date();
  const ym = today.toISOString().slice(0, 7);

  const monthRows = data.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"]?.startsWith(ym) && !isNaN(d) && clean(r["ТО"]) > 0 && d <= today;
  });

  const last3 = monthRows.slice(-3);
  const avg3 = last3.reduce((sum, r) => sum + clean(r["ТО"]), 0) / (last3.length || 1);
  const recommended = Math.round(avg3 * 4 * 0.45);

  const block = document.createElement("div");
  block.style.background = "#fff";
  block.style.color = "#000";
  block.style.borderRadius = "16px";
  block.style.padding = "20px";
  block.style.marginTop = "24px";
  block.style.width = "95%";
  block.style.maxWidth = "600px";
  block.style.boxSizing = "border-box";
  block.style.fontFamily = "monospace";
  block.style.boxShadow = "0 0 16px rgba(0,0,0,0.1)";

  block.innerHTML = `
    <div style='font-size:18px;font-weight:bold;margin-bottom:12px;text-align:center;'>📦 Нужно сделать закупку на:</div>
    <div style='font-size:24px;font-weight:bold;text-align:center;'>${recommended.toLocaleString('ru-RU')}₽</div>
    <div style='font-size:13px;color:#444;text-align:center;margin-top:6px;'>Возможно отклонение от этой суммы на +/- 5000 рублей. Никогда не тратьте больше этой суммы, иначе это повлияет на ваши показатели отрицательно. Строго следуйте моим рекомендациям и все будет ТИП-ТОП!</div>
  `;

  document.body.appendChild(block);
})();
