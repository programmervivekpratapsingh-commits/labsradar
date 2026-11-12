import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [patients, labsTotal, labsPending, bookings, paidBookings, revenue, recent] =
    await Promise.all([
      prisma.user.count({ where: { role: "PATIENT" } }),
      prisma.lab.count(),
      prisma.lab.count({ where: { isApproved: false } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { paymentStatus: "PAID" } }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "PAID", status: { not: "CANCELLED" } },
      }),
      prisma.booking.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { patient: true, lab: true, labTest: { include: { test: true } } },
      }),
    ]);

  const stats = [
    { label: "Patients", value: String(patients) },
    { label: "Labs", value: String(labsTotal) },
    { label: "Labs awaiting approval", value: String(labsPending) },
    { label: "Bookings", value: String(bookings) },
    { label: "Paid bookings", value: String(paidBookings) },
    { label: "Paid revenue", value: rupee(revenue._sum.totalAmount ?? 0) },
  ];

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">LabsRadar admin</h1>
          <p className="text-sm text-gray-600">{session.user.email}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Log out</button>
        </form>
      </div>

      <nav className="mt-4 flex gap-3 text-sm">
        <Link href="/admin/labs" className="border rounded-lg px-3 py-1.5">
          Labs{labsPending > 0 ? " (" + labsPending + " pending)" : ""}
        </Link>
      </nav>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="border rounded-xl bg-white p-4">
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-8">Latest bookings</h2>
      <div className="mt-3 space-y-3">
        {recent.map((b) => (
          <div key={b.id} className="border rounded-xl bg-white p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">{b.labTest.test.name}</p>
              <p className="text-sm text-gray-600">
                {b.patient.name} at {b.lab.name}
              </p>
              <p className="text-xs text-gray-500">
                {b.bookingDate.toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold">{rupee(b.totalAmount)}</p>
              <p className="text-xs text-gray-600">{b.status}</p>
              <p className="text-xs text-gray-500">Payment {b.paymentStatus}</p>
            </div>
          </div>
        ))}
        {recent.length === 0 && <p className="text-gray-600">No bookings yet.</p>}
      </div>
    </main>
  );
}
