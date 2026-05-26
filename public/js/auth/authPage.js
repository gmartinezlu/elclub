import { loginWithEmail, registerPatient, sendPasswordReset, getDestination } from "./authService.js";
import { qs } from "../utils/dom.js";
import { toast, alertError } from "../ui/alerts.js";
import { db, setDoc, doc, getUserProfile } from "../firebase/index.js";

const formLogin = qs('#form-login');
const formRegister = qs('#form-register');
const tabLogin = qs('#tab-login');
const tabRegister = qs('#tab-register');
const btnReset = qs('#btn-reset-password');

function switchTab(tab) {
    if (tab === 'login') {
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        tabLogin.className = "w-1/2 py-4 text-center border-b-2 border-clubCrema text-clubCrema transition-all duration-300";
        tabRegister.className = "w-1/2 py-4 text-center border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-all duration-300";
    } else {
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
        tabLogin.className = "w-1/2 py-4 text-center border-b-2 border-transparent text-gray-400 hover:text-gray-200 transition-all duration-300";
        tabRegister.className = "w-1/2 py-4 text-center border-b-2 border-clubCrema text-clubCrema transition-all duration-300";
    }
}

function goAfterLogin(profile) {
    const params = new URLSearchParams(window.location.search);
    const nextUrl = params.get('next');
    if (nextUrl && profile.role === 'paciente') {
        window.location.href = nextUrl;
        return;
    }
    window.location.href = getDestination(profile.role);
}

formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = formRegister.querySelectorAll('input');
    const name = inputs[0].value.trim();
    const lastname = inputs[1].value.trim();
    const email = inputs[2].value.trim();
    const password = inputs[3].value;

    try {
        const user = await registerPatient({ email, password });
        await setDoc(doc(db, 'users', user.uid), {
            firstName: name,
            lastName: lastname,
            email,
            role: 'paciente',
            rol: 'paciente',
            createdAt: new Date().toISOString()
        });
        toast('¡Cuenta creada con éxito!');
        goAfterLogin({ role: 'paciente' });
    } catch (error) {
        alertError('Error al crear la cuenta: ' + error.message);
    }
});

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = formLogin.querySelector('input[type="email"]').value.trim();
    const password = formLogin.querySelector('input[type="password"]').value;
    const remember = formLogin.querySelector('input[name="remember"]').checked;

    try {
        const userCredential = await loginWithEmail(email, password, remember);
        const profile = await getUserProfile(userCredential.user);
        if (!profile) {
            alertError('Tu usuario existe, pero falta el perfil en la base de datos. Contacta a administración.');
            return;
        }
        toast('Sesión iniciada correctamente.');
        goAfterLogin(profile);
    } catch (error) {
        alertError('Credenciales inválidas o error de conexión. ' + error.message);
    }
});

btnReset.addEventListener('click', async () => {
    const email = formLogin.querySelector('input[type="email"]').value.trim();
    if (!email) {
        alertError('Escribe tu correo electrónico para enviarte la recuperación.');
        return;
    }
    try {
        await sendPasswordReset(email);
        toast('Te enviamos un correo para restablecer tu contraseña.');
    } catch (error) {
        alertError('No pudimos enviar el correo. Revisa el email e intenta de nuevo. ' + error.message);
    }
});

window.switchTab = switchTab;

if (new URLSearchParams(window.location.search).get('tab') === 'register') {
    switchTab('register');
}
