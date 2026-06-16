import { budgetHeads } from "../data";

function Dashboard() {
  const totalAllocated = budgetHeads.reduce((sum, b) => sum + b.allocated, 0);
  const totalSpent = budgetHeads.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = budgetHeads.reduce((sum, b) => sum + b.remaining, 0);

  const formatMoney = (amount) =>
    amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });

  return (
    <div style={pageStyle}>
      <div style={cardContainer}>
        <h1 style={titleStyle}>ECE Budget Portal</h1>

        <p style={subtitleStyle}>
          Accumulated budget tracking, invoices and inventory management
        </p>

        <p style={deptStyle}>
          Department of Electronics and Communication Engineering
        </p>

        <div style={yearBox}>
          <label style={yearLabel}>Financial Year:</label>
          <select style={yearSelect}>
            <option>2024–2025</option>
            <option>2025–2026</option>
            <option>2026–2027</option>
          </select>
        </div>

        <div style={summaryGrid}>
          <div style={summaryCard}>
            <p style={labelStyle}>Total Budget</p>
            <h2 style={amountStyle}>{formatMoney(totalAllocated)}</h2>
          </div>

          <div style={summaryCard}>
            <p style={labelStyle}>Amount Spent</p>
            <h2 style={amountStyle}>{formatMoney(totalSpent)}</h2>
          </div>

          <div style={summaryCard}>
            <p style={labelStyle}>Remaining</p>
            <h2 style={amountStyle}>{formatMoney(totalRemaining)}</h2>
          </div>
        </div>

        <div style={buttonRow}>
          <button style={buttonStyle}>+ Add Budget Head</button>
          <button style={buttonStyle}>+ Add Expense</button>
          <button style={outlineButton}>View Invoices</button>
          <button style={outlineButton}>Inventory</button>
        </div>

        <p style={lastUpdated}>Last Updated: 16 June 2026</p>

        <h2 style={sectionTitle}>Budget Summary</h2>

        <table style={tableStyle}>
          <thead>
            <tr style={tableHeadRow}>
              <th style={thStyle}>Budget Head</th>
              <th style={thStyle}>Allocated</th>
              <th style={thStyle}>Spent</th>
              <th style={thStyle}>Remaining</th>
              <th style={thStyle}>Utilization</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {budgetHeads.map((budget) => {
              const utilization = Math.round(
                (budget.spent / budget.allocated) * 100
              );

              return (
                <tr key={budget.id}>
                  <td style={tdStyle}>{budget.head}</td>
                  <td style={tdStyle}>{formatMoney(budget.allocated)}</td>
                  <td style={tdStyle}>{formatMoney(budget.spent)}</td>
                  <td style={remainingStyle}>{formatMoney(budget.remaining)}</td>
                  <td style={tdStyle}>
                    <div style={progressOuter}>
                      <div
                        style={{
                          ...progressInner,
                          width: `${utilization}%`,
                        }}
                      ></div>
                    </div>
                    <span>{utilization}%</span>
                  </td>
                  <td style={tdStyle}>
                    <button style={smallButton}>Edit</button>
                  </td>
                </tr>
              );
            })}

            <tr style={totalRow}>
              <td style={tdStyle}>Total</td>
              <td style={tdStyle}>{formatMoney(totalAllocated)}</td>
              <td style={tdStyle}>{formatMoney(totalSpent)}</td>
              <td style={remainingStyle}>{formatMoney(totalRemaining)}</td>
              <td style={tdStyle}>
                {Math.round((totalSpent / totalAllocated) * 100)}%
              </td>
              <td style={tdStyle}>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#edf7f2",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const cardContainer = {
  background: "#ffffff",
  padding: "30px 40px",
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(22, 101, 52, 0.15)",
  maxWidth: "1500px",
  margin: "0 auto",
};

const titleStyle = {
  color: "#14532d",
  fontSize: "36px",
  marginBottom: "6px",
  textAlign: "center",
};

const subtitleStyle = {
  color: "#4b5563",
  textAlign: "center",
  marginBottom: "4px",
};

const deptStyle = {
  color: "#15803d",
  fontWeight: "600",
  textAlign: "center",
  marginBottom: "18px",
};

const yearBox = {
  textAlign: "center",
  marginBottom: "28px",
};

const yearLabel = {
  marginRight: "10px",
  fontWeight: "600",
  color: "#14532d",
};

const yearSelect = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #15803d",
  color: "#14532d",
  background: "#ffffff",
  fontWeight: "600",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "20px",
  marginBottom: "30px",
};

const summaryCard = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "14px",
  padding: "24px",
  textAlign: "center",
};

const labelStyle = {
  color: "#374151",
  fontWeight: "600",
  marginBottom: "10px",
};

const amountStyle = {
  color: "#15803d",
  fontSize: "28px",
  margin: 0,
};

const buttonRow = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const buttonStyle = {
  padding: "11px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#15803d",
  color: "white",
  cursor: "pointer",
  fontWeight: "600",
};

const outlineButton = {
  padding: "11px 18px",
  border: "1px solid #15803d",
  borderRadius: "8px",
  background: "white",
  color: "#15803d",
  cursor: "pointer",
  fontWeight: "600",
};

const lastUpdated = {
  textAlign: "right",
  color: "#6b7280",
  marginBottom: "20px",
  fontSize: "14px",
};

const sectionTitle = {
  color: "#14532d",
  marginBottom: "15px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  borderRadius: "12px",
  overflow: "hidden",
};

const tableHeadRow = {
  background: "#dcfce7",
};

const thStyle = {
  padding: "14px",
  textAlign: "left",
  color: "#14532d",
  borderBottom: "1px solid #bbf7d0",
};

const tdStyle = {
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
  color: "#374151",
  fontWeight: "500",
};

const remainingStyle = {
  ...tdStyle,
  color: "#15803d",
  fontWeight: "700",
};

const totalRow = {
  background: "#f0fdf4",
  fontWeight: "700",
};

const progressOuter = {
  width: "100px",
  height: "8px",
  background: "#e5e7eb",
  borderRadius: "20px",
  display: "inline-block",
  marginRight: "10px",
  overflow: "hidden",
};

const progressInner = {
  height: "100%",
  background: "#15803d",
  borderRadius: "20px",
};

const smallButton = {
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  background: "#15803d",
  color: "white",
  cursor: "pointer",
};

export default Dashboard;