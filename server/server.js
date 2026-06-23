import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // behind Render's proxy — needed for rate-limit IPs
app.use(express.json({ limit: "16kb" }));

// ---------------------------------------------------------------------------
// CORS — allow TV Signal Solutions domains + local dev.
// Override with ALLOWED_ORIGINS env var (comma-separated) if needed.
// ---------------------------------------------------------------------------
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "https://tvsignalsolutions.co.nz,https://www.tvsignalsolutions.co.nz,http://localhost:3000,http://localhost:5500"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl / health checks (no Origin header)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // also allow GitHub Pages previews
      if (/\.github\.io$/.test(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["POST", "GET", "OPTIONS"],
  })
);

// ---------------------------------------------------------------------------
// Rate limiting — protect the inbox from spam/abuse.
// ---------------------------------------------------------------------------
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many messages. Please try again later." },
});

// ---------------------------------------------------------------------------
// Mail transport (SMTP). Configure via environment variables — see .env.example.
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const isEmail   = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const escHtml   = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ ok: true, status: "up" }));
app.get("/",       (_req, res) => res.json({ ok: true, service: "tvss-contact-backend" }));

// ---------------------------------------------------------------------------
// Contact endpoint
// ---------------------------------------------------------------------------
app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, phone, service, message, honeypot } = req.body || {};

    // Honeypot: real users never fill this hidden field
    if (honeypot) return res.json({ ok: true, message: "Message sent." });

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, message: "Please fill in your name, email, and message." });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Please enter a valid email address." });
    }
    if (String(message).length > 5000) {
      return res.status(400).json({ ok: false, message: "Message is too long." });
    }

    const rows = [
      ["Name",    name],
      ["Email",   email],
      ...(phone   ? [["Phone",   phone]]   : []),
      ...(service ? [["Service", service]] : []),
      ["Message", message],
    ];

    const textBody = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
    const htmlRows = rows
      .map(([k, v]) => `
        <tr>
          <td style="padding:8px 12px;background:#f4f8fb;font-weight:600;white-space:nowrap;color:#1a3a5c;border-bottom:1px solid #dde6ef;">${escHtml(k)}</td>
          <td style="padding:8px 12px;color:#222;border-bottom:1px solid #dde6ef;">${escHtml(v).replace(/\n/g, "<br>")}</td>
        </tr>`)
      .join("");

    await transporter.sendMail({
      from:    `"TV Signal Solutions Website" <${process.env.SMTP_USER}>`,
      to:      process.env.CONTACT_TO || process.env.SMTP_USER,
      replyTo: `"${name}" <${email}>`,
      subject: `New enquiry from ${name} — TV Signal Solutions`,
      text:    textBody,
      html: `
        <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1b2330;max-width:560px;margin:0 auto;">
          <div style="background:#0a3d6b;padding:20px 24px;border-radius:8px 8px 0 0;">
            <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.5px;">TV Signal Solutions</span>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #dde6ef;border-top:none;border-radius:0 0 8px 8px;">
            ${htmlRows}
          </table>
          <p style="font-size:12px;color:#999;margin-top:16px;text-align:center;">
            Sent from tvsignalsolutions.co.nz
          </p>
        </div>`,
    });

    return res.json({ ok: true, message: "Message sent." });
  } catch (err) {
    console.error("Contact send failed:", err);
    return res.status(500).json({ ok: false, message: "Failed to send message. Please try again." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`TVSS contact backend listening on :${port}`));
