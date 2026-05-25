// 1. Traemos las herramientas de Firebase desde internet
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. LLAVES DE CONEXIÃ“N â€” reemplaza con las de tu consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD8xFD7aZagMG7EQx62eQP_dd9nnxi6KuU",
    authDomain: "el-club-5821a.firebaseapp.com",
    projectId: "el-club-5821a",
    storageBucket: "el-club-5821a.firebasestorage.app",
    messagingSenderId: "1013119725626",
    appId: "1:1013119725626:web:59666200dd8e7f7ac24503"
};

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getRoleDestination(role) {
    if (role === "psicologa") return "dashboard-psicologa.html";
    if (role === "admin") return "admin.html";
    return "dashboard-paciente.html";
}

async function getUserProfile(user) {
    if (!user) return null;
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
        id: user.uid,
        email: user.email,
        ...data,
        role: data.role || data.rol || "paciente"
    };
}

/**
 * GUARDIÃN DE SEGURIDAD:
 * Verifica que el usuario tenga el rol requerido para ver la pantalla.
 */
function checkAuth(roleRequired) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "auth.html";
        } else {
            const userData = await getUserProfile(user);
            if (userData) {
                if (userData.role !== roleRequired) {
                    alert("Acceso denegado: No tienes los permisos para ver esta secciÃ³n.");
                    window.location.href = getRoleDestination(userData.role);
                }
            } else {
                window.location.href = "auth.html";
            }
        }
    });
}

// 4. Exportar todo â€” incluyendo `app` para Firebase Storage
export { 
    app,
    auth, db, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
    doc, setDoc, getDoc, getDocs, collection, addDoc, query, where, onSnapshot, updateDoc, deleteDoc, serverTimestamp,
    checkAuth, getUserProfile, getRoleDestination
};
