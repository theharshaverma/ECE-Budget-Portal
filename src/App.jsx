import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AddExpense from "./pages/AddExpense";
import Inventory from "./pages/Inventory";
import Invoices from "./pages/Invoices";
import {
  clearToken,
  createRecord,
  deleteRecord,
  getCurrentUser,
  getRecords,
  getToken,
  login,
  updateRecord,
  uploadInvoice,
} from "./api";

function App() {
  const [user, setUser] = useState(null);
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [expenseRecords, setExpenseRecords] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loginForm, setLoginForm] = useState({
    username: "admin",
    password: "admin123",
  });
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!getToken()) return;

    bootApp().catch(() => {
      clearToken();
      setUser(null);
      setLoading(false);
    });
  }, []);

  async function bootApp(nextUser) {
    setLoading(true);
    setError("");

    const activeUser = nextUser || (await getCurrentUser());
    const [income, expenses, inventory] = await Promise.all([
      getRecords("/api/income"),
      getRecords("/api/expenses"),
      getRecords("/api/inventory"),
    ]);

    setUser(activeUser);
    setIncomeRecords(income);
    setExpenseRecords(expenses);
    setInventoryItems(inventory);
    setLoading(false);
  }

  async function handleLogin(event) {
    event.preventDefault();

    try {
      const nextUser = await login(loginForm.username, loginForm.password);
      await bootApp(nextUser);
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setIncomeRecords([]);
    setExpenseRecords([]);
    setInventoryItems([]);
  }

  async function saveIncome(payload, invoiceFile) {
    const upload = await uploadInvoice(invoiceFile);
    const record = await createRecord("/api/income", {
      ...payload,
      invoice: upload?.fileName || "Not Attached",
      invoiceUrl: upload?.url || "",
    });
    setIncomeRecords((current) => [record, ...current]);
  }

  async function updateIncome(id, payload, invoiceFile) {
    const upload = await uploadInvoice(invoiceFile);
    const record = await updateRecord("/api/income", id, {
      ...payload,
      ...(upload
        ? {
            invoice: upload.fileName,
            invoiceUrl: upload.url,
          }
        : {}),
    });
    setIncomeRecords((current) =>
      current.map((item) => (item.id === record.id ? record : item)),
    );
  }

  async function removeIncome(id) {
    await deleteRecord("/api/income", id);
    setIncomeRecords((current) => current.filter((record) => record.id !== id));
  }

  async function saveExpense(payload, invoiceFile) {
    const upload = await uploadInvoice(invoiceFile);
    const record = await createRecord("/api/expenses", {
      ...payload,
      invoice: upload?.fileName || "Not Attached",
      invoiceUrl: upload?.url || "",
    });
    setExpenseRecords((current) => [record, ...current]);
  }

  async function updateExpense(id, payload, invoiceFile) {
    const upload = await uploadInvoice(invoiceFile);
    const record = await updateRecord("/api/expenses", id, {
      ...payload,
      ...(upload
        ? {
            invoice: upload.fileName,
            invoiceUrl: upload.url,
          }
        : {}),
    });
    setExpenseRecords((current) =>
      current.map((item) => (item.id === record.id ? record : item)),
    );
  }

  async function removeExpense(id) {
    await deleteRecord("/api/expenses", id);
    setExpenseRecords((current) => current.filter((record) => record.id !== id));
  }

  async function saveInventoryItem(payload, invoiceFile) {
    const upload = await uploadInvoice(invoiceFile);
    const record = await createRecord("/api/inventory", {
      ...payload,
      invoice: upload?.fileName || "Not Attached",
      invoiceUrl: upload?.url || "",
    });
    setInventoryItems((current) => [record, ...current]);
  }

  async function updateInventoryItem(id, payload, invoiceFile) {
    const upload = await uploadInvoice(invoiceFile);
    const record = await updateRecord("/api/inventory", id, {
      ...payload,
      ...(upload
        ? {
            invoice: upload.fileName,
            invoiceUrl: upload.url,
          }
        : {}),
    });
    setInventoryItems((current) =>
      current.map((item) => (item.id === record.id ? record : item)),
    );
  }

  async function removeInventoryItem(id) {
    await deleteRecord("/api/inventory", id);
    setInventoryItems((current) => current.filter((item) => item.id !== id));
  }

  if (loading) {
    return <div className="loading-screen">Loading ECE Budget Portal...</div>;
  }

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-panel">
          <div className="login-logos">
            <img
              src="/iiitd-logo.png"
              alt="Indraprastha Institute of Information Technology Delhi"
            />
            <img src="/ece-logo.png" alt="ECE Department Logo" />
          </div>
          <p className="eyebrow">Secure Access</p>
          <h1>ECE Budget Portal</h1>
          <p>
            Sign in as an admin to add records and upload invoices, or as a
            viewer to review the registers.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Username
              <input
                name="username"
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit">
              Sign In
            </button>
          </form>

          <div className="demo-users">
            <button
              type="button"
              onClick={() =>
                setLoginForm({ username: "admin", password: "admin123" })
              }
            >
              Use Admin Demo
            </button>
            <button
              type="button"
              onClick={() =>
                setLoginForm({ username: "viewer", password: "viewer123" })
              }
            >
              Use Viewer Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="header-inner">
          <img
            src="/iiitd-logo.png"
            alt="Indraprastha Institute of Information Technology Delhi"
            className="iiitd-logo"
          />
          <img
            src="/ece-logo.png"
            alt="ECE Department Logo"
            className="ece-logo"
          />
        </div>
      </header>

      <nav className="nav-bar" aria-label="Portal navigation">
        <div className="nav-inner">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/accumulated-income">Accumulated Income</NavLink>
          <NavLink to="/expenditure-budget">Expenditure Budget</NavLink>
          <NavLink to="/inventory">Inventory</NavLink>

          <div className="user-badge">
            <span>{user.name}</span>
            <strong>{user.role}</strong>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              isAdmin={isAdmin}
              incomeRecords={incomeRecords}
              expenseRecords={expenseRecords}
              inventoryItems={inventoryItems}
            />
          }
        />
        <Route
          path="/accumulated-income"
          element={
            <Invoices
              isAdmin={isAdmin}
              records={incomeRecords}
              onCreate={saveIncome}
              onUpdate={updateIncome}
              onDelete={removeIncome}
            />
          }
        />
        <Route
          path="/expenditure-budget"
          element={
            <AddExpense
              isAdmin={isAdmin}
              records={expenseRecords}
              onCreate={saveExpense}
              onUpdate={updateExpense}
              onDelete={removeExpense}
            />
          }
        />
        <Route
          path="/inventory"
          element={
            <Inventory
              isAdmin={isAdmin}
              items={inventoryItems}
              onCreate={saveInventoryItem}
              onUpdate={updateInventoryItem}
              onDelete={removeInventoryItem}
            />
          }
        />
      </Routes>

      <footer className="site-footer" />
    </div>
  );
}

export default App;
