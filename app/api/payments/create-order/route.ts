import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Please log in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const bookingId = body?.bookingId;
  if (!bookingId) {
    return NextResponse.json({ error: "Missing booking" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: String(bookingId), patientId: session.user.id },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ error: "This booking is already paid" }, { status: 409 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "This booking was cancelled" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
    },
    body: JSON.stringify({
      amount: Math.round(booking.totalAmount * 100),
      currency: "INR",
      receipt: booking.id,
    }),
  });

  if (!res.ok) {
    console.error("Razorpay order failed:", await res.text());
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }

  const order = await res.json();

  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: { razorpayOrderId: order.id, amount: booking.totalAmount, status: "PENDING" },
    create: { bookingId: booking.id, amount: booking.totalAmount, razorpayOrderId: order.id },
  });

  return NextResponse.json({ orderId: order.id, amount: order.amount, keyId });
}
