import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await users.insertOne({ name: name || null, email, password: hashed, createdAt: new Date() });

    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
