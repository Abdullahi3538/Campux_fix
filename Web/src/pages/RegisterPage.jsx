import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/Firebase";
import * as XLSX from "xlsx";

const firebaseConfig = {
  apiKey: "AIzaSyAxwN5xfB-K7qBnch_Fyug_ht-7480_p7o",
  authDomain: "campusfix-d69ec.firebaseapp.com",
  projectId: "campusfix-d69ec",
  storageBucket: "campusfix-d69ec.firebasestorage.app",
  messagingSenderId: "111577172143",
  appId: "1:111577172143:web:d6ba0924a051ec132bec5a"
};

// Add this helper at the top of the file after imports
const calculateSemester = (startYear) => {
  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const start = parseInt(startYear);

  // Academic year starts in September
  let academicYearsPassed = currentYear - start;

  // Before September, still previous academic year
  if (currentMonth < 9) {
    academicYearsPassed -= 1;
  }


  let semester = academicYearsPassed * 2;

  if (currentMonth >= 9 || currentMonth === 1) {
    semester += 1;
  } else if (currentMonth >= 2 && currentMonth <= 6) {
    semester += 2;
  }

  return semester;
};

const buildClassCode = (startYear, hall) => {
  const shortYear = String(startYear).slice(-2);
  return `CA${shortYear}${hall}`;
};

const secondaryApp = initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

async function registerOneStudent(name, studentId, password, role, className, semester) {
  const email = `${studentId.toLowerCase()}@campusfix.com`;
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = userCredential.user.uid;
  await secondaryAuth.signOut();
  await setDoc(doc(db, "users", uid), {
    name,
    studentId: studentId.toLowerCase(),
    role: role || "student",
    email,
    password, // saved so head can view it
    className: className || "",
    semester: semester || "",
  });
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [className, setClassName] = useState("");
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [startYear, setStartYear] = useState("");
const [hall, setHall] = useState("");

  const [bulkData, setBulkData] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState([]);
  const [fileName, setFileName] = useState("");

const handleRegister = async () => {
  if (!name || !studentId || !password || !startYear || !hall) {
    setError("Please fill all fields"); return;
  }
  setLoading(true);
  setError("");
  setSuccess("");
  try {
    const className = buildClassCode(startYear, hall);
    const semester = calculateSemester(startYear);
    await registerOneStudent(name, studentId, password, role, className, semester);
    setSuccess(`✅ ${name} registered in class ${className} (Semester ${semester})!`);
    setName(""); setStudentId(""); setPassword("");
    setRole("student"); setStartYear(""); setHall("");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") setError("❌ This Student ID is already registered.");
    else if (err.code === "auth/weak-password") setError("❌ Password must be at least 6 characters.");
    else setError(`❌ ${err.message}`);
  }
  setLoading(false);
};

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setBulkResults([]);
    setBulkProgress(0);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setBulkData(rows);
    };
    reader.readAsBinaryString(file);
  };

const handleBulkRegister = async () => {
  if (bulkData.length === 0) return;
  setBulkLoading(true);
  setBulkResults([]);
  const results = [];
  for (let i = 0; i < bulkData.length; i++) {
    const row = bulkData[i];
    const name = row["name"] || row["Name"];
    const studentId = row["studentId"] || row["StudentID"] || row["ID"];
    const password = String(row["password"] || row["Password"]);
    const role = row["role"] || row["Role"] || "student";
    const startYear = String(row["startYear"] || row["StartYear"] || "2023");
    const hall = String(row["hall"] || row["Hall"] || "1");
    const className = buildClassCode(startYear, hall);
    const semester = calculateSemester(startYear);

    if (!name || !studentId || !password) {
      results.push({ name: name || "Unknown", status: "❌ Missing fields" });
      continue;
    }
    try {
      await registerOneStudent(name, studentId, password, role, className, semester);
      results.push({ name, status: `✅ ${className} · Sem ${semester}` });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") results.push({ name, status: "⚠️ Already exists" });
      else results.push({ name, status: "❌ Failed" });
    }
    setBulkProgress(i + 1);
  }
  setBulkResults(results);
  setBulkLoading(false);
  setBulkData([]);
  setFileName("");
};

  const downloadTemplate = () => {
    const template = [
      { name: "Ahmed Mohamed", studentId: "ju-2024-0001", password: "student123", role: "student", class: "CA235", semester: "6" },
      { name: "Sara Khalid",   studentId: "ju-2024-0002", password: "student123", role: "classrep", class: "CA235", semester: "6" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "campusfix_students_template.xlsx");
  };

  return (
    <div>
      <h2 className="text-xl font-extrabold text-gray-900 mb-6">Register Student</h2>
      <div className="grid grid-cols-2 gap-6">

        {/* Single */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span>👤</span> Single Registration
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4"><p className="text-red-500 text-sm font-medium">{error}</p></div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4"><p className="text-green-600 text-sm font-medium">{success}</p></div>}

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 tracking-widest block mb-2">FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ahmed Mohamed"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 tracking-widest block mb-2">STUDENT ID</label>
            <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. C1230347"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 tracking-widest block mb-2">PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min 6 characters"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400" />
          </div>

       {/* Start Year + Hall */}
<div className="flex gap-3 mb-4">
  <div className="flex-1">
    <label className="text-xs font-bold text-gray-400 tracking-widest block mb-2">START YEAR</label>
    <select value={startYear} onChange={e => setStartYear(e.target.value)}
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400">
      <option value="">Select year</option>
      {[2022,2023, 2024, 2025, 2026].map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  </div>
  <div className="flex-1">
    <label className="text-xs font-bold text-gray-400 tracking-widest block mb-2">HALL</label>
    <select value={hall} onChange={e => setHall(e.target.value)}
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400">
      <option value="">Select hall</option>
      {[1, 2, 3, 4, 5].map(h => (
        <option key={h} value={h}>{h}</option>
      ))}
    </select>
  </div>
</div>

{/* Auto preview */}
{startYear && hall && (
  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
    <div>
      <div className="text-xs text-blue-400 font-bold">CLASS CODE</div>
      <div className="text-lg font-extrabold text-blue-600">{buildClassCode(startYear, hall)}</div>
    </div>
    <div>
      <div className="text-xs text-blue-400 font-bold">SEMESTER</div>
      <div className="text-lg font-extrabold text-blue-600">{calculateSemester(startYear)}</div>
    </div>
  </div>
)}

          <div className="mb-5">
            <label className="text-xs font-bold text-gray-400 tracking-widest block mb-2">ROLE</label>
            <div className="flex gap-2">
              {[{ key: "student", label: "👨‍🎓 Student" }, { key: "classrep", label: "👨‍🏫 Class Rep" }].map(r => (
                <button key={r.key} onClick={() => setRole(r.key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition ${role === r.key ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleRegister} disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-extrabold py-3 rounded-xl transition disabled:opacity-50">
            {loading ? "Registering..." : "➕ Register Student"}
          </button>
        </div>

        {/* Bulk */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span></span> Upload Excel for Bulk Registration
          </div>

          

          <label className="block w-full bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl py-8 text-center cursor-pointer hover:bg-blue-100 transition mb-4">
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm font-bold text-blue-600">{fileName || "Click to upload Excel file"}</div>
            <div className="text-xs text-gray-400 mt-1">.xlsx or .xls files only</div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>

          {bulkData.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="text-sm font-bold text-gray-700 mb-2">📋 {bulkData.length} students ready</div>
              <div className="max-h-32 overflow-y-auto">
                {bulkData.slice(0, 5).map((row, i) => (
                  <div key={i} className="text-xs text-gray-500 py-1 border-b border-gray-100">
                    {row.name || row.Name} · {row.studentId || row.StudentID || row.ID} · Class: {row.class || row.className || row.Class}
                  </div>
                ))}
                {bulkData.length > 5 && <div className="text-xs text-gray-400 pt-1">+{bulkData.length - 5} more...</div>}
              </div>
            </div>
          )}

          {bulkLoading && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Registering...</span>
                <span>{bulkProgress}/{bulkData.length + bulkProgress}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-900 h-2 rounded-full transition-all"
                  style={{ width: `${(bulkProgress / (bulkData.length + bulkProgress)) * 100}%` }} />
              </div>
            </div>
          )}

          {bulkResults.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
              {bulkResults.map((r, i) => (
                <div key={i} className="text-xs py-1 border-b border-gray-100 flex justify-between">
                  <span className="text-gray-600">{r.name}</span>
                  <span>{r.status}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleBulkRegister} disabled={bulkLoading || bulkData.length === 0}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-extrabold py-3 rounded-xl transition disabled:opacity-50">
            {bulkLoading ? `Registering ${bulkProgress}...` : `🚀 Register ${bulkData.length || ""} Students`}
          </button>
        </div>
      </div>
    </div>
  );
}