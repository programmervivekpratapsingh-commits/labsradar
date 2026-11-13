import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

async function getMyLab() {
  const session = await auth();
  if (!session || session.user.role !== "LAB") redirect("/login");
  return prisma.lab.findUnique({ where: { managerId: session.user.id } });
}

async function updateStatus(formData: FormData) {
  "use server";
  const lab = await getMyLab();
  if (!lab) return;

  const id = String(formData.get("id"));
  const next = String(formData.get("next"));

  const booking = await prisma.booking.findFirst({ where: { id, labId: lab.id } });
  if (!booking) return;

  if (next === "COMPLETED" && booking.status === "CONFIRMED") {
    await prisma.booking.update({ where: { id }, data: { status: "COMPLETED" } });
  }

  if (
    next === "CANCELLED" &&
    booking.paymentStatus !== "PAID" &&
    (booking.status === "PENDING" || booking.status === "CONFIRMED")
  ) {
    await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  revalidatePath("/lab/bookings");
}

export default async function LabBookingsPage() {
  const lab = await getMyLab();

  if (!lab) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Lab bookings</h1>
        <p className="mt-4 text-gray-600">No lab is linked to your account yet. Please contact LabsRadar.</p>
      </main>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { labId: lab.id },
    include: { patient: true, items: true },
    orderBy: { bookingDate: "asc" },
  });

  const upcoming = bookings.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED");
  const past = bookings.filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED").reverse();

  function Card({ b }: { b: (typeof bookings)[number] }) {
    return (
      <div className="border rounded-xl bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">{b.items.map((i) => i.testName).join(", ")}</h3>
            <p className="text-sm text-gray-600">
              {b.bookingDate.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              &middot; {b.type === "HOME_VISIT" ? "Home visit" : "At the lab"}
            </p>
            <p className="text-sm mt-1">
              <strong>{b.patient.name}</strong>
              {b.patient.phone ? " \u00B7 " + b.patient.phone : ""}
            </p>
            {b.address && <p className="text-sm text-gray-600">Collect from: {b.address}</p>}
            {b.notes && <p className="text-sm text-gray-500">Note: {b.notes}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold">{rupee(b.totalAmount)}</p>
            <p className="text-xs text-gray-600">{b.status}</p>
            <p className="text-xs text-gray-500">Payment {b.paymentStatus}</p>
          </div>
        </div>

        {(b.status === "PENDING" || b.status === "CONFIRMED") && (
          <div className="mt-3 flex gap-2">
            {b.status === "CONFIRMED" && (
              <form action={updateStatus}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="next" value="COMPLETED" />
                <button className="bg-teal-600 text-white rounded-lg px-3 py-1.5 text-sm">
                  Mark completed
                </button>
              </form>
            )}
            {b.paymentStatus !== "PAID" && (
              <form action={updateStatus}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="next" value="CANCELLED" />
                <button className="border rounded-lg px-3 py-1.5 text-sm">Cancel</button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{lab.name}</h1>
      <p className="text-sm text-gray-600">Bookings</p>

      <h2 className="text-lg font-semibold mt-8">Upcoming ({upcoming.length})</h2>
      <div className="mt-3 space-y-3">
        {upcoming.map((b) => <Card key={b.id} b={b} />)}
        {upcoming.length === 0 && <p className="text-gray-600">No upcoming bookings.</p>}
      </div>

      <h2 className="text-lg font-semibold mt-8">Past ({past.length})</h2>
      <div className="mt-3 space-y-3">
        {past.map((b) => <Card key={b.id} b={b} />)}
        {past.length === 0 && <p className="text-gray-600">Nothing here yet.</p>}
      </div>
    </main>
  );
}

