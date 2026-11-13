// Handprüfung: PDF-Erzeugung mit echtem Chrome (nicht Teil von npm test).
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/pdf-rauch.ts
import { htmlToPdf } from "../../src/lib/server/pdf";

htmlToPdf(`<html><body><h1>Test</h1><img src="http://127.0.0.1:9/x.png"><p>Äöü</p></body></html>`, "Test").then(
  (pdf) => {
    console.log(`PDF mit ${pdf.length} Bytes, beginnt mit ${pdf.subarray(0, 5).toString()}`);
    process.exit(0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
