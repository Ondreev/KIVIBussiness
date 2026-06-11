// purchase.js — Рекомендованная сумма закупки с современным дизайном

(async () => {
  const dataUrl = SHEETS.data;

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
  const minPurchase = recommended - 5000;
  const maxPurchase = recommended + 5000;

  const block = document.createElement("div");
  block.className = "card-light";

  block.innerHTML = `
    <div class='card-title'>📦 Рекомендация по закупке</div>
    
    <!-- Основная сумма -->
    <div style='background:linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));border-radius:16px;padding:20px;text-align:center;margin-bottom:16px;'>
      <div style='font-size:clamp(12px, 3vw, 14px);color:#64748b;margin-bottom:8px;'>Оптимальная сумма закупки</div>
      <div style='font-size:clamp(32px, 8vw, 42px);font-weight:900;background:linear-gradient(135deg, #ff6b35, #f7931e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;'>${recommended.toLocaleString('ru-RU')}₽</div>
      <div style='font-size:clamp(11px, 2.8vw, 13px);color:#64748b;'>Диапазон: ${minPurchase.toLocaleString('ru-RU')}₽ — ${maxPurchase.toLocaleString('ru-RU')}₽</div>
    </div>

    <!-- Важное предупреждение -->
    <div style='background:linear-gradient(135deg, rgba(255, 82, 82, 0.1), rgba(252, 92, 125, 0.1));border-left:4px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:12px;'>
      <div style='font-size:clamp(11px, 2.8vw, 13px);color:#b91c1c;line-height:1.5;'>
        <strong>⚠️ Важно:</strong> Никогда не превышайте максимальную сумму — это негативно скажется на показателях!
      </div>
    </div>

    <!-- Совет -->
    <div style='background:linear-gradient(135deg, rgba(40, 167, 69, 0.1), rgba(72, 199, 116, 0.1));border-left:4px solid #10b981;border-radius:8px;padding:12px;'>
      <div style='font-size:clamp(11px, 2.8vw, 13px);color:#047857;line-height:1.5;'>
        <strong>💡 Совет:</strong> Следуйте рекомендациям для поддержания оптимальной рентабельности. Отклонение ±5000₽ допустимо.
      </div>
    </div>
  `;

  document.querySelector('.container').appendChild(block);
})();
