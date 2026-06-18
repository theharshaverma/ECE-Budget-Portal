import { Link } from "react-router-dom";
import { getFinancialYear } from "../utils";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Dashboard({ isAdmin, incomeRecords, expenseRecords, inventoryItems }) {
  const currentFinancialYear = getFinancialYear(new Date());
  const accumulatedIncomeHeads = new Map();
  incomeRecords.forEach((record) => {
    const financialYear =
      getFinancialYear(record.date) || record.financialYear || "2026-2027";

    if (financialYear !== currentFinancialYear) return;

    const key = `${financialYear}::${record.budgetHead}`;
    const current = accumulatedIncomeHeads.get(key) || {
      approved: 0,
      utilized: 0,
    };
    current.approved = Math.max(current.approved, Number(record.amount || 0));
    current.utilized += Number(record.utilisedAmountLakh || 0) * 100000;
    accumulatedIncomeHeads.set(key, current);
  });
  const remainingIncome = [...accumulatedIncomeHeads.values()].reduce(
    (sum, head) => sum + Math.max(head.approved - head.utilized, 0),
    0,
  );

  const expenditureHeads = new Map();
  expenseRecords.forEach((record) => {
    const financialYear = getFinancialYear(record.date) || "2026-2027";

    if (financialYear !== currentFinancialYear) return;

    const key = `${financialYear}::${record.head}`;
    const current = expenditureHeads.get(key) || {
      approved: 0,
      utilized: 0,
    };
    current.approved = Math.max(
      current.approved,
      Number(record.budgetLakh || 0) * 100000,
    );
    current.utilized += Number(record.amount || 0);
    expenditureHeads.set(key, current);
  });
  const remainingExpense = [...expenditureHeads.values()].reduce(
    (sum, head) => sum + Math.max(head.approved - head.utilized, 0),
    0,
  );
  const inventoryValue = inventoryItems.reduce((sum, item) => sum + item.amount, 0);

  const modules = [
    {
      title: "Institute's Accumulated Income",
      description:
        "Track official ECE accumulated budget heads, sanctioned amount and utilization.",
      metric: currency.format(remainingIncome),
      label: `FY ${currentFinancialYear} remaining · ${accumulatedIncomeHeads.size} budget heads`,
      link: "/accumulated-income",
    },
    {
      title: "Expenditure Budget",
      description:
        "Manage 2026-27 expenditure particulars, utilization, balance and invoices.",
      metric: currency.format(remainingExpense),
      label: `FY ${currentFinancialYear} remaining · ${expenditureHeads.size} expenditure heads`,
      link: "/expenditure-budget",
    },
    {
      title: "Inventory",
      description:
        "Track purchased items, quantity and invoice references.",
      metric: currency.format(inventoryValue),
      label: `${inventoryItems.length} inventory items`,
      link: "/inventory",
    },
  ];

  return (
    <main className="page-content">
      <section className="page-hero dashboard-hero">
        <div>
          <p className="eyebrow">ECE Department</p>
          <h1>ECE Budget Portal</h1>
          <p>
            Budget management and inventory tracking system for departmental
            income, expenditure and purchases.
          </p>
        </div>
        <div className="status-panel">
          <span className="status-label">Current Access</span>
          <strong>{isAdmin ? "Admin" : "Viewer"}</strong>
          <p>
            {isAdmin
              ? "Admin users can add records and attach invoice files."
              : "Viewer users can review records without edit controls."}
          </p>
        </div>
      </section>

      <section className="module-grid" aria-label="Budget portal modules">
        {modules.map((module) => (
          <article className="module-card" key={module.title}>
            <div>
              <h2>{module.title}</h2>
              <p>{module.description}</p>
            </div>
            <div className="module-metric">
              <strong>{module.metric}</strong>
              <span>{module.label}</span>
            </div>
            <Link className="primary-button" to={module.link}>
              Open Module
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Dashboard;
