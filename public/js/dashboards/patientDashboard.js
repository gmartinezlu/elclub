import { checkAuth, auth, signOut, db, collection, query, where, onSnapshot, getUserProfile, doc, addDoc, updateDoc } from "../firebase/index.js";
import { initProfilePhoto, loadProfilePhoto } from "../profile-photo.js";
import { escapeHtml } from "../utils/dom.js";
import { formatSpanishDate } from "../utils/date.js";
import { confirmAction } from "../ui/alerts.js";

checkAuth("paciente");

let currentPatientId = null;
let currentPsychologistId = null;
let currentPsychologistName = "tu psicologa";
let unsubscribeChat = null;
let unsubscribeTasks = null;
let unsubscribeResources = null;

function getMeetLink(a) {
    return a.googleMeetLink || a.meetLink || null;
}

function getChatId(psychologistId, patientId) {
    return psychologistId < patientId ? `${psychologistId}_${patientId}` : `${patientId}_${psychologistId}`;
}

function renderEmptyDashboard() {
    document.getElementById('lista-citas').innerHTML = '<p class="text-gray-500 text-sm">No tienes citas agendadas.</p>';
    document.getElementById('next-session-title').innerText = "Agenda tu proxima sesion";
    document.getElementById('next-session-details').innerText = "Cuando reserves, veras aqui el acceso a tu videollamada.";
    document.getElementById('completed-count').innerText = "0";
    document.getElementById('next-session-stat').innerText = "Sin citas";
    document.getElementById('process-weeks').innerText = "0";
}

function resolvePsychologist(profile, appointments) {
    const fromAppointment = appointments.find(item => item.psychologistId);
    currentPsychologistId = profile?.assignedPsychologistId || fromAppointment?.psychologistId || null;
    currentPsychologistName = profile?.assignedPsychologistName || fromAppointment?.psychologistName || "tu psicologa";
    setupPatientChat();
    loadPatientTasks();
    loadPatientResources();
}

function loadPatientTasks() {
    if (unsubscribeTasks) unsubscribeTasks();
    const container = document.getElementById('lista-tareas');
    if (!currentPatientId) return;
    const qTasks = query(collection(db, "patient_tasks"), where("patientId", "==", currentPatientId));
    unsubscribeTasks = onSnapshot(qTasks, function(snap) {
        const tasks = snap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
        if (!tasks.length) {
            container.innerHTML = '<p class="text-gray-500 text-sm italic py-3">Sin tareas por ahora.</p>';
            return;
        }
        container.innerHTML = tasks.map(function(task) {
            const done = task.status === "completed";
            return '<div class="bg-white/5 border border-white/5 rounded-xl p-3 flex items-start justify-between gap-3"><div><p class="text-sm font-semibold text-white">' + escapeHtml(task.title || task.description || "Tarea") + '</p><p class="text-[10px] text-gray-500 mt-1">' + (done ? "Completada" : "Pendiente") + '</p></div><button data-task-id="' + task.id + '" data-current-status="' + (task.status || "pending") + '" class="btn-task-status text-[10px] px-3 py-1.5 rounded-lg ' + (done ? "bg-emerald-500/10 text-emerald-400" : "bg-clubCrema text-clubVerde") + ' font-bold shrink-0">' + (done ? "Hecha" : "Marcar") + '</button></div>';
        }).join("");
        document.querySelectorAll('.btn-task-status').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                const nextStatus = btn.dataset.currentStatus === 'completed' ? 'pending' : 'completed';
                await updateDoc(doc(db, 'patient_tasks', btn.dataset.taskId), { status: nextStatus, patientUpdatedAt: new Date().toISOString() });
            });
        });
    });
}

function loadPatientResources() {
    if (unsubscribeResources) unsubscribeResources();
    const container = document.getElementById('lista-recursos');
    if (!currentPatientId) return;
    const qResources = query(collection(db, "patient_resources"), where("patientId", "==", currentPatientId));
    unsubscribeResources = onSnapshot(qResources, function(snap) {
        const resources = snap.docs.map(function(d) { return { id: d.id, ...d.data() }; });
        if (!resources.length) {
            container.innerHTML = '<p class="text-gray-500 text-sm italic py-3">Sin recursos por ahora.</p>';
            return;
        }
        container.innerHTML = resources.map(function(resource) {
            const href = resource.dataUrl || resource.url || '#';
            return '<a href="' + href + '" target="_blank" class="block py-3 hover:bg-white/5 rounded-lg transition-colors"><p class="text-sm font-semibold text-clubCrema truncate">' + escapeHtml(resource.fileName || resource.title || "Recurso") + '</p><p class="text-[10px] text-gray-500">' + escapeHtml(resource.type || "Material compartido") + '</p></a>';
        }).join("");
    });
}

function setupPatientChat() {
    const status = document.getElementById('chat-status');
    const input = document.getElementById('chat-input-paciente');
    const send = document.getElementById('btn-send-chat-paciente');
    const body = document.getElementById('chat-messages');
    if (unsubscribeChat) unsubscribeChat();
    if (!currentPatientId || !currentPsychologistId) {
        status.innerText = 'Agenda una cita para habilitar mensajes con tu psicologa.';
        input.disabled = true;
        send.disabled = true;
        body.innerHTML = '<p class="text-gray-500 text-sm italic">Cuando tengas una psicologa asignada, podras escribirle aqui.</p>';
        return;
    }

    status.innerText = 'Conversacion con ' + currentPsychologistName;
    input.disabled = false;
    send.disabled = false;
    const chatId = getChatId(currentPsychologistId, currentPatientId);
    const qMessages = query(collection(db, "chats", chatId, "messages"));

    unsubscribeChat = onSnapshot(qMessages, function(snap) {
        const messages = snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }).sort(function(a,b) { return String(a.createdAt || '').localeCompare(String(b.createdAt || '')); });
        if (!messages.length) {
            body.innerHTML = '<p class="text-gray-500 text-sm italic">Aun no hay mensajes. Puedes iniciar la conversacion.</p>';
            return;
        }
        body.innerHTML = messages.map(function(m) {
            const isMe = m.senderId === currentPatientId;
            return '<div class="flex ' + (isMe ? 'justify-end' : 'justify-start') + '"><div class="max-w-[82%] rounded-2xl px-4 py-2 text-sm ' + (isMe ? 'bg-clubCrema text-clubVerde' : 'bg-white/10 text-white') + '"><p>' + escapeHtml(m.text) + '</p><p class="text-[9px] opacity-60 mt-1">' + (isMe ? 'Tu' : escapeHtml(currentPsychologistName)) + '</p></div></div>';
        }).join('');
        body.scrollTop = body.scrollHeight;
    });
}

const chatForm = document.getElementById('form-chat-paciente');
chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input-paciente');
    const text = input.value.trim();
    if (!text || !currentPatientId || !currentPsychologistId) return;
    const chatId = getChatId(currentPsychologistId, currentPatientId);
    await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentPatientId,
        text,
        createdAt: new Date().toISOString()
    });
    input.value = '';
});

auth.onAuthStateChanged(async function(user) {
    if (!user) return;
    currentPatientId = user.uid;
    const profile = await getUserProfile(user);
    const displayName = profile ? ((profile.firstName || "") + " " + (profile.lastName || "")).trim() : "";
    document.getElementById('patient-name').innerText = displayName || user.email || "Paciente";
    const initials = displayName.split(" ").slice(0,2).map(function(w) { return w[0]; }).join("").toUpperCase() || "US";
    document.getElementById('user-initials').innerText = initials;

    if (profile?.photoURL) {
        loadProfilePhoto(profile.photoURL, { avatarId: "user-photo", initialsId: "user-initials" });
    }

    initProfilePhoto({ avatarId:"user-photo", initialsId:"user-initials", inputId:"photo-input", btnId:"btn-change-photo", progressId:"upload-progress" });

    document.getElementById('btn-entrar-sesion').addEventListener('click', function() {
        const href = document.getElementById('btn-entrar-sesion').dataset.meetLink;
        if (href) window.open(href, "_blank");
        else alert("No tienes sesiones confirmadas con enlace de videollamada aun.");
    });

    const qAppointments = query(collection(db, "appointments"), where("patientId", "==", user.uid));
    onSnapshot(qAppointments, function(snapshot) {
        if (snapshot.empty) {
            renderEmptyDashboard();
            resolvePsychologist(profile, []);
            return;
        }
        const appointments = [];
        snapshot.forEach(function(d) { appointments.push({ id: d.id, ...d.data() }); });
        appointments.sort(function(a,b) { return ((a.dateISO || a.date || "") + " " + (a.time || "")).localeCompare((b.dateISO || b.date || "") + " " + (b.time || "")); });
        resolvePsychologist(profile, appointments);
        const completed = appointments.filter(function(c) { return c.status === "completada"; }).length;
        const upcoming = appointments.find(function(c) { return c.status === "confirmada"; }) || appointments[0];
        document.getElementById('completed-count').innerText = completed;
        document.getElementById('next-session-stat').innerText = upcoming ? (upcoming.date || upcoming.dateISO || "Fecha") + " " + (upcoming.time || "") : "Sin citas";
        document.getElementById('process-weeks').innerText = Math.max(1, appointments.length);
        if (upcoming) {
            const meetLink = getMeetLink(upcoming);
            document.getElementById('next-session-title').innerText = 'Sesion con ' + (upcoming.psychologistName || "tu psicologa");
            document.getElementById('next-session-details').innerText = (upcoming.date || upcoming.dateISO || "Fecha por confirmar") + ' - ' + (upcoming.time || "") + ' - ' + (upcoming.modality || "Videollamada");
            document.getElementById('btn-entrar-sesion').dataset.meetLink = meetLink || "";
        }
        document.getElementById('lista-citas').innerHTML = appointments.map(function(c) {
            const meetLink = getMeetLink(c);
            const meetBtn = meetLink ? '<a href="' + meetLink + '" target="_blank" class="text-[10px] font-bold text-clubCrema hover:underline">Meet</a>' : '';
            return '<div class="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-xl"><div class="flex items-center gap-3"><span class="text-xs font-mono font-bold text-clubCrema bg-clubVerde px-2.5 py-1.5 rounded-md">' + escapeHtml(c.time || '--') + '</span><div><h5 class="text-sm font-semibold">' + escapeHtml(c.psychologistName || 'Sesion de consulta') + '</h5><p class="text-[11px] text-gray-400">' + escapeHtml(c.date || c.dateISO || '') + ' - ' + escapeHtml(c.paymentMethod?.toUpperCase() || 'Pagado') + '</p></div></div><div class="flex flex-col items-end gap-1"><span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">' + escapeHtml(c.status || 'confirmada') + '</span>' + meetBtn + '</div></div>';
        }).join('');
    });
});

document.getElementById('btn-logout').addEventListener('click', async function() {
    if (!confirmAction("Cerrar sesion en El Club?")) return;
    if (unsubscribeChat) unsubscribeChat();
    if (unsubscribeTasks) unsubscribeTasks();
    if (unsubscribeResources) unsubscribeResources();
    await signOut(auth);
    window.location.href = "auth.html";
});

document.getElementById('current-date').innerText = formatSpanishDate(new Date());
