import { useMemo, useState } from "react";
import InvoiceLink from "../components/InvoiceLink";
import { currency, exportCsv, getFinancialYear, matchesSearch } from "../utils";

const initialForm = {
  category: "",
  customCategory: "",
  totalQuantity: "",
  quantityGiven: "",
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
  const [matchedInventoryId, setMatchedInventoryId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [financialYearFilter, setFinancialYearFilter] = useState(() =>
    getFinancialYear(new Date()),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory =
          categoryFilter === "all" || item.category === categoryFilter;
        const matchesFinancialYear =
          financialYearFilter === "all" ||
          getFinancialYear(item.purchaseDate) === financialYearFilter;

        return (
          matchesCategory &&
          matchesFinancialYear &&
          matchesSearch(item, search)
        );
      }),
    [categoryFilter, financialYearFilter, items, search],
  );

  const financialYearOptions = useMemo(
    () => [
      ...new Set(
        items.map((item) => getFinancialYear(item.purchaseDate)).filter(Boolean),
      ),
    ],
    [items],
  );
  const categoryOptions = useMemo(
    () => [
      ...new Set([
        ...categories,
        ...items.map((item) => item.category).filter(Boolean),
      ]),
    ],
    [items],
  );

  const inventoryValue = filteredItems.reduce((sum, item) => sum + item.amount, 0);
  const selectedFinancialYear = getFinancialYear(form.purchaseDate);
  const existingInventoryRecord = items.find(
    (item) =>
      item.category === form.category &&
      getFinancialYear(item.purchaseDate) === selectedFinancialYear,
  );
  const remainingQuantity = Math.max(
    Number(form.totalQuantity || 0) - Number(form.quantityGiven || 0),
    0,
  );

  function updateField(event) {
    const { name, value, files } = event.target;

    if (name === "category" || name === "purchaseDate") {
      const nextCategory = name === "category" ? value : form.category;
      const nextDate = name === "purchaseDate" ? value : form.purchaseDate;
      const nextFinancialYear = getFinancialYear(nextDate);
      const existingRecord = items.find(
        (item) =>
          item.category === nextCategory &&
          getFinancialYear(item.purchaseDate) === nextFinancialYear,
      );

      setMatchedInventoryId(existingRecord?.id || null);
      setForm((current) => ({
        ...current,
        [name]: value,
        totalQuantity: existingRecord
          ? String(existingRecord.quantity || 0)
          : "",
        quantityGiven: existingRecord
          ? String(existingRecord.quantityGiven || 0)
          : "",
        amount: "",
        invoiceFile: null,
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  function validateForm() {
    if (Number(form.totalQuantity) <= 0) {
      throw new Error("Total quantity must be greater than zero");
    }

    if (Number(form.quantityGiven) < 0) {
      throw new Error("Quantity given must be zero or greater");
    }

    if (Number(form.quantityGiven) > Number(form.totalQuantity)) {
      throw new Error("Quantity given cannot exceed total quantity");
    }

    if (Number(form.amount) <= 0) {
      throw new Error("Purchase amount must be greater than zero");
    }

  }

  async function saveInventoryItem(event) {
    event.preventDefault();
    const formElement = event.currentTarget;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      validateForm();

      const payload = {
        item: "Inventory Purchase",
        category:
          form.category === "Other"
            ? form.customCategory.trim()
            : form.category,
        quantity: Number(form.totalQuantity),
        quantityGiven: Number(form.quantityGiven || 0),
        remainingQuantity,
        location: "Not specified",
        purchaseDate: form.purchaseDate,
        amount: Number(form.amount),
      };

      const recordId = editingId || matchedInventoryId;

      if (recordId) {
        await onUpdate(recordId, payload, form.invoiceFile);
      } else {
        await onCreate(payload, form.invoiceFile);
      }

      setEditingId(null);
      setMatchedInventoryId(null);
      setForm(initialForm);
      formElement.reset();
      setSuccess("Saved Successfully");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function editItem(item) {
    setEditingId(item.id);
    setMatchedInventoryId(null);
    setError("");
    setSuccess("");
    setForm({
      category: item.category,
      customCategory: "",
      totalQuantity: String(item.quantity || 0),
      quantityGiven: String(item.quantityGiven || 0),
      purchaseDate: item.purchaseDate,
      amount: String(item.amount),
      invoiceFile: null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setMatchedInventoryId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  async function deleteItem(item) {
    if (!window.confirm("Delete this inventory record?")) return;
    await onDelete(item.id);
  }

  function exportRows() {
    exportCsv("ece-inventory-register.csv", filteredItems, [
      { label: "Purchase Date", value: (item) => formatDate(item.purchaseDate) },
      { label: "Category", value: "category" },
      { label: "Total Quantity", value: "quantity" },
      {
        label: "Quantity Given",
        value: (item) => Number(item.quantityGiven || 0),
      },
      {
        label: "Remaining Quantity",
        value: (item) =>
          Math.max(
            Number(item.quantity || 0) - Number(item.quantityGiven || 0),
            0,
          ),
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
          <span className="status-label">
            Total Amount Spent ·{" "}
            {financialYearFilter === "all"
              ? "All Financial Years"
              : `FY ${financialYearFilter}`}
          </span>
          <strong>{currency.format(inventoryValue)}</strong>
        </div>
      </section>

      {isAdmin && (
        <section className="panel">
          <div className="section-heading">
            <h2>{editingId ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
            <p>
              Invoice upload is optional. Existing items keep their invoice
              unless a replacement is selected.
            </p>
          </div>

          <form className="form-grid" onSubmit={saveInventoryItem}>
            <label>
              Purchase Date
              <input
                required
                type="date"
                name="purchaseDate"
                value={form.purchaseDate}
                onChange={updateField}
              />
              {form.purchaseDate && (
                <span className="field-hint">
                  Financial year: {getFinancialYear(form.purchaseDate)}
                </span>
              )}
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
                {categoryOptions.map((category) => (
                  <option key={category}>{category}</option>
                ))}
                <option>Other</option>
              </select>
            </label>
            {form.category === "Other" && (
              <label>
                Enter Category
                <input
                  required
                  name="customCategory"
                  value={form.customCategory}
                  onChange={updateField}
                  placeholder="Enter custom category"
                />
              </label>
            )}
            <label>
              Total Quantity
              <input
                required
                readOnly={Boolean(existingInventoryRecord)}
                min="1"
                type="number"
                name="totalQuantity"
                value={form.totalQuantity}
                onChange={updateField}
                placeholder={
                  existingInventoryRecord
                    ? "Loaded automatically"
                    : "Enter total quantity"
                }
              />
            </label>
            <label>
              Quantity Given
              <input
                required
                min="0"
                type="number"
                name="quantityGiven"
                value={form.quantityGiven}
                onChange={updateField}
                placeholder="0"
              />
            </label>
            <label>
              Remaining Quantity
              <input readOnly value={remainingQuantity} />
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
            {success && <p className="form-success span-two">{success}</p>}
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
              placeholder="Search category, invoice..."
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
              {categoryOptions.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Purchase Date</th>
                <th>Category</th>
                <th>Total Quantity</th>
                <th>Quantity Given</th>
                <th>Remaining</th>
                <th>Amount</th>
                <th>Invoice</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.purchaseDate)}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.quantityGiven || 0)}</td>
                  <td>
                    {Math.max(
                      Number(item.quantity || 0) -
                        Number(item.quantityGiven || 0),
                      0,
                    )}
                  </td>
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
                  <td colSpan={isAdmin ? 8 : 7}>No inventory records found.</td>
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
