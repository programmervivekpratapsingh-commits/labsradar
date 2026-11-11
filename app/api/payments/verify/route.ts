import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Please log in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: String(bookingId), patientId: session.user.id },
    include: { payment: true },
  });
  if (!booking || !booking.payment) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.payment.status === "PAID") {
    return NextResponse.json({ ok: true });
  }

  if (booking.payment.razorpayOrderId !== razorpay_order_id) {
    return NextResponse.json({ error: "Payment does not match this booking" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpay_signature));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: "PAID", razorpayPaymentId: String(razorpay_payment_id) },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
