import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/Firebase";

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const email = `${studentId.toLowerCase()}@campusfix.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role !== "head") {
          await auth.signOut();
          setError("Access denied. Only Campus Head can access this dashboard.");
        }
      }
    } catch (err) {
      setError("Invalid  headID or password.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md " >
        {/* Logo */}
        <div className="text-center mb-5">
          <div className="w-15 h-15 bg-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🏛
          </div>
          <h1 className="text-2xl font-extrabold text-white">CampusFix</h1>
          <p className="text-gray-500 mt-1">Campus Head Dashboard</p>
        </div>

        {/* Form */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-10  mb-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-5">
            <label className="text-xs font-bold text-gray-500 tracking-widest block mb-2">STUDENT ID</label>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              placeholder="e.g. head"
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-2 text-white placeholder-gray-600 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="mb-8">
            <label className="text-xs font-bold text-gray-500 tracking-widest block mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/10 rounded px-2 py-2 text-white placeholder-gray-600 outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 rounded-2xl py-4 text-white font-extrabold text-base transition disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">Only Campus Head can access this dashboard</p>
      </div>
    </div>
  );
}