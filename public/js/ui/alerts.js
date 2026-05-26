export function toast(message) {
    alert(message);
}

export function alertError(message) {
    console.error(message);
    alert(message);
}

export function confirmAction(message) {
    return confirm(message);
}
