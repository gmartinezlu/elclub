import { auth, checkAuth, signOut, db, collection, onSnapshot, doc, updateDoc } from "../firebase/index.js";
import { alertError, confirmAction } from "../ui/alerts.js";

checkAuth("admin");

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
let usersCache = [];
let appointmentsCache = [];

function renderAdmin() {
    const psychologists = usersCache.filter(user => (user.role || user.rol) === "psicologa");
    const patients = usersCache.filter(user => (user.role || user.rol) === "paciente");
    const totalIncome = appointmentsCache.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    document.getElementById('admin-psychologists-count').innerText = psychologists.length;
    document.getElementById('admin-patients-count').innerText = patients.length;
    document.getElementById('admin-sessions-count').innerText = appointmentsCache.length;
    document.getElementById('admin-income-total').innerText = money.format(totalIncome);

    const pending = psychologists.filter(user => user.applicationStatus === "pending" || user.verificationStatus === "pending");
    document.getElementById('admin-pending-count').innerText = `${pending.length} pendientes`;
    const applications = document.getElementById('admin-professional-applications');
    applications.innerHTML = pending.length ? pending.map((user) => {
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Psicóloga";
        const areas = Array.isArray(user.areas) ? user.areas.join(", ") : (user.areas || "Sin áreas registradas");
        return `
            <div class="bg-white/5 border border-white/5 p-4 rounded-xl text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div class="space-y-1">
                    <h5 class="text-sm font-bold text-white">${name}</h5>
                    <p class="text-gray-400">${user.specialty || user.degree || "Especialidad pendiente"} · ${user.experience || "Experiencia por revisar"}</p>
                    <p class="text-gray-500">Áreas: ${areas}</p>
                    <p class="text-gray-500">Licencia: ${user.license || "No registrada"} · ${user.email || ""}</p>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button type="button" onclick="approvePsychologist('${user.id}')" class="bg-clubCrema text-clubVerde font-bold px-4 py-2 rounded-lg hover:bg-white transition-colors">Aprobar</button>
                    <button type="button" onclick="rejectPsychologist('${user.id}')" class="border border-white/10 text-gray-300 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">Rechazar</button>
                </div>
            </div>
        `;
    }).join("") : '<p class="text-gray-500 text-sm">No hay solicitudes pendientes.</p>';

    const byPsychologist = appointmentsCache.reduce((acc, item) => {
        const name = item.psychologistName || "Psicóloga sin nombre";
        acc[name] ||= { sessions: 0, total: 0 };
        acc[name].sessions += 1;
        acc[name].total += Number(item.amount || 0);
        return acc;
    }, {});

    const summary = document.getElementById('admin-psychologist-summary');
    const rows = Object.entries(byPsychologist);
    summary.innerHTML = rows.length ? rows.map(([name, data]) => `
        <div class="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-xl text-xs">
            <div class="space-y-1">
                <h5 class="text-sm font-bold text-white">${name}</h5>
                <p class="text-gray-400 font-medium">Sesiones dictadas: <span class="font-mono font-bold text-clubCrema">${data.sessions}</span></p>
            </div>
            <div class="text-right space-y-1">
                <div class="font-mono font-bold text-white">${money.format(data.total)} <span class="text-[10px] text-gray-400">COP</span></div>
                <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Activa</span>
            </div>
        </div>
    `).join("") : '<p class="text-gray-500 text-sm">Sin sesiones registradas todavía.</p>';

    const transactions = document.getElementById('admin-transactions');
    transactions.innerHTML = appointmentsCache.slice(-6).reverse().map((item) => `
        <div class="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between items-center">
            <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">${(item.paymentMethod || "PAGO").toUpperCase()}</span>
                    <span class="text-white font-semibold">${item.patientName || item.patientEmail || "Paciente"} → ${item.psychologistName || "Psicóloga"}</span>
                </div>
                <p class="text-[10px] text-gray-500 font-mono">${item.createdAt ? new Date(item.createdAt).toLocaleString('es-CO') : "Fecha no disponible"}</p>
            </div>
            <span class="font-mono font-bold text-emerald-400 text-sm">+${money.format(Number(item.amount || 0))}</span>
        </div>
    `).join("") || '<p class="text-gray-500 text-sm">Sin transacciones todavía.</p>';
}

onSnapshot(collection(db, "users"), (snapshot) => {
    usersCache = [];
    snapshot.forEach((docSnap) => usersCache.push({ id: docSnap.id, ...docSnap.data() }));
    renderAdmin();
});

onSnapshot(collection(db, "appointments"), (snapshot) => {
    appointmentsCache = [];
    snapshot.forEach((docSnap) => appointmentsCache.push({ id: docSnap.id, ...docSnap.data() }));
    renderAdmin();
});

window.approvePsychologist = async (id) => {
    if (!confirmAction("¿Aprobar esta psicóloga y publicarla en el catálogo?")) return;
    await updateDoc(doc(db, "users", id), {
        applicationStatus: "approved",
        verificationStatus: "approved",
        available: true,
        approvedAt: new Date().toISOString()
    });
};

window.rejectPsychologist = async (id) => {
    if (!confirmAction("¿Marcar esta postulación como rechazada?")) return;
    await updateDoc(doc(db, "users", id), {
        applicationStatus: "rejected",
        verificationStatus: "rejected",
        available: false,
        rejectedAt: new Date().toISOString()
    });
};

document.getElementById('btn-admin-logout').addEventListener('click', async () => {
    if (confirmAction("¿Deseas cerrar la consola de administración global de El Club?")) {
        try {
            await signOut(auth);
            window.location.href = "auth.html";
        } catch (error) {
            alertError("Error al salir de la consola administrativa: " + error.message);
        }
    }
});
