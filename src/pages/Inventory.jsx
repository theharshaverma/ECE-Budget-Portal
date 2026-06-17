import { useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const initialForm = {
  item: "",
  category: "",
  quantity: "",
  location: "",
  purchaseDate: "",
  amount: "",
  invoiceFile: null,
};

function Inventory({ isAdmin, items, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const inventoryValue = items.reduce((sum, item) => sum + item.amount, 0);

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  async function addInventoryItem(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await onCreate(
        {
          item: form.item,
          category: form.category,
          quantity: Number(form.quantity),
          location: form.location,
          purchaseDate: form.purchaseDate,
          amount: Number(form.amount),
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
          <p className="eyebrow">Assets and Purchases</p>
          <h1>Inventory</h1>
          <p>
            Track equipment, consumables, teaching aids and purchase references
            with invoice support for each inventory addition.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">Inventory Value</span>
          <strong>{currency.format(inventoryValue)}</strong>
          <p>{totalItems} units currently recorded.</p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>Add Inventory Item</h2>
            <p>Upload the purchase invoice while adding a new item.</p>
          </div>

          <form className="form-grid" onSubmit={addInventoryItem}>
            <label>
              Item Name
              <input
                required
                name="item"
                value={form.item}
                onChange={updateField}
                placeholder="Function Generator"
              />
            </label>
            <label>
              Category
              <select
                required
                name="category"
                value={form.category}
                onChange={updateField}
              >
                <option value="">Select category</option>
                <option>Lab Equipment</option>
                <option>Tools</option>
                <option>Consumables</option>
                <option>Teaching Aid</option>
                <option>Furniture</option>
              </select>
            </label>
            <label>
              Quantity
              <input
                required
                min="1"
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={updateField}
                placeholder="4"
              />
            </label>
            <label>
              Location
              <input
                required
                name="location"
                value={form.location}
                onChange={updateField}
                placeholder="ECE Lab 204"
              />
            </label>
            <label>
              Purchase Date
              <input
                required
                type="date"
                name="purchaseDate"
                value={form.purchaseDate}
                onChange={updateField}
              />
            </label>
            <label>
              Purchase Amount
              <input
                required
                min="1"
                type="number"
                name="amount"
                value={form.amount}
                onChange={updateField}
                placeholder="125000"
              />
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
              {saving ? "Saving..." : "Save Inventory Item"}
            </button>
            {error && <p className="form-error span-two">{error}</p>}
          </form>
        </section>
      )}

      <section className="panel">
        <div className="section-heading">
          <h2>Inventory Register</h2>
          <p>
            {isAdmin
              ? "Admin users can add inventory and attach purchase invoices."
              : "Viewer users can review the inventory register only."}
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Location</th>
                <th>Purchase Date</th>
                <th>Amount</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.item}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{item.location}</td>
                  <td>{item.purchaseDate}</td>
                  <td>{currency.format(item.amount)}</td>
                  <td>{item.invoice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Inventory;
