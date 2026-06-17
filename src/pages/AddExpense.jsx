import { useMemo, useState } from "react";
import InvoiceLink from "../components/InvoiceLink";
import { expenditureBudgetHeads } from "../data";
import { currency, exportCsv, getFinancialYear, matchesSearch } from "../utils";

const initialForm = {
  head: "",
  budgetLakh: "",
  utilizedLakh: "",
  balanceLakh: "",
  vendor: "ECE Department",
  date: "",
  invoiceFile: null,
  status: "Pending",
};

function getExpenseEntries(description) {
  const parts = String(description || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return [];
  }

  const entries = [];

  for (let index = 0; index < parts.length; index += 2) {
    const amount = parts[index];
    const period = parts[index + 1];

    if (amount && period) {
      entries.push({
        amount,
        period,
        label: `${amount} for ${period}`,
      });
    }
  }

  return entries;
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-GB");
}

function normalizeExpenseDate(period) {
  const value = String(period || "").trim();

  if (!value) return "";

  const withDay = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

  if (withDay) {
    return formatDisplayDate(`${withDay[2]} ${withDay[1]}, ${withDay[3]}`);
  }

  const monthYear = value.match(/^([A-Za-z]+)\s+(\d{4})$/);

  if (monthYear) {
    return formatDisplayDate(`${monthYear[1]} 1, ${monthYear[2]}`);
  }

  return formatDisplayDate(value);
}

function AddExpense({ isAdmin, records, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [headFilter, setHeadFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [financialYearFilter, setFinancialYearFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesStatus = statusFilter === "all" || record.status === statusFilter;
        const matchesHead = headFilter === "all" || record.head === headFilter;
        return matchesStatus && matchesHead && matchesSearch(record, search);
      }),
    [headFilter, records, search, statusFilter],
  );

  const allTableRows = useMemo(
    () =>
      filteredRecords.flatMap((record) => {
        const entries = getExpenseEntries(record.expensesDescription);

        if (entries.length === 0) {
          return [
            {
              ...record,
              rowKey: `${record.id}`,
              displayPeriod: formatDisplayDate(record.date),
              displayUtilizedAmount:
                Number(record.amount) || Number(record.utilizedLakh || 0) * 100000,
            },
          ];
        }

        return entries.map((entry, index) => ({
          ...record,
          rowKey: `${record.id}-${index}`,
          displayPeriod: normalizeExpenseDate(entry.period),
          displayUtilizedAmount: Number(entry.amount),
        }));
      }),
    [filteredRecords],
  );

  const dateOptions = useMemo(
    () => [...new Set(allTableRows.map((record) => record.displayPeriod).filter(Boolean))],
    [allTableRows],
  );

  const financialYearOptions = useMemo(
    () => [
      ...new Set(
        allTableRows
          .map((record) => getFinancialYear(record.displayPeriod))
          .filter(Boolean),
      ),
    ],
    [allTableRows],
  );

  const tableRows = useMemo(
    () =>
      allTableRows.filter(
        (record) => {
          const matchesDate = dateFilter === "all" || record.displayPeriod === dateFilter;
          const matchesFinancialYear =
            financialYearFilter === "all" ||
            getFinancialYear(record.displayPeriod) === financialYearFilter;
          return matchesDate && matchesFinancialYear;
        },
      ),
    [allTableRows, dateFilter, financialYearFilter],
  );

  const totalExpense = tableRows.reduce(
    (sum, record) => sum + getRowUtilizedAmount(record),
    0,
  );
  const totalBudgetLakh = filteredRecords.reduce(
    (sum, record) => sum + Number(record.budgetLakh || 0),
    0,
  );
  const approvedAmount = tableRows
    .filter((record) => record.status === "Approved")
    .reduce((sum, record) => sum + getRowUtilizedAmount(record), 0);
  const pendingAmount = tableRows
    .filter((record) => record.status === "Pending")
    .reduce(
      (sum, record) =>
        sum +
        (Number(record.balanceLakh || 0) > 0
          ? Number(record.balanceLakh || 0) * 100000
          : Number(record.budgetLakh || 0) * 100000),
      0,
    );
  const rejectedAmount = tableRows
    .filter((record) => record.status === "Rejected")
    .reduce((sum, record) => sum + getRowUtilizedAmount(record), 0);

  function getRowUtilizedAmount(row) {
    return Number(row.displayUtilizedAmount || 0);
  }

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  function validateForm() {
    if (Number(form.budgetLakh) <= 0) {
      throw new Error("Budget must be greater than zero");
    }

    if (Number(form.utilizedLakh) < 0 || Number(form.balanceLakh) < 0) {
      throw new Error("Utilized and remaining amount values must be zero or greater");
    }

    if (!editingId && !form.invoiceFile) {
      throw new Error("Invoice is required for new expenditure updates");
    }
  }

  async function saveExpense(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      validateForm();

      const payload = {
        head: form.head,
        budgetLakh: Number(form.budgetLakh),
        expensesDescription: "",
        utilizedLakh: Number(form.utilizedLakh || 0),
        balanceLakh: Number(form.balanceLakh || 0),
        vendor: form.vendor.trim(),
        date: form.date || "2026-04-01",
        amount: Number(form.utilizedLakh || 0) * 100000,
        status: form.status,
      };

      if (editingId) {
        await onUpdate(editingId, payload, form.invoiceFile);
      } else {
        await onCreate(payload, form.invoiceFile);
      }

      setEditingId(null);
      setForm(initialForm);
      event.currentTarget.reset();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function editRecord(record) {
    setEditingId(record.id);
    setError("");
    setForm({
      head: record.head,
      budgetLakh: String(record.budgetLakh || ""),
      utilizedLakh: String(record.utilizedLakh || 0),
      balanceLakh: String(record.balanceLakh || 0),
      vendor: record.vendor || "ECE Department",
      date: record.date || "",
      invoiceFile: null,
      status: record.status,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  async function deleteExpense(record) {
    if (!window.confirm(`Delete expenditure record for "${record.vendor}"?`)) return;
    await onDelete(record.id);
  }

  async function updateExpenseStatus(record, status) {
    await onUpdate(
      record.id,
      {
        head: record.head,
        budgetLakh: Number(record.budgetLakh || 0),
        expensesDescription: record.expensesDescription || "",
        utilizedLakh: Number(record.utilizedLakh || 0),
        balanceLakh: Number(record.balanceLakh || 0),
        vendor: record.vendor || "ECE Department",
        date: record.date || "2026-04-01",
        amount: Number(record.amount),
        status,
      },
      null,
    );
  }

  function exportRows() {
    exportCsv("ece-expenditure-records.csv", tableRows, [
      { label: "S. N.", value: (_record, index) => index + 1 },
      {
        label: "Particulars",
        value: "head",
      },
      { label: "Date", value: (record) => record.displayPeriod || record.date },
      {
        label: "Financial Year",
        value: (record) => getFinancialYear(record.displayPeriod || record.date),
      },
      { label: "Budget (INR lac) 2026-27", value: "budgetLakh" },
      { label: "Utilized", value: (record) => getRowUtilizedAmount(record) },
      { label: "Remaining Amount / Balance", value: "balanceLakh" },
      { label: "Status", value: "status" },
      { label: "Invoice", value: "invoice" },
    ]);
  }

  return (
    <main className="page-content">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Budget Utilization</p>
          <h1>Expenditure Budget</h1>
          <p>
            Maintain expenditure entries, vendor payments, approval status and
            invoice proof for every budget update.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">Filtered Expenditure</span>
          <strong>{currency.format(totalExpense)}</strong>
          <p>
            Budget {totalBudgetLakh.toFixed(2)} lac | Approved{" "}
            {currency.format(approvedAmount)} | Pending{" "}
            {currency.format(pendingAmount)} | Rejected{" "}
            {currency.format(rejectedAmount)}
          </p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? "Edit Expenditure Record" : "Add Expenditure Record"}</h2>
            <p>
              Use the same particulars and budget columns as the shared
              expenditure sheet. Existing entries keep their invoice unless
              replaced.
            </p>
          </div>

          <form className="form-grid" onSubmit={saveExpense}>
            <label>
              Budget Head
              <select required name="head" value={form.head} onChange={updateField}>
                <option value="">Select head</option>
                {expenditureBudgetHeads.map((head) => (
                  <option key={head}>{head}</option>
                ))}
              </select>
            </label>
            <label>
              Budget (INR lac) 2026-27
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                name="budgetLakh"
                value={form.budgetLakh}
                onChange={updateField}
                placeholder="1.5"
              />
            </label>
            <label>
              Utilized
              <input
                required
                min="0"
                step="0.01"
                type="number"
                name="utilizedLakh"
                value={form.utilizedLakh}
                onChange={updateField}
                placeholder="0.34"
              />
            </label>
            <label>
              Remaining Amount / Balance
              <input
                required
                min="0"
                step="0.01"
                type="number"
                name="balanceLakh"
                value={form.balanceLakh}
                onChange={updateField}
                placeholder="1.16"
              />
            </label>
            <label>
              Vendor / Payee
              <input
                required
                name="vendor"
                value={form.vendor}
                onChange={updateField}
                placeholder="ECE Department"
              />
            </label>
            <label>
              Date
              <input
                required
                type="date"
                name="date"
                value={form.date}
                onChange={updateField}
              />
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={updateField}>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </label>
            <label>
              Upload Invoice
              <input
                required={!editingId}
                type="file"
                name="invoiceFile"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={updateField}
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Expenditure"
                    : "Save Expenditure Update"}
              </button>
              {editingId && (
                <button className="secondary-button" type="button" onClick={cancelEdit}>
                  Cancel Edit
                </button>
              )}
            </div>
            {error && <p className="form-error span-two">{error}</p>}
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-toolbar">
          <div className="section-heading">
            <h2>Expenditure Records</h2>
            <p>
              {isAdmin
                ? "Search, filter, export, edit, or delete expenditure records."
                : "Search, filter, and export expenditure records."}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={exportRows}>
            Export CSV
          </button>
        </div>

        <div className="filters-row">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, head, invoice..."
            />
          </label>
          <label>
            Budget Head
            <select value={headFilter} onChange={(event) => setHeadFilter(event.target.value)}>
              <option value="all">All heads</option>
              {expenditureBudgetHeads.map((head) => (
                <option key={head}>{head}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>
          <label>
            Financial Year
            <select
              value={financialYearFilter}
              onChange={(event) => setFinancialYearFilter(event.target.value)}
            >
              <option value="all">All financial years</option>
              {financialYearOptions.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="all">All dates</option>
              {dateOptions.map((date) => (
                <option key={date}>{date}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>S. N.</th>
                <th>Particulars</th>
                <th>Date</th>
                <th>FY</th>
                <th>Budget (INR lac) 2026-27</th>
                <th>Utilized</th>
                <th>Remaining Amount / Balance</th>
                <th>Status</th>
                <th>Invoice</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((record, index) => (
                <tr key={record.rowKey}>
                  <td>{index + 1}</td>
                  <td>{record.head}</td>
                  <td>{record.displayPeriod || record.date}</td>
                  <td>{getFinancialYear(record.displayPeriod || record.date)}</td>
                  <td>{Number(record.budgetLakh || 0).toFixed(2)}</td>
                  <td>{currency.format(getRowUtilizedAmount(record))}</td>
                  <td>{Number(record.balanceLakh || 0).toFixed(2)}</td>
                  <td>
                    <span className={`status-pill ${record.status.toLowerCase()}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <InvoiceLink record={record} />
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        {record.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateExpenseStatus(record, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => updateExpenseStatus(record, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => editRecord(record)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteExpense(record)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9}>No expenditure records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AddExpense;
