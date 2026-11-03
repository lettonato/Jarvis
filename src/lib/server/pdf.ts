// Macht aus einer fertigen Seite ein PDF, mit dem Chrome auf dem Mac (wie der Browser-Agent, aber ohne
// Fenster und ohne dein Profil). Skripte sind aus, und die Seite darf nichts aus dem Netz laden.

export class PdfError extends Error {}

export async function htmlToPdf(html: string, title: string): Promise<Buffer> {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    throw new PdfError("Der Browser-Baustein fehlt. Starte JARVIS bitte über start-jarvis.command, dann wird er installiert.");
  }
  const exe = process.env.JARVIS_CHROME;
  let browser;
  try {
    browser = await chromium.launch({ ...(exe ? { executablePath: exe } : { channel: "chrome" }), headless: true });
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e);
    throw new PdfError(/not found|executable doesn't exist|ENOENT/i.test(text) ? "Für das PDF brauche ich Google Chrome auf deinem Mac." : `Chrome ließ sich nicht starten: ${text.split("\n")[0].slice(0, 160)}`);
  }
  try {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: "de-DE" });
    await context.route("**/*", (route) => (route.request().url().startsWith("data:") ? route.continue() : route.abort()));
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%;padding:0 16mm;font:8px -apple-system,system-ui,sans-serif;color:#898781;display:flex;justify-content:space-between"><span>${title
        .replace(/[<>&"]/g, "")
        .slice(0, 90)}</span><span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
      tagged: true,
      outline: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
