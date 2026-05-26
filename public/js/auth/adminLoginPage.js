import { loginWithEmail, sendPasswordReset } from "./authService.js";
import { auth, getUserProfile } from "../firebase/index.js";
import { qs } from "../utils/dom.js";
import { toast, alertError } from "../ui/alerts.js";

const form = qs('#form-login-admin');
const resetButton = qs('#btn-reset-password');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Validando permisos...";

        const userCredential = await loginWithEmail(email, password, true);
        const profile = await getUserProfile(userCredential.user);

        if (!profile || profile.role !== "admin") {
            if (userCredential?.user) await auth.signOut();
            alert("Este acceso es solo para administración. Tu cuenta no tiene permisos admin.");
            window.location.href = "auth.html";
            return;
        }

        window.location.href = "admin.html";
    } catch (error) {
        alertError("No pudimos iniciar sesión. Revisa tus credenciales e intenta de nuevo. " + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Entrar a la consola admin";
    }
});

resetButton.addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) {
        alertError("Escribe el correo admin para enviarte la recuperación.");
        return;
    }

    try {
        await sendPasswordReset(email);
        toast("Te enviamos un correo para restablecer tu contraseña.");
    } catch (error) {
        alertError("No pudimos enviar el correo. Revisa el email e intenta de nuevo. " + error.message);
    }
});
