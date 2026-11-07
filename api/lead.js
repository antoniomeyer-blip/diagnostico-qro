// Recebe o diagnóstico preenchido e grava uma linha na planilha de leads (Google Sheets via Apps Script).
// Variável de ambiente necessária na Vercel: SHEETS_WEBHOOK_URL (URL do app da Web do Apps Script).

const PILLARS = ["Organizar", "Humanizar", "Automatizar", "Evoluir"];

// Evita que um texto começando com = + - @ vire fórmula na planilha
function clean(v, max = 200) {
  let s = String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido" });
  }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== "object") return res.status(400).json({ error: "Dados inválidos." });

  // Honeypot: robôs preenchem o campo escondido; respondemos ok sem gravar
  if (b.site) return res.status(200).json({ ok: true });

  const tel = String(b.whatsapp || "").replace(/\D/g, "");
  const email = String(b.email || "").trim().toLowerCase();
  const respostas = Array.isArray(b.respostas) ? b.respostas : [];

  if (String(b.nome || "").trim().length < 3) return res.status(400).json({ error: "Informe seu nome." });
  if (tel.length < 10 || tel.length > 11) return res.status(400).json({ error: "Informe o WhatsApp com DDD." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: "Confira o e-mail." });
  if (b.consentimento !== true) return res.status(400).json({ error: "É preciso autorizar o contato." });
  if (respostas.length !== 15 || respostas.some(v => ![0, 1, 2].includes(v))) return res.status(400).json({ error: "Responda as 15 perguntas." });

  // Recalcula no servidor para não confiar na nota enviada pelo navegador
  const pts = respostas.reduce((s, v) => s + v, 0);
  const nota = Math.round(100 - pts * 100 / 30);
  const faixa = nota >= 80 ? "Operação estruturada" : nota >= 50 ? "Estrutura parcial" : "Operação no improviso";
  const pil = b.pilares && typeof b.pilares === "object" ? b.pilares : {};
  const o = b.origem && typeof b.origem === "object" ? b.origem : {};

  const row = {
    data: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    nome: clean(b.nome, 120),
    profissao: clean(b.profissao, 80),
    whatsapp: "+55" + tel,
    email: clean(email, 120),
    cidade: clean(b.cidade, 80),
    uf: clean(b.uf, 2),
    instagram: clean(b.instagram, 60),
    nota, pontos: pts, faixa,
    organizar: Number(pil.Organizar) || 0,
    humanizar: Number(pil.Humanizar) || 0,
    automatizar: Number(pil.Automatizar) || 0,
    evoluir: Number(pil.Evoluir) || 0,
    foco: PILLARS.includes(b.foco) ? b.foco : "",
    respostas: respostas.join(","),
    utm_source: clean(o.utm_source, 100),
    utm_medium: clean(o.utm_medium, 100),
    utm_campaign: clean(o.utm_campaign, 100),
    utm_content: clean(o.utm_content, 100),
    consentimento: "Sim",
    pagina: clean(b.pagina, 300)
  };

  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) {
    console.error("SHEETS_WEBHOOK_URL não configurada");
    return res.status(500).json({ error: "Configuração pendente." });
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(row),
      redirect: "follow"
    });
    const text = await r.text();
    if (!r.ok || !text.includes('"ok":true')) {
      console.error("Falha ao gravar na planilha", r.status, text.slice(0, 300));
      return res.status(502).json({ error: "Não foi possível registrar agora." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro ao chamar a planilha", err);
    return res.status(502).json({ error: "Não foi possível registrar agora." });
  }
};
