import { useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const initialForm = {
  head: "",
  vendor: "",
  date: "",
  amount: "",
  invoiceFile: null,
  status: "Pending",
};

function AddExpense({ isAdmin, records, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalExpense = records.reduce((sum, record) => sum + record.amount, 0);
  const pendingCount = records.filter((record) => record.status === "Pending").length;

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  async function addExpense(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await onCreate(
        {
          head: form.head,
          vendor: form.vendor,
          date: form.date,
          amount: Number(form.amount),
          status: form.status,
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
          <p className="eyebrow">Budget Utilization</p>
          <h1>Expenditure Budget</h1>
          <p>
            Maintain expenditure entries, vendor payments, approval status and
            invoice proof for every budget update.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">Total Expenditure</span>
          <strong>{currency.format(totalExpense)}</strong>
          <p>{pendingCount} pending approval records.</p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>Add Expenditure Record</h2>
            <p>Every budget update should include the matching invoice file.</p>
          </div>

          <form className="form-grid" onSubmit={addExpense}>
            <label>
              Budget Head
              <select
                required
                name="head"
                value={form.head}
                onChange={updateField}
              >
                <option value="">Select head</option>
                <option>Lab Equipment</option>
                <option>Consumables</option>
                <option>Maintenance</option>
                <option>Travel</option>
                <option>Teaching Aid</option>
              </select>
            </label>
            <label>
              Vendor / Payee
              <input
                required
                name="vendor"
                value={form.vendor}
                onChange={updateField}
                placeholder="Vendor name"
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
                placeholder="50000"
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
                required
                type="file"
                name="invoiceFile"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={updateField}
              />
            </label>
            <button className="primary-button form-action" type="submit">
              {saving ? "Saving..." : "Save Expenditure Update"}
            </button>
            {error && <p className="form-error span-two">{error}</p>}
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <h2>Expenditure Records</h2>
          <p>
            {isAdmin
              ? "Admin users can add new expenditure records above."
              : "Viewer users can only review budget utilization."}
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Budget Head</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.head}</td>
                  <td>{record.vendor}</td>
                  <td>{record.date}</td>
                  <td>{currency.format(record.amount)}</td>
                  <td>
                    <span className={`status-pill ${record.status.toLowerCase()}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>{record.invoice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AddExpense;
