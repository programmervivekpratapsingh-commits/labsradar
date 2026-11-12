import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function LabDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "LAB") redirect("/login");

  const lab = await prisma.lab.findUnique({ where: { managerId: session.user.id } });

  if (!lab) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Lab dashboard</h1>
        <p className="mt-4 text-gray-600">No lab is linked to your account yet. Please contact LabsRadar.</p>
      </main>
    );
  }

  // Midnight to midnight today, in India Standard Time
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const dayStart = new Date(todayIST + "T00:00:00+05:30");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = new Date(todayIST.slice(0, 7) + "-01T00:00:00+05:30");

  const active = { in: ["PENDING", "CONFIRMED"] as ("PENDING" | "CONFIRMED")[] };

  const [todays, awaitingPayment, upcomingCount, completedCount, monthRevenue, totalRevenue] =
    await Promise.all([
      prisma.booking.findMany({
        where: { labId: lab.id, status: active, bookingDate: { gte: dayStart, lt: dayEnd } },
        include: { patient: true, labTest: { include: { test: true } } },
        orderBy: { bookingDate: "asc" },
      }),
      prisma.booking.count({ where: { labId: lab.id, status: "PENDING", paymentStatus: "PENDING" } }),
      prisma.booking.count({ where: { labId: lab.id, status: active, bookingDate: { gte: dayStart } } }),
      prisma.booking.count({ where: { labId: lab.id, status: "COMPLETED" } }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          labId: lab.id,
          paymentStatus: "PAID",
          status: { not: "CANCELLED" },
          bookingDate: { gte: monthStart },
        },
      }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { labId: lab.id, paymentStatus: "PAID", status: { not: "CANCELLED" } },
      }),
    ]);

  const stats = [
    { label: "Today", value: String(todays.length) },
    { label: "Upcoming", value: String(upcomingCount) },
    { label: "Awaiting payment", value: String(awaitingPayment) },
    { label: "Completed", value: String(completedCount) },
  ];

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{lab.name}</h1>
          <p className="text-sm text-gray-600">
            {lab.city} &middot; {lab.isApproved ? "Approved partner" : "Waiting for approval"}
          </p>
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
        <Link href="/lab/bookings" className="border rounded-lg px-3 py-1.5">All bookings</Link>
        <Link href="/lab/tests" className="border rounded-lg px-3 py-1.5">Tests and prices</Link>
      </nav>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="border rounded-xl bg-white p-4">
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <div className="border rounded-xl bg-white p-4">
          <p className="text-sm text-gray-600">Revenue this month (paid)</p>
          <p className="text-2xl font-bold mt-1">{rupee(monthRevenue._sum.totalAmount ?? 0)}</p>
        </div>
        <div className="border rounded-xl bg-white p-4">
          <p className="text-sm text-gray-600">Revenue all time (paid)</p>
          <p className="text-2xl font-bold mt-1">{rupee(totalRevenue._sum.totalAmount ?? 0)}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-8">Today&apos;s schedule</h2>
      <div className="mt-3 space-y-3">
        {todays.map((b) => (
          <div key={b.id} className="border rounded-xl bg-white p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">
                {b.bookingDate.toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                &middot; {b.labTest.test.name}
              </p>
              <p className="text-sm text-gray-600">
                {b.patient.name}
                {b.patient.phone ? " \u00B7 " + b.patient.phone : ""}
              </p>
              <p className="text-sm text-gray-600">
                {b.type === "HOME_VISIT" ? "Home visit: " + (b.address ?? "") : "At the lab"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold">{rupee(b.totalAmount)}</p>
              <p className="text-xs text-gray-600">{b.status}</p>
              <p className="text-xs text-gray-500">Payment {b.paymentStatus}</p>
            </div>
          </div>
        ))}
        {todays.length === 0 && <p className="text-gray-600">Nothing scheduled for today.</p>}
      </div>
    </main>
  );
}
