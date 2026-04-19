import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: { id: user._id, name: user.name, email: user.email } }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
