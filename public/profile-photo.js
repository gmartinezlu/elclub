/**
 * EL CLUB — Módulo de foto de perfil
 * Importa este script en dashboard-paciente.html y dashboard-psicologa.html
 * Requiere: Firebase Storage habilitado en el proyecto
 */

import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

import { app, auth, db, doc, updateDoc } from "./js/firebase/index.js";

const storage = getStorage(app);

/**
 * Inicializa el componente de foto de perfil.
 * @param {string} avatarId     - id del elemento <img> o <div> del avatar
 * @param {string} initialsId   - id del <span> con las iniciales
 * @param {string} inputId      - id del <input type="file"> oculto
 * @param {string} btnId        - id del botón que activa el file picker
 * @param {string} progressId   - id de la barra de progreso (opcional)
 */
export function initProfilePhoto({ avatarId, initialsId, inputId, btnId, progressId }) {

    const avatarEl    = document.getElementById(avatarId);
    const initialsEl  = document.getElementById(initialsId);
    const inputEl     = document.getElementById(inputId);
    const btnEl       = document.getElementById(btnId);
    const progressEl  = progressId ? document.getElementById(progressId) : null;

    if (!inputEl || !btnEl) return;

    // Abrir selector de archivo al hacer clic en el botón o el avatar
    btnEl.addEventListener("click", () => inputEl.click());
    if (avatarEl) avatarEl.addEventListener("click", () => inputEl.click());

    inputEl.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo y tamaño (máx 5MB)
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            alert("Solo se permiten imágenes JPG, PNG o WebP.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("La imagen no puede superar 5MB.");
            return;
        }

        const user = auth.currentUser;
        if (!user) { alert("Debes estar autenticado."); return; }

        // Comprimir imagen antes de subir
        const compressed = await compressImage(file, 400);

        // Subir a Firebase Storage
        const storageRef = ref(storage, `profile-photos/${user.uid}.jpg`);
        const uploadTask = uploadBytesResumable(storageRef, compressed);

        btnEl.disabled = true;
        btnEl.innerText = "Subiendo...";

        uploadTask.on("state_changed",
            (snapshot) => {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                if (progressEl) {
                    progressEl.style.width = pct + "%";
                    progressEl.classList.remove("hidden");
                }
                btnEl.innerText = `Subiendo ${pct}%...`;
            },
            (error) => {
                console.error("Error subiendo foto:", error);
                alert("Error al subir la imagen. Intenta de nuevo.");
                btnEl.disabled = false;
                btnEl.innerText = "Cambiar foto";
                if (progressEl) progressEl.classList.add("hidden");
            },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);

                // Guardar URL en Firestore
                await updateDoc(doc(db, "users", user.uid), { photoURL: url });

                // Actualizar UI
                if (avatarEl && avatarEl.tagName === "IMG") {
                    avatarEl.src = url;
                    avatarEl.classList.remove("hidden");
                    if (initialsEl) initialsEl.classList.add("hidden");
                } else if (avatarEl) {
                    // Es un div contenedor — insertar img dentro
                    avatarEl.style.backgroundImage = `url(${url})`;
                    avatarEl.style.backgroundSize = "cover";
                    avatarEl.style.backgroundPosition = "center";
                    if (initialsEl) initialsEl.classList.add("hidden");
                }

                btnEl.disabled = false;
                btnEl.innerText = "Cambiar foto";
                if (progressEl) {
                    progressEl.style.width = "100%";
                    setTimeout(() => progressEl.classList.add("hidden"), 1000);
                }
            }
        );
    });
}

/**
 * Carga la foto existente de un usuario en el UI.
 * Llama esto al cargar el dashboard con el perfil del usuario.
 */
export function loadProfilePhoto(photoURL, { avatarId, initialsId }) {
    if (!photoURL) return;
    const avatarEl   = document.getElementById(avatarId);
    const initialsEl = document.getElementById(initialsId);
    if (!avatarEl) return;

    if (avatarEl.tagName === "IMG") {
        avatarEl.src = photoURL;
        avatarEl.classList.remove("hidden");
        if (initialsEl) initialsEl.classList.add("hidden");
    } else {
        avatarEl.style.backgroundImage = `url(${photoURL})`;
        avatarEl.style.backgroundSize = "cover";
        avatarEl.style.backgroundPosition = "center";
        if (initialsEl) initialsEl.classList.add("hidden");
    }
}

/**
 * Comprime una imagen antes de subir usando canvas.
 * @param {File} file       - archivo original
 * @param {number} maxSize  - tamaño máximo en px (ancho y alto)
 * @returns {Promise<Blob>}
 */
function compressImage(file, maxSize = 400) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement("canvas");
            let w = img.width, h = img.height;
            if (w > maxSize || h > maxSize) {
                if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                else       { w = Math.round(w * maxSize / h); h = maxSize; }
            }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(resolve, "image/jpeg", 0.85);
        };
        img.src = url;
    });
}