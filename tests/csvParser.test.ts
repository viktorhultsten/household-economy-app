import assert from "node:assert/strict";
import test from "node:test";

import { parseSwedishCSV } from "../app/utils/csvParser";

test("parseSwedishCSV returnerar events och rapporterar skippade rader", () => {
  const csv = [
    "Bokforingsdag;Text;Valuta;Belopp",
    "2026-01-31;Lon;;12 345,67 kr",
    "2026-02-30;Ogiltigt datum;;100,00 kr",
    "2026-03-01;Fel decimaltecken;;100.00 kr",
    "2026-03-05;Kortkop;;-1 234,50 kr",
    "2026-03-07;For fa kolumner",
    "",
  ].join("\n");

  const result = parseSwedishCSV(csv);

  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].amount, 12345.67);
  assert.equal(result.events[1].amount, -1234.5);

  assert.equal(result.events[0].date, "2026-01-31");
  assert.equal(result.events[1].date, "2026-03-05");

  assert.deepEqual(
    result.skippedRows.map((row) => ({ lineNumber: row.lineNumber, reason: row.reason })),
    [
      {
        lineNumber: 3,
        reason: "Ogiltigt datum - förväntat format YYYY-MM-DD",
      },
      {
        lineNumber: 4,
        reason: "Ogiltigt belopp - förväntar svenskt talformat med decimalkomma",
      },
      {
        lineNumber: 6,
        reason: "För få kolumner - förväntar minst 4 semikolonseparerade kolumner",
      },
    ]
  );
});
