import { useState, useEffect } from "react";
import { auth } from "./firebase/Firebase";
import { onAuthStateChanged } from "firebase/auth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-lg">Loading...</div>
    </div>
  );

  return user ? <DashboardPage /> : <LoginPage />;
}

export default App;