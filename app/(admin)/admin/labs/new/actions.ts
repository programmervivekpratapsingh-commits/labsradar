"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CreateLabState = {
  error?: string;
  created?: { labName: string; managerEmail: string; password: string };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createLab(
  _prev: CreateLabState,
  formData: FormData
): Promise<CreateLabState> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return { error: "Not allowed" };

  const f = (k: string) => String(formData.get(k) ?? "").trim();
  const name = f("name");
  const address = f("address");
  const city = f("city");
  const pincode = f("pincode");
  const phone = f("phone");
  const labEmail = f("labEmail").toLowerCase();
  const nablNumber = f("nablNumber");
  const managerName = f("managerName");
  const managerEmail = f("managerEmail").toLowerCase();

  if (!name || !address || !city || !nablNumber || !managerName) {
    return { error: "Please fill in all the fields" };
  }
  if (!/^\d{6}$/.test(pincode)) return { error: "Pincode must be 6 digits" };
  if (!/^\d{10}$/.test(phone)) return { error: "Phone must be 10 digits" };
  if (!EMAIL.test(labEmail) || !EMAIL.test(managerEmail)) {
    return { error: "Please enter valid email addresses" };
  }

  const [emailTaken, nablTaken, userTaken] = await Promise.all([
    prisma.lab.findUnique({ where: { email: labEmail } }),
    prisma.lab.findUnique({ where: { nablNumber } }),
    prisma.user.findUnique({ where: { email: managerEmail } }),
  ]);
  if (emailTaken) return { error: "A lab with this email already exists" };
  if (nablTaken) return { error: "A lab with this NABL number already exists" };
  if (userTaken) return { error: "The manager email is already registered" };

  const password = crypto.randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const manager = await tx.user.create({
        data: { name: managerName, email: managerEmail, password: hash, role: "LAB" },
      });
      await tx.lab.create({
        data: {
          name,
          address,
          city,
          pincode,
          phone,
          email: labEmail,
          nablNumber,
          isApproved: false,
          managerId: manager.id,
        },
      });
    });
  } catch (e) {
    console.error("createLab failed:", e);
    return { error: "Could not create the lab. Please try again." };
  }

  return { created: { labName: name, managerEmail, password } };
}
