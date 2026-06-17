import { API_BASE_URL } from "./api";

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function buildInvoiceUrl(invoiceUrl) {
  if (!invoiceUrl) return "";
  if (invoiceUrl.startsWith("http")) return invoiceUrl;
  return `${API_BASE_URL}${invoiceUrl}`;
}

export function matchesSearch(record, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return Object.values(record).some((value) =>
    String(value || "").toLowerCase().includes(normalizedQuery),
  );
}

export function parseDateValue(dateValue) {
  if (!dateValue) return null;

  const value = String(dateValue).trim();
  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (ddmmyyyy) {
    return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getFinancialYear(dateValue) {
  const date = parseDateValue(dateValue);

  if (!date) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function exportCsv(fileName, rows, columns) {
  const header = columns.map((column) => column.label);
  const body = rows.map((row, index) =>
    columns.map((column) => {
      const rawValue =
        typeof column.value === "function"
          ? column.value(row, index)
          : row[column.value];
      return `"${String(rawValue ?? "").replaceAll('"', '""')}"`;
    }),
  );

  const csv = [header, ...body].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
