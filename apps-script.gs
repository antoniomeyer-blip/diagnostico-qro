// Cole este código em Extensões > Apps Script da planilha de leads
// e publique em Implantar > Nova implantação > App da Web
// (Executar como: Eu · Quem pode acessar: Qualquer pessoa).

const COLS = [
  "data", "nome", "profissao", "whatsapp", "email", "cidade", "uf", "instagram",
  "nota", "pontos", "faixa", "organizar", "humanizar", "automatizar", "evoluir", "foco",
  "respostas", "utm_source", "utm_medium", "utm_campaign", "utm_content", "consentimento", "pagina"
];
const HEADERS = [
  "Data", "Nome", "Profissão", "WhatsApp", "E-mail", "Cidade", "UF", "Instagram",
  "Nota", "Pontos", "Faixa", "Organizar %", "Humanizar %", "Automatizar %", "Evoluir %", "Foco",
  "Respostas (1-15)", "utm_source", "utm_medium", "utm_campaign", "utm_content", "Consentimento LGPD", "Página"
];

function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    sheet_().appendRow(COLS.map(k => d[k] === undefined ? "" : d[k]));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  sheet_();
  return ContentService.createTextOutput("ok");
}
