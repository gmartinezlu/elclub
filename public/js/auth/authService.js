import {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    getUserProfile,
    getRoleDestination
} from "../firebase/index.js";

export async function loginWithEmail(email, password, remember) {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
}

export async function registerPatient(payload) {
    const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    return userCredential.user;
}

export async function registerPsychologist(payload) {
    const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    return userCredential.user;
}

export async function sendPasswordReset(email) {
    return sendPasswordResetEmail(auth, email);
}

export async function logout() {
    return signOut(auth);
}

export async function getProfile(user) {
    return getUserProfile(user);
}

export function getDestination(role) {
    return getRoleDestination(role);
}
