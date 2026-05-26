export function qs(selector, parent = document) {
    return parent.querySelector(selector);
}

export function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
}

export function setText(selector, value, parent = document) {
    const element = qs(selector, parent);
    if (element) element.textContent = value;
    return element;
}

export function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (char) => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[char];
    });
}
