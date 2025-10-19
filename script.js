import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDz621OqT9ERxnyCY7BGmh3iMUnb97-TDI",
  authDomain: "database-d81c7.firebaseapp.com",
  projectId: "database-d81c7",
  storageBucket: "database-d81c7.appspot.com",
  messagingSenderId: "934049685295",
  appId: "1:934049685295:web:17ad6001402c57b9434bda"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");
const pageTitle = document.getElementById("pageTitle");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const logoutBtn = document.getElementById("logoutBtn");
const groupsGrid = document.getElementById("groupsGrid");
const blacklistList = document.getElementById("blacklistList");
const blkIdInput = document.getElementById("blkIdInput");
const blkReasonInput = document.getElementById("blkReasonInput");
const addBlacklistBtn = document.getElementById("addBlacklistBtn");
const leaderboardList = document.getElementById("leaderboardList");
const roleLabel = document.getElementById("roleLabel");
const userLabel = document.getElementById("userLabel");

// ===================== Sidebar navigation =====================
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    navBtns.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
    pages.forEach(p => p.classList.remove("active"));
    document.getElementById(btn.dataset.page).classList.add("active");
    pageTitle.textContent = btn.textContent;
    if (window.innerWidth <= 800) sidebar.classList.remove("show");
  });
});

menuToggle.addEventListener("click", () => sidebar.classList.toggle("show"));
document.addEventListener("click", e => {
  if (window.innerWidth > 800) return;
  if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove("show");
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ===================== Auth listener =====================
// Ganti onAuthStateChanged
function checkLogin() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role") || "user";
  if (!username) {
    window.location.href = "index.html";
    return;
  }
  userLabel.textContent = username;
  roleLabel.textContent = role.toUpperCase();
  window.currentUserRole = role;

  startGroupsListener();
  startBlacklistListener();
  startLeaderboardListener();
}

checkLogin();

// Logout
logoutBtn.addEventListener("click", async () => {
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  window.location.href = "index.html";
});

// ===================== Helpers =====================
function escapeHtml(t) {
  return t ? String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;") : "";
}

// ===================== Groups =====================
function startGroupsListener() {
  let blacklistSet = new Set();

  onSnapshot(collection(db, "blacklist"), snap => {
    blacklistSet.clear();
    snap.forEach(docSnap => blacklistSet.add(docSnap.id));

    document.querySelectorAll(".group-card").forEach(card => {
      const groupId = card.dataset.id;
      const statusDiv = card.querySelector(".status");
      if(statusDiv){
        statusDiv.textContent = blacklistSet.has(groupId) ? "🚫 Blacklist" : "✅ Aktif";
      }
      const blBtn = card.querySelector(".bl-btn");
      if(blBtn){
        blBtn.textContent = blacklistSet.has(groupId) ? "Hapus dari Blacklist" : "Blacklist";
      }
    });
  });

  onSnapshot(collection(db, "groups"), snap => {
    groupsGrid.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const isBlacklisted = blacklistSet.has(docSnap.id);

      const el = document.createElement("div");
      el.className = "group-card";
      el.dataset.id = docSnap.id;
      el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <h4>${escapeHtml(data.title)}</h4>
          <div class="meta">ID: <code>${escapeHtml(docSnap.id)}</code></div>
          <div class="meta">Added by: ${escapeHtml(data.addedByName || data.addedBy || "-")}</div>
          <div class="meta status">${isBlacklisted ? "🚫 Blacklist" : "✅ Aktif"}</div>
        </div>
        <div style="text-align:right" class="meta">${data.memberCount||0} anggota</div>
      </div>`;

      if (window.currentUserRole === "admin") {
        const actions = document.createElement("div");
        actions.style.display = "flex"; actions.style.gap = "8px"; actions.style.marginTop = "10px";

        const delBtn = document.createElement("button");
        delBtn.className = "small-btn danger"; delBtn.textContent = "Hapus Grup";
        delBtn.onclick = async () => { 
          if (confirm(`Yakin hapus ${data.title}?`)) await deleteDoc(doc(db, "groups", docSnap.id)); 
        };

        const blBtn = document.createElement("button");
        blBtn.className = "small-btn bl-btn"; 
        blBtn.textContent = isBlacklisted ? "Hapus dari Blacklist" : "Blacklist";
        blBtn.onclick = async () => { 
          if(blacklistSet.has(docSnap.id)){
            await deleteDoc(doc(db,"blacklist",docSnap.id));
          } else {
            const reason = prompt("Alasan:","Spam"); 
            if(reason!==null) await setDoc(doc(db,"blacklist",docSnap.id), { name: data.title, reason, date: Date.now() }); 
          }
        };

        actions.appendChild(blBtn); 
        actions.appendChild(delBtn); 
        el.appendChild(actions);
      }

      groupsGrid.appendChild(el);
    });
  });
}

// ===================== Blacklist =====================
function startBlacklistListener() {
  onSnapshot(collection(db, "blacklist"), snap => {
    blacklistList.innerHTML = "";
    snap.forEach(docSnap => {
      const li = document.createElement("li");
      const data = docSnap.data();
      li.innerHTML = `<div><strong>${escapeHtml(docSnap.id)}</strong><div class="meta">${escapeHtml(data.name||"")} — ${escapeHtml(data.reason||"")}</div></div>`;
      if(window.currentUserRole==="admin"){
        const rm = document.createElement("button"); rm.className="small-btn"; rm.textContent="Hapus";
        rm.onclick=async()=>{ if(confirm(`Hapus ${docSnap.id}?`)) await deleteDoc(doc(db,"blacklist",docSnap.id)); };
        li.appendChild(rm);
      }
      blacklistList.appendChild(li);
    });
  });

  if(addBlacklistBtn){
    addBlacklistBtn.addEventListener("click", async () => {
      if(window.currentUserRole!=="admin") return alert("Hanya admin bisa menambah blacklist.");
      const id = blkIdInput.value.trim(); 
      if(!id) return alert("Masukkan ID grup/user!");
      const reason = blkReasonInput.value.trim() || "Tidak disebutkan";
      await setDoc(doc(db, "blacklist", id), { name: id, reason, date: Date.now() });
      blkIdInput.value = ""; blkReasonInput.value = "";
      alert("Berhasil menambahkan blacklist!");
    });
  }
}

// ===================== Leaderboard =====================
function startLeaderboardListener() {
  try {
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(20));
    onSnapshot(q, snap => {
      leaderboardList.innerHTML = "";
      let rank = 1;
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const li = document.createElement("li");
        li.textContent = `${rank}. ${escapeHtml(data.name || docSnap.id)} — ${data.points || 0} poin`;
        leaderboardList.appendChild(li);
        rank++;
      });
    }, err => {
      console.error("Error leaderboard:", err);
    });
  } catch(e) {
    console.error("Exception leaderboard:", e);
  }
}