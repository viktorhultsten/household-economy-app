import { Transaction } from "../types";

export function parseSwedishCSV(csvContent: string): Transaction[] {
  const lines = csvContent.trim().split("\n");

  // Skip header row
  const dataLines = lines.slice(1);

  const transactions: Transaction[] = [];

  dataLines.forEach((line, index) => {
    // Split by semicolon
    const columns = line.split(";");

    if (columns.length < 4) {
      return; // Skip invalid rows
    }

    const [dateStr, description, , amountStr] = columns;

    // Parse date (format: YYYY-MM-DD)
    const date = new Date(dateStr.trim());

    // Parse amount - remove " kr" suffix, replace comma with dot, and parse as float
    const cleanAmount = amountStr
      .trim()
      .replace(" kr", "")
      .replace(/\s/g, "") // Remove spaces (thousand separators)
      .replace(",", ".");

    const amount = parseFloat(cleanAmount);

    if (isNaN(date.getTime()) || isNaN(amount)) {
      return; // Skip invalid rows
    }

    transactions.push({
      id: index + 1,
      date,
      description: description.trim(),
      amount,
    });
  });

  return transactions;
}
