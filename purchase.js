// purchase.js — Рекомендованная сумма закупки
document.addEventListener('sheets-ready', () => {
  const data = window.DATASETS.data;

  const clean = v => parseFloat((v || '0').toString().replace(/\s/g, '').replace(',', '.'));

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
});
