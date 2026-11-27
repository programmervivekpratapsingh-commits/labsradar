"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type PasswordState = { error?: string; done?: boolean };

export async function changePassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const session = await auth();
  if (!session) return { error: "Please log in again" };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 8) return { error: "The new password must be at least 8 characters" };
  if (next.length > 72) return { error: "The new password must be 72 characters or fewer" };
  if (next !== confirm) return { error: "The new passwords do not match" };
  if (next === current) return { error: "Choose a password different from the current one" };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) return { error: "Could not change the password" };

  const ok = await bcrypt.compare(current, user.password);
  if (!ok) return { error: "Your current password is not correct" };

  const hash = await bcrypt.hash(next, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, mustChangePassword: false },
  });

  return { done: true };
}
