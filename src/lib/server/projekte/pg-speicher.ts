import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { Eintrag, Projekt, Vorschlag } from "../../projekte";
import { MAX_ENTSCHIEDEN, speicherbar, SpeicherFehler, type ProjektSpeicher } from "./schnittstelle";

// Das Projektgedächtnis in PostgreSQL, für den zentralen Betrieb (zum Beispiel Azure Database for PostgreSQL).
// Gleiche Schnittstelle wie die Datei auf dem Mac; die Abläufe in projekte.ts merken keinen Unterschied.
//
// Stand: geprüft gegen ein PostgreSQL 16 auf demselben Rechner (test/hand/postgres-rauch.ts). Gegen eine
// Datenbank in Azure ist nichts gelaufen; dort gibt es noch keine.
//
// Regeln:
// - Außerhalb dieses Rechners wird immer verschlüsselt und das Zertifikat geprüft. Zusätze in der Adresse
//   (sslmode und ähnliche) werden nicht gelesen und können das nicht abschalten.
// - Die Adresse enthält ein Kennwort. Sie steht nur in der Umgebung (JARVIS_PROJEKTE_DB), nie in einer
//   Meldung, im Protokoll oder in der Anzeige. Fehler der Datenbank kommen als fester Satz mit ihrer Kennung an.
// - Zusammengehörige Schritte laufen in einer Transaktion und nacheinander (eine Sperre in der Datenbank),
//   auch wenn mehrere JARVIS-Prozesse dieselbe Datenbank benutzen. Das entspricht der Warteschlange der Datei.
// - Die Tabellen legt JARVIS nur an, wenn sie fehlen. Hat eure IT sie schon angelegt, braucht das Konto von
//   JARVIS in der Datenbank nur lesen, einfügen, ändern und löschen zu dürfen, kein Anlegen.

const LOKAL = new Set(["localhost", "127.0.0.1", "::1"]);
const UNBRAUCHBAR =
  "Die Adresse der Datenbank in JARVIS_PROJEKTE_DB ist unbrauchbar. Erwartet wird die Form postgres://benutzer:kennwort@rechner:5432/datenbank.";

// Liest die Adresse. Zurück kommt, was die Verbindung braucht, und ein Text für die Anzeige ohne Benutzer und Kennwort.
export function pgVerbindung(adresse: string): { ort: string; pool: PoolConfig } {
  let u: URL;
  try {
    u = new URL(adresse);
  } catch {
    throw new SpeicherFehler(UNBRAUCHBAR);
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  let datenbank = "";
  let user = "";
  let password: string | undefined;
  try {
    datenbank = decodeURIComponent(u.pathname.slice(1));
    user = decodeURIComponent(u.username);
    password = u.password ? decodeURIComponent(u.password) : undefined;
  } catch {
    throw new SpeicherFehler(UNBRAUCHBAR);
  }
  if (!/^postgres(?:ql)?:$/.test(u.protocol) || !host || !datenbank || datenbank.includes("/")) throw new SpeicherFehler(UNBRAUCHBAR);
  return {
    ort: `PostgreSQL-Datenbank „${datenbank}“ auf ${host}`,
    pool: { host, port: u.port ? Number(u.port) : 5432, user, password, database: datenbank, ssl: LOKAL.has(host.toLowerCase()) ? false : { rejectUnauthorized: true } },
  };
}

// Die Tabellen. Jede Zeile trägt den ganzen Datensatz als JSON und daneben nur die Spalten, nach denen gesucht
// oder die geprüft werden. `lfd` hält die Reihenfolge des Anlegens fest, wie die Liste in der Datei.
export const TABELLEN = `
create table if not exists projekte (
  lfd bigint generated always as identity,
  id text primary key,
  daten jsonb not null
);
create table if not exists projekt_eintraege (
  lfd bigint generated always as identity,
  id text primary key,
  projekt_id text not null references projekte(id),
  daten jsonb not null
);
create index if not exists projekt_eintraege_projekt on projekt_eintraege (projekt_id);
create table if not exists projekt_vorschlaege (
  lfd bigint generated always as identity,
  id text primary key,
  zustand text not null check (zustand in ('offen', 'uebernommen', 'abgelehnt')),
  daten jsonb not null
);
`;

// Die Nummer der Sperre, unter der alle Änderungen am Projektgedächtnis nacheinander laufen („JRVS“).
const SPERRE = 0x4a525653;
// So lange wartet eine Änderung höchstens auf die Sperre, bevor sie mit einer Meldung aufgibt.
const SPERRFRIST_MS = 20_000;

// Aus einem Fehler der Datenbank wird ein fester Satz. Der Text der Datenbank kann Benutzer, Rechner oder
// Inhalte nennen und geht deshalb nie an die Seite oder an das Modell, nur ihre kurze Kennung (zum Beispiel
// 23503, ECONNREFUSED oder SELF_SIGNED_CERT_IN_CHAIN). Für die Fehlersuche steht die Meldung der Datenbank
// im Protokoll des Servers, ohne die Einzelheiten zur betroffenen Zeile und höchstens einmal je Minute und Kennung.
const gemeldet = new Map<string, number>();
function fehler(e: unknown): SpeicherFehler {
  if (e instanceof SpeicherFehler) return e;
  const code = (e as { code?: unknown } | null)?.code;
  const text = e instanceof Error ? e.message : "";
  const kennung =
    typeof code === "string" && /^[0-9A-Z_]{1,48}$/.test(code) ? code : /timeout/i.test(text) ? "ZEITUEBERSCHREITUNG" : /does not support SSL/i.test(text) ? "KEINE_VERSCHLUESSELUNG" : "unbekannt";
  const jetzt = Date.now();
  if (jetzt - (gemeldet.get(kennung) ?? 0) > 60_000) {
    gemeldet.set(kennung, jetzt);
    console.error(`Projektgedächtnis, Datenbank (Kennung ${kennung}):`, text.slice(0, 200) || "ohne Meldung");
  }
  return new SpeicherFehler(`Die Datenbank des Projektgedächtnisses ist nicht erreichbar oder hat einen Fehler gemeldet (Kennung ${kennung}).`);
}

type Zeile<T> = { daten: T };

// Eine ausgeliehene Verbindung meldet einen Abriss zusätzlich als Ereignis. Hört niemand zu, beendet Node den
// ganzen Server. Solange JARVIS die Verbindung hält, hört deshalb jemand zu; die laufende Anweisung schlägt
// ohnehin fehl, und die Verbindung wird danach weggeworfen statt zurückgelegt.
async function mitVerbindung<T>(pool: Pool, arbeit: (client: PoolClient, verwerfen: () => void) => Promise<T>): Promise<T> {
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (e) {
    throw fehler(e);
  }
  let kaputt = false;
  const abriss = () => void (kaputt = true);
  client.on("error", abriss);
  try {
    return await arbeit(client, abriss);
  } finally {
    client.removeListener("error", abriss);
    client.release(kaputt);
  }
}

export class PgSpeicher implements ProjektSpeicher {
  readonly ort: string;
  readonly art = "datenbank";
  private readonly einstellung: PoolConfig;
  private readonly sperrfrist: number;
  private bereit: Promise<Pool> | null = null;
  // Die Verbindung der laufenden Transaktion. Aufrufe innerhalb benutzen sie, alle anderen den Vorrat.
  private readonly laufend = new AsyncLocalStorage<PoolClient>();
  // Änderungen dieses Prozesses stellen sich hier an. So wartet immer nur eine Verbindung auf die Sperre in der
  // Datenbank, und die übrigen bleiben fürs Lesen frei.
  private schlange: Promise<unknown> = Promise.resolve();

  constructor(adresse: string, optionen: { sperrfristMs?: number } = {}) {
    const v = pgVerbindung(adresse);
    this.ort = v.ort;
    this.einstellung = v.pool;
    this.sperrfrist = Math.max(1, Math.round(optionen.sperrfristMs ?? SPERRFRIST_MS));
  }

  // Beginnt eine Transaktion und holt die Sperre. Wartet darauf höchstens die Sperrfrist. Bleibt ein Prozess
  // mitten in einer Transaktion hängen, beendet die Datenbank seine Verbindung nach einer Minute; die Sperre
  // ist dann wieder frei.
  private async beginne(client: PoolClient): Promise<void> {
    await client.query("begin");
    await client.query("select set_config('lock_timeout', $1, true), set_config('idle_in_transaction_session_timeout', '60s', true)", [`${this.sperrfrist}ms`]);
    await client.query("select pg_advisory_xact_lock($1)", [SPERRE]);
  }

  // Verbindet sich beim ersten Zugriff und legt die Tabellen an, falls sie fehlen. Schlägt das fehl, versucht
  // es der nächste Zugriff von vorn (die Datenbank kann inzwischen wieder da sein).
  private verbinde(): Promise<Pool> {
    return (this.bereit ??= (async () => {
      const pool = new Pool({ ...this.einstellung, max: 5, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
      // Reißt eine ruhende Verbindung ab, darf das den Server nicht beenden; der nächste Zugriff holt eine neue.
      pool.on("error", () => {});
      try {
        const da = "select to_regclass('projekte') is not null and to_regclass('projekt_eintraege') is not null and to_regclass('projekt_vorschlaege') is not null as da";
        if (!(await pool.query<{ da: boolean }>(da)).rows[0].da) {
          await mitVerbindung(pool, async (client, verwerfen) => {
            try {
              await this.beginne(client);
              await client.query(TABELLEN);
              await client.query("commit");
            } catch (e) {
              await client.query("rollback").catch(verwerfen);
              throw e;
            }
          });
        }
        return pool;
      } catch (e) {
        this.bereit = null;
        await pool.end().catch(() => {});
        throw fehler(e);
      }
    })());
  }

  // Für Tests und zum sauberen Beenden.
  async schliesse(): Promise<void> {
    const bereit = this.bereit;
    this.bereit = null;
    if (bereit) await bereit.then((pool) => pool.end()).catch(() => {});
  }

  private async frage<T>(sql: string, werte: unknown[] = []): Promise<T[]> {
    const client = this.laufend.getStore();
    try {
      const ergebnis = client ? await client.query(sql, werte) : await (await this.verbinde()).query(sql, werte);
      return ergebnis.rows as T[];
    } catch (e) {
      throw fehler(e);
    }
  }

  // Eine einzelne Änderung wartet wie in der Datei, bis eine laufende Transaktion fertig ist.
  private aendere(sql: string, werte: unknown[]): Promise<void> {
    return this.transaktion(() => this.frage(sql, werte).then(() => {}));
  }

  // Der Datensatz als JSON für die Datenbank, mit bereinigtem Text (die Datenbank lehnt NUL und halbe Zeichenpaare ab).
  private json(wert: unknown): string {
    return JSON.stringify(speicherbar(wert));
  }

  async projekte() {
    return (await this.frage<Zeile<Projekt>>("select daten from projekte order by lfd")).map((z) => z.daten);
  }
  speichereProjekt(projekt: Projekt) {
    return this.aendere("insert into projekte (id, daten) values ($1, $2::jsonb) on conflict (id) do update set daten = excluded.daten", [projekt.id, this.json(projekt)]);
  }

  async eintraege(projektId?: string) {
    const zeilen = projektId
      ? await this.frage<Zeile<Eintrag>>("select daten from projekt_eintraege where projekt_id = $1 order by lfd", [projektId])
      : await this.frage<Zeile<Eintrag>>("select daten from projekt_eintraege order by lfd");
    return zeilen.map((z) => z.daten);
  }
  speichereEintrag(eintrag: Eintrag) {
    return this.aendere(
      "insert into projekt_eintraege (id, projekt_id, daten) values ($1, $2, $3::jsonb) on conflict (id) do update set projekt_id = excluded.projekt_id, daten = excluded.daten",
      [eintrag.id, eintrag.projektId, this.json(eintrag)],
    );
  }

  async vorschlaege(zustand?: Vorschlag["zustand"]) {
    const zeilen = zustand
      ? await this.frage<Zeile<Vorschlag>>("select daten from projekt_vorschlaege where zustand = $1 order by lfd", [zustand])
      : await this.frage<Zeile<Vorschlag>>("select daten from projekt_vorschlaege order by lfd");
    return zeilen.map((z) => z.daten);
  }
  speichereVorschlag(vorschlag: Vorschlag) {
    return this.transaktion(async () => {
      await this.frage("insert into projekt_vorschlaege (id, zustand, daten) values ($1, $2, $3::jsonb) on conflict (id) do update set zustand = excluded.zustand, daten = excluded.daten", [
        vorschlag.id,
        vorschlag.zustand,
        this.json(vorschlag),
      ]);
      // Die ältesten entschiedenen Vorschläge fallen weg, wie in der Datei.
      await this.frage("delete from projekt_vorschlaege where id in (select id from projekt_vorschlaege where zustand <> 'offen' order by lfd desc offset $1)", [MAX_ENTSCHIEDEN]);
    });
  }

  transaktion<T>(arbeit: () => Promise<T>): Promise<T> {
    // Gehört der Aufruf schon zu einer Transaktion, läuft er in ihr mit.
    if (this.laufend.getStore()) return arbeit();
    const lauf = this.schlange.then(() => this.eineTransaktion(arbeit));
    this.schlange = lauf.catch(() => {});
    return lauf;
  }

  private async eineTransaktion<T>(arbeit: () => Promise<T>): Promise<T> {
    const pool = await this.verbinde();
    return mitVerbindung(pool, async (client, verwerfen) => {
      try {
        try {
          await this.beginne(client);
        } catch (e) {
          throw fehler(e);
        }
        const ergebnis = await this.laufend.run(client, arbeit);
        let abschluss: string | null;
        try {
          abschluss = (await client.query("commit")).command;
        } catch (e) {
          throw fehler(e);
        }
        // Ist unterwegs eine Anweisung gescheitert und der Fehler wurde verschluckt, macht die Datenbank aus
        // „commit“ still ein „rollback“. Das darf nicht als Erfolg durchgehen.
        if (abschluss !== "COMMIT") throw new SpeicherFehler("Die Datenbank des Projektgedächtnisses hat die Änderung nicht übernommen (Kennung ROLLBACK).");
        return ergebnis;
      } catch (e) {
        await client.query("rollback").catch(verwerfen);
        throw e;
      }
    });
  }
}
