import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/Firebase";
import RegisterPage from "./RegisterPage";

const statusConfig = {
  pending:    { label: "Pending",     bg: "bg-red-50",    text: "text-red-500",    border: "border-red-200" },
  inprogress: { label: "In Progress", bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
  resolved:   { label: "Resolved",   bg: "bg-green-50",  text: "text-green-600",  border: "border-green-200" },
};

const categoryConfig = {
  water:     { icon: "🚰", bg: "bg-blue-50" },
  classroom: { icon: "💡", bg: "bg-purple-50" },
  bathroom:  { icon: "🚻", bg: "bg-orange-50" },
  wifi:      { icon: "🌐", bg: "bg-cyan-50" },
  furniture: { icon: "🪑", bg: "bg-red-50" },
  door:      { icon: "🚪", bg: "bg-gray-100" },
};

export default function DashboardPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchId, setSearchId] = useState("");
  const [assignMsg, setAssignMsg] = useState("");
  const [page, setPage] = useState("issues");
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "issues"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snapshot => {
      setIssues(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selected) return;
    const unsub = onSnapshot(
      collection(db, "issues", selected.id, "comments"),
      snapshot => setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [selected]);

  useEffect(() => {
    if (page !== "students") return;
    const fetchStudents = async () => {
      const snap = await getDocs(collection(db, "users"));
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchStudents();
  }, [page]);

const resolve = async (id) => {
  await updateDoc(doc(db, "issues", id), { 
    status: "resolved", 
    resolvedAt: serverTimestamp() 
  });
  
  // Delete after 10 minutes
  setTimeout(async () => { 
    try { 
      await deleteDoc(doc(db, "issues", id));
      // Remove from selected if it's open
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      console.log("Delete error:", e);
    } 
  }, 1 * 60 * 1000);

  if (selected?.id === id) setSelected({ ...selected, status: "resolved" });
};
  const setInProgress = async (id) => {
    await updateDoc(doc(db, "issues", id), { status: "inprogress" });
    if (selected?.id === id) setSelected({ ...selected, status: "inprogress" });
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    await addDoc(collection(db, "issues", selected.id, "comments"), {
      text: comment,
      postedBy: "🏛 Campus Head",
      createdAt: serverTimestamp(),
    });
    setComment("");
  };

  const handleAssign = async () => {
    const student = students.find(s => s.studentId === searchId.trim());
    if (!student) { setAssignMsg("❌ Student ID not found"); setTimeout(() => setAssignMsg(""), 3000); return; }
    await updateDoc(doc(db, "users", student.id), { role: "classrep" });
    setAssignMsg(`✅ ${student.name} assigned as Class Rep`);
    setStudents(s => s.map(u => u.id === student.id ? { ...u, role: "classrep" } : u));
    setTimeout(() => setAssignMsg(""), 3000);
    setSearchId("");
  };

  const handleRemoveRep = async (id) => {
    await updateDoc(doc(db, "users", id), { role: "student" });
    setStudents(s => s.map(u => u.id === id ? { ...u, role: "student" } : u));
  };

  const pending = issues.filter(i => i.status === "pending").length;
  const inprogress = issues.filter(i => i.status === "inprogress").length;
  const resolved = issues.filter(i => i.status === "resolved").length;
  const filtered = filter === "all" ? issues : issues.filter(i => i.status === filter);

  // Get unique classes
  const classes = [...new Set(students.filter(s => s.className).map(s => s.className))];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-56 bg-[#0f0f1a] min-h-screen flex flex-col fixed left-0 top-0">
        <div className="p-6 border-b border-white/5">
          <div className="text-xl font-black text-white">CampusFix</div>
          <div className="text-xs text-white/30 mt-1 tracking-widest">ADMIN</div>
        </div>
        <div className="p-3 flex-1">
          {[
            { id: "issues",   icon: "⚠️", label: "Issues" },
            { id: "register", icon: "➕", label: "Register" },
            { id: "students", icon: "👥", label: "Students" },
          ].map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setSelected(null); setSelectedClass(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-left transition ${page === item.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70"}`}>
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {item.id === "issues" && pending > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pending}</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => signOut(auth)}
            className="w-full text-white/40 hover:text-white text-sm font-medium py-2 transition">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="ml-56 flex-1 flex">
        <div className="flex-1 p-8 overflow-y-auto">

          {/* ISSUES PAGE */}
          {page === "issues" && (
            <div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total",       value: issues.length, color: "text-gray-800" },
                  { label: "Pending",     value: pending,       color: "text-red-500" },
                  { label: "In Progress", value: inprogress,    color: "text-yellow-600" },
                  { label: "Resolved",    value: resolved,      color: "text-green-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className={`text-4xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-sm text-gray-400 mt-1 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-extrabold text-gray-900">All Issues</h2>
                    <div className="flex gap-2">
                      {["all", "pending", "inprogress", "resolved"].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${filter === f ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-400 hover:border-gray-400"}`}>
                          {f === "all" ? "All" : f === "inprogress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {loading ? (
                      <div className="text-center py-20 text-gray-400">Loading...</div>
                    ) : filtered.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="text-5xl mb-3">✅</div>
                        <div className="text-gray-400 font-medium">No issues found</div>
                      </div>
                    ) : filtered.map(issue => {
                      const cat = categoryConfig[issue.category] || { icon: "⚠️", bg: "bg-gray-100" };
                      const status = statusConfig[issue.status] || { label: issue.status, bg: "bg-gray-100", text: "text-gray-500" };
                      return (
                        <button key={issue.id} onClick={() => setSelected(issue)}
                          className={`bg-white rounded-2xl p-4 border text-left transition hover:shadow-md ${selected?.id === issue.id ? "border-gray-900 shadow-md" : "border-gray-100"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 ${cat.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{cat.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-sm capitalize">{issue.category} Issue</div>
                              <div className="text-xs text-gray-400 truncate mt-0.5">{issue.description}</div>
                              <div className="text-xs text-gray-300 mt-1">by {issue.posterName}</div>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.bg} ${status.text} flex-shrink-0`}>
                              {status.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detail panel */}
                {selected && (
                  <div className="w-80 flex-shrink-0">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-0">
                      {selected.photoUrl ? (
                        <img src={selected.photoUrl} alt="issue" className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-4xl">📷</div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-extrabold text-gray-900 capitalize text-lg">{selected.category} Issue</div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig[selected.status]?.bg} ${statusConfig[selected.status]?.text}`}>
                            {statusConfig[selected.status]?.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">{selected.description}</p>
     <div className="bg-gray-50 rounded-xl p-3 mb-4 flex flex-col gap-2">
  <div className="text-xs text-gray-400">
    👤 <span className="font-semibold text-gray-600">{selected.posterName}</span>
  </div>
  {selected.posterClass && (
    <div className="text-xs text-gray-400">
      🎓 Class · <span className="font-semibold text-gray-600">{selected.posterClass}</span>
    </div>
  )}
  {selected.posterStudentId && (
    <div className="text-xs text-gray-400">
      🪪 <span className="font-semibold text-gray-600"> ID :  {selected.posterStudentId.toUpperCase()}</span>
    </div>
  )}
</div>
                        {selected.status !== "resolved" && (
                          <div className="flex gap-2 mb-4">
                            {selected.status === "pending" && (
                              <button onClick={() => setInProgress(selected.id)}
                                className="flex-1 bg-yellow-50 border border-yellow-200 text-yellow-600 font-bold text-sm py-2.5 rounded-xl hover:bg-yellow-100 transition">
                                🔧 In Progress
                              </button>
                            )}
                            <button onClick={() => resolve(selected.id)}
                              className="flex-1 bg-green-50 border border-green-200 text-green-600 font-bold text-sm py-2.5 rounded-xl hover:bg-green-100 transition">
                              ✅ Resolve
                            </button>
                          </div>
                        )}
                        <div className="font-bold text-gray-900 text-sm mb-3">Comments</div>
                        <div className="max-h-40 overflow-y-auto mb-3 flex flex-col gap-2">
                          {comments.length === 0 ? (
                            <div className="text-xs text-gray-300 text-center py-4">No comments yet</div>
                          ) : comments.map(c => (
                            <div key={c.id} className="bg-green-50 rounded-xl p-3">
                              <div className="text-xs font-bold text-green-600">{c.postedBy}</div>
                              <div className="text-sm text-gray-600 mt-1">{c.text}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={comment} onChange={e => setComment(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleComment()}
                            placeholder="Reply to students..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-gray-400" />
                          <button onClick={handleComment}
                            className="bg-gray-900 text-white rounded-xl w-9 flex items-center justify-center hover:bg-gray-700 transition">
                            ➤
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REGISTER PAGE */}
          {page === "register" && <RegisterPage />}

          {/* STUDENTS PAGE */}
          {page === "students" && (
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-6">Students</h2>

              {/* Assign Class Rep */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                <div className="font-bold text-gray-900 mb-4">Assign Class Rep</div>
                <div className="flex gap-3">
                  <input value={searchId} onChange={e => setSearchId(e.target.value)}
                    placeholder="Enter Student ID (e.g. c1230347)"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400" />
                  <button onClick={handleAssign}
                    className="bg-gray-900 text-white rounded-xl px-6 py-3 text-sm font-bold hover:bg-gray-700 transition">
                    Assign
                  </button>
                </div>
                {assignMsg && (
                  <div className={`mt-3 text-sm font-medium ${assignMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                    {assignMsg}
                  </div>
                )}
              </div>

              {/* Class view or Students view */}
              {selectedClass ? (
                <div>
                  <button onClick={() => setSelectedClass(null)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-5 transition">
                    ← Back to Classes
                  </button>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🎓</div>
                      <div>
                        <div className="font-extrabold text-gray-900">Class {selectedClass}</div>
                        <div className="text-xs text-gray-400">{students.filter(s => s.className === selectedClass).length} students</div>
                      </div>
                    </div>
                    {students.filter(s => s.className === selectedClass).map((s, idx, arr) => (
                      <div key={s.id} className={`flex items-center gap-4 px-6 py-4 ${idx < arr.length - 1 ? "border-b border-gray-50" : ""}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.role === "classrep" ? "bg-purple-50" : "bg-gray-100"}`}>
                          {s.role === "classrep" ? "👨‍🏫" : "👨‍🎓"}
                        </div>
                       <div className="flex-1">
  <div className="font-semibold text-gray-900 text-sm">{s.name}</div>
  <div className="text-xs text-gray-400">{s.studentId} · Semester {s.semester}</div>
  <div className="text-xs text-gray-300">🔑 {s.password || "—"}</div>
</div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.role === "classrep" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                          {s.role === "classrep" ? "Class Rep" : "Student"}
                        </span>
                        {s.role === "classrep" && (
                          <button onClick={() => handleRemoveRep(s.id)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium transition">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold text-gray-400 tracking-widest mb-4">ALL CLASSES</div>
                  {classes.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                      <div className="text-4xl mb-3">🎓</div>
                      <div className="font-medium text-gray-500">No classes yet</div>
                      <div className="text-sm text-gray-400 mt-1">Register students to see classes here</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {classes.map(cls => {
                        const classStudents = students.filter(s => s.className === cls);
                        const hasRep = classStudents.some(s => s.role === "classrep");
                        return (
                          <button key={cls} onClick={() => setSelectedClass(cls)}
                            className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-gray-300 transition">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-3">🎓</div>
                            <div className="font-extrabold text-gray-900 text-base mb-1">{cls}</div>
                            <div className="text-xs text-gray-400 mb-2">{classStudents.length} students</div>
                            <div className={`text-xs font-bold ${hasRep ? "text-purple-500" : "text-red-400"}`}>
                              {hasRep ? "✅ Has Class Rep" : "⚠️ No Class Rep"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}