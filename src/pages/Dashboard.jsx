import { Link } from "react-router-dom";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Dashboard({ isAdmin, incomeRecords, expenseRecords, inventoryItems }) {
  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalExpense = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
  const inventoryValue = inventoryItems.reduce((sum, item) => sum + item.amount, 0);

  const modules = [
    {
      title: "Institute's Accumulated Income",
      description:
        "Track all institute allocations, recoveries and department income for ECE.",
      metric: currency.format(totalIncome),
      label: `${incomeRecords.length} income records`,
      link: "/accumulated-income",
    },
    {
      title: "Expenditure Budget",
      description:
        "Manage budget utilization, vendor payments and uploaded invoices.",
      metric: currency.format(totalExpense),
      label: `${expenseRecords.length} expenditure records`,
      link: "/expenditure-budget",
    },
    {
      title: "Inventory",
      description:
        "Track purchased items, quantity, location and invoice references.",
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
