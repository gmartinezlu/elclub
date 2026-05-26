const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const runtimeConfig = functions.config();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || runtimeConfig.google?.client_id;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || runtimeConfig.google?.client_secret;
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || runtimeConfig.app?.url || "https://el-club-5821a.web.app").replace(/\/$/, "");
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || runtimeConfig.google?.redirect_uri || `${PUBLIC_APP_URL}/google-calendar/oauth2callback`;
const DEFAULT_SCOPE = ["https://www.googleapis.com/auth/calendar.events"];

function getOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Google OAuth client credentials are not configured.");
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

async function verifyFirebaseIdToken(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: "Falta el token de Firebase." });

    req.user = await admin.auth().verifyIdToken(match[1]);
    return next();
  } catch (error) {
    console.error("verifyFirebaseIdToken error", error);
    return res.status(401).json({ error: "Token Firebase invalido." });
  }
}

function getMeetingLink(event) {
  return event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri || null;
}

app.get("/auth-url", verifyFirebaseIdToken, async (req, res) => {
  try {
    const stateRef = db.collection("googleOAuthStates").doc();
    await stateRef.set({
      uid: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000)
    });

    const authUrl = getOAuth2Client().generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: DEFAULT_SCOPE,
      state: stateRef.id
    });

    return res.json({ authUrl });
  } catch (error) {
    console.error("auth-url error", error);
    return res.status(500).json({ error: error.message || "No se pudo crear la URL de autorizacion." });
  }
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${PUBLIC_APP_URL}/dashboard-psicologa.html?google=error`);
    }

    const stateRef = db.collection("googleOAuthStates").doc(String(state));
    const stateSnap = await stateRef.get();
    const stateData = stateSnap.exists ? stateSnap.data() : null;
    const uid = stateData?.uid;

    if (!uid || stateData.expiresAt?.toMillis?.() < Date.now()) {
      return res.redirect(`${PUBLIC_APP_URL}/dashboard-psicologa.html?google=error`);
    }

    const tokenResponse = await getOAuth2Client().getToken(String(code));
    const tokens = tokenResponse.tokens;
    if (!tokens?.refresh_token) {
      throw new Error("Google no entrego refresh token. Intenta vincular de nuevo aceptando los permisos.");
    }

    await db.collection("googleCalendarTokens").doc(uid).set({
      tokens,
      connected: true,
      scopes: DEFAULT_SCOPE,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection("users").doc(uid).set({
      googleCalendarConnected: true,
      googleCalendarLastConnectedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await stateRef.delete();
    return res.redirect(`${PUBLIC_APP_URL}/dashboard-psicologa.html?google=success`);
  } catch (error) {
    console.error("oauth2callback error", error);
    return res.redirect(`${PUBLIC_APP_URL}/dashboard-psicologa.html?google=error`);
  }
});

app.post("/disconnect", verifyFirebaseIdToken, async (req, res) => {
  try {
    const tokenRef = db.collection("googleCalendarTokens").doc(req.user.uid);
    const tokenSnap = await tokenRef.get();
    const refreshToken = tokenSnap.data()?.tokens?.refresh_token;

    if (refreshToken) {
      await getOAuth2Client().revokeToken(refreshToken).catch((error) => {
        console.warn("No se pudo revocar el token en Google:", error.message);
      });
    }

    await tokenRef.delete();
    await db.collection("users").doc(req.user.uid).set({
      googleCalendarConnected: false,
      googleCalendarDisconnectedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.json({ ok: true });
  } catch (error) {
    console.error("disconnect error", error);
    return res.status(500).json({ error: error.message || "No se pudo desvincular Google Calendar." });
  }
});

app.post("/create-event", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { psychologistId, patientName, patientEmail, dateISO, time, durationMinutes = 60 } = req.body;
    if (!psychologistId || !patientName || !patientEmail || !dateISO || !time) {
      return res.status(400).json({ error: "Faltan datos necesarios para crear el evento." });
    }

    const tokenSnap = await db.collection("googleCalendarTokens").doc(psychologistId).get();
    const legacyUserSnap = await db.collection("users").doc(psychologistId).get();
    const tokens = tokenSnap.data()?.tokens || legacyUserSnap.data()?.googleTokens;
    if (!tokens?.refresh_token) {
      return res.status(400).json({ error: "La psicologa no tiene Google Calendar vinculado." });
    }

    const authClient = getOAuth2Client();
    authClient.setCredentials(tokens);

    const [hours, minutes] = String(time).split(":").map(Number);
    const start = new Date(`${dateISO}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00-05:00`);
    const end = new Date(start.getTime() + Number(durationMinutes) * 60000);

    const calendar = google.calendar({ version: "v3", auth: authClient });
    const eventResponse = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: `Consulta El Club - ${patientName}`,
        description: `Sesion por Google Meet con ${patientName} (${patientEmail}).`,
        start: { dateTime: start.toISOString(), timeZone: "America/Bogota" },
        end: { dateTime: end.toISOString(), timeZone: "America/Bogota" },
        attendees: [{ email: patientEmail }],
        conferenceData: {
          createRequest: {
            requestId: `elclub-${psychologistId}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      }
    });

    await db.collection("googleCalendarTokens").doc(psychologistId).set({
      tokens: { ...tokens, ...authClient.credentials },
      connected: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.json({
      event: eventResponse.data,
      meetLink: getMeetingLink(eventResponse.data)
    });
  } catch (error) {
    console.error("create-event error", error);
    return res.status(500).json({ error: error.message || "No se pudo crear el evento." });
  }
});

exports["google-calendar"] = functions.https.onRequest(app);

