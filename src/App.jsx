import { useState, useMemo } from "react";

const CONTRACT_TOTAL = 28700000;
const STAGE_COST = 2870000;

const STAGES = [
  { id: 1, name: "Демонтажные работы, занос материалов, вынос мусора", status: "done" },
  { id: 2, name: "Штукатурка стен, возведение откосов, выравнивание пола, занос материала, вынос мусора", status: "done" },
  { id: 3, name: "Возведение перегородок на 70%, прокладка электрокабеля, UTP, TV, прокладка канализации и водоснабжения, установка инсталляций", status: "done" },
  { id: 4, name: "Установка электрощита, разводка коробок, окончание перегородок, подготовка стен под теневой плинтус, монтаж потолков ГКЛ на 50%", status: "done" },
  { id: 5, name: "Завершение потолков ГКЛ, укладка керамогранита на 30%, нанесение левкаса на 30%", status: "partial", note: "Левкас стен готов на 100%. Потолки ожидают завершения работ по умному дому и вентиляции. Керамогранит не начат." },
  { id: 6, name: "Завершение левкаса и керамогранита", status: "pending" },
  { id: 7, name: "Укладка паркета или ламината", status: "pending" },
  { id: 8, name: "Монтаж теневого плинтуса, грунтовка стен и потолков", status: "pending" },
  { id: 9, name: "Монтаж галтелей, декоративные элементы (молдинги, фотообои), покраска стен и потолков на 50%", status: "pending" },
  { id: 10, name: "Окончание покраски, установка освещения (розетки, споты, выключатели), установка сантехники (ванна, унитаз, раковина, смесители)", status: "pending" },
];

const PAYMENTS = [
  { id: 1, date: "2025-09-10", amount: 2870000, sender: "ИП MODA", desc: "Аванс 10% по договору №07.09/2025", doc: "ПП №334" },
  { id: 2, date: "2025-10-23", amount: 2587000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №429" },
  { id: 3, date: "2025-12-06", amount: 2587000, sender: "ИП БАҚЖАН", desc: "За работу Дизайнера", doc: "ПП №1548" },
  { id: 4, date: "2025-12-30", amount: 1500000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №596" },
  { id: 5, date: "2026-02-06", amount: 1000000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №25" },
  { id: 6, date: "2026-02-07", amount: 87000, sender: "ИП MODA", desc: "Прочие безвозмездные переводы денег", doc: "ПП №26" },
  { id: 7, date: "2026-02-07", amount: 1500000, sender: "ИП MODA", desc: "Прочие безвозмездные переводы денег", doc: "ПП №27" },
  { id: 8, date: "2026-03-07", amount: 1000000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №75" },
  { id: 9, date: "2026-03-18", amount: 500000, sender: "Уразбаева М.А.", desc: "Перевод клиенту Kaspi", doc: "Квитанция №821996138..." },
];

const fmt = (n) => n.toLocaleString("ru-RU") + " ₸";
const fmtDate = (d) => {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
};

const ProgressBar = ({ value, max, color = "#16a34a", bg = "#e5e7eb", height = 8 }) => (
  <div style={{ background: bg, borderRadius: height, height, width: "100%", overflow: "hidden" }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: height, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
  </div>
);

const StatusBadge = ({ status }) => {
  const c = {
    done: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", label: "✓ Завершён" },
    partial: { bg: "#fef9c3", color: "#a16207", border: "#fde68a", label: "◐ В процессе" },
    pending: { bg: "#f3f4f6", color: "#9ca3af", border: "#e5e7eb", label: "○ Ожидает" },
  }[status];
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
};

const Card = ({ children, style }) => (
  <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style }}>
    {children}
  </div>
);

export default function App() {
  const [tab, setTab] = useState("overview");

  const totalPaid = useMemo(() => PAYMENTS.reduce((s, p) => s + p.amount, 0), []);
  const remaining = CONTRACT_TOTAL - totalPaid;
  const paidPercent = ((totalPaid / CONTRACT_TOTAL) * 100).toFixed(1);
  const completedStages = STAGES.filter(s => s.status === "done").length;
  const earnedByStages = completedStages * STAGE_COST;
  const overpaid = totalPaid - earnedByStages;
  const neededFor5and6 = Math.max(0, STAGE_COST * 2 - overpaid);

  const tabs = [
    { id: "overview", label: "Обзор", icon: "◉" },
    { id: "payments", label: "Платежи", icon: "₸" },
    { id: "stages", label: "Этапы", icon: "▤" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", color: "#1e293b", fontFamily: "'Onest', 'Inter', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #1e293b, #475569)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>D</div>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, letterSpacing: 0.5 }}>DnA бюро · Авторский надзор</span>
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: "10px 0 4px", color: "#0f172a", letterSpacing: -0.3 }}>ЖК President's Park</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>Квартиры 41–42–43 · мкр Мирас, 116 · 350 м² · Договор №07.09/2025</p>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px", display: "flex", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 18px", background: tab === t.id ? "#f8f9fb" : "transparent", border: "none",
              borderTop: tab === t.id ? "2px solid #1e293b" : "2px solid transparent",
              borderRadius: "8px 8px 0 0", color: tab === t.id ? "#0f172a" : "#94a3b8",
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6
            }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 60px" }}>

        {tab === "overview" && (
          <div>
            {/* Metric cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Сумма договора", value: fmt(CONTRACT_TOTAL), color: "#0f172a" },
                { label: "Оплачено", value: fmt(totalPaid), sub: `${paidPercent}%`, color: "#2563eb" },
                { label: "Остаток", value: fmt(remaining), color: "#d97706" },
              ].map((m, i) => (
                <Card key={i}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>{m.value}</div>
                  {m.sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{m.sub} от суммы договора</div>}
                </Card>
              ))}
            </div>

            {/* Progress bars */}
            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Финансирование</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace" }}>{paidPercent}%</span>
              </div>
              <ProgressBar value={totalPaid} max={CONTRACT_TOTAL} color="#2563eb" bg="#dbeafe" height={10} />
            </Card>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Прогресс работ</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", fontFamily: "'JetBrains Mono', monospace" }}>{completedStages} из 10 этапов</span>
              </div>
              <ProgressBar value={completedStages + 0.4} max={10} color="#16a34a" bg="#dcfce7" height={10} />
              <div style={{ marginTop: 12, fontSize: 13, color: "#64748b", lineHeight: 1.6, background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: 12 }}>
                <strong style={{ color: "#a16207" }}>Текущий статус:</strong> Этапы 1–4 завершены. Этап 5 в процессе — левкас стен 100%, потолки ожидают завершения умного дома и вентиляции, керамогранит не начат.
              </div>
            </Card>

            {/* Financial balance */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Финансовый баланс</div>
              {[
                { label: "Стоимость завершённых этапов (1–4)", value: fmt(earnedByStages), color: "#334155" },
                { label: "Фактически оплачено заказчиком", value: fmt(totalPaid), color: "#2563eb" },
                { label: "Авансировано сверх завершённых этапов", value: fmt(overpaid), color: "#16a34a" },
                null,
                { label: "Стоимость этапов 5 + 6", value: fmt(STAGE_COST * 2), color: "#334155" },
                { label: "Минус ранее авансировано", value: `– ${fmt(overpaid)}`, color: "#64748b" },
              ].map((row, i) => row === null ? (
                <div key={i} style={{ borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />
              ) : (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: row.color, fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>К оплате за этапы 5–6</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#15803d", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(neededFor5and6)}</span>
              </div>
            </Card>
          </div>
        )}

        {tab === "payments" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>История платежей</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{PAYMENTS.length} платежей на общую сумму {fmt(totalPaid)}</div>
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e5e7eb" }}>
                      {["№", "Дата", "Сумма", "Отправитель", "Назначение", "Документ"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PAYMENTS.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 500 }}>{i + 1}</td>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#334155" }}>{fmtDate(p.date)}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#16a34a", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{p.sender}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.desc}</td>
                        <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap" }}>{p.doc}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8f9fb", borderTop: "2px solid #e5e7eb" }}>
                      <td colSpan={2} style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>ИТОГО</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#2563eb" }}>{fmt(totalPaid)}</td>
                      <td colSpan={3} style={{ padding: "12px 14px", color: "#94a3b8" }}>{PAYMENTS.length} платежей</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "stages" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Этапы строительства</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>10 стадий · каждая = 10% от суммы договора = {fmt(STAGE_COST)}</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {STAGES.map((s) => (
                <Card key={s.id} style={{
                  padding: "16px 20px",
                  borderColor: s.status === "done" ? "#bbf7d0" : s.status === "partial" ? "#fde68a" : "#e5e7eb",
                  background: s.status === "done" ? "#fafffe" : s.status === "partial" ? "#fffef5" : "#ffffff",
                  opacity: s.status === "pending" ? 0.65 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, minWidth: 22 }}>
                          {String(s.id).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", lineHeight: 1.5 }}>{s.name}</span>
                      </div>
                      {s.note && (
                        <div style={{ fontSize: 12, color: "#92400e", marginTop: 6, paddingLeft: 32, lineHeight: 1.5, background: "#fef3c7", borderRadius: 6, padding: "6px 10px 6px 32px" }}>
                          {s.note}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                </Card>
              ))}
            </div>

            <Card style={{ marginTop: 16, background: "#f8f9fb", borderColor: "#e5e7eb" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>НЕ ВХОДЯТ В ДОГОВОР</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                Столярные работы (двери) · Кондиционирование · Текстиль · Зеркала и стеклянные перегородки · Гипсовый декор · Газовое оборудование · Системы «умный дом»
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px 20px", background: "#ffffff" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>DnA бюро · ИП Yellow D.S. · Договор подряда №07.09/2025</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Обновлено: {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}
