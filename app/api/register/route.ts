import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { name, email, phone, password } = await req.json();

  if (!name || !email || !password || String(password).length < 8) {
    return NextResponse.json(
      { error: "Name, email and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, phone, password: hashed, role: "PATIENT" },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}