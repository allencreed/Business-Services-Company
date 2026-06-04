import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import LoginPage from "./LoginPage";
import VendorDashboard from "./VendorDashboard";
import AdminDashboard from "./AdminDashboard";

export default function App() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);

  if (user === undefined) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>
          <a href="/">
            Imperium <span>Partners</span>
          </a>
        </h1>
        <div className="header-actions">
          <span>
            {user.name} ({isAdmin ? "Admin" : "Vendor"})
          </span>
          <button className="logout-btn" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="app-main">
        {isAdmin ? <AdminDashboard /> : <VendorDashboard />}
      </main>
    </div>
  );
}
