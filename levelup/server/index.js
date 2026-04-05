import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Resend } from "resend";
import crypto from "crypto";
import admin from "firebase-admin";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getCareerGuidanceEngineStatus,
  runCareerGuidanceChat,
} from "./careerGuidance.js";
import {
  getResumeAnalyzerEngineStatus,
  runResumeAnalyzer,
  runResumeAnalyzerChat,
} from "./resumeAnalyzer.js";
import {
  getDocumentSummarizerEngineStatus,
  runDocumentSummarizer,
} from "./documentSummarizer.js";
import {
  getVideoSummarizerEngineStatus,
  runVideoSummarizer,
} from "./videoSummarizer.js";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const app = express();
const PORT = process.env.PORT || 5050;
const resendKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const databaseUrl = process.env.FIREBASE_DATABASE_URL;
const resend = resendKey ? new Resend(resendKey) : null;

const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

const getServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
    try {
      const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
      const fileContents = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileContents);
    } catch (error) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_FILE:", error);
      return null;
    }
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try {
    const decoded = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT:", error);
    return null;
  }
};

const ensureAdmin = () => {
  if (admin.apps.length) return;
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(databaseUrl ? { databaseURL: databaseUrl } : {}),
  });
};

const createOtp = () => crypto.randomInt(100000, 999999).toString();

const getBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return "";
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

app.post("/otp/request", async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  if (!resendKey) {
    return res.status(500).json({ error: "RESEND_API_KEY is missing." });
  }
  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to validate accounts.",
    });
  }

  try {
    await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        error: "No password account found. If you signed up with Google, please continue with Google.",
      });
    }
    console.error("Account lookup error:", error);
    return res.status(500).json({
      error: `Failed to validate account: ${error.message || "Unknown error"}`,
    });
  }

  const code = createOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;
  otpStore.set(email.toLowerCase(), { code, expiresAt, verified: false });
  console.log(`OTP for ${email.toLowerCase()}: ${code}`);

  try {
    await resend.emails.send({
      from: resendFrom,
      to: email,
      subject: "Your LevelUp OTP",
      html: `<p>Your OTP is <strong>${code}</strong>. It expires in 5 minutes.</p>`,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Resend error:", error);
    res.status(500).json({ error: "Failed to send OTP." });
  }
});

app.post("/otp/verify", (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required." });
  }
  const record = otpStore.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: "OTP not found." });
  }
  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "OTP expired." });
  }
  if (record.code !== code) {
    return res.status(400).json({ error: "Invalid OTP." });
  }
  record.verified = true;
  otpStore.set(email.toLowerCase(), record);
  res.json({ ok: true });
});

app.post("/otp/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and newPassword are required." });
  }

  const record = otpStore.get(email.toLowerCase());
  if (!record || record.code !== code || !record.verified) {
    return res.status(400).json({ error: "OTP not verified." });
  }
  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "OTP expired." });
  }

  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to reset password.",
    });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    otpStore.delete(email.toLowerCase());
    res.json({ ok: true });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      error: `Failed to reset password: ${error.message || "Unknown error"}`,
    });
  }
});

app.post("/resend/domain", async (req, res) => {
  const { name, customReturnPath } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Domain name is required." });
  }
  if (!resendKey) {
    return res.status(500).json({ error: "RESEND_API_KEY is missing." });
  }
  try {
    const result = await resend.domains.create({
      name,
      ...(customReturnPath ? { customReturnPath } : {}),
    });
    res.json(result);
  } catch (error) {
    console.error("Resend domain create error:", error);
    res.status(500).json({ error: error.message || "Failed to create domain." });
  }
});

app.post("/career-guidance/chat", async (req, res) => {
  const token = getBearerToken(req.headers.authorization || "");
  const { message, chatId = "", createNewChat = false } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: "Authorization token is required." });
  }

  if (!String(message || "").trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to use career guidance.",
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const snapshot = await admin.database().ref(`users/${decodedToken.uid}`).once("value");
    const profile = snapshot.exists() ? snapshot.val() : {};
    const result = await runCareerGuidanceChat({
      uid: decodedToken.uid,
      profile,
      message,
      requestedChatId: chatId,
      createNewChat: Boolean(createNewChat),
    });

    res.json({
      ok: true,
      engine: getCareerGuidanceEngineStatus(),
      ...result,
    });
  } catch (error) {
    const statusCode =
      error?.code === "auth/id-token-expired" || error?.code === "auth/argument-error"
        ? 401
        : 500;

    console.error("Career guidance error:", error);
    res.status(statusCode).json({
      error: error?.message || "Career guidance request failed.",
      engine: getCareerGuidanceEngineStatus(),
    });
  }
});

app.post("/resume-analyzer/analyze", async (req, res) => {
  const token = getBearerToken(req.headers.authorization || "");
  const { resumeText, jobDescription = "", fileName = "Resume" } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: "Authorization token is required." });
  }

  if (!String(resumeText || "").trim()) {
    return res.status(400).json({ error: "Resume text is required." });
  }

  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to use the Gemini resume analyzer.",
    });
  }

  try {
    await admin.auth().verifyIdToken(token);
    const result = await runResumeAnalyzer({
      resumeText,
      jobDescription,
      fileName,
    });

    res.json({
      ok: true,
      engine: getResumeAnalyzerEngineStatus(),
      ...result,
    });
  } catch (error) {
    const statusCode =
      error?.code === "auth/id-token-expired" || error?.code === "auth/argument-error"
        ? 401
        : 500;

    console.error("Resume analyzer error:", error);
    res.status(statusCode).json({
      error: error?.message || "Resume analyzer request failed.",
      engine: getResumeAnalyzerEngineStatus(),
    });
  }
});

app.post("/resume-analyzer/chat", async (req, res) => {
  const token = getBearerToken(req.headers.authorization || "");
  const { analysis, question, context = {}, history = [] } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: "Authorization token is required." });
  }

  if (!String(question || "").trim()) {
    return res.status(400).json({ error: "Question is required." });
  }

  if (!analysis || typeof analysis !== "object") {
    return res.status(400).json({ error: "Analysis context is required." });
  }

  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to use Gemini resume chat.",
    });
  }

  try {
    await admin.auth().verifyIdToken(token);
    const result = await runResumeAnalyzerChat({
      analysis,
      question,
      context,
      history,
    });

    res.json({
      ok: true,
      engine: getResumeAnalyzerEngineStatus(),
      ...result,
    });
  } catch (error) {
    const statusCode =
      error?.code === "auth/id-token-expired" || error?.code === "auth/argument-error"
        ? 401
        : 500;

    console.error("Resume analyzer chat error:", error);
    res.status(statusCode).json({
      error: error?.message || "Resume analyzer chat request failed.",
      engine: getResumeAnalyzerEngineStatus(),
    });
  }
});

app.post("/document-summarizer/summarize", async (req, res) => {
  const token = getBearerToken(req.headers.authorization || "");
  const { documentText, fileName = "Document" } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: "Authorization token is required." });
  }

  if (!String(documentText || "").trim()) {
    return res.status(400).json({ error: "Document text is required." });
  }

  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to use the Gemini document summarizer.",
    });
  }

  try {
    await admin.auth().verifyIdToken(token);
    const result = await runDocumentSummarizer({
      documentText,
      fileName,
    });

    res.json({
      ok: true,
      engine: getDocumentSummarizerEngineStatus(),
      ...result,
    });
  } catch (error) {
    const statusCode =
      error?.code === "auth/id-token-expired" || error?.code === "auth/argument-error"
        ? 401
        : 500;

    console.error("Document summarizer error:", error);
    res.status(statusCode).json({
      error: error?.message || "Document summarizer request failed.",
      engine: getDocumentSummarizerEngineStatus(),
    });
  }
});

app.post("/video-brief/summarize", async (req, res) => {
  const token = getBearerToken(req.headers.authorization || "");
  const { videoUrl } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: "Authorization token is required." });
  }

  if (!String(videoUrl || "").trim()) {
    return res.status(400).json({ error: "Video URL is required." });
  }

  ensureAdmin();
  if (!admin.apps.length) {
    return res.status(501).json({
      error: "FIREBASE_SERVICE_ACCOUNT missing. Configure Admin SDK to use the Gemini video brief feature.",
    });
  }

  try {
    await admin.auth().verifyIdToken(token);
    const result = await runVideoSummarizer({
      videoUrl,
    });

    res.json({
      ok: true,
      engine: getVideoSummarizerEngineStatus(),
      ...result,
    });
  } catch (error) {
    const statusCode =
      error?.code === "auth/id-token-expired" || error?.code === "auth/argument-error"
        ? 401
        : 500;

    console.error("Video brief error:", error);
    res.status(statusCode).json({
      error: error?.message || "Video brief request failed.",
      engine: getVideoSummarizerEngineStatus(),
    });
  }
});

app.listen(PORT, () => {
  if (!resendKey) {
    console.warn("RESEND_API_KEY is missing. Email endpoints will return 500 until it is configured.");
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is missing. Career guidance and resume analyzer will use fallback logic.");
  }
  console.log(`OTP server running on http://localhost:${PORT}`);
});
