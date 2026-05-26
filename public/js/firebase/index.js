// Firebase configuration and shared services
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
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

const firebaseConfig = {
    apiKey: "AIzaSyD8xFD7aZagMG7EQx62eQP_dd9nnxi6KuU",
    authDomain: "el-club-5821a.firebaseapp.com",
    projectId: "el-club-5821a",
    storageBucket: "el-club-5821a.firebasestorage.app",
    messagingSenderId: "1013119725626",
    appId: "1:1013119725626:web:59666200dd8e7f7ac24503"
};

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

function checkAuth(roleRequired) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "auth.html";
            return;
        }
        const userData = await getUserProfile(user);
        if (!userData) {
            window.location.href = "auth.html";
            return;
        }
        if (roleRequired && userData.role !== roleRequired) {
            alert("Acceso denegado: No tienes los permisos para ver esta sección.");
            window.location.href = getRoleDestination(userData.role);
        }
    });
}

export {
    app,
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
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
    serverTimestamp,
    getRoleDestination,
    getUserProfile,
    checkAuth
};
