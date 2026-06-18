import { Fragment, useMemo, useRef, useState } from "react";
import InvoiceLink from "../components/InvoiceLink";
import { expenditureBudgetHeads } from "../data";
import { currency, exportCsv, getFinancialYear, matchesSearch } from "../utils";

const initialForm = {
  head: "",
  budgetLakh: "",
  approvedAmount: "",
  utilizedAmount: "",
  vendor: "ECE Department",
  date: "",
  invoiceFile: null,
  status: "Pending",
};

const inrNumber = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function toDateInputValue(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getExpenseEntries(record) {
  if (Array.isArray(record.expenseEntries)) {
    return record.expenseEntries.map((entry, index) => ({
      entryId: entry.entryId || `entry-${index + 1}`,
      amount: Number(entry.amount || 0),
      date: entry.date || record.date || "",
      vendor: entry.vendor || record.vendor || "ECE Department",
      status: entry.status || record.status || "Pending",
    }));
  }

  const parts = String(record.expensesDescription || "")
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
        entryId: `legacy-${index / 2 + 1}`,
        amount: Number(amount),
        date: toDateInputValue(period),
        vendor: record.vendor || "ECE Department",
        status: record.status || "Pending",
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

function getExpenseRecordFinancialYear(record) {
  return getFinancialYear(record.date) || "2026-2027";
}

function AddExpense({ isAdmin, records, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
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
    () => [
      ...new Set([
        ...expenditureBudgetHeads,
        ...records.map((record) => record.head).filter(Boolean),
      ]),
    ],
    [records],
  );
  const matchingBudgetHeads = budgetHeadOptions.filter((head) =>
    head.toLowerCase().includes(form.head.trim().toLowerCase()),
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesHead = headFilter === "all" || record.head === headFilter;
        return matchesHead && matchesSearch(record, search);
      }),
    [headFilter, records, search],
  );

  const allTableRows = useMemo(
    () =>
      filteredRecords.flatMap((record) => {
        const entries = getExpenseEntries(record);

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

        return entries.map((entry) => ({
          ...record,
          rowKey: `${record.id}-${entry.entryId}`,
          entryId: entry.entryId,
          entryDate: entry.date,
          displayPeriod: formatDisplayDate(entry.date),
          displayUtilizedAmount: Number(entry.amount),
          vendor: entry.vendor,
          status: entry.status,
        }));
      }),
    [filteredRecords],
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
      allTableRows.filter((record) => {
        return (
          financialYearFilter === "all" ||
          getFinancialYear(record.displayPeriod) === financialYearFilter
        );
      }),
    [allTableRows, financialYearFilter],
  );

  const groupedBudgetHeads = useMemo(() => {
    const groups = new Map();

    tableRows.forEach((record) => {
      const head = record.head || "Unassigned Budget Head";
      const existing = groups.get(head) || {
        head,
        budgetLakh: 0,
        entries: [],
      };

      existing.budgetLakh = Math.max(
        existing.budgetLakh,
        Number(record.budgetLakh || 0),
      );
      existing.entries.push(record);
      groups.set(head, existing);
    });

    return [...groups.values()].map((group) => {
      const utilizedAmount = group.entries.reduce(
        (sum, entry) => sum + getRowUtilizedAmount(entry),
        0,
      );
      return {
        ...group,
        utilizedAmount,
        remainingAmount: Math.max(group.budgetLakh * 100000 - utilizedAmount, 0),
      };
    });
  }, [tableRows]);

  const totalExpense = tableRows.reduce(
    (sum, record) => sum + getRowUtilizedAmount(record),
    0,
  );
  const totalBudgetLakh = groupedBudgetHeads.reduce(
    (sum, group) => sum + group.budgetLakh,
    0,
  );
  const totalRemainingAmount = Math.max(
    totalBudgetLakh * 100000 - totalExpense,
    0,
  );
  function getRowUtilizedAmount(row) {
    return Number(row.displayUtilizedAmount || 0);
  }

  function toggleBudgetHead(head) {
    setExpandedHeads((current) => {
      const next = new Set(current);

      if (next.has(head)) {
        next.delete(head);
      } else {
        next.add(head);
      }

      return next;
    });
  }

  function updateField(event) {
    const { name, value, files } = event.target;

    if (name === "head" || name === "date") {
      const nextHead = name === "head" ? value : form.head;
      const nextDate = name === "date" ? value : form.date;
      const nextFinancialYear = getFinancialYear(nextDate);
      const approvedBudget = records
        .filter(
          (record) =>
            record.head === nextHead &&
            getExpenseRecordFinancialYear(record) === nextFinancialYear,
        )
        .reduce(
          (maximum, record) =>
            Math.max(maximum, Number(record.budgetLakh || 0)),
          0,
        );

      setForm((current) => ({
        ...current,
        [name]: value,
        budgetLakh: approvedBudget ? String(approvedBudget) : "",
        approvedAmount: approvedBudget
          ? String(approvedBudget * 100000)
          : "",
      }));
      return;
    }

    if (name === "approvedAmount") {
      setForm((current) => ({
        ...current,
        approvedAmount: value,
        budgetLakh: value ? String(Number(value) / 100000) : "",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] || null : value,
    }));
  }

  function selectBudgetHead(head) {
    const financialYear = getFinancialYear(form.date);
    const approvedBudget = records
      .filter(
        (record) =>
          record.head === head &&
          getExpenseRecordFinancialYear(record) === financialYear,
      )
      .reduce(
        (maximum, record) => Math.max(maximum, Number(record.budgetLakh || 0)),
        0,
      );

    setForm((current) => ({
      ...current,
      head,
      budgetLakh: approvedBudget ? String(approvedBudget) : "",
      approvedAmount: approvedBudget
        ? String(approvedBudget * 100000)
        : "",
    }));
    setShowHeadSuggestions(false);
  }

  function validateForm() {
    if (Number(form.budgetLakh) <= 0) {
      throw new Error("Budget must be greater than zero");
    }

    if (Number(form.utilizedAmount) < 0) {
      throw new Error("Utilized amount must be zero or greater");
    }

    if (
      otherUtilizedForSelectedHead + Number(form.utilizedAmount || 0) >
      Number(form.budgetLakh || 0) * 100000
    ) {
      throw new Error("Utilized amount cannot exceed the remaining budget");
    }

  }

  function getRecordUtilizedAmount(record) {
    const entries = getExpenseEntries(record);

    if (entries.length > 0) {
      return entries.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0,
      );
    }

    return Number(record.amount) || Number(record.utilizedLakh || 0) * 100000;
  }

  const otherUtilizedForSelectedHead = records
    .filter(
      (record) =>
        record.head === form.head &&
        getExpenseRecordFinancialYear(record) === getFinancialYear(form.date),
    )
    .reduce((sum, record) => {
      if (!editingId || Number(record.id) !== Number(editingId)) {
        return sum + getRecordUtilizedAmount(record);
      }

      if (!editingEntryId) {
        return sum;
      }

      const siblingAmount = getExpenseEntries(record)
        .filter((entry) => entry.entryId !== editingEntryId)
        .reduce((entrySum, entry) => entrySum + Number(entry.amount || 0), 0);
      return sum + siblingAmount;
    }, 0);
  const calculatedRemainingAmount = Math.max(
    Number(form.budgetLakh || 0) * 100000 -
      otherUtilizedForSelectedHead -
      Number(form.utilizedAmount || 0),
    0,
  );

  function buildEntryUpdatePayload(record, entries) {
    const utilizedAmount = entries.reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0,
    );
    const budgetLakh = Number(record.budgetLakh || 0);

    return {
      head: record.head,
      budgetLakh,
      expensesDescription: "",
      expenseEntries: entries,
      utilizedLakh: utilizedAmount / 100000,
      balanceLakh: Math.max(budgetLakh - utilizedAmount / 100000, 0),
      vendor: record.vendor || "ECE Department",
      date: entries[0]?.date || record.date || "2026-04-01",
      amount: utilizedAmount,
      status: record.status || "Pending",
    };
  }

  async function saveExpense(event) {
    event.preventDefault();
    const formElement = event.currentTarget;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      validateForm();

      let payload = {
        head: form.head,
        budgetLakh: Number(form.budgetLakh),
        expensesDescription: "",
        utilizedLakh: Number(form.utilizedAmount || 0) / 100000,
        balanceLakh: calculatedRemainingAmount / 100000,
        vendor: form.vendor.trim(),
        date: form.date || "2026-04-01",
        amount: Number(form.utilizedAmount || 0),
        status: form.status,
      };

      if (editingId) {
        if (editingEntryId) {
          const parentRecord = records.find(
            (record) => Number(record.id) === Number(editingId),
          );

          if (!parentRecord) {
            throw new Error("The expenditure entry could not be found");
          }

          const entries = getExpenseEntries(parentRecord).map((entry) =>
            entry.entryId === editingEntryId
              ? {
                  ...entry,
                  amount: Number(form.utilizedAmount || 0),
                  date: form.date,
                  vendor: form.vendor.trim(),
                  status: form.status,
                }
              : entry,
          );
          payload = buildEntryUpdatePayload(parentRecord, entries);
        }

        await onUpdate(editingId, payload, form.invoiceFile);
      } else {
        await onCreate(payload, form.invoiceFile);
      }

      setEditingId(null);
      setEditingEntryId(null);
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
    setEditingEntryId(record.entryId || null);
    setError("");
    setSuccess("");
    setForm({
      head: record.head,
      budgetLakh: String(record.budgetLakh || ""),
      approvedAmount: String(Number(record.budgetLakh || 0) * 100000),
      utilizedAmount: String(
        record.entryId
          ? Number(record.displayUtilizedAmount || 0)
          : Number(record.amount) || Number(record.utilizedLakh || 0) * 100000,
      ),
      vendor: record.vendor || "ECE Department",
      date: record.entryDate || record.date || "",
      invoiceFile: null,
      status: record.status,
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
    setEditingEntryId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
  }

  async function deleteExpense(record) {
    const entriesUnderHead = records
      .filter((item) => item.head === record.head)
      .reduce((count, item) => {
        const entries = getExpenseEntries(item);
        return count + Math.max(entries.length, 1);
      }, 0);
    const removesBudgetHead = entriesUnderHead === 1;
    const deleteMessage = removesBudgetHead
      ? `Warning: this is the only entry under "${record.head}". Deleting it will also remove the budget head. Continue?`
      : `Delete only this ${inrNumber.format(
          getRowUtilizedAmount(record),
        )} expenditure entry?`;

    if (!window.confirm(deleteMessage)) return;

    if (record.entryId) {
      const parentRecord = records.find(
        (item) => Number(item.id) === Number(record.id),
      );

      if (!parentRecord) {
        setError("The expenditure entry could not be found");
        return;
      }

      const remainingEntries = getExpenseEntries(parentRecord).filter(
        (entry) => entry.entryId !== record.entryId,
      );

      if (remainingEntries.length === 0) {
        await onDelete(parentRecord.id);
        return;
      }

      await onUpdate(
        parentRecord.id,
        buildEntryUpdatePayload(parentRecord, remainingEntries),
        null,
      );
      return;
    }

    await onDelete(record.id);
  }

  function exportRows() {
    const selectedFinancialYear =
      financialYearFilter === "all" ? "all-years" : financialYearFilter;

    exportCsv(`ece-expenditure-budget-${selectedFinancialYear}.csv`, groupedBudgetHeads, [
      { label: "S. N.", value: (_group, index) => index + 1 },
      { label: "Budget Head", value: "head" },
      {
        label: "Total Amount Approved (INR)",
        value: (group) => inrNumber.format(group.budgetLakh * 100000),
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
    ]);
  }

  const isExistingBudgetHead = records.some(
    (record) =>
      record.head === form.head &&
      getExpenseRecordFinancialYear(record) === getFinancialYear(form.date),
  );

  return (
    <main className="page-content">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Budget Utilization</p>
          <h1>Expenditure Budget</h1>
          <p>
            Maintain expenditure entries, vendor payments and invoice proof
            for every budget update.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">
            Remaining Amount ·{" "}
            {financialYearFilter === "all"
              ? "All Financial Years"
              : `FY ${financialYearFilter}`}
          </span>
          <strong>{currency.format(totalRemainingAmount)}</strong>
          <p>
            Budget {currency.format(totalBudgetLakh * 100000)} | Utilized{" "}
            {currency.format(totalExpense)}
          </p>
        </div>
      </section>

      {isAdmin && (
        <section className="panel" ref={formSectionRef}>
          <div className="section-heading">
            <h2>
              {editingEntryId
                ? "Edit Expenditure Entry"
                : editingId
                  ? "Edit Expenditure Record"
                  : "Add Expenditure Record"}
            </h2>
            <p>
              Use the same particulars and budget columns as the shared
              expenditure sheet. Existing entries keep their invoice unless
              replaced.
            </p>
          </div>

          <form className="form-grid" onSubmit={saveExpense}>
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
                  name="head"
                  value={form.head}
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
                  aria-controls="budget-head-suggestions"
                />
                {showHeadSuggestions && matchingBudgetHeads.length > 0 && (
                  <div
                    className="budget-head-suggestions"
                    id="budget-head-suggestions"
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
              Utilized Amount (INR)
              <input
                required
                min="0"
                step="1"
                type="number"
                name="utilizedAmount"
                value={form.utilizedAmount}
                onChange={updateField}
                placeholder="4504"
              />
            </label>
            <label>
              Remaining Amount (INR)
              <input
                readOnly
                value={
                  form.budgetLakh
                    ? inrNumber.format(calculatedRemainingAmount)
                    : ""
                }
                placeholder="Calculated automatically"
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
                    ? "Update Expenditure"
                    : "Save Expenditure Update"}
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
            <h2>Budget Heads</h2>
            <p>
              {isAdmin
                ? "Each budget head appears once. Click a head to view, edit, or delete its entries."
                : "Each budget head appears once. Click a head to view all entries under it."}
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
              {budgetHeadOptions.map((head) => (
                <option key={head}>{head}</option>
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
                const isExpanded = expandedHeads.has(group.head);

                return (
                  <Fragment key={group.head}>
                    <tr className="budget-head-row">
                      <td>{index + 1}</td>
                      <td>
                        <button
                          className="budget-head-toggle"
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleBudgetHead(group.head)}
                        >
                          <span className="expand-icon" aria-hidden="true">
                            {isExpanded ? "▾" : "▸"}
                          </span>
                          <span>{group.head}</span>
                        </button>
                      </td>
                      <td>{inrNumber.format(group.budgetLakh * 100000)}</td>
                      <td>{inrNumber.format(group.utilizedAmount)}</td>
                      <td>{inrNumber.format(group.remainingAmount)}</td>
                      <td>{group.entries.length}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="budget-entry-detail" key={`${group.head}-entries`}>
                        <td colSpan="6">
                          <div className="nested-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>S. N.</th>
                                  <th>Date</th>
                                  <th>FY</th>
                                  <th>Vendor / Payee</th>
                                  <th>Utilized (INR)</th>
                                  <th>Invoice</th>
                                  {isAdmin && <th>Actions</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {group.entries.map((record, entryIndex) => (
                                  <tr key={record.rowKey}>
                                    <td>{entryIndex + 1}</td>
                                    <td>{record.displayPeriod || record.date}</td>
                                    <td>
                                      {getFinancialYear(
                                        record.displayPeriod || record.date,
                                      )}
                                    </td>
                                    <td>{record.vendor || "ECE Department"}</td>
                                    <td>
                                      {inrNumber.format(getRowUtilizedAmount(record))}
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
                                            onClick={() => deleteExpense(record)}
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

export default AddExpense;
