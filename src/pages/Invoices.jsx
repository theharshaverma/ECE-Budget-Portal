import { Fragment, useMemo, useRef, useState } from "react";
import InvoiceLink from "../components/InvoiceLink";
import {
  currency,
  exportCsv,
  getFinancialYear,
  matchesSearch,
} from "../utils";

const initialForm = {
  date: "",
  budgetHead: "",
  approvedAmount: "",
  utilizedAmount: "",
  description: "",
  purchasesFor: "",
  invoiceFile: null,
};

const inrNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function getRecordFinancialYear(record) {
  return getFinancialYear(record.date) || record.financialYear || "2026-2027";
}

function getUtilizedAmount(record) {
  return Number(record.utilisedAmountLakh || 0) * 100000;
}

function getFormFinancialYear(date) {
  return getFinancialYear(date);
}

function Invoices({ isAdmin, records, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [headFilter, setHeadFilter] = useState("all");
  const [financialYearFilter, setFinancialYearFilter] = useState(() =>
    getFinancialYear(new Date()),
  );
  const [expandedHeads, setExpandedHeads] = useState(() => new Set());
  const [showHeadSuggestions, setShowHeadSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formSectionRef = useRef(null);

  const budgetHeadOptions = useMemo(
    () => [...new Set(records.map((record) => record.budgetHead).filter(Boolean))],
    [records],
  );
  const matchingBudgetHeads = budgetHeadOptions.filter((head) =>
    head.toLowerCase().includes(form.budgetHead.trim().toLowerCase()),
  );
  const financialYearOptions = useMemo(
    () => [...new Set(records.map(getRecordFinancialYear))],
    [records],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesFinancialYear =
          financialYearFilter === "all" ||
          getRecordFinancialYear(record) === financialYearFilter;
        const matchesHead =
          headFilter === "all" || record.budgetHead === headFilter;

        return (
          matchesFinancialYear &&
          matchesHead &&
          matchesSearch(record, search)
        );
      }),
    [
      financialYearFilter,
      headFilter,
      records,
      search,
    ],
  );

  const groupedBudgetHeads = useMemo(() => {
    const groups = new Map();

    filteredRecords.forEach((record) => {
      const financialYear = getRecordFinancialYear(record);
      const head = record.budgetHead || record.source || "Unassigned Budget Head";
      const key = `${financialYear}::${head}`;
      const group = groups.get(key) || {
        key,
        financialYear,
        head,
        approvedAmount: 0,
        utilizedAmount: 0,
        entries: [],
      };

      group.approvedAmount = Math.max(
        group.approvedAmount,
        Number(record.amount || 0),
      );
      group.utilizedAmount += getUtilizedAmount(record);
      group.entries.push(record);
      groups.set(key, group);
    });

    return [...groups.values()].map((group) => ({
      ...group,
      remainingAmount: Math.max(
        group.approvedAmount - group.utilizedAmount,
        0,
      ),
    }));
  }, [filteredRecords]);

  const totalBudget = groupedBudgetHeads.reduce(
    (sum, group) => sum + group.approvedAmount,
    0,
  );
  const totalUtilized = groupedBudgetHeads.reduce(
    (sum, group) => sum + group.utilizedAmount,
    0,
  );
  const totalRemaining = groupedBudgetHeads.reduce(
    (sum, group) => sum + group.remainingAmount,
    0,
  );

  function findApprovedAmount(head, financialYear) {
    return records
      .filter(
        (record) =>
          record.budgetHead === head &&
          getRecordFinancialYear(record) === financialYear,
      )
      .reduce(
        (maximum, record) => Math.max(maximum, Number(record.amount || 0)),
        0,
      );
  }

  function updateField(event) {
    const { name, value, files } = event.target;

    if (name === "budgetHead" || name === "date") {
      const nextHead = name === "budgetHead" ? value : form.budgetHead;
      const nextDate = name === "date" ? value : form.date;
      const nextYear = getFormFinancialYear(nextDate);
      const approvedAmount = findApprovedAmount(nextHead, nextYear);

      setForm((current) => ({
        ...current,
        [name]: value,
        approvedAmount: approvedAmount ? String(approvedAmount) : "",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  function selectBudgetHead(head) {
    const approvedAmount = findApprovedAmount(
      head,
      getFormFinancialYear(form.date),
    );
    setForm((current) => ({
      ...current,
      budgetHead: head,
      approvedAmount: approvedAmount ? String(approvedAmount) : "",
    }));
    setShowHeadSuggestions(false);
  }

  const isExistingBudgetHead = records.some(
    (record) =>
      record.budgetHead === form.budgetHead &&
      getRecordFinancialYear(record) === getFormFinancialYear(form.date),
  );

  const otherUtilizedAmount = records
    .filter(
      (record) =>
        record.budgetHead === form.budgetHead &&
        getRecordFinancialYear(record) === getFormFinancialYear(form.date) &&
        (!editingId || Number(record.id) !== Number(editingId)),
    )
    .reduce((sum, record) => sum + getUtilizedAmount(record), 0);
  const calculatedRemainingAmount = Math.max(
    Number(form.approvedAmount || 0) -
      otherUtilizedAmount -
      Number(form.utilizedAmount || 0),
    0,
  );
  const calculatedTotalUtilized =
    otherUtilizedAmount + Number(form.utilizedAmount || 0);

  function validateForm() {
    if (Number(form.approvedAmount) <= 0) {
      throw new Error("Total approved amount must be greater than zero");
    }

    if (Number(form.utilizedAmount) < 0) {
      throw new Error("Utilized amount must be zero or greater");
    }

    if (
      otherUtilizedAmount + Number(form.utilizedAmount || 0) >
      Number(form.approvedAmount || 0)
    ) {
      throw new Error("Utilized amount cannot exceed the remaining budget");
    }
  }

  async function saveIncomeRecord(event) {
    event.preventDefault();
    const formElement = event.currentTarget;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      validateForm();

      const payload = {
        date: form.date,
        financialYear: getFinancialYear(form.date),
        budgetHead: form.budgetHead.trim(),
        amountText: `INR ${inrNumber.format(Number(form.approvedAmount))}`,
        amount: Number(form.approvedAmount),
        description: form.description.trim(),
        utilisedAmountLakh: Number(form.utilizedAmount || 0) / 100000,
        purchasesFor: form.purchasesFor.trim(),
      };

      if (editingId) {
        await onUpdate(editingId, payload, form.invoiceFile);
      } else {
        await onCreate(payload, form.invoiceFile);
      }

      setEditingId(null);
      setForm(initialForm);
      formElement.reset();
      setSuccess("Saved Successfully");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function editRecord(record) {
    setEditingId(record.id);
    setError("");
    setSuccess("");
    setForm({
      date: record.date || "",
      budgetHead: record.budgetHead || record.source || "",
      approvedAmount: String(record.amount || ""),
      utilizedAmount: String(getUtilizedAmount(record)),
      description: record.description || record.notes || "",
      purchasesFor: record.purchasesFor || "",
      invoiceFile: null,
    });
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  async function deleteIncomeRecord(record) {
    const entriesUnderHead = records.filter(
      (item) =>
        item.budgetHead === record.budgetHead &&
        getRecordFinancialYear(item) === getRecordFinancialYear(record),
    ).length;
    const message =
      entriesUnderHead === 1
        ? `Warning: this is the only entry under "${record.budgetHead}" for ${getRecordFinancialYear(
            record,
          )}. Deleting it will also remove the budget head. Continue?`
        : "Delete only this accumulated-income entry?";

    if (!window.confirm(message)) return;
    await onDelete(record.id);
  }

  function toggleBudgetHead(key) {
    setExpandedHeads((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function exportRows() {
    const selectedFinancialYear =
      financialYearFilter === "all" ? "all-years" : financialYearFilter;

    exportCsv(
      `ece-accumulated-income-${selectedFinancialYear}.csv`,
      groupedBudgetHeads,
      [
        { label: "S. N.", value: (_group, index) => index + 1 },
        { label: "Budget Head", value: "head" },
        {
          label: "Total Amount Approved (INR)",
          value: (group) => inrNumber.format(group.approvedAmount),
        },
        {
          label: "Utilized (INR)",
          value: (group) => inrNumber.format(group.utilizedAmount),
        },
        {
          label: "Remaining (INR)",
          value: (group) => inrNumber.format(group.remainingAmount),
        },
        { label: "Entries", value: (group) => group.entries.length },
      ],
    );
  }

  return (
    <main className="page-content">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Accumulated Budget</p>
          <h1>Institute&apos;s Accumulated Income - ECE Department</h1>
          <p>
            Maintain accumulated-income entries, purchase purposes and invoice
            proof under each budget head.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">
            Remaining Amount ·{" "}
            {financialYearFilter === "all"
              ? "All Financial Years"
              : `FY ${financialYearFilter}`}
          </span>
          <strong>{currency.format(totalRemaining)}</strong>
          <p>
            Budget {currency.format(totalBudget)} | Utilized{" "}
            {currency.format(totalUtilized)}
          </p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel" ref={formSectionRef}>
          <div className="section-heading">
            <h2>{editingId ? "Edit Income Entry" : "Add Income Entry"}</h2>
            <p>
              Search for an existing budget head or enter a new one. Existing
              approved amounts load automatically for the entry date&apos;s
              financial year.
            </p>
          </div>

          <form className="form-grid" onSubmit={saveIncomeRecord}>
            <label>
              Entry Date
              <input
                required
                type="date"
                name="date"
                value={form.date}
                onChange={updateField}
              />
              {form.date && (
                <span className="field-hint">
                  Financial year: {getFinancialYear(form.date)}
                </span>
              )}
            </label>
            <label>
              Budget Head
              <div className="budget-head-combobox">
                <input
                  required
                  disabled={!form.date}
                  autoComplete="off"
                  name="budgetHead"
                  value={form.budgetHead}
                  onChange={(event) => {
                    updateField(event);
                    setShowHeadSuggestions(true);
                  }}
                  onFocus={() => setShowHeadSuggestions(true)}
                  onBlur={() => setShowHeadSuggestions(false)}
                  placeholder={
                    form.date
                      ? "Search or enter a new budget head"
                      : "Select entry date first"
                  }
                  role="combobox"
                  aria-expanded={showHeadSuggestions}
                  aria-controls="income-head-suggestions"
                />
                {showHeadSuggestions && matchingBudgetHeads.length > 0 && (
                  <div
                    className="budget-head-suggestions"
                    id="income-head-suggestions"
                    role="listbox"
                  >
                    {matchingBudgetHeads.map((head) => (
                      <button
                        type="button"
                        role="option"
                        key={head}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectBudgetHead(head)}
                      >
                        {head}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label>
              Total Amount Approved (INR)
              <input
                required
                readOnly={isExistingBudgetHead}
                min="1"
                step="1"
                type={isExistingBudgetHead ? "text" : "number"}
                name="approvedAmount"
                value={
                  isExistingBudgetHead && form.approvedAmount
                    ? inrNumber.format(Number(form.approvedAmount))
                    : form.approvedAmount
                }
                onChange={updateField}
                placeholder={
                  isExistingBudgetHead
                    ? "Loaded automatically"
                    : "Enter approved amount"
                }
              />
            </label>
            <label>
              Total Utilized Amount (INR)
              <input
                readOnly
                value={
                  form.budgetHead
                    ? inrNumber.format(calculatedTotalUtilized)
                    : ""
                }
                placeholder="Calculated automatically"
              />
            </label>
            <label>
              New Entry Amount (INR)
              <input
                required
                min="0"
                step="1"
                type="number"
                name="utilizedAmount"
                value={form.utilizedAmount}
                onChange={updateField}
                placeholder="Enter this entry's amount"
              />
            </label>
            <label>
              Remaining Amount (INR)
              <input
                readOnly
                value={
                  form.approvedAmount
                    ? inrNumber.format(calculatedRemainingAmount)
                    : ""
                }
                placeholder="Calculated automatically"
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
            <label className="span-two">
              Description
              <textarea
                required
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Describe this utilization entry"
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
                    ? "Update Income Entry"
                    : "Save Income Entry"}
              </button>
              {editingId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={cancelEdit}
                >
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
            <h2>Accumulated Income Budget Heads</h2>
            <p>
              {isAdmin
                ? "Each budget head appears once per financial year. Click a head to view, edit, or delete its entries."
                : "Each budget head appears once per financial year. Click a head to view its entries."}
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
            Budget Head
            <select
              value={headFilter}
              onChange={(event) => setHeadFilter(event.target.value)}
            >
              <option value="all">All budget heads</option>
              {budgetHeadOptions.map((head) => (
                <option key={head} value={head}>
                  {head}
                </option>
              ))}
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
        </div>

        <div className="table-wrap">
          <table className="budget-head-table">
            <thead>
              <tr>
                <th>S. N.</th>
                <th>Budget Head</th>
                <th>Total Amount Approved (INR)</th>
                <th>Utilized (INR)</th>
                <th>Remaining (INR)</th>
                <th>Entries</th>
              </tr>
            </thead>
            <tbody>
              {groupedBudgetHeads.map((group, index) => {
                const isExpanded = expandedHeads.has(group.key);

                return (
                  <Fragment key={group.key}>
                    <tr className="budget-head-row">
                      <td>{index + 1}</td>
                      <td>
                        <button
                          className="budget-head-toggle"
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleBudgetHead(group.key)}
                        >
                          <span className="expand-icon" aria-hidden="true">
                            {isExpanded ? "▾" : "▸"}
                          </span>
                          <span>{group.head}</span>
                        </button>
                      </td>
                      <td>{inrNumber.format(group.approvedAmount)}</td>
                      <td>{inrNumber.format(group.utilizedAmount)}</td>
                      <td>{inrNumber.format(group.remainingAmount)}</td>
                      <td>{group.entries.length}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="budget-entry-detail">
                        <td colSpan="6">
                          <div className="nested-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>S. N.</th>
                                  <th>Date</th>
                                  <th>Description</th>
                                  <th>Purchases For</th>
                                  <th>Utilized (INR)</th>
                                  <th>Invoice</th>
                                  {isAdmin && <th>Actions</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {group.entries.map((record, entryIndex) => (
                                  <tr key={record.id}>
                                    <td>{entryIndex + 1}</td>
                                    <td>{record.date || "Not recorded"}</td>
                                    <td>
                                      {record.description ||
                                        record.notes ||
                                        "No description"}
                                    </td>
                                    <td>{record.purchasesFor || "—"}</td>
                                    <td>
                                      {inrNumber.format(
                                        getUtilizedAmount(record),
                                      )}
                                    </td>
                                    <td>
                                      <InvoiceLink record={record} />
                                    </td>
                                    {isAdmin && (
                                      <td>
                                        <div className="table-actions">
                                          <button
                                            type="button"
                                            onClick={() => editRecord(record)}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteIncomeRecord(record)
                                            }
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {groupedBudgetHeads.length === 0 && (
                <tr>
                  <td colSpan="6">No budget heads found.</td>
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
