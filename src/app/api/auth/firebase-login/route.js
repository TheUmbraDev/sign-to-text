import { NextResponse } from "next/server";
// Force Node.js runtime (firebase-admin not supported on Edge runtime)
export const runtime = "nodejs";
import clientPromise from "../../../../lib/mongodb";
import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Helper to ensure firebase-admin is initialized. Parses a service account JSON
// string from environment and initializes admin when needed. Throws an Error
// with guidance if initialization cannot proceed.
function ensureAdminInitialized() {
  if (admin.apps && admin.apps.length) return;

  // Prefer inline JSON if provided
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    try {
      const parsed = JSON.parse(inline);
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return;
    } catch (e) {
      throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: " + (e.message || e));
    }
  }

  // Fallback to file path
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    try {
      const raw = fs.readFileSync(resolved, "utf8");
      const parsed = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return;
    } catch (e) {
      throw new Error("Failed to read service account file at " + resolved + ": " + (e.message || e));
    }
  }

  throw new Error("Missing Firebase admin credentials. Provide FIREBASE_SERVICE_ACCOUNT (JSON) or GOOGLE_APPLICATION_CREDENTIALS (file path).");
}

export async function POST(req) {
  try {
    const { idToken, password, isSignup } = await req.json();
    if (!idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });
    // Ensure admin SDK is initialized (gives clear error if not)
    try {
      ensureAdminInitialized();
    } catch (initErr) {
      console.error("Admin init error", initErr);
      return NextResponse.json({ error: initErr.message }, { status: 500 });
    }

    // Verify token; invalid tokens should yield 401 not 500
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (verifyErr) {
      console.warn("ID token verification failed", verifyErr);
      return NextResponse.json({ error: "Invalid or expired Firebase ID token" }, { status: 401 });
    }
    const uid = decoded.uid;

    // Get user record for extra info
    let userRecord = null;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (e) {
      // ignore if not found, we can still use decoded claims
    }

    const email = decoded.email || (userRecord && userRecord.email) || null;
    const name = (userRecord && userRecord.displayName) || decoded.name || null;
    const photoURL = (userRecord && userRecord.photoURL) || null;

    // Upsert into MongoDB
    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const existing = await users.findOne({ uid });
    if (!existing) {
      // Hash password if provided during signup (for email/password users)
      const userData = { uid, name, email, photoURL, createdAt: new Date(), lastLogin: new Date() };
      if (isSignup && password) {
        userData.passwordHash = await bcrypt.hash(password, 10);
      }
      const insertResult = await users.insertOne(userData);
      return NextResponse.json({ success: true, user: { id: insertResult.insertedId, uid, name, email } }, { status: 201 });
    } else {
      // Update lastLogin and profile info
      const updateData = { lastLogin: new Date(), name, email, photoURL };
      // If user doesn't have a password hash and one is provided during signup, add it
      if (isSignup && password && !existing.passwordHash) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      await users.updateOne({ uid }, { $set: updateData });
      return NextResponse.json({ success: true, user: { id: existing._id, uid, name, email } }, { status: 200 });
    }
  } catch (err) {
    console.error("Unhandled firebase-login error", err);
    const message = err && err.message ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
