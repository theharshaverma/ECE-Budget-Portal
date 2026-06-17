import { useMemo, useState } from "react";
import InvoiceLink from "../components/InvoiceLink";
import { currency, exportCsv, getFinancialYear, matchesSearch } from "../utils";

const initialForm = {
  item: "",
  category: "",
  quantity: "",
  location: "",
  purchaseDate: "",
  amount: "",
  invoiceFile: null,
};

const categories = [
  "Lab Equipment",
  "Tools",
  "Consumables",
  "Teaching Aid",
  "Furniture",
];

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-GB");
}

function Inventory({ isAdmin, items, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [financialYearFilter, setFinancialYearFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory =
          categoryFilter === "all" || item.category === categoryFilter;
        const matchesFinancialYear =
          financialYearFilter === "all" ||
          getFinancialYear(item.purchaseDate) === financialYearFilter;
        const matchesDate =
          dateFilter === "all" || formatDate(item.purchaseDate) === dateFilter;

        return (
          matchesCategory &&
          matchesFinancialYear &&
          matchesDate &&
          matchesSearch(item, search)
        );
      }),
    [
      categoryFilter,
      dateFilter,
      financialYearFilter,
      items,
      search,
    ],
  );

  const financialYearOptions = useMemo(
    () => [
      ...new Set(
        items.map((item) => getFinancialYear(item.purchaseDate)).filter(Boolean),
      ),
    ],
    [items],
  );

  const dateOptions = useMemo(
    () => [...new Set(items.map((item) => formatDate(item.purchaseDate)).filter(Boolean))],
    [items],
  );

  const totalItems = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  const inventoryValue = filteredItems.reduce((sum, item) => sum + item.amount, 0);
  const categorySummary = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          quantity: filteredItems
            .filter((item) => item.category === category)
            .reduce((sum, item) => sum + item.quantity, 0),
        }))
        .filter((item) => item.quantity > 0),
    [filteredItems],
  );

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  function validateForm() {
    if (Number(form.quantity) <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    if (Number(form.amount) <= 0) {
      throw new Error("Purchase amount must be greater than zero");
    }

    if (!editingId && !form.invoiceFile) {
      throw new Error("Purchase invoice is required");
    }
  }

  async function saveInventoryItem(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      validateForm();

      const payload = {
        item: form.item.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        location: form.location.trim(),
        purchaseDate: form.purchaseDate,
        amount: Number(form.amount),
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

  function editItem(item) {
    setEditingId(item.id);
    setError("");
    setForm({
      item: item.item,
      category: item.category,
      quantity: String(item.quantity),
      location: item.location,
      purchaseDate: item.purchaseDate,
      amount: String(item.amount),
      invoiceFile: null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete inventory item "${item.item}"?`)) return;
    await onDelete(item.id);
  }

  function exportRows() {
    exportCsv("ece-inventory-register.csv", filteredItems, [
      { label: "Item", value: "item" },
      { label: "Category", value: "category" },
      { label: "Quantity", value: "quantity" },
      { label: "Location", value: "location" },
      { label: "Purchase Date", value: (item) => formatDate(item.purchaseDate) },
      {
        label: "Financial Year",
        value: (item) => getFinancialYear(item.purchaseDate),
      },
      { label: "Amount", value: "amount" },
      { label: "Invoice", value: "invoice" },
    ]);
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
          <span className="status-label">Filtered Inventory Value</span>
          <strong>{currency.format(inventoryValue)}</strong>
          <p>{totalItems} units currently shown.</p>
        </div>
      </section>

      {categorySummary.length > 0 && (
        <section className="summary-strip" aria-label="Inventory quantity by category">
          {categorySummary.map((item) => (
            <div key={item.category}>
              <span>{item.category}</span>
              <strong>{item.quantity}</strong>
            </div>
          ))}
        </section>
      )}

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
            <p>
              Upload the purchase invoice for new items. Existing items keep
              their invoice unless a replacement is selected.
            </p>
          </div>

          <form className="form-grid" onSubmit={saveInventoryItem}>
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
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
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
                    ? "Update Inventory Item"
                    : "Save Inventory Item"}
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
            <h2>Inventory Register</h2>
            <p>
              {isAdmin
                ? "Search, filter, export, edit, or delete inventory records."
                : "Search, filter, and export the inventory register."}
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
              placeholder="Search item, location, invoice..."
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
            Category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
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
                <th>Item</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Location</th>
                <th>Purchase Date</th>
                <th>FY</th>
                <th>Amount</th>
                <th>Invoice</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.item}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{item.location}</td>
                  <td>{formatDate(item.purchaseDate)}</td>
                  <td>{getFinancialYear(item.purchaseDate)}</td>
                  <td>{currency.format(item.amount)}</td>
                  <td>
                    <InvoiceLink record={item} />
                  </td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => editItem(item)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteItem(item)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8}>No inventory records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Inventory;
