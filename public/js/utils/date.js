export function formatSpanishDate(date) {
    return new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function formatDateShort(date) {
    return new Date(date).toLocaleDateString('es-ES');
}
