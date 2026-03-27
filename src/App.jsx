import { useState, useMemo, useCallback, useRef, useEffect } from "react";

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

const INITIAL_PAYMENTS = [
  { id: "init-1", date: "2025-09-10", amount: 2870000, sender: "ИП MODA", desc: "Аванс 10% по договору №07.09/2025", doc: "ПП №334", isInitial: true },
  { id: "init-2", date: "2025-10-23", amount: 2587000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №429", isInitial: true },
  { id: "init-3", date: "2025-12-06", amount: 2587000, sender: "ИП БАҚЖАН", desc: "За работу Дизайнера", doc: "ПП №1548", isInitial: true },
  { id: "init-4", date: "2025-12-30", amount: 1500000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №596", isInitial: true },
  { id: "init-5", date: "2026-02-06", amount: 1000000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №25", isInitial: true },
  { id: "init-6", date: "2026-02-07", amount: 87000, sender: "ИП MODA", desc: "Прочие безвозмездные переводы денег", doc: "ПП №26", isInitial: true },
  { id: "init-7", date: "2026-02-07", amount: 1500000, sender: "ИП MODA", desc: "Прочие безвозмездные переводы денег", doc: "ПП №27", isInitial: true },
  { id: "init-8", date: "2026-03-07", amount: 1000000, sender: "ИП MODA", desc: "За профессиональные, научные и технические услуги", doc: "ПП №75", isInitial: true },
  { id: "init-9", date: "2026-03-18", amount: 500000, sender: "Уразбаева М.А.", desc: "Перевод клиенту Kaspi", doc: "Квитанция №821996138...", isInitial: true },
];

const fmt = (n) => n.toLocaleString("ru-RU") + " \u20B8";
const fmtDate = (d) => {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
};

/* ─── Image processing ─── */
const processImage = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const thumb = document.createElement("canvas");
        const tr = Math.min(200 / img.width, 200 / img.height, 1);
        thumb.width = img.width * tr;
        thumb.height = img.height * tr;
        thumb.getContext("2d").drawImage(img, 0, 0, thumb.width, thumb.height);

        const ocr = document.createElement("canvas");
        const or2 = Math.min(1500 / img.width, 1500 / img.height, 1);
        ocr.width = img.width * or2;
        ocr.height = img.height * or2;
        ocr.getContext("2d").drawImage(img, 0, 0, ocr.width, ocr.height);

        resolve({
          thumbnail: thumb.toDataURL("image/jpeg", 0.6),
          ocrImage: ocr.toDataURL("image/png"),
          fullImage: e.target.result,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

/* ─── OCR result parsing ─── */
const parseReceiptText = (text) => {
  let amount = null, date = null, sender = "", desc = "", doc = "";

  // Amount
  for (const p of [
    /(?:сумма|итого|переведено|списано|к оплате|amount)[\s:=]*([0-9\s]+[.,]?\d*)/gi,
    /([0-9]{1,3}(?:\s\d{3})+(?:[.,]\d{2})?)\s*(?:\u20B8|тенге|KZT|тг)/gi,
    /(?:\u20B8|KZT)\s*([0-9]{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)/gi,
    /([0-9]{4,}(?:[.,]\d{2})?)\s*(?:\u20B8|тенге|тг)/gi,
  ]) {
    for (const m of text.matchAll(p)) {
      const v = parseInt(m[1].replace(/[\s,.]/g, ""));
      if (v > 1000 && (!amount || v > amount)) amount = v;
    }
  }

  // Date
  for (const p of [/(\d{2})[./](\d{2})[./](\d{4})/, /(\d{4})-(\d{2})-(\d{2})/]) {
    const m = text.match(p);
    if (m) {
      date = m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`;
      break;
    }
  }

  // Sender
  const sm = text.match(/(?:ИП|ТОО|АО)\s+[А-ЯЁA-Z][^\n,;]{2,30}/i);
  if (sm) sender = sm[0].trim();

  // Description
  const dm = text.match(/(?:назначение|основание|комментарий)[\s:]+(.+?)(?:\n|$)/i);
  if (dm) desc = dm[1].trim();

  // Doc number
  const nm = text.match(/(?:№|номер|квитанция)[\s:]*([^\n]{3,30})/i);
  if (nm) doc = nm[0].trim();

  return { amount, date, sender, desc, doc };
};

/* ─── Reusable components ─── */
const ProgressBar = ({ value, max, color = "#16a34a", bg = "#e5e7eb", height = 8 }) => (
  <div style={{ background: bg, borderRadius: height, height, width: "100%", overflow: "hidden" }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: height, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
  </div>
);

const StatusBadge = ({ status }) => {
  const c = {
    done: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0", label: "\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D" },
    partial: { bg: "#fef9c3", color: "#a16207", border: "#fde68a", label: "\u25D0 \u0412 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435" },
    pending: { bg: "#f3f4f6", color: "#9ca3af", border: "#e5e7eb", label: "\u25CB \u041E\u0436\u0438\u0434\u0430\u0435\u0442" },
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

/* ─── Add Payment Modal ─── */
const AddPaymentModal = ({ onClose, onSave }) => {
  const [step, setStep] = useState("choose");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    sender: "",
    desc: "",
    doc: "",
  });
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStep("ocr");
    setOcrStatus("Обработка изображения...");
    setOcrProgress(5);
    try {
      const { thumbnail: thumb, ocrImage, fullImage } = await processImage(file);
      setImagePreview(fullImage);
      setThumbnail(thumb);
      setOcrProgress(10);
      setOcrStatus("Загрузка модуля распознавания...");

      const { createWorker } = await import("tesseract.js");
      setOcrProgress(25);
      setOcrStatus("Инициализация OCR...");

      const worker = await createWorker("rus", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(25 + Math.round(m.progress * 65));
            setOcrStatus("Распознаём текст...");
          }
        },
      });

      const { data } = await worker.recognize(ocrImage);
      await worker.terminate();
      setOcrProgress(95);
      setOcrStatus("Анализируем данные...");

      const parsed = parseReceiptText(data.text);
      setForm((f) => ({
        ...f,
        amount: parsed.amount ? String(parsed.amount) : f.amount,
        date: parsed.date || f.date,
        sender: parsed.sender || f.sender,
        desc: parsed.desc || f.desc,
        doc: parsed.doc || f.doc,
      }));
      setOcrProgress(100);
      setTimeout(() => setStep("form"), 400);
    } catch {
      setOcrStatus("Не удалось распознать — заполните вручную");
      setTimeout(() => setStep("form"), 1200);
    }
  };

  const handleSave = () => {
    if (!form.amount || !form.date) return;
    onSave({
      id: "user-" + Date.now(),
      date: form.date,
      amount: parseInt(form.amount),
      sender: form.sender || "\u2014",
      desc: form.desc || "\u2014",
      doc: form.doc || "\u2014",
      thumbnail,
      isInitial: false,
    });
    onClose();
  };

  const inp = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8,
    fontSize: 14, color: "#1e293b", background: "#fff", outline: "none", boxSizing: "border-box",
    fontFamily: "'Onest', sans-serif",
  };
  const lbl = { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }} onClick={(e) => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>Добавить платёж</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Загрузите чек или заполните вручную</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "none", background: "#f1f5f9", borderRadius: 8, color: "#64748b", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
        </div>

        <div style={{ padding: 22 }}>

          {/* Choose */}
          {step === "choose" && (
            <div style={{ display: "grid", gap: 12 }}>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
              <button onClick={() => fileRef.current?.click()} style={{ padding: "30px 20px", border: "2px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Загрузить чек / квитанцию</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Автоматически распознаем сумму, дату и назначение</div>
              </button>
              <button onClick={() => setStep("form")} style={{ padding: "14px 20px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                Заполнить вручную
              </button>
            </div>
          )}

          {/* OCR progress */}
          {step === "ocr" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              {imagePreview && <img src={imagePreview} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 10, marginBottom: 14, border: "1px solid #e5e7eb" }} />}
              <div style={{ width: 36, height: 36, margin: "0 auto 10px", border: "3px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", animation: "ppSpin 1s linear infinite" }} />
              <style>{`@keyframes ppSpin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>{ocrStatus}</div>
              <ProgressBar value={ocrProgress} max={100} color="#2563eb" bg="#dbeafe" height={6} />
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{ocrProgress}%</div>
            </div>
          )}

          {/* Form */}
          {step === "form" && (
            <div>
              {imagePreview && (
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                  <img src={imagePreview} alt="" style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 10, border: "1px solid #e5e7eb" }} />
                  <div style={{ fontSize: 11, color: "#16a34a", marginTop: 6, fontWeight: 500 }}>Данные распознаны — проверьте и скорректируйте</div>
                </div>
              )}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Сумма (\u20B8) *</label>
                    <input style={{ ...inp, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }} type="number" placeholder="1000000" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label style={lbl}>Дата *</label>
                    <input style={inp} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Отправитель</label>
                  <input style={inp} placeholder="ИП MODA" value={form.sender} onChange={(e) => setForm((f) => ({ ...f, sender: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Назначение платежа</label>
                  <input style={inp} placeholder="За профессиональные услуги" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Документ / Квитанция</label>
                  <input style={inp} placeholder="ПП №123 или Квитанция Kaspi" value={form.doc} onChange={(e) => setForm((f) => ({ ...f, doc: e.target.value }))} />
                </div>
              </div>

              {form.amount && (
                <div style={{ marginTop: 14, padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>Будет добавлен:</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#15803d", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(parseInt(form.amount) || 0)}</span>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Отмена</button>
                <button onClick={handleSave} disabled={!form.amount || !form.date} style={{ flex: 1, padding: 12, border: "none", borderRadius: 10, background: form.amount && form.date ? "#1e293b" : "#e5e7eb", color: form.amount && form.date ? "#fff" : "#94a3b8", fontSize: 14, fontWeight: 600, cursor: form.amount && form.date ? "pointer" : "default" }}>Сохранить</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Receipt preview ─── */
const ReceiptPreview = ({ src, onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={onClose}>
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <img src={src} alt="" style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }} />
      <button onClick={onClose} style={{ position: "absolute", top: -12, right: -12, width: 36, height: 36, borderRadius: "50%", border: "none", background: "#fff", color: "#333", fontSize: 18, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>&times;</button>
    </div>
  </div>
);

/* ─── Delete confirmation ─── */
const ConfirmDelete = ({ payment, onConfirm, onCancel }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 16 }} onClick={onCancel}>
    <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Удалить платёж?</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{fmtDate(payment.date)} — {fmt(payment.amount)}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 18 }}>{payment.desc}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Отмена</button>
        <button onClick={onConfirm} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Удалить</button>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [receiptView, setReceiptView] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [userPayments, setUserPayments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pp-user-payments") || "[]");
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("pp-user-payments", JSON.stringify(userPayments));
  }, [userPayments]);

  const allPayments = useMemo(
    () => [...INITIAL_PAYMENTS, ...userPayments].sort((a, b) => a.date.localeCompare(b.date)),
    [userPayments],
  );

  const totalPaid = useMemo(() => allPayments.reduce((s, p) => s + p.amount, 0), [allPayments]);
  const remaining = CONTRACT_TOTAL - totalPaid;
  const paidPercent = ((totalPaid / CONTRACT_TOTAL) * 100).toFixed(1);
  const completedStages = STAGES.filter((s) => s.status === "done").length;
  const earnedByStages = completedStages * STAGE_COST;
  const overpaid = totalPaid - earnedByStages;
  const neededFor5and6 = Math.max(0, STAGE_COST * 2 - overpaid);

  const addPayment = useCallback((p) => setUserPayments((prev) => [...prev, p]), []);
  const removePayment = useCallback((id) => { setUserPayments((prev) => prev.filter((p) => p.id !== id)); setDeleteTarget(null); }, []);

  const tabs = [
    { id: "overview", label: "Обзор", icon: "\u25C9" },
    { id: "payments", label: "Платежи", icon: "\u20B8" },
    { id: "stages", label: "Этапы", icon: "\u25A4" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fb", color: "#1e293b", fontFamily: "'Onest','Inter',-apple-system,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="url(#lg)" /><text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="Onest,sans-serif">D</text><defs><linearGradient id="lg" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#1e293b" /><stop offset="1" stopColor="#475569" /></linearGradient></defs></svg>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, letterSpacing: 0.5 }}>DnA бюро &middot; Авторский надзор</span>
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: "10px 0 4px", color: "#0f172a", letterSpacing: -0.3 }}>ЖК President&rsquo;s Park</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>Квартиры 41–42–43 &middot; мкр Мирас, 116 &middot; 350 м&sup2; &middot; Договор №07.09/2025</p>
        </div>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px", display: "flex", gap: 2 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 18px", background: tab === t.id ? "#f8f9fb" : "transparent", border: "none",
              borderTop: tab === t.id ? "2px solid #1e293b" : "2px solid transparent",
              borderRadius: "8px 8px 0 0", color: tab === t.id ? "#0f172a" : "#94a3b8",
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Сумма договора", value: fmt(CONTRACT_TOTAL), color: "#0f172a" },
                { label: "Оплачено", value: fmt(totalPaid), sub: `${paidPercent}%`, color: "#2563eb" },
                { label: "Остаток", value: fmt(remaining), color: remaining > 0 ? "#d97706" : "#16a34a" },
              ].map((m, i) => (
                <Card key={i}>
                  <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.1 }}>{m.value}</div>
                  {m.sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{m.sub} от суммы договора</div>}
                </Card>
              ))}
            </div>

            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Финансирование</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", fontFamily: "'JetBrains Mono',monospace" }}>{paidPercent}%</span>
              </div>
              <ProgressBar value={totalPaid} max={CONTRACT_TOTAL} color="#2563eb" bg="#dbeafe" height={10} />
            </Card>

            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Прогресс работ</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", fontFamily: "'JetBrains Mono',monospace" }}>{completedStages} из 10 этапов</span>
              </div>
              <ProgressBar value={completedStages + 0.4} max={10} color="#16a34a" bg="#dcfce7" height={10} />
              <div style={{ marginTop: 12, fontSize: 13, color: "#64748b", lineHeight: 1.6, background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: 12 }}>
                <strong style={{ color: "#a16207" }}>Текущий статус:</strong> Этапы 1–4 завершены. Этап 5 в процессе — левкас стен 100%, потолки ожидают завершения умного дома и вентиляции, керамогранит не начат.
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#0f172a" }}>Финансовый баланс</div>
              {[
                { label: "Стоимость завершённых этапов (1–4)", value: fmt(earnedByStages), color: "#334155" },
                { label: "Фактически оплачено заказчиком", value: fmt(totalPaid), color: "#2563eb" },
                { label: "Авансировано сверх завершённых этапов", value: fmt(overpaid), color: "#16a34a" },
                null,
                { label: "Стоимость этапов 5 + 6", value: fmt(STAGE_COST * 2), color: "#334155" },
                { label: "Минус ранее авансировано", value: `\u2013 ${fmt(overpaid)}`, color: "#64748b" },
              ].map((row, i) =>
                row === null ? <div key={i} style={{ borderTop: "1px solid #e5e7eb", margin: "8px 0" }} /> : (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: row.color, fontFamily: "'JetBrains Mono',monospace" }}>{row.value}</span>
                  </div>
                ),
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>К оплате за этапы 5–6</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#15803d", fontFamily: "'JetBrains Mono',monospace" }}>{fmt(neededFor5and6)}</span>
              </div>
            </Card>
          </div>
        )}

        {/* ─── PAYMENTS ─── */}
        {tab === "payments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>История платежей</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{allPayments.length} платежей на общую сумму {fmt(totalPaid)}</div>
              </div>
              <button onClick={() => setShowAdd(true)} style={{
                padding: "10px 18px", border: "none", borderRadius: 10, background: "#1e293b", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(30,41,59,.25)", transition: "transform .15s",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Добавить платёж
              </button>
            </div>

            {userPayments.length > 0 && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, fontSize: 12, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>i</span>
                Добавлено вами: {userPayments.length} платеж(ей) на {fmt(userPayments.reduce((s, p) => s + p.amount, 0))}. Данные сохранены в браузере.
              </div>
            )}

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e5e7eb" }}>
                      {["№", "Дата", "Сумма", "Отправитель", "Назначение", "Документ", ""].map((h, i) => (
                        <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: p.isInitial ? "transparent" : "#fefce8" }}>
                        <td style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 500 }}>{i + 1}</td>
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#334155" }}>{fmtDate(p.date)}</td>
                        <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: "#16a34a", whiteSpace: "nowrap" }}>{fmt(p.amount)}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>{p.sender}</td>
                        <td style={{ padding: "10px 14px", color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.desc}</td>
                        <td style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {p.thumbnail && (
                              <button onClick={() => setReceiptView(p.thumbnail)} style={{ width: 28, height: 28, padding: 0, border: "1px solid #e5e7eb", borderRadius: 4, background: "none", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}>
                                <img src={p.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </button>
                            )}
                            {p.doc}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {!p.isInitial && (
                            <button onClick={() => setDeleteTarget(p)} title="Удалить" style={{ width: 28, height: 28, border: "none", background: "transparent", color: "#d1d5db", cursor: "pointer", borderRadius: 6, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
                            >&times;</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8f9fb", borderTop: "2px solid #e5e7eb" }}>
                      <td colSpan={2} style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>ИТОГО</td>
                      <td style={{ padding: "12px 14px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: "#2563eb" }}>{fmt(totalPaid)}</td>
                      <td colSpan={4} style={{ padding: "12px 14px", color: "#94a3b8" }}>{allPayments.length} платежей</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ─── STAGES ─── */}
        {tab === "stages" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Этапы строительства</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>10 стадий &middot; каждая = 10% от суммы договора = {fmt(STAGE_COST)}</div>
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
                        <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, minWidth: 22 }}>
                          {String(s.id).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", lineHeight: 1.5 }}>{s.name}</span>
                      </div>
                      {s.note && (
                        <div style={{ fontSize: 12, color: "#92400e", marginTop: 6, lineHeight: 1.5, background: "#fef3c7", borderRadius: 6, padding: "6px 10px 6px 32px" }}>
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
                Столярные работы (двери) &middot; Кондиционирование &middot; Текстиль &middot; Зеркала и стеклянные перегородки &middot; Гипсовый декор &middot; Газовое оборудование &middot; Системы «умный дом»
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px 20px", background: "#ffffff" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>DnA бюро &middot; ИП Yellow D.S. &middot; Договор подряда №07.09/2025</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Обновлено: {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAdd && <AddPaymentModal onClose={() => setShowAdd(false)} onSave={addPayment} />}
      {receiptView && <ReceiptPreview src={receiptView} onClose={() => setReceiptView(null)} />}
      {deleteTarget && <ConfirmDelete payment={deleteTarget} onConfirm={() => removePayment(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
