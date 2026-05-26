import { loginWithEmail, sendPasswordReset } from "./authService.js";
import { auth, getUserProfile } from "../firebase/index.js";
import { qs } from "../utils/dom.js";
import { toast, alertError } from "../ui/alerts.js";

const form = qs('#form-login-psicologa');
const resetButton = qs('#btn-reset-password');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;
    const remember = form.remember?.checked;

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Validando acceso...";

        const userCredential = await loginWithEmail(email, password, remember);
        const profile = await getUserProfile(userCredential.user);

        if (!profile || profile.role !== "psicologa") {
            if (userCredential?.user) await auth.signOut();
            alert("Este acceso es solo para psicólogas registradas. Si eres paciente, entra desde el acceso de pacientes.");
            window.location.href = "auth.html";
            return;
        }

        window.location.href = "dashboard-psicologa.html";
    } catch (error) {
        alertError("No pudimos iniciar sesión. Revisa tus credenciales e intenta de nuevo. " + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Entrar al panel profesional";
    }
});

resetButton.addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!email) {
        alertError("Escribe tu correo profesional para enviarte la recuperación.");
        return;
    }

    try {
        await sendPasswordReset(email);
        toast("Te enviamos un correo para restablecer tu contraseña.");
    } catch (error) {
        alertError("No pudimos enviar el correo. Revisa el email e intenta de nuevo. " + error.message);
    }
});
