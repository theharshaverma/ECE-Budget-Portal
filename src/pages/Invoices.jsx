import { useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const initialForm = {
  source: "",
  reference: "",
  date: "",
  amount: "",
  invoiceFile: null,
  notes: "",
};

function Invoices({ isAdmin, records, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalIncome = records.reduce((sum, record) => sum + record.amount, 0);

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  async function addIncomeRecord(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await onCreate(
        {
          source: form.source,
          reference: form.reference,
          date: form.date,
          amount: Number(form.amount),
          notes: form.notes,
        },
        form.invoiceFile,
      );
      setForm(initialForm);
      event.currentTarget.reset();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-content">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Income Ledger</p>
          <h1>Institute&apos;s Accumulated Income - ECE Department</h1>
          <p>
            Record institute allocations, recoveries, project overheads and all
            department income references with supporting invoices.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">Total Accumulated Income</span>
          <strong>{currency.format(totalIncome)}</strong>
          <p>{records.length} records available for review.</p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>Add Income Record</h2>
            <p>Attach the sanction note, invoice or supporting document.</p>
          </div>

          <form className="form-grid" onSubmit={addIncomeRecord}>
            <label>
              Income Source
              <input
                required
                name="source"
                value={form.source}
                onChange={updateField}
                placeholder="Institute Grant"
              />
            </label>
            <label>
              Reference Number
              <input
                required
                name="reference"
                value={form.reference}
                onChange={updateField}
                placeholder="ECE/INST/2026/001"
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
              Amount
              <input
                required
                min="1"
                type="number"
                name="amount"
                value={form.amount}
                onChange={updateField}
                placeholder="250000"
              />
            </label>
            <label>
              Upload Invoice / Document
              <input
                required
                type="file"
                name="invoiceFile"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={updateField}
              />
            </label>
            <label className="span-two">
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                placeholder="Short description of the income entry"
              />
            </label>
            <button className="primary-button form-action" type="submit">
              {saving ? "Saving..." : "Save Income Update"}
            </button>
            {error && <p className="form-error span-two">{error}</p>}
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <h2>Income Records</h2>
          <p>
            {isAdmin
              ? "Admin access includes entry creation and invoice attachment."
              : "Viewer access shows records without update controls."}
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Invoice</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.source}</td>
                  <td>{record.reference}</td>
                  <td>{record.date}</td>
                  <td>{currency.format(record.amount)}</td>
                  <td>{record.invoice}</td>
                  <td>{record.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Invoices;
