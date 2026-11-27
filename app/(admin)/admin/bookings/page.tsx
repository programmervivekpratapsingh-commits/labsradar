import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const NOTICES: Record<string, { text: string; ok: boolean }> = {
  refunded: { text: "Booking cancelled and the refund was sent to Razorpay.", ok: true },
  cancelled: { text: "Booking cancelled.", ok: true },
  "refund-failed": {
    text: "Razorpay could not process the refund, so the booking was not changed. See the server log for the reason.",
    ok: false,
  },
  "not-allowed": { text: "This booking cannot be changed in its current state.", ok: false },
};

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

async function refundAndCancel(a: {
  bookingId: string;
  paymentRowId: string;
  razorpayPaymentId: string;
  amount: number;
}): Promise<string> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return "refund-failed";

  // The refund amount comes from OUR database (in paise)
  const res = await fetch(
    "https://api.razorpay.com/v1/payments/" + a.razorpayPaymentId + "/refund",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
      },
      body: JSON.stringify({
        amount: Math.round(a.amount * 100),
        speed: "normal",
        notes: { bookingId: a.bookingId },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Razorpay refund failed:", text);
    // If an earlier attempt already refunded this payment, finish the database update
    if (!/refunded already|fully refunded/i.test(text)) return "refund-failed";
  }

  await prisma.$transaction([
    prisma.payment.update({ where: { id: a.paymentRowId }, data: { status: "REFUNDED" } }),
    prisma.booking.update({
      where: { id: a.bookingId },
      data: { paymentStatus: "REFUNDED", status: "CANCELLED" },
    }),
  ]);

  return "refunded";
}

async function cancelBooking(formData: FormData) {
  "use server";
  await requireAdmin();

  const id = String(formData.get("id"));
  const booking = await prisma.booking.findUnique({ where: { id }, include: { payment: true } });

  let result = "not-allowed";
  if (booking && (booking.status === "PENDING" || booking.status === "CONFIRMED")) {
    if (booking.paymentStatus === "PAID") {
      if (booking.payment?.razorpayPaymentId) {
        result = await refundAndCancel({
          bookingId: booking.id,
          paymentRowId: booking.payment.id,
          razorpayPaymentId: booking.payment.razorpayPaymentId,
          amount: booking.totalAmount,
        });
      } else {
        result = "refund-failed";
      }
    } else {
      await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
      result = "cancelled";
    }
  }

  revalidatePath("/admin/bookings");
  redirect("/admin/bookings?notice=" + result);
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; notice?: string }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const active = STATUSES.find((s) => s === sp.status);
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;

  const bookings = await prisma.booking.findMany({
    where: active ? { status: active } : {},
    include: { patient: true, lab: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const tabs = [{ label: "All", href: "/admin/bookings", on: !active }].concat(
    STATUSES.map((s) => ({
      label: s.charAt(0) + s.slice(1).toLowerCase(),
      href: "/admin/bookings?status=" + s,
      on: active === s,
    }))
  );

  return (
    <main className="max-w-4xl mx-auto p-6">
      <Link href="/admin/dashboard" className="text-sm text-teal-700 underline">
        Admin dashboard
      </Link>
      <h1 className="text-2xl font-bold mt-2">Bookings</h1>
      <p className="text-sm text-gray-600">
        The latest 100 bookings across all labs. Cancelling a paid booking refunds the full amount.
      </p>

      {notice && (
        <p
          className={
            "mt-4 rounded-lg p-3 text-sm " +
            (notice.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900")
          }
        >
          {notice.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={"rounded-lg px-3 py-1.5 border " + (t.on ? "bg-gray-900 text-white" : "bg-white")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {bookings.map((b) => {
          const canCancel = b.status === "PENDING" || b.status === "CONFIRMED";
          const paid = b.paymentStatus === "PAID";
          return (
            <div key={b.id} className="border rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{b.items.map((i) => i.testName).join(", ")}</h3>
                  <p className="text-sm text-gray-600">{b.lab.name}</p>
                  <p className="text-sm mt-1">
                    <strong>{b.patient.name}</strong> &middot; {b.patient.email}
                    {b.patient.phone ? " \u00B7 " + b.patient.phone : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.bookingDate.toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    &middot; {b.type === "HOME_VISIT" ? "Home visit" : "At the lab"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Ref: {b.id}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{rupee(b.totalAmount)}</p>
                  <p className="text-xs text-gray-600">{b.status}</p>
                  <p className="text-xs text-gray-500">Payment {b.paymentStatus}</p>
                </div>
              </div>

              {canCancel && (
                <form action={cancelBooking} className="mt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <ConfirmSubmit
                    message={
                      paid
                        ? "Cancel this booking and refund " + rupee(b.totalAmount) + " to the patient?"
                        : "Cancel this booking?"
                    }
                    className={
                      "rounded-lg px-3 py-1.5 text-sm " +
                      (paid ? "bg-red-600 text-white" : "border")
                    }
                  >
                    {paid ? "Cancel and refund " + rupee(b.totalAmount) : "Cancel booking"}
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          );
        })}
        {bookings.length === 0 && <p className="text-gray-600">No bookings found.</p>}
      </div>
    </main>
  );
}
