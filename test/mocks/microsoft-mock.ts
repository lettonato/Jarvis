// Nachgebautes Microsoft für die Tests: der Anmeldeserver (Anmeldung mit Code, Erneuern) und Microsoft Graph
// (/me und /me/calendarView). Ein Server auf 127.0.0.1, nichts davon berührt das echte Microsoft.
//
// Die Form der Anmeldung folgt der öffentlichen Beschreibung von Microsoft (Stand 13.11.2026): Felder der
// Antworten, Fehlerwörter beim Warten (authorization_pending, authorization_declined, expired_token,
// bad_verification_code). Bei Graph sind die Form der Zeitangaben, die Folgeseite (@odata.nextLink) und die
// Fehlerantworten so nachgebaut, wie sie üblich sind; gegen den echten Dienst ist das nicht geprüft.

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export const MOCK_TENANT = "11111111-2222-3333-4444-555555555555";
export const MOCK_CLIENT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

export type MicrosoftMock = {
  loginUrl: string;
  graphUrl: string;
  // Was du auf der Seite von Microsoft getan hast.
  anmeldung: "wartet" | "bestaetigt" | "abgelehnt" | "abgelaufen" | "falscher-code";
  userCode: string;
  // Gesetzt: Diese Adresse nennt der Anmeldeserver statt der eigenen.
  adresse: string | null;
  intervall: number;
  // Erneuern klappt nur, solange das stimmt.
  angemeldetBleibenGilt: boolean;
  // Gesetzt: Der Anmeldeserver antwortet auf die nächste Anfrage mit diesem Status.
  anmeldeStoerung: number | null;
  // Gesetzt: Graph antwortet auf die nächste Anfrage mit diesem Status.
  graphStoerung: number | null;
  // Gesetzt: verändert die Antwort mit den Schlüsseln, bevor sie hinausgeht (etwa ohne expires_in).
  verbiegeSchluessel: ((antwort: Record<string, unknown>) => Record<string, unknown>) | null;
  // Gesetzt: Graph schickt die Kalenderansicht mit einer Umleitung an diese Adresse weiter.
  graphUmleitung: string | null;
  // So viele Millisekunden lässt sich Graph mit der Kalenderansicht Zeit.
  graphWartezeit: number;
  // Gesetzt: Graph nennt diese Adresse als Folgeseite.
  fremdeFolgeseite: string | null;
  termine: Record<string, unknown>[];
  konto: { displayName: string; userPrincipalName: string };
  // Der Zugangsschlüssel, den Graph gerade annimmt, und der Schlüssel zum Angemeldetbleiben, der gerade gilt.
  zugang: string | null;
  bleib: string | null;
  // Macht den Zugangsschlüssel ungültig, als wäre er abgelaufen.
  verfalleZugang: () => void;
  anfragen: { methode: string; pfad: string; auth: string | null; body: string }[];
  leeren: () => void;
  // Fängt beim Zählen der Schlüssel wieder bei 1 an (zugang-1, bleib-1).
  neu: () => void;
  stop: () => Promise<void>;
};

// Ein Termin, wie Graph ihn liefert. Zeiten als UTC, etwa „2026-11-16T09:00:00“.
export const graphTermin = (id: string, subject: string, start: string, end: string, mehr: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  subject,
  start: { dateTime: `${start}.0000000`, timeZone: "UTC" },
  end: { dateTime: `${end}.0000000`, timeZone: "UTC" },
  isAllDay: false,
  isCancelled: false,
  location: { displayName: "" },
  sensitivity: "normal",
  ...mehr,
});

export async function starteMicrosoftMock(): Promise<MicrosoftMock> {
  let nummer = 0;
  const mock: MicrosoftMock = {
    loginUrl: "",
    graphUrl: "",
    anmeldung: "wartet",
    userCode: "ABCD-EFGH",
    adresse: null,
    intervall: 1,
    angemeldetBleibenGilt: true,
    anmeldeStoerung: null,
    graphStoerung: null,
    verbiegeSchluessel: null,
    graphUmleitung: null,
    graphWartezeit: 0,
    fremdeFolgeseite: null,
    termine: [],
    konto: { displayName: "Benedikt Scheuchl", userPrincipalName: "benedikt@ds-test.example" },
    zugang: null,
    bleib: null,
    verfalleZugang: () => void (mock.zugang = null),
    anfragen: [],
    leeren: () => void (mock.anfragen.length = 0),
    neu: () => void (nummer = 0),
    stop: async () => {},
  };
  const neuerZugang = () => {
    nummer++;
    mock.zugang = `zugang-${nummer}`;
    mock.bleib = `bleib-${nummer}`;
    const antwort = { token_type: "Bearer", scope: "User.Read Calendars.ReadBasic", expires_in: 3600, access_token: mock.zugang, refresh_token: mock.bleib };
    return mock.verbiegeSchluessel ? mock.verbiegeSchluessel(antwort) : antwort;
  };
  const server: Server = createServer((req, res) => {
    const teile: Buffer[] = [];
    req.on("data", (c: Buffer) => teile.push(c));
    req.on("end", () => {
      const body = Buffer.concat(teile).toString("utf8");
      const url = new URL(req.url ?? "/", mock.loginUrl);
      mock.anfragen.push({ methode: req.method ?? "", pfad: req.url ?? "", auth: req.headers.authorization ?? null, body });
      const json = (status: number, inhalt: unknown) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(inhalt));
      const felder = new URLSearchParams(body);

      // ---- Anmeldeserver ----
      const anmelde = url.pathname.match(/^\/([^/]+)\/oauth2\/v2\.0\/(devicecode|token)$/);
      if (anmelde && req.method === "POST") {
        if (mock.anmeldeStoerung) {
          const status = mock.anmeldeStoerung;
          mock.anmeldeStoerung = null;
          return json(status, { error: "temporarily_unavailable", error_description: "GEHEIMER-TEXT-VON-MICROSOFT" });
        }
        if (decodeURIComponent(anmelde[1]) !== MOCK_TENANT || felder.get("client_id") !== MOCK_CLIENT) return json(400, { error: "unauthorized_client", error_description: "GEHEIMER-TEXT-VON-MICROSOFT" });
        if (anmelde[2] === "devicecode") {
          mock.anmeldung = "wartet";
          return json(200, { device_code: "geraetecode-1", user_code: mock.userCode, verification_uri: mock.adresse ?? `${mock.loginUrl}/geraet`, expires_in: 900, interval: mock.intervall, message: "Gib den Code ein." });
        }
        if (felder.get("grant_type") === "urn:ietf:params:oauth:grant-type:device_code") {
          if (felder.get("device_code") !== "geraetecode-1" || mock.anmeldung === "falscher-code") return json(400, { error: "bad_verification_code" });
          if (mock.anmeldung === "wartet") return json(400, { error: "authorization_pending", error_description: "GEHEIMER-TEXT-VON-MICROSOFT" });
          if (mock.anmeldung === "abgelehnt") return json(400, { error: "authorization_declined" });
          if (mock.anmeldung === "abgelaufen") return json(400, { error: "expired_token" });
          return json(200, neuerZugang());
        }
        if (felder.get("grant_type") === "refresh_token") {
          if (!mock.angemeldetBleibenGilt || felder.get("refresh_token") !== mock.bleib) return json(400, { error: "invalid_grant", error_description: "GEHEIMER-TEXT-VON-MICROSOFT" });
          return json(200, neuerZugang());
        }
        return json(400, { error: "unsupported_grant_type" });
      }

      // ---- Graph ----
      if (url.pathname.startsWith("/v1.0/") && req.method === "GET") {
        if (mock.graphStoerung) {
          const status = mock.graphStoerung;
          mock.graphStoerung = null;
          return json(status, { error: { code: "Stoerung", message: "GEHEIMER-TEXT-VON-MICROSOFT" } });
        }
        if (!mock.zugang || req.headers.authorization !== `Bearer ${mock.zugang}`) return json(401, { error: { code: "InvalidAuthenticationToken", message: "GEHEIMER-TEXT-VON-MICROSOFT" } });
        if (url.pathname === "/v1.0/me") return json(200, mock.konto);
        if (url.pathname === "/v1.0/me/calendarView") {
          if (mock.graphUmleitung) return void res.writeHead(302, { location: mock.graphUmleitung }).end();
          if (!url.searchParams.get("startDateTime") || !url.searchParams.get("endDateTime")) return json(400, { error: { code: "ErrorInvalidRequest", message: "startDateTime fehlt" } });
          const je = Number(url.searchParams.get("$top") ?? 10);
          const ab = Number(url.searchParams.get("$skip") ?? 0);
          const value = mock.termine.slice(ab, ab + je);
          const weiter = new URL(url);
          weiter.searchParams.set("$skip", String(ab + je));
          const mehr = ab + je < mock.termine.length;
          const antwort = () => json(200, { value, ...(mock.fremdeFolgeseite ? { "@odata.nextLink": mock.fremdeFolgeseite } : mehr ? { "@odata.nextLink": `${mock.loginUrl}${weiter.pathname}${weiter.search}` } : {}) });
          return mock.graphWartezeit > 0 ? void setTimeout(antwort, mock.graphWartezeit) : antwort();
        }
      }
      json(404, { error: { code: "NotFound", message: "gibt es im Nachbau nicht" } });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  mock.loginUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  mock.graphUrl = `${mock.loginUrl}/v1.0`;
  mock.stop = () => new Promise((resolve) => server.close(() => resolve()));
  return mock;
}
