import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SLOTS = ["07:00", "09:00", "11:00", "14:00", "16:00", "18:00"];
const MAX_DAYS_AHEAD = 60;
const MAX_TESTS = 10;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Please log in to book" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { labTestIds, type, date, slot, address, notes } = body;

  if (
    !Array.isArray(labTestIds) ||
    labTestIds.length < 1 ||
    labTestIds.length > MAX_TESTS ||
    !labTestIds.every((x: unknown) => typeof x === "string") ||
    !["IN_LAB", "HOME_VISIT"].includes(type) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) ||
    !SLOTS.includes(slot)
  ) {
    return NextResponse.json({ error: "Please fill in all the details" }, { status: 400 });
  }

  if (type === "HOME_VISIT" && String(address ?? "").trim().length < 10) {
    return NextResponse.json({ error: "Please enter your full collection address" }, { status: 400 });
  }

  const when = new Date(date + "T" + slot + ":00+05:30");
  const now = Date.now();
  if (isNaN(when.getTime()) || when.getTime() <= now) {
    return NextResponse.json({ error: "Please choose a future date and time" }, { status: 400 });
  }
  if (when.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Bookings open up to " + MAX_DAYS_AHEAD + " days ahead" }, { status: 400 });
  }

  const ids = Array.from(new Set(labTestIds as string[]));
  const labTests = await prisma.labTest.findMany({
    where: { id: { in: ids } },
    include: { lab: true, test: true },
  });

  if (labTests.length !== ids.length) {
    return NextResponse.json({ error: "One of these tests is no longer available" }, { status: 404 });
  }

  const lab = labTests[0].lab;
  if (!lab.isApproved || !lab.isActive || labTests.some((lt) => lt.labId !== lab.id || !lt.isAvailable)) {
    return NextResponse.json(
      { error: "All tests must be available at the same lab" },
      { status: 400 }
    );
  }

  // Prices come from OUR database, never from the browser
  const items = labTests.map((lt) => ({
    labTestId: lt.id,
    testName: lt.test.name,
    price: lt.price,
    discount: lt.discount,
    amount: Math.round(lt.price * (1 - lt.discount / 100)),
  }));
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  const booking = await prisma.booking.create({
    data: {
      bookingDate: when,
      type,
      totalAmount,
      address: type === "HOME_VISIT" ? String(address).trim() : null,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      patient: { connect: { id: session.user.id } },
      lab: { connect: { id: lab.id } },
      items: { create: items },
    },
  });

  return NextResponse.json({ id: booking.id }, { status: 201 });
}

