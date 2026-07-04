import { BankEvent } from "../types";

export interface CSVSkippedRow {
  lineNumber: number;
  reason: string;
  rawLine: string;
}

export interface ParseSwedishCSVResult {
  events: Omit<BankEvent, "id" | "isPosted" | "verifikatId">[]; 
  skippedRows: CSVSkippedRow[];
}

function parseStrictDate(dateText: string): Date | null {
  const trimmed = dateText.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseStrictSwedishAmount(amountText: string): number | null {
  const trimmed = amountText.trim().replace(/\s*kr$/i, "");
  const match =
    /^[-+]?(?:\d{1,3}(?:[ .\u00A0]\d{3})*|\d+)(?:,\d{1,2})?$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const normalized = trimmed
    .replace(/[ .\u00A0]/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function parseSwedishCSV(
  csvContent: string
): ParseSwedishCSVResult {
  const lines = csvContent.split(/\r?\n/);
  const events: Omit<BankEvent, "id" | "isPosted" | "verifikatId">[] = [];
  const skippedRows: CSVSkippedRow[] = [];

  let firstDataLineFound = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (line.trim() === "") {
      continue;
    }

    if (!firstDataLineFound) {
      firstDataLineFound = true;
      continue; // Header row
    }

    const columns = line.split(";");
    if (columns.length < 4) {
      skippedRows.push({
        lineNumber,
        reason: "För få kolumner - förväntar minst 4 semikolonseparerade kolumner",
        rawLine: line,
      });
      continue;
    }

    const [dateStr, description, , amountStr] = columns;
    const date = parseStrictDate(dateStr);
    if (!date) {
      skippedRows.push({
        lineNumber,
        reason: "Ogiltigt datum - förväntat format YYYY-MM-DD",
        rawLine: line,
      });
      continue;
    }

    const amount = parseStrictSwedishAmount(amountStr);
    if (amount === null) {
      skippedRows.push({
        lineNumber,
        reason: "Ogiltigt belopp - förväntar svenskt talformat med decimalkomma",
        rawLine: line,
      });
      continue;
    }

    events.push({
      date,
      description: description.trim(),
      amount,
    });
  }

  return {
    events,
    skippedRows,
  };
}
