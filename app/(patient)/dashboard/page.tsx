import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "LAB") redirect("/lab/dashboard");
  if (session.user.role === "ADMIN") redirect("/admin/dashboard");

  const bookings = await prisma.booking.findMany({
    where: { patientId: session.user.id },
    include: { lab: true, labTest: { include: { test: true } } },
    orderBy: { bookingDate: "desc" },
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
          <p className="text-sm text-gray-600">
            {session.user.email} &middot; {session.user.role}
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

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold">My bookings</h2>
        <Link href="/tests" className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm">
          Book a test
        </Link>
      </div>

      {bookings.length === 0 && (
        <p className="mt-6 text-gray-600">You have no bookings yet.</p>
      )}

      <div className="mt-4 space-y-3">
        {bookings.map((b) => (
          <Link
            key={b.id}
            href={"/booking/confirm?id=" + b.id}
            className="block border rounded-xl bg-white p-4 hover:shadow transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{b.labTest.test.name}</h3>
                <p className="text-sm text-gray-600">{b.lab.name}, {b.lab.city}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {b.bookingDate.toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  &middot; {b.type === "HOME_VISIT" ? "Home visit" : "At the lab"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">{rupee(b.totalAmount)}</p>
                <p className="text-xs text-gray-600">{b.status}</p>
                <p className="text-xs text-gray-500">Payment {b.paymentStatus}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}


