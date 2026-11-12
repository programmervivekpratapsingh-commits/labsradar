import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

async function setApproval(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const approve = formData.get("approve") === "true";
  await prisma.lab.updateMany({ where: { id }, data: { isApproved: approve } });
  revalidatePath("/admin/labs");
}

async function setActive(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.lab.updateMany({ where: { id }, data: { isActive: active } });
  revalidatePath("/admin/labs");
}

export default async function AdminLabsPage() {
  await requireAdmin();

  const labs = await prisma.lab.findMany({
    include: { manager: true, _count: { select: { bookings: true, labTests: true } } },
    orderBy: [{ isApproved: "asc" }, { name: "asc" }],
  });

  return (
    <main className="max-w-4xl mx-auto p-6">
      <Link href="/admin/dashboard" className="text-sm text-teal-700 underline">
        Admin dashboard
      </Link>
      <div className="flex items-center justify-between mt-2"><h1 className="text-2xl font-bold">Labs</h1><Link href="/admin/labs/new" className="bg-teal-600 text-white rounded-lg px-3 py-1.5 text-sm">Add a lab</Link></div>
      <p className="text-sm text-gray-600">
        Check each lab&apos;s NABL certificate before approving. Patients only see labs that are
        approved and active.
      </p>

      <div className="mt-6 space-y-3">
        {labs.map((lab) => (
          <div key={lab.id} className="border rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{lab.name}</h3>
                <p className="text-sm text-gray-600">
                  {lab.address}, {lab.city} {lab.pincode}
                </p>
                <p className="text-sm text-gray-600">
                  {lab.phone} &middot; {lab.email}
                </p>
                <p className="text-sm mt-1">
                  <strong>NABL:</strong> {lab.nablNumber}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Manager: {lab.manager ? lab.manager.email : "none"} &middot; {lab._count.labTests} tests
                  &middot; {lab._count.bookings} bookings
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p
                  className={
                    "text-xs rounded px-2 py-0.5 inline-block " +
                    (lab.isApproved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")
                  }
                >
                  {lab.isApproved ? "Approved" : "Pending approval"}
                </p>
                <p className="text-xs text-gray-600">{lab.isActive ? "Active" : "Deactivated"}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <form action={setApproval}>
                <input type="hidden" name="id" value={lab.id} />
                <input type="hidden" name="approve" value={lab.isApproved ? "false" : "true"} />
                <button
                  className={
                    "rounded-lg px-3 py-1.5 text-sm " +
                    (lab.isApproved ? "border" : "bg-teal-600 text-white")
                  }
                >
                  {lab.isApproved ? "Revoke approval" : "Approve lab"}
                </button>
              </form>
              <form action={setActive}>
                <input type="hidden" name="id" value={lab.id} />
                <input type="hidden" name="active" value={lab.isActive ? "false" : "true"} />
                <button className="border rounded-lg px-3 py-1.5 text-sm">
                  {lab.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>
          </div>
        ))}
        {labs.length === 0 && <p className="text-gray-600">No labs yet.</p>}
      </div>
    </main>
  );
}

