import type { Prisma } from "@prisma/client";

export function locationWhere(loc?: string): Prisma.LabWhereInput {
  const q = (loc ?? "").trim().slice(0, 60);
  if (!q) return {};

  // A 6-digit pincode matches labs in the same postal area (first 3 digits)
  if (/^\d{6}$/.test(q)) {
    return { pincode: { startsWith: q.slice(0, 3) } };
  }

  return {
    OR: [
      { city: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function isPincode(loc?: string) {
  return /^\d{6}$/.test((loc ?? "").trim());
}
