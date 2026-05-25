async function fetchJson(path, options = {}) {
    const res = await fetch(path, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error en ${path}`);
    return data;
}

export async function getGoogleCalendarAuthUrl(idToken) {
    const data = await fetchJson("/google-calendar/auth-url", {
        headers: {
            Authorization: `Bearer ${idToken}`
        }
    });
    return data.authUrl;
}

export async function createGoogleCalendarEvent(booking, idToken) {
    const data = await fetchJson("/google-calendar/create-event", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(booking)
    });
    return data;
}

export async function disconnectGoogleCalendar(idToken) {
    return fetchJson("/google-calendar/disconnect", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${idToken}`
        }
    });
}

export function getGoogleMeetLinkFromEvent(event) {
    return event.hangoutLink || event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || null;
}

export function isGoogleCalendarConnected(profile) {
    return !!profile?.googleCalendarConnected;
}
