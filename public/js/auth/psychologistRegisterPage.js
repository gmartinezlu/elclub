import { registerPsychologist } from "./authService.js";
import { qs } from "../utils/dom.js";
import { toast, alertError } from "../ui/alerts.js";
import { db, setDoc, doc } from "../firebase/index.js";

const form = qs('#form-psicologa');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());

    try {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando postulación...";

        const user = await registerPsychologist({ email: data.email, password: data.password });
        const areas = data.areas.split(',').map(item => item.trim()).filter(Boolean);

        await setDoc(doc(db, 'users', user.uid), {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            city: data.city,
            role: "psicologa",
            rol: "psicologa",
            degree: data.degree,
            license: data.license,
            university: data.university,
            experienceYears: Number(data.experienceYears || 0),
            experience: `${Number(data.experienceYears || 0)} años de experiencia`,
            specialty: data.specialty,
            profession: data.degree,
            areas,
            price: Number(data.price || 80000),
            bio: data.bio,
            available: false,
            applicationStatus: "pending",
            verificationStatus: "pending",
            createdAt: new Date().toISOString()
        });

        toast("Tu postulación fue enviada. Tu perfil queda pendiente de revisión antes de aparecer en el catálogo.");
        window.location.href = "dashboard-psicologa.html";
    } catch (error) {
        alertError("No pudimos enviar la postulación: " + error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar postulación profesional";
    }
});
