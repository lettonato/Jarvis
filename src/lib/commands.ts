import type { MarketSnapshot } from "./market";
import type { WeatherSnapshot } from "./weather";
import { formatEur, formatPct } from "./format";

// Einfache Befehlserkennung, bis in Phase 2 das KI-Gehirn freie Sätze versteht.
// Jeder Befehl ist eine Regel: passende Wörter -> Antwort und optional eine Ansicht, die sich öffnet.

export type CommandContext = {
  market: MarketSnapshot | null;
  weather: WeatherSnapshot | null;
  now: Date;
};

export type CommandResult = {
  reply: string;
  navigate?: string;
};

type Rule = {
  match: RegExp;
  run: (ctx: CommandContext, text: string) => CommandResult;
};

const COINS = [
  { symbol: "BTC", words: /bitcoin|btc/ },
  { symbol: "ETH", words: /ethereum|eth\b|ether\b/ },
  { symbol: "SOL", words: /solana|sol\b/ },
];

function timeSentence(now: Date): string {
  return `Es ist ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.`;
}

function weatherSentence(w: WeatherSnapshot | null): string {
  if (!w) return "Die Wetterdaten laden noch.";
  const demo = w.source === "demo" ? " Achtung, das sind Beispieldaten, ich habe gerade keine Verbindung." : "";
  return `In ${w.place} hat es ${Math.round(w.temperature)} Grad, gefühlt ${Math.round(w.feelsLike)}, ${w.description}.${demo}`;
}

function priceSentence(market: MarketSnapshot | null, symbols: string[]): string {
  if (!market) return "Die Kurse laden noch.";
  const parts = market.majors.quotes
    .filter((q) => symbols.includes(q.symbol))
    .map((q) => `${q.name} steht bei ${formatEur(q.eur)}, ${formatPct(q.change24h)} in 24 Stunden`);
  const demo = market.majors.source === "demo" ? " Das sind Beispieldaten, ich habe gerade keine Verbindung." : "";
  return `${parts.join(". ")}.${demo}`;
}

function scanSentence(market: MarketSnapshot | null): string {
  if (!market) return "Der Scanner lädt noch.";
  const passed = market.scan.candidates.filter((c) => c.passed);
  const best = passed[0] ? ` Am stärksten gehandelt wird gerade ${passed[0].symbol}.` : "";
  return `Ich habe ${market.scan.scanned} neue Solana-Coins gescannt. ${passed.length} bestehen die harten Filter.${best}`;
}

const RULES: Rule[] = [
  {
    match: /not-?aus|stopp alles|alles stoppen/,
    run: () => ({ reply: "Der Not-Aus ist bereit. Sobald der Spielgeld-Handel läuft, stoppt er alle Agenten sofort." }),
  },
  {
    match: /trading|desk|handel/,
    run: () => ({ reply: "Ich öffne den Trading-Desk.", navigate: "/trading" }),
  },
  {
    match: /meme|scan|\bcoins?\b|krypto-?markt/,
    run: (ctx) => ({ reply: scanSentence(ctx.market) }),
  },
  {
    match: /bitcoin|btc|ethereum|eth\b|solana|sol\b|kurs|preis/,
    run: (ctx, text) => {
      const asked = COINS.filter((c) => c.words.test(text)).map((c) => c.symbol);
      return { reply: priceSentence(ctx.market, asked.length ? asked : ["BTC", "ETH", "SOL"]) };
    },
  },
  {
    match: /wetter|temperatur|regen|grad/,
    run: (ctx) => ({ reply: weatherSentence(ctx.weather) }),
  },
  {
    match: /uhr|zeit|spät/,
    run: (ctx) => ({ reply: timeSentence(ctx.now) }),
  },
  {
    match: /guten morgen|guten tag|guten abend|hallo|hey|briefing|was steht an/,
    run: (ctx) => {
      const hour = ctx.now.getHours();
      const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
      return {
        reply: [
          `${greeting}, Benedikt.`,
          timeSentence(ctx.now),
          weatherSentence(ctx.weather),
          priceSentence(ctx.market, ["BTC"]),
          scanSentence(ctx.market),
        ].join(" "),
      };
    },
  },
  {
    match: /anruf|telefon|ruf .* an/,
    run: () => ({ reply: "Telefonieren lerne ich in einer späteren Phase. Dafür bekomme ich eine eigene Telefonnummer." }),
  },
  {
    match: /kalender|termin|e-?mail|mail/,
    run: () => ({ reply: "Kalender und E-Mails verbinde ich in Phase 4." }),
  },
  {
    match: /such|recherch|finde/,
    run: () => ({ reply: "Selbstständig im Web suchen kann ich, sobald der Browser-Agent fertig ist." }),
  },
];

export function runCommand(input: string, ctx: CommandContext): CommandResult {
  const text = input.toLowerCase();
  const rule = RULES.find((r) => r.match.test(text));
  if (rule) return rule.run(ctx, text);
  return {
    reply:
      "Das verstehe ich noch nicht. Frag mich nach Wetter, Uhrzeit, Kursen, den Memecoins oder sag: Öffne den Trading-Desk. Freie Sätze verstehe ich ab Phase 2.",
  };
}
