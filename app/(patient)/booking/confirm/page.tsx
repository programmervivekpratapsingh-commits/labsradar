import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  const session = await auth();
  if (!session) redirect("/login");
  if (!id) redirect("/dashboard");

  const booking = await prisma.booking.findFirst({
    where: { id, patientId: session.user.id },
    include: { lab: true, labTest: { include: { test: true } } },
  });
  if (!booking) notFound();

  const when = booking.bookingDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  const canPay = booking.paymentStatus === "PENDING" && booking.status !== "CANCELLED";

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold">
        {booking.paymentStatus === "PAID" ? "Booking confirmed" : "Complete your booking"}
      </h1>
      <p className="text-gray-600 mt-1">Reference: {booking.id}</p>

      <div className="mt-6 border rounded-xl bg-white p-5 space-y-2">
        <p><strong>Test:</strong> {booking.labTest.test.name}</p>
        <p><strong>Lab:</strong> {booking.lab.name}, {booking.lab.city}</p>
        <p><strong>When:</strong> {when}</p>
        <p>
          <strong>Type:</strong>{" "}
          {booking.type === "HOME_VISIT" ? "Home visit sample collection" : "Visit the lab"}
        </p>
        {booking.address && <p><strong>Address:</strong> {booking.address}</p>}
        <p><strong>Amount:</strong> {rupee(booking.totalAmount)}</p>
        <p><strong>Status:</strong> {booking.status} (payment {booking.paymentStatus})</p>
      </div>

      {canPay && (
        <div className="mt-6">
          <PayButton
            bookingId={booking.id}
            amountLabel={rupee(booking.totalAmount)}
            name={session.user.name ?? ""}
            email={session.user.email ?? ""}
          />
          <p className="text-xs text-gray-500 mt-2">Test mode: no real money is charged.</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link href="/dashboard" className="bg-gray-900 text-white rounded-lg px-4 py-2">My dashboard</Link>
        <Link href="/tests" className="border rounded-lg px-4 py-2">Book another test</Link>
      </div>
    </main>
  );
}
