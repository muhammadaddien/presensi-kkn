var API =
  "https://script.google.com/macros/s/AKfycbxl-zL13Ua_D6JDKDFVHvyEqIbal313FHNrW571CfY6kL-CBKLsHOW787jOazsgg7w6/exec";
var acts = [],
  pState = 0,
  cNim = "",
  cNama = "",
  rekapData = null,
  notPreselect = "",
  isAdmin = false;

function $(id) {
  return document.getElementById(id);
}
function esc(s) {
  var d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function api(a, p, t) {
  t = t || 20000;
  var u = API + "?action=" + a + "&_t=" + Date.now();
  if (p)
    Object.keys(p).forEach(function (k) {
      u += "&" + k + "=" + encodeURIComponent(p[k]);
    });
  return Promise.race([
    fetch(u, {
      redirect: "follow",
      headers: { Accept: "application/json" },
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }),
    new Promise(function (_, rej) {
      setTimeout(function () {
        rej(new Error("Timeout"));
      }, t);
    }),
  ]);
}

function toast(msg, type) {
  var c =
    {
      success: "#ECFDF5,#065F46,fa-check-circle",
      error: "#FEF2F2,#991B1B,fa-times-circle",
      warn: "#FFF7ED,#92400E,fa-exclamation-circle",
    }[type] || "#F1F5F9,#334155,fa-info-circle";
  c = c.split(",");
  var t = document.createElement("div");
  t.className = "toast";
  t.style.cssText = "background:" + c[0] + ";color:" + c[1];
  t.innerHTML = '<i class="fas ' + c[2] + ' mr-1.5"></i>' + msg;
  $("toast-box").appendChild(t);
  setTimeout(function () {
    t.remove();
  }, 3500);
}

// ==================== AUTH & NAV ====================
function go(tab) {
  if (tab === "aktivitas" && !isAdmin) tab = "presensi";
  if (tab === "rekap" && !isAdmin) tab = "presensi";
  ["aktivitas", "presensi", "notulensi", "rekap"].forEach(function (t) {
    $("t-" + t).classList.toggle("hidden", t !== tab);
    $("nav-" + t).className =
      "flex-1 py-2 rounded-xl " +
      (t === tab ? "bg-blue-700 text-white shadow" : "text-slate-400");
  });
  if (tab === "aktivitas") renderAktivitas();
  if (tab === "presensi") renderPresensi();
  if (tab === "notulensi") renderNotulensi();
  if (tab === "rekap") renderRekap();
}

function closeModal() {
  $("modal-bg").classList.add("hidden");
}

function buildNav() {
  $("nav-aktivitas").style.display = isAdmin ? "" : "none";
  $("nav-rekap").style.display = isAdmin ? "" : "none";
  if (!document.getElementById("logout-btn")) {
    var b = document.createElement("button");
    b.id = "logout-btn";
    b.className =
      "absolute top-4 right-4 text-[11px] text-blue-300 hover:text-white transition z-10";
    b.innerHTML = '<i class="fas fa-right-from-bracket mr-1"></i>Keluar';
    b.onclick = function () {
      sessionStorage.removeItem("role");
      location.reload();
    };
    document.querySelector("header").style.position = "relative";
    document.querySelector("header").appendChild(b);
  }
}

function hideLoader() {
  var l = $("loader");
  l.style.transition = "opacity .3s";
  l.style.opacity = "0";
  setTimeout(function () {
    l.style.display = "none";
  }, 300);
}

function showLoginScreen() {
  $("loader").innerHTML =
    '<div class="w-full max-w-xs px-6 text-center">' +
    '<div class="w-14 h-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-clipboard-check text-2xl"></i></div>' +
    '<h2 class="font-extrabold text-slate-800 text-lg">Presensi Aktivitas KKN</h2>' +
    '<p class="text-xs text-slate-400 mt-1 mb-6">Pilih cara masuk</p>' +
    '<button onclick="toggleAdminForm(true)" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl mb-2 text-sm transition active:scale-[.98]"><i class="fas fa-shield-halved mr-1.5"></i>Masuk sebagai Admin</button>' +
    '<div id="admin-form" class="hidden bg-white border border-slate-200 rounded-xl p-4 mb-2 shadow-sm fade-up text-left">' +
    '<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Admin</label>' +
    '<input id="admin-pw" type="password" class="w-full mt-1 mb-3 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Masukkan password" onkeydown="if(event.key===\'Enter\')submitLogin()">' +
    '<button onclick="submitLogin()" class="w-full bg-blue-700 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-800 transition active:scale-[.98]">Login</button>' +
    "</div>" +
    '<div class="text-[10px] text-slate-300 font-bold my-3">ATAU</div>' +
    '<button onclick="loginAsUser()" class="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold py-3 rounded-xl text-sm transition active:scale-[.98]"><i class="fas fa-user mr-1.5"></i>Masuk sebagai Anggota</button>' +
    '<p id="login-err" class="text-xs text-rose-600 mt-3 hidden font-semibold"></p>' +
    "</div>";
}

function toggleAdminForm(show) {
  $("admin-form").classList.toggle("hidden", !show);
  if (show) $("admin-pw").focus();
}
function loginAsUser() {
  isAdmin = false;
  sessionStorage.setItem("role", "user");
  hideLoader();
  buildNav();
  go("presensi");
}

function submitLogin() {
  var pw = $("admin-pw").value;
  if (!pw) return toast("Masukkan password", "error");
  api("loginAdmin", { pw: pw })
    .then(function (r) {
      if (r.success) {
        isAdmin = true;
        sessionStorage.setItem("role", "admin");
        hideLoader();
        buildNav();
        go("aktivitas");
      } else {
        var e = $("login-err");
        e.textContent = "Password salah!";
        e.classList.remove("hidden");
        $("admin-pw").value = "";
        $("admin-pw").focus();
      }
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

// ==================== AKTIVITAS ====================
function renderAktivitas() {
  api("listAktivitas").then(function (list) {
    acts = list;
    var h =
      '<button onclick="openBuat()" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl mb-4 text-sm shadow-lg shadow-blue-200 transition active:scale-[.98]"><i class="fas fa-plus mr-1.5"></i>Buat Aktivitas Baru</button>';
    if (!list.length) {
      h +=
        '<div class="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm"><i class="fas fa-inbox text-3xl mb-2 block"></i>Belum ada aktivitas</div>';
    } else {
      list.sort(function (a, b) {
        return new Date(b.waktuDibuat) - new Date(a.waktuDibuat);
      });
      list.forEach(function (a) {
        var badge,
          act = "";
        if (a.status === "Belum Mulai") {
          badge =
            '<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">Belum Mulai</span>';
          act =
            "<button onclick=\"chgStatus('" +
            a.id +
            "','Berlangsung')\" class=\"text-[11px] font-bold text-teal-700 hover:underline\">Mulai</button> <button onclick=\"hapusAkt('" +
            a.id +
            '\')" class="text-[11px] font-bold text-rose-500 hover:underline">Hapus</button>';
        } else if (a.status === "Berlangsung") {
          badge =
            '<span class="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold"><i class="fas fa-circle text-[6px] mr-1 animate-pulse"></i>Berlangsung</span>';
          act =
            "<button onclick=\"chgStatus('" +
            a.id +
            "','Selesai')\" class=\"text-[11px] font-bold text-blue-700 hover:underline\">Selesai & Kunci</button>";
        } else {
          badge =
            '<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Selesai</span>';
          act =
            "<button onclick=\"openEdit('" +
            a.id +
            '\')" class="text-[11px] font-bold text-slate-600 hover:underline">Edit</button> <button onclick="goNotulensi(\'' +
            a.id +
            '\')" class="text-[11px] font-bold text-slate-600 hover:underline">Notulensi</button> <button onclick="hapusAkt(\'' +
            a.id +
            '\')" class="text-[11px] font-bold text-rose-500 hover:underline">Hapus</button>';
        }
        h +=
          '<div class="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm fade-up"><div class="flex justify-between items-start mb-2"><h3 class="font-bold text-sm text-slate-800 flex-1 mr-2">' +
          esc(a.nama) +
          "</h3>" +
          badge +
          '</div><p class="text-[11px] text-slate-400 mb-3"><i class="fas fa-user-pen mr-1"></i>' +
          esc(a.dibuatOleh) +
          '</p><div class="flex justify-between items-center"><span class="text-[10px] text-slate-400"><i class="fas fa-users mr-1"></i>' +
          a.peserta +
          ' peserta</span><div class="flex gap-3">' +
          act +
          "</div></div></div>";
      });
    }
    $("t-aktivitas").innerHTML = h;
  });
}

function openBuat() {
  $("modal-card").innerHTML =
    '<h3 class="font-bold text-base text-slate-800 mb-4"><i class="fas fa-plus-circle text-blue-600 mr-1.5"></i>Buat Aktivitas Baru</h3><div class="space-y-3"><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Aktivitas</label><input id="m-nama" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Mis: Sosialisasi Program"></div><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal</label><input id="m-tgl" type="date" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi</label><input id="m-lok" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Mis: Balai Desa"></div><div class="grid grid-cols-2 gap-2"><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Mulai</label><input id="m-jm" type="time" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Selesai</label><input id="m-js" type="time" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div></div><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dibuat Oleh</label><input id="m-oleh" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Nama Anda"></div></div><div class="flex gap-2 mt-5"><button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Batal</button><button onclick="submitBuat()" class="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 transition active:scale-[.98]">Buat</button></div>';
  $("modal-bg").classList.remove("hidden");
}

function submitBuat() {
  var n = $("m-nama").value.trim(),
    t = $("m-tgl").value,
    l = $("m-lok").value.trim(),
    jm = $("m-jm").value,
    js = $("m-js").value,
    o = $("m-oleh").value.trim();
  if (!n || !t || !l || !jm || !js || !o)
    return toast("Lengkapi semua field", "error");
  if (jm >= js) return toast("Jam selesai harus setelah jam mulai", "error");
  api("buatAktivitas", {
    nama: n,
    tanggal: t,
    lokasi: l,
    jamMulai: jm,
    jamSelesai: js,
    dibuatOleh: o,
  })
    .then(function (r) {
      if (r.error) return toast(r.error, "error");
      closeModal();
      toast("Aktivitas berhasil dibuat", "success");
      renderAktivitas();
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

function openEdit(id) {
  var a = acts.find(function (x) {
    return x.id === id;
  });
  if (!a) return;
  $("modal-card").innerHTML =
    '<h3 class="font-bold text-base text-slate-800 mb-4"><i class="fas fa-pen-to-square text-blue-600 mr-1.5"></i>Edit Aktivitas</h3><div class="space-y-3"><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Aktivitas</label><input id="e-nama" value="' +
    esc(a.nama) +
    '" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi</label><input id="e-lok" value="' +
    esc(a.lokasi) +
    '" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div><div class="grid grid-cols-2 gap-2"><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Mulai</label><input id="e-jm" type="time" value="' +
    (a.jamMulai || "") +
    '" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div><div><label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jam Selesai</label><input id="e-js" type="time" value="' +
    (a.jamSelesai || "") +
    '" class="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"></div></div></div><div class="flex gap-2 mt-5"><button onclick="closeModal()" class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Batal</button><button onclick="submitEdit(\'' +
    id +
    '\')" class="flex-1 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 transition active:scale-[.98]">Simpan</button></div>';
  $("modal-bg").classList.remove("hidden");
}

function submitEdit(id) {
  var n = $("e-nama").value.trim(),
    l = $("e-lok").value.trim(),
    jm = $("e-jm").value,
    js = $("e-js").value;
  if (!n || !l || !jm || !js) return toast("Lengkapi semua field", "error");
  if (jm >= js) return toast("Jam selesai harus setelah jam mulai", "error");
  api("editAktivitas", {
    id: id,
    nama: n,
    lokasi: l,
    jamMulai: jm,
    jamSelesai: js,
  })
    .then(function (r) {
      if (r.error) return toast(r.error, "error");
      closeModal();
      toast("Aktivitas berhasil diubah", "success");
      renderAktivitas();
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

function chgStatus(id, status) {
  var lb = status === "Berlangsung" ? "mulai" : "selesaikan & kunci";
  if (!confirm("Yakin ingin " + lb + " aktivitas ini?")) return;
  api("ubahStatus", { id: id, status: status })
    .then(function (r) {
      if (r.error) return toast(r.error, "error");
      toast("Status berhasil diubah", "success");
      renderAktivitas();
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

function hapusAkt(id) {
  if (
    !confirm(
      "Hapus aktivitas ini? Semua data presensi dan notulensi juga akan dihapus.",
    )
  )
    return;
  api("hapusAktivitas", { id: id })
    .then(function (r) {
      if (r.error) return toast(r.error, "error");
      toast("Aktivitas berhasil dihapus", "success");
      renderAktivitas();
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

// ==================== PRESENSI ====================
function renderPresensi() {
  pState = 0;
  cNim = "";
  cNama = "";
  var bl = acts.filter(function (a) {
    return a.status === "Berlangsung";
  });
  var h =
    '<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">';
  if (!bl.length) {
    h +=
      '<div class="text-center text-slate-400 text-sm py-6"><i class="fas fa-pause-circle text-2xl mb-2 block"></i>Tidak ada aktivitas yang sedang berlangsung</div>';
  } else {
    h +=
      '<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Aktivitas</label><select id="p-akt" class="w-full mt-1 mb-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm appearance-none bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"><option value="">-- Pilih --</option>';
    bl.forEach(function (a) {
      h += '<option value="' + a.id + '">' + esc(a.nama) + "</option>";
    });
    h +=
      '</select><div id="p-time" class="mb-4"></div><div id="p-form"></div><div id="p-peserta" class="mt-4"></div>';
  }
  h += "</div>";
  $("t-presensi").innerHTML = h;
  showPForm();
  if ($("p-akt"))
    $("p-akt").onchange = function () {
      var a = acts.find(function (x) {
        return x.id === $("p-akt").value;
      });
      var el = $("p-time");
      if (a && a.jamMulai && a.jamSelesai)
        el.innerHTML =
          '<div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-500 text-center"><i class="fas fa-clock mr-1"></i>Presensi dibuka: <strong class="text-slate-700">' +
          a.jamMulai +
          '</strong> sampai <strong class="text-slate-700">' +
          a.jamSelesai +
          "</strong></div>";
      else el.innerHTML = "";
      loadPeserta(a ? a.id : "");
    };
}

function showPForm() {
  var f = $("p-form");
  if (!f) return;
  if (pState === 0)
    f.innerHTML =
      '<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIM</label><div class="flex gap-2 mt-1"><input id="p-nim" type="text" class="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Masukkan NIM Anda" onkeydown="if(event.key===\'Enter\')cekNIM()"><button onclick="cekNIM()" class="px-4 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 transition active:scale-[.98]">Cek</button></div>';
  else if (pState === 1)
    f.innerHTML =
      '<div class="bg-teal-50 border border-teal-200 rounded-xl p-4"><p class="text-xs text-teal-600 mb-1">NIM: ' +
      cNim +
      '</p><p class="text-sm font-bold text-teal-800">Anda adalah <span class="text-base">' +
      esc(cNama) +
      '</span>?</p><div class="flex gap-2 mt-3"><button onclick="batalP()" class="flex-1 py-2 rounded-lg border border-teal-300 text-teal-700 text-xs font-bold hover:bg-teal-100 transition">Batal</button><button onclick="konfirmP()" class="flex-1 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition active:scale-[.98]">Ya, Saya ' +
      esc(cNama) +
      "</button></div></div>";
  else if (pState === 2)
    f.innerHTML =
      '<div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center text-sm font-bold text-emerald-800"><i class="fas fa-check-circle mr-1.5"></i>Presensi berhasil dicatat</div>';
}

function cekNIM() {
  var nim = $("p-nim").value.trim(),
    akt = $("p-akt").value;
  if (!nim) return toast("Masukkan NIM", "error");
  if (!akt) return toast("Pilih aktivitas", "error");
  api("cekNIM", { nim: nim })
    .then(function (r) {
      if (!r.found) return toast("NIM tidak terdaftar", "error");
      cNim = r.nim;
      cNama = r.nama;
      pState = 1;
      showPForm();
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

function konfirmP() {
  var akt = $("p-akt").value;
  api("presensi", { id: akt, nim: cNim })
    .then(function (r) {
      if (r.error) {
        toast(r.error, "error");
        batalP();
        return;
      }
      pState = 2;
      showPForm();
      toast("Presensi berhasil — " + cNama, "success");
      loadPeserta(akt);
      var a = acts.find(function (x) {
        return x.id === akt;
      });
      if (a) a.peserta++;
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

function batalP() {
  pState = 0;
  cNim = "";
  cNama = "";
  showPForm();
}

function loadPeserta(id) {
  var el = $("p-peserta");
  if (!el || !id) {
    if (el) el.innerHTML = "";
    return;
  }
  el.innerHTML =
    '<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Peserta Hadir</p><p class="text-xs text-slate-400"><i class="fas fa-spinner fa-spin mr-1"></i>Memuat...</p>';
  api("getPeserta", { id: id }).then(function (list) {
    if (!list.length) {
      el.innerHTML =
        '<p class="text-xs text-slate-400 italic">Belum ada peserta</p>';
      return;
    }
    var h = "";
    list.forEach(function (p, i) {
      h +=
        '<div class="flex justify-between items-center py-2 ' +
        (i ? "border-t border-slate-100" : "") +
        ' text-xs"><span class="text-slate-600"><span class="font-bold text-slate-400 mr-2">' +
        (i + 1) +
        ".</span>" +
        esc(p.nama) +
        ' <span class="text-slate-400">(' +
        p.nim +
        ')</span></span><span class="text-slate-400">' +
        p.waktu +
        "</span></div>";
    });
    el.innerHTML = h;
  });
}

// ==================== NOTULENSI ====================
function goNotulensi(id) {
  notPreselect = id;
  go("notulensi");
}

function renderNotulensi() {
  var sc = acts.filter(function (a) {
    return a.status === "Selesai";
  });
  var h =
    '<div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">';
  if (!sc.length) {
    h +=
      '<div class="text-center text-slate-400 text-sm py-6"><i class="fas fa-lock text-2xl mb-2 block"></i>Belum ada aktivitas yang selesai</div>';
  } else {
    h +=
      '<label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Aktivitas</label><select id="n-akt" onchange="loadNotul()" class="w-full mt-1 mb-4 px-3 py-2.5 border border-slate-200 rounded-lg text-sm appearance-none bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"><option value="">-- Pilih --</option>';
    sc.forEach(function (a) {
      var sel = a.id === notPreselect ? " selected" : "";
      h +=
        '<option value="' + a.id + '"' + sel + ">" + esc(a.nama) + "</option>";
    });
    h += '</select><div id="n-content"></div>';
  }
  h += "</div>";
  $("t-notulensi").innerHTML = h;
  notPreselect = "";
  if (sc.length) loadNotul();
}

function loadNotul() {
  var id = $("n-akt").value,
    el = $("n-content");
  if (!id) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML =
    '<p class="text-xs text-slate-400"><i class="fas fa-spinner fa-spin mr-1"></i>Memuat...</p>';
  api("getNotulensi", { id: id }).then(function (r) {
    var ro = !isAdmin;
    el.innerHTML =
      '<textarea id="n-isi" class="w-full h-64 px-3 py-3 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y" ' +
      (ro ? 'readonly style="background:#f8fafc;cursor:default"' : "") +
      ">" +
      esc(r.isi || "") +
      "</textarea>" +
      (r.terakhir
        ? '<p class="text-[10px] text-slate-400 mt-1.5">Terakhir diubah: ' +
          r.terakhir +
          "</p>"
        : "") +
      (ro
        ? '<p class="text-[10px] text-slate-400 mt-3 text-center italic">Hanya admin yang dapat mengedit notulensi</p>'
        : '<button onclick="simpanNotul()" class="w-full mt-3 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-[.98]"><i class="fas fa-save mr-1.5"></i>Simpan Notulensi</button>');
  });
}

function simpanNotul() {
  var id = $("n-akt").value,
    isi = $("n-isi").value;
  if (!id) return;
  api("simpanNotulensi", { id: id, isi: isi })
    .then(function (r) {
      if (r.error) return toast(r.error, "error");
      toast("Notulensi berhasil disimpan", "success");
      loadNotul();
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

// ==================== REKAP ====================
function renderRekap() {
  var el = $("t-rekap");
  el.innerHTML =
    '<p class="text-center text-slate-400 text-sm py-6"><i class="fas fa-spinner fa-spin mr-1"></i>Memuat...</p>';
  api("getRekap")
    .then(function (d) {
      rekapData = d;
      var h = "";
      h +=
        '<h3 class="text-sm font-bold text-slate-700 mb-2"><i class="fas fa-clipboard-list text-blue-600 mr-1.5"></i>Rekap Per Aktivitas</h3><div class="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">';
      if (!d.aktivitas.length)
        h +=
          '<p class="text-xs text-slate-400 text-center py-4">Belum ada aktivitas selesai</p>';
      else
        d.aktivitas.forEach(function (a, i) {
          var pct = a.total ? Math.round((a.hadir / a.total) * 100) : 0;
          h +=
            '<div class="flex justify-between items-center px-4 py-3 ' +
            (i ? "border-t border-slate-100" : "") +
            ' text-xs"><div class="flex-1 mr-3"><p class="font-semibold text-slate-700">' +
            esc(a.nama) +
            '</p><p class="text-slate-400 text-[10px]">' +
            a.tanggal +
            " · " +
            esc(a.lokasi) +
            '</p></div><div class="text-right"><p class="font-bold text-slate-800">' +
            a.hadir +
            "/" +
            a.total +
            '</p><p class="text-[10px] text-slate-400">' +
            pct +
            "%</p></div></div>";
        });
      h += "</div>";
      h +=
        '<h3 class="text-sm font-bold text-slate-700 mb-2"><i class="fas fa-users text-blue-600 mr-1.5"></i>Rekap Per Anggota</h3><div class="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">';
      if (!d.anggota.length)
        h +=
          '<p class="text-xs text-slate-400 text-center py-4">Belum ada data</p>';
      else
        d.anggota.forEach(function (a, i) {
          var pct = a.total ? Math.round((a.hadir / a.total) * 100) : 0;
          h +=
            '<div class="flex justify-between items-center px-4 py-3 ' +
            (i ? "border-t border-slate-100" : "") +
            ' text-xs"><div class="flex-1 mr-3"><p class="font-semibold text-slate-700">' +
            esc(a.nama) +
            '</p><p class="text-slate-400 text-[10px]">' +
            a.nim +
            '</p></div><div class="flex items-center gap-3"><div class="text-right"><p class="font-bold text-slate-800">' +
            a.hadir +
            "/" +
            a.total +
            '</p><p class="text-[10px] text-slate-400">' +
            pct +
            '%</p></div><button onclick="expAnggota(' +
            i +
            ')" class="text-[10px] px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold hover:bg-emerald-100 transition" title="Download Excel"><i class="fas fa-download"></i></button></div></div>';
        });
      h +=
        '</div><button onclick="expSemua()" id="btn-exp" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-200 transition active:scale-[.98]"><i class="fas fa-file-excel mr-2"></i>Export Semua Rekap ke Excel</button>';
      el.innerHTML = h;
    })
    .catch(function (e) {
      el.innerHTML =
        '<p class="text-center text-rose-500 text-sm py-6">' +
        e.message +
        "</p>";
    });
}

function expSemua() {
  var b = $("btn-exp");
  b.disabled = true;
  b.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Membuat file...';
  api("exportSemua", null, 30000)
    .then(function (r) {
      b.disabled = false;
      b.innerHTML =
        '<i class="fas fa-file-excel mr-2"></i>Export Semua Rekap ke Excel';
      if (r.error) return toast(r.error, "error");
      dlB64(
        r.base64,
        "Rekap_KKN_" +
          new Date().getDate() +
          "-" +
          (new Date().getMonth() + 1) +
          "-" +
          new Date().getFullYear() +
          ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      toast("Excel berhasil didownload", "success");
    })
    .catch(function (e) {
      b.disabled = false;
      b.innerHTML =
        '<i class="fas fa-file-excel mr-2"></i>Export Semua Rekap to Excel';
      toast(e.message, "error");
    });
}

function expAnggota(idx) {
  var a = rekapData.anggota[idx];
  toast("Membuat file untuk " + a.nama + "...", "warn");
  api("exportAnggota", { nim: a.nim }, 30000)
    .then(function (r) {
      if (r.error) return toast(r.error, "error");
      dlB64(
        r.base64,
        "Rekap_" + a.nama.replace(/\s+/g, "_") + "_" + a.nim + ".xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      toast("Berhasil didownload", "success");
    })
    .catch(function (e) {
      toast(e.message, "error");
    });
}

function dlB64(b64, name, mime) {
  var b = atob(b64),
    buf = new ArrayBuffer(b.length),
    arr = new Uint8Array(buf);
  for (var i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
  var u = URL.createObjectURL(new Blob([buf], { type: mime })),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    a.remove();
    URL.revokeObjectURL(u);
  }, 200);
}

// ==================== INIT ====================
window.onload = function () {
  $("hd-date").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  setInterval(function () {
    var n = new Date();
    $("hd-clock").textContent =
      String(n.getHours()).padStart(2, "0") +
      ":" +
      String(n.getMinutes()).padStart(2, "0") +
      ":" +
      String(n.getSeconds()).padStart(2, "0") +
      " WIB";
  }, 1000);
  var savedRole = sessionStorage.getItem("role");
  if (savedRole) {
    isAdmin = savedRole === "admin";
    api("listAktivitas").then(function (list) {
      acts = list;
      hideLoader();
      buildNav();
      go(isAdmin ? "aktivitas" : "presensi");
    });
    return;
  }
  api("listAktivitas")
    .then(function (list) {
      acts = list;
      showLoginScreen();
    })
    .catch(function (e) {
      $("loader").innerHTML =
        '<div class="text-center px-6"><i class="fas fa-wifi text-3xl text-rose-400 mb-3"></i><h2 class="font-bold text-slate-800 mb-1">Koneksi Gagal</h2><p class="text-sm text-slate-400 mb-4">' +
        e.message +
        '</p><button onclick="location.reload()" class="bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm">Coba Lagi</button></div>';
    });
};
