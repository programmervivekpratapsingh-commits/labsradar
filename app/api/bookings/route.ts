import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SLOTS = ["07:00", "09:00", "11:00", "14:00", "16:00", "18:00"];
const MAX_DAYS_AHEAD = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Please log in to book" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { labTestId, type, date, slot, address, notes } = body;

  if (
    !labTestId ||
    !["IN_LAB", "HOME_VISIT"].includes(type) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) ||
    !SLOTS.includes(slot)
  ) {
    return NextResponse.json({ error: "Please fill in all the details" }, { status: 400 });
  }

  if (type === "HOME_VISIT" && String(address ?? "").trim().length < 10) {
    return NextResponse.json({ error: "Please enter your full collection address" }, { status: 400 });
  }

  // Build the appointment time in India Standard Time
  const when = new Date(date + "T" + slot + ":00+05:30");
  const now = Date.now();
  if (isNaN(when.getTime()) || when.getTime() <= now) {
    return NextResponse.json({ error: "Please choose a future date and time" }, { status: 400 });
  }
  if (when.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Bookings open up to " + MAX_DAYS_AHEAD + " days ahead" }, { status: 400 });
  }

  const labTest = await prisma.labTest.findUnique({
    where: { id: String(labTestId) },
    include: { lab: true },
  });
  if (!labTest || !labTest.isAvailable || !labTest.lab.isApproved || !labTest.lab.isActive) {
    return NextResponse.json({ error: "This test is not available right now" }, { status: 404 });
  }

  // The price is calculated on the server, never taken from the browser
  const totalAmount = Math.round(labTest.price * (1 - labTest.discount / 100));

  const booking = await prisma.booking.create({
    data: {
      bookingDate: when,
      type,
      totalAmount,
      address: type === "HOME_VISIT" ? String(address).trim() : null,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      patientId: session.user.id,
      labId: labTest.labId,
      labTestId: labTest.id,
    },
  });

  return NextResponse.json({ id: booking.id }, { status: 201 });
}
