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
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. LLAVED DE CONEXIÓN (Reemplaza estos datos con los de tu consola de Firebase)
 const firebaseConfig = {
    apiKey: "AIzaSyD8xFD7aZagMG7EQx62eQP_dd9nnxi6KuU",
    authDomain: "el-club-5821a.firebaseapp.com",
    projectId: "el-club-5821a",
    storageBucket: "el-club-5821a.firebasestorage.app",
    messagingSenderId: "1013119725626",
    appId: "1:1013119725626:web:59666200dd8e7f7ac24503"
  };

// 3. Encendemos los motores de Firebase con tus datos
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
 * 4. GUARDIÁN DE SEGURIDAD:
 * Esta función revisa si el usuario que entró tiene permiso de ver la pantalla.
 * Si un paciente intenta entrar al panel de administración, el guardián lo saca.
 */
function checkAuth(roleRequired) {
    onAuthStateChanged(auth, async (user) => {
        // Si no ha iniciado sesión, mándalo a la pantalla de entrada (auth.html)
        if (!user) {
            window.location.href = "auth.html";
        } else {
            // Si inició sesión, buscamos en la base de datos qué rol tiene.
            const userData = await getUserProfile(user);

            if (userData) {
                // Si su rol no coincide con el que requiere la pantalla, lo redirigimos a donde le corresponde
                if (userData.role !== roleRequired) {
                    alert("Acceso denegado: No tienes los permisos para ver esta sección.");
                    window.location.href = getRoleDestination(userData.role);
                }
            } else {
                window.location.href = "auth.html";
            }
        }
    });
}

// 5. Exportamos todo para que las demás pantallas puedan usarlo
export { 
    auth, db, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail,
    doc, setDoc, getDoc, getDocs, collection, addDoc, query, where, onSnapshot, updateDoc, deleteDoc,
    checkAuth, getUserProfile, getRoleDestination
};
