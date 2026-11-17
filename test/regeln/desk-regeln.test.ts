// Feste Regeln des Spielgeld-Desks (src/lib/paper.ts) und der Rückfrage vor Käufen (src/lib/approval.ts).
// Diese Regeln sind die Sicherheitsgrenzen des Desks; das KI-Gehirn kann sie nicht ändern.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SAFETY, exitPlan, simulateBuy, simulateSell, stopPrice, targetPrice, testDayOf, ticketSize, tradeShare, type Position } from "../../src/lib/paper";
import { APPROVAL, approvalLimitOf, needsApproval, parseApprovalButton } from "../../src/lib/approval";

const position = (over: Partial<Position> = {}): Position =>
  ({
    address: "Coin111",
    symbol: "TEST",
    name: "Test",
    qty: 100,
    costUsd: 100,
    entryPrice: 1,
    peakPrice: 1,
    lastPrice: 1,
    entryLiquidity: 100_000,
    lastLiquidity: 100_000,
    halfSold: false,
    openedAt: "2026-11-05T08:00:00.000Z",
    why: "Test",
    ...over,
  }) as Position;

describe("Desk: feste Sicherheitsgrenzen", () => {
  test("Grenzwerte stehen wie dokumentiert im Code", () => {
    assert.equal(SAFETY.startCapitalUsd, 10_000);
    assert.equal(SAFETY.minTradeShare, 0.02);
    assert.equal(SAFETY.maxTradeShare, 0.05);
    assert.equal(SAFETY.dailyLossLimit, 0.08);
    assert.equal(SAFETY.stopLoss, 0.15);
    assert.equal(SAFETY.maxOpenPositions, 8);
  });

  test("Einsatz bleibt zwischen 2 und 5 Prozent und nie über dem Bargeld", () => {
    assert.equal(tradeShare(-3), 0.02);
    assert.equal(tradeShare(0), 0.02);
    assert.equal(tradeShare(1), 0.05);
    assert.equal(tradeShare(99), 0.05);
    assert.equal(ticketSize(10_000, 10_000, 1), 500);
    assert.equal(ticketSize(10_000, 10_000, 0), 200);
    assert.equal(ticketSize(10_000, 120, 1), 120, "nie mehr als bar da ist");
    assert.equal(ticketSize(10_000, 5, 1), 0, "unter dem Mindestbetrag wird nicht gekauft");
  });

  test("Stop-Loss 15 Prozent unter dem Einstieg, Nachlauf-Stop zieht nach", () => {
    assert.equal(stopPrice(position()), 0.85);
    assert.ok(Math.abs(stopPrice(position({ peakPrice: 2 })) - 1.6) < 1e-9, "20 % unter dem Höchststand");
    assert.ok(Math.abs(stopPrice(position({ peakPrice: 2, halfSold: true })) - 1.4) < 1e-9, "Rest 30 % unter dem Höchststand");
  });

  test("Risk verkauft bei Stop-Loss alles, bei +100 Prozent die Hälfte", () => {
    const now = new Date("2026-11-05T09:00:00.000Z");
    assert.equal(exitPlan(position(), 0.84, 100_000, now)?.share, 1);
    assert.equal(targetPrice(position()), 2);
    assert.equal(exitPlan(position({ peakPrice: 2.1 }), 2.1, 100_000, now)?.share, 0.5);
    assert.equal(exitPlan(position(), 1.05, 100_000, now), null);
  });

  test("Fällt die Liquidität unter die Hälfte, geht alles sofort raus (Rug-Schutz)", () => {
    const plan = exitPlan(position(), 1.2, 40_000, new Date("2026-11-05T09:00:00.000Z"));
    assert.equal(plan?.share, 1);
  });

  test("Kauf und Verkauf rechnen Gebühren und Slippage ein", () => {
    const buy = simulateBuy(100, 1, 1_000_000);
    assert.ok(buy.qty < 100 && buy.feesUsd > 0 && buy.fillPrice > 1);
    const sell = simulateSell(buy.qty, 1, 1_000_000);
    assert.ok(sell.usd < 100, "Hin und zurück kostet Geld");
  });

  test("Testtag zählt Kalendertage ab Start", () => {
    assert.equal(testDayOf(null, new Date()), 0);
    assert.equal(testDayOf("2026-11-02T20:00:00", new Date("2026-11-03T08:00:00")), 2);
  });
});

describe("Rückfrage vor Käufen", () => {
  test("Grenze null heißt nie fragen, 0 heißt immer fragen", () => {
    assert.equal(needsApproval(1_000, null), false);
    assert.equal(needsApproval(1, 0), true);
    assert.equal(needsApproval(99, 100), false);
    assert.equal(needsApproval(100, 100), true);
  });

  test("Unsinn in den Einstellungen fällt auf die feste Voreinstellung zurück", () => {
    assert.equal(approvalLimitOf(123), approvalLimitOf(undefined));
    assert.equal(approvalLimitOf("100"), approvalLimitOf(undefined));
    assert.equal(approvalLimitOf(250), 250);
  });

  test("Frage verfällt nach 10 Minuten", () => {
    assert.equal(APPROVAL.timeoutMinutes, 10);
  });

  test("Telegram-Knopf wird nur im exakten Format akzeptiert", () => {
    assert.ok(parseApprovalButton("rf:abc123:ja"));
    assert.ok(parseApprovalButton("rf:abc123:nein"));
    assert.equal(parseApprovalButton("rf:abc123:vielleicht"), null);
    assert.equal(parseApprovalButton("xx:abc123:ja"), null);
    assert.equal(parseApprovalButton(""), null);
  });
});
