import { useMemo, useState } from "react";
import InvoiceLink from "../components/InvoiceLink";
import { currency, exportCsv, matchesSearch } from "../utils";

const initialForm = {
  financialYear: "2025-2026",
  budgetHead: "",
  amountText: "",
  amount: "",
  description: "",
  utilisedAmountLakh: "",
  purchasesFor: "",
  invoiceFile: null,
};

function Invoices({ isAdmin, records, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [financialYearFilter, setFinancialYearFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [utilisationFilter, setUtilisationFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const financialYear = record.financialYear || "2025-2026";
        const matchesFinancialYear =
          financialYearFilter === "all" || financialYear === financialYearFilter;
        const hasInvoice = Boolean(record.invoiceUrl);
        const matchesInvoice =
          invoiceFilter === "all" ||
          (invoiceFilter === "attached" && hasInvoice) ||
          (invoiceFilter === "missing" && !hasInvoice);
        const utilisedAmount = Number(record.utilisedAmountLakh || 0);
        const remainingAmount = getRemainingAmount(record);
        const matchesUtilisation =
          utilisationFilter === "all" ||
          (utilisationFilter === "utilised" && utilisedAmount > 0) ||
          (utilisationFilter === "not-utilised" && utilisedAmount === 0) ||
          (utilisationFilter === "remaining" && remainingAmount > 0);
        const matchesMinAmount = !minAmount || Number(record.amount || 0) >= Number(minAmount);
        const matchesMaxAmount = !maxAmount || Number(record.amount || 0) <= Number(maxAmount);

        return (
          matchesFinancialYear &&
          matchesInvoice &&
          matchesUtilisation &&
          matchesMinAmount &&
          matchesMaxAmount &&
          matchesSearch(record, search)
        );
      }),
    [
      financialYearFilter,
      invoiceFilter,
      maxAmount,
      minAmount,
      records,
      search,
      utilisationFilter,
    ],
  );

  const financialYearOptions = useMemo(
    () => [
      ...new Set(records.map((record) => record.financialYear || "2025-2026")),
    ],
    [records],
  );

  const totalBudget = filteredRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalUtilisedLakh = filteredRecords.reduce(
    (sum, record) => sum + Number(record.utilisedAmountLakh || 0),
    0,
  );
  const totalRemaining = filteredRecords.reduce(
    (sum, record) =>
      sum + Math.max(Number(record.amount || 0) - Number(record.utilisedAmountLakh || 0) * 100000, 0),
    0,
  );

  function getRemainingAmount(record) {
    return Math.max(
      Number(record.amount || 0) - Number(record.utilisedAmountLakh || 0) * 100000,
      0,
    );
  }

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  function validateForm() {
    if (Number(form.amount) <= 0) {
      throw new Error("Amount in INR must be greater than zero");
    }

    if (Number(form.utilisedAmountLakh) < 0) {
      throw new Error("Utilised amount must be zero or greater");
    }
  }

  async function saveIncomeRecord(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      validateForm();

      const payload = {
        financialYear: form.financialYear,
        budgetHead: form.budgetHead.trim(),
        amountText: form.amountText.trim(),
        amount: Number(form.amount),
        description: form.description.trim(),
        utilisedAmountLakh: Number(form.utilisedAmountLakh || 0),
        purchasesFor: form.purchasesFor.trim(),
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
      financialYear: record.financialYear || "2025-2026",
      budgetHead: record.budgetHead || record.source || "",
      amountText: record.amountText || currency.format(record.amount || 0),
      amount: String(record.amount || ""),
      description: record.description || record.notes || "",
      utilisedAmountLakh: String(record.utilisedAmountLakh || 0),
      purchasesFor: record.purchasesFor || "",
      invoiceFile: null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  async function deleteIncomeRecord(record) {
    if (!window.confirm(`Delete budget head "${record.budgetHead}"?`)) return;
    await onDelete(record.id);
  }

  function exportRows() {
    exportCsv("ece-accumulated-budget.csv", filteredRecords, [
      { label: "S.N.", value: (_record, index) => index + 1 },
      { label: "Financial Year", value: (record) => record.financialYear || "2025-2026" },
      { label: "Budget Head", value: "budgetHead" },
      { label: "Amount", value: "amountText" },
      { label: "Description", value: "description" },
      { label: "Utilised Amount (in lakhs)", value: "utilisedAmountLakh" },
      {
        label: "Remaining Amount",
        value: (record) => getRemainingAmount(record),
      },
      { label: "Purchases for", value: "purchasesFor" },
      { label: "Invoice", value: "invoice" },
    ]);
  }

  return (
    <main className="page-content">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Accumulated Budget</p>
          <h1>Institute&apos;s Accumulated Income - ECE Department</h1>
          <p>
            Budget heads now follow the ECE admin spreadsheet format, including
            sanctioned amount, description, utilisation and purchase purpose.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">Filtered Budget</span>
          <strong>{currency.format(totalBudget)}</strong>
          <p>
            {totalUtilisedLakh.toFixed(2)} lakhs utilised |{" "}
            {currency.format(totalRemaining)} remaining
          </p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? "Edit Budget Head" : "Add Budget Head"}</h2>
            <p>
              Use the same columns as the shared Excel sheet. Invoice/document
              upload is optional for existing template rows.
            </p>
          </div>

          <form className="form-grid" onSubmit={saveIncomeRecord}>
            <label>
              Financial Year
              <select
                required
                name="financialYear"
                value={form.financialYear}
                onChange={updateField}
              >
                <option>2025-2026</option>
                <option>2026-2027</option>
                <option>2027-2028</option>
              </select>
            </label>
            <label>
              Budget Head
              <input
                required
                name="budgetHead"
                value={form.budgetHead}
                onChange={updateField}
                placeholder="End-to-End Testbed on Beyond 5G"
              />
            </label>
            <label>
              Amount Display Text
              <input
                required
                name="amountText"
                value={form.amountText}
                onChange={updateField}
                placeholder="₹50 Lakhs"
              />
            </label>
            <label>
              Amount in INR
              <input
                required
                min="1"
                type="number"
                name="amount"
                value={form.amount}
                onChange={updateField}
                placeholder="5000000"
              />
            </label>
            <label>
              Utilised Amount (in lakhs)
              <input
                required
                min="0"
                step="0.00001"
                type="number"
                name="utilisedAmountLakh"
                value={form.utilisedAmountLakh}
                onChange={updateField}
                placeholder="5.07933"
              />
            </label>
            <label className="span-two">
              Description
              <textarea
                required
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Hardware for Beyond 5G..."
              />
            </label>
            <label>
              Purchases For
              <input
                name="purchasesFor"
                value={form.purchasesFor}
                onChange={updateField}
                placeholder="Panel & Camera"
              />
            </label>
            <label>
              Upload Invoice / Document
              <input
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
                    ? "Update Budget Head"
                    : "Save Budget Head"}
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
            <h2>Accumulated Budget Heads</h2>
            <p>
              {isAdmin
                ? "Search, export, edit, or delete official budget-head rows."
                : "Search and export official budget-head rows."}
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
              placeholder="Search budget head, description, purchase..."
            />
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
            Invoice
            <select
              value={invoiceFilter}
              onChange={(event) => setInvoiceFilter(event.target.value)}
            >
              <option value="all">All invoice states</option>
              <option value="attached">Invoice attached</option>
              <option value="missing">Invoice missing</option>
            </select>
          </label>
          <label>
            Utilisation
            <select
              value={utilisationFilter}
              onChange={(event) => setUtilisationFilter(event.target.value)}
            >
              <option value="all">All utilization</option>
              <option value="utilised">Utilised</option>
              <option value="not-utilised">Not utilised</option>
              <option value="remaining">Has remaining amount</option>
            </select>
          </label>
          <label>
            Min Amount
            <input
              min="0"
              type="number"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Max Amount
            <input
              min="0"
              type="number"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="5000000"
            />
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>S.N.</th>
                <th>FY</th>
                <th>Budget Head</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Utilised Amount (in lakhs)</th>
                <th>Remaining Amount</th>
                <th>Purchases for</th>
                <th>Invoice</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td>{record.financialYear || "2025-2026"}</td>
                  <td>{record.budgetHead || record.source}</td>
                  <td>{record.amountText || currency.format(record.amount)}</td>
                  <td>{record.description || record.notes}</td>
                  <td>{Number(record.utilisedAmountLakh || 0).toFixed(5)}</td>
                  <td>{currency.format(getRemainingAmount(record))}</td>
                  <td>{record.purchasesFor}</td>
                  <td>
                    <InvoiceLink record={record} />
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => editRecord(record)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteIncomeRecord(record)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9}>No budget heads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Invoices;
