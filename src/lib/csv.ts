/**
 * CSV export for the admin tables.
 *
 * Built by hand rather than with a library: RFC 4180 quoting is a dozen
 * lines, and the only other thing worth doing is neutralising spreadsheet
 * formulas — a prompt or a contact-form message that starts with "=" would
 * otherwise execute when an operator opens the file in Excel.
 */

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  // Numbers pass through untouched — a credit adjustment of -200 is data,
  // not a formula, and quoting it would stop it summing.
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(","));
  return lines.join("\r\n");
}

/** Saves text as a file. The BOM makes Excel read the file as UTF-8, so
 *  names and prompts with accents survive the round trip. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers start the download
  // asynchronously and fail if the URL is already gone.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A filename stamped with today's date, e.g. "users-2026-09-18.csv". */
export function csvFilename(name: string) {
  return `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
}
