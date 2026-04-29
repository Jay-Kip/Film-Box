import { useState, useEffect } from "react";
import "../styles/admin.css";

const ADMIN_PASSWORD = "12345678"; // 🔐 change this to whatever you want


function Admin() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // -----------------------------------
  // 🔐 PASSWORD GATE
  // -----------------------------------
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === ADMIN_PASSWORD) setAuthed(true);
  }, []);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", ADMIN_PASSWORD);
      setAuthed(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    setAuthed(false);
  };

  // -----------------------------------
  // 📡 FETCH DATA
  // -----------------------------------
 const fetchAll = async () => {
  setLoading(true);
  try {
    const [ticketsRes, statsRes, ratingsRes] = await Promise.all([
      fetch("http://127.0.0.1:5000/admin/tickets", {
        headers: { "x-admin-password": ADMIN_PASSWORD },
      }),
      fetch("http://127.0.0.1:5000/admin/stats", {
        headers: { "x-admin-password": ADMIN_PASSWORD },
      }),
      fetch("http://127.0.0.1:5000/admin/ratings-breakdown", {
        headers: { "x-admin-password": ADMIN_PASSWORD },
      }),
    ]);

    const ticketsData = await ticketsRes.json();
    const statsData = await statsRes.json();
    const ratingsData = await ratingsRes.json();

    // ✅ Guard against auth errors
    if (ticketsRes.status === 401) {
      alert("❌ Wrong admin password");
      handleLogout();
      return;
    }

    setTickets(Array.isArray(ticketsData) ? ticketsData : []);
    setStats(statsData.error ? null : statsData);
    setRatings(ratingsData.error ? null : ratingsData);
  } catch (err) {
    console.error(err);
  }
  setLoading(false);
};

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  // -----------------------------------
  // ✅ MARK PAID MANUALLY
  // -----------------------------------
  const markPaid = async (checkoutId) => {
    const confirm = window.confirm(
      "Manually mark this ticket as paid? Only do this if the user was charged but the callback failed."
    );
    if (!confirm) return;

    const res = await fetch("http://127.0.0.1:5000/admin/mark-paid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": ADMIN_PASSWORD,
      },
      body: JSON.stringify({ checkout_id: checkoutId }),
    });

    const data = await res.json();
    setActionMsg(data.success ? "✅ Ticket marked as paid" : "❌ " + data.error);
    fetchAll();
    setTimeout(() => setActionMsg(""), 3000);
  };

  // -----------------------------------
  // 🚫 REVOKE TOKEN
  // -----------------------------------
  const revokeToken = async (checkoutId) => {
    const confirm = window.confirm(
      "Revoke this ticket? The user will lose access immediately."
    );
    if (!confirm) return;

    const res = await fetch("http://127.0.0.1:5000/admin/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": ADMIN_PASSWORD,
      },
      body: JSON.stringify({ checkout_id: checkoutId }),
    });

    const data = await res.json();
    setActionMsg(data.success ? "🚫 Token revoked" : "❌ " + data.error);
    fetchAll();
    setTimeout(() => setActionMsg(""), 3000);
  };

  // -----------------------------------
  // 📋 COPY TOKEN
  // -----------------------------------
  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    setActionMsg("📋 Token copied to clipboard");
    setTimeout(() => setActionMsg(""), 2000);
  };

  // -----------------------------------
  // 🔍 FILTER + SEARCH
  // -----------------------------------
  const filtered = tickets.filter((t) => {
    const matchesFilter = filter === "all" || t.payment_status === filter;
    const matchesSearch =
      search === "" ||
      t.phone?.includes(search) ||
      t.mpesa_receipt?.includes(search);
    return matchesFilter && matchesSearch;
  });

  // -----------------------------------
  // 🔐 LOGIN SCREEN
  // -----------------------------------
  if (!authed) {
    return (
      <div className="admin-login">
        <div className="login-box">
          <div className="login-logo">🎬</div>
          <h1>Admin Access</h1>
          <p>Russell Lé Misérable — Dashboard</p>
          <input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className={passwordError ? "error" : ""}
          />
          {passwordError && <span className="error-msg">Incorrect password</span>}
          <button onClick={handleLogin}>Enter</button>
        </div>
      </div>
    );
  }

  // -----------------------------------
  // 📊 DASHBOARD
  // -----------------------------------
  return (
    <div className="admin-wrap">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-logo">🎬</span>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Russell Lé Misérable (2026)</p>
          </div>
        </div>
        <div className="admin-header-right">
          {actionMsg && <span className="action-msg">{actionMsg}</span>}
          <button className="refresh-btn" onClick={fetchAll}>↻ Refresh</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="admin-body">

        {/* STATS CARDS */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card green">
              <span className="stat-label">Paid Tickets</span>
              <span className="stat-value">{stats.paid}</span>
            </div>
            <div className="stat-card yellow">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{stats.pending}</span>
            </div>
            <div className="stat-card red">
              <span className="stat-label">Failed</span>
              <span className="stat-value">{stats.failed}</span>
            </div>
            <div className="stat-card blue">
              <span className="stat-label">Total Revenue</span>
              <span className="stat-value">KES {stats.revenue}</span>
            </div>
            <div className="stat-card purple">
              <span className="stat-label">Avg Rating</span>
              <span className="stat-value">⭐ {stats.avg_rating} / 5</span>
            </div>
            <div className="stat-card gray">
              <span className="stat-label">Total Ratings</span>
              <span className="stat-value">{stats.rating_count}</span>
            </div>
          </div>
        )}

        {/* RATINGS BREAKDOWN */}
        {ratings && (
          <div className="section">
            <h2 className="section-title">Rating Breakdown</h2>
            <div className="ratings-bars">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratings[star] || 0;
                const max = Math.max(...Object.values(ratings), 1);
                const pct = Math.round((count / max) * 100);
                return (
                  <div className="rating-row" key={star}>
                    <span className="rating-label">{star}★</span>
                    <div className="rating-bar-bg">
                      <div
                        className="rating-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="rating-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TICKETS TABLE */}
        <div className="section">
          <div className="table-controls">
            <h2 className="section-title">Tickets</h2>
            <div className="controls-right">
              <input
                className="search-input"
                placeholder="Search phone or receipt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="filter-tabs">
                {["all", "paid", "pending", "failed"].map((f) => (
                  <button
                    key={f}
                    className={`filter-tab ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="table-wrap">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Receipt</th>
                    <th>Token</th>
                    <th>Date</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty">No tickets found</td>
                    </tr>
                  ) : (
                    filtered.map((t) => (
                      <tr key={t.id}>
                        <td>{t.phone || "—"}</td>
                        <td>
                          <span className={`badge ${t.payment_status}`}>
                            {t.payment_status}
                          </span>
                        </td>
                        <td>{t.mpesa_receipt || "—"}</td>
                        <td className="token-cell">
                          {t.token ? (
                            <span
                              className="token-text"
                              title={t.token}
                              onClick={() => copyToken(t.token)}
                            >
                              {t.token.slice(0, 8)}…
                            </span>
                          ) : "—"}
                        </td>
                        <td>{t.created_at ? t.created_at.slice(0, 16).replace("T", " ") : "—"}</td>
                        <td>{t.expires_at ? t.expires_at.slice(0, 10) : "—"}</td>
                        <td className="actions-cell">
                          {t.payment_status !== "paid" && (
                            <button
                              className="action-btn mark"
                              onClick={() => markPaid(t.checkout_id)}
                            >
                              ✅ Mark Paid
                            </button>
                          )}
                          {t.token && (
                            <>
                              <button
                                className="action-btn copy"
                                onClick={() => copyToken(t.token)}
                              >
                                📋 Copy Token
                              </button>
                              <button
                                className="action-btn revoke"
                                onClick={() => revokeToken(t.checkout_id)}
                              >
                                🚫 Revoke
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
