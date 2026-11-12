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

function parseNumbers(formData: FormData) {
  const price = Number(formData.get("price"));
  const discount = Number(formData.get("discount") || 0);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return null;
  if (!Number.isFinite(discount) || discount < 0 || discount > 90) return null;
  return { price: Math.round(price), discount };
}

async function updateListing(formData: FormData) {
  "use server";
  const lab = await getMyLab();
  if (!lab) return;

  const nums = parseNumbers(formData);
  if (!nums) return;

  const id = String(formData.get("id"));
  const listing = await prisma.labTest.findFirst({ where: { id, labId: lab.id } });
  if (!listing) return;

  await prisma.labTest.update({
    where: { id },
    data: {
      price: nums.price,
      discount: nums.discount,
      isAvailable: formData.get("isAvailable") === "on",
    },
  });

  revalidatePath("/lab/tests");
}

async function addListing(formData: FormData) {
  "use server";
  const lab = await getMyLab();
  if (!lab) return;

  const nums = parseNumbers(formData);
  if (!nums) return;

  const testId = String(formData.get("testId"));
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) return;

  await prisma.labTest.upsert({
    where: { labId_testId: { labId: lab.id, testId } },
    update: { price: nums.price, discount: nums.discount, isAvailable: true },
    create: { labId: lab.id, testId, price: nums.price, discount: nums.discount },
  });

  revalidatePath("/lab/tests");
}

export default async function LabTestsPage() {
  const lab = await getMyLab();

  if (!lab) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">My tests</h1>
        <p className="mt-4 text-gray-600">No lab is linked to your account yet. Please contact LabsRadar.</p>
      </main>
    );
  }

  const listings = await prisma.labTest.findMany({
    where: { labId: lab.id },
    include: { test: true },
    orderBy: { test: { name: "asc" } },
  });

  const listedIds = listings.map((l) => l.testId);
  const notListed = await prisma.test.findMany({
    where: { id: { notIn: listedIds } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{lab.name}</h1>
      <p className="text-sm text-gray-600">
        Your tests and prices. Patients see the price after discount.
      </p>

      <div className="mt-6 space-y-3">
        {listings.map((l) => {
          const final = l.price * (1 - l.discount / 100);
          return (
            <form
              key={l.id}
              action={updateListing}
              className={"border rounded-xl bg-white p-4 " + (l.isAvailable ? "" : "opacity-60")}
            >
              <input type="hidden" name="id" value={l.id} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{l.test.name}</h3>
                  <p className="text-xs text-gray-500">{l.test.category}</p>
                </div>
                <p className="text-sm text-gray-600 shrink-0">
                  Patients pay <strong>{rupee(final)}</strong>
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  Price (INR)
                  <input
                    name="price"
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    defaultValue={l.price}
                    required
                    className="block w-28 border rounded-lg p-2 mt-1"
                  />
                </label>
                <label className="text-sm">
                  Discount (%)
                  <input
                    name="discount"
                    type="number"
                    min={0}
                    max={90}
                    step={1}
                    defaultValue={l.discount}
                    required
                    className="block w-24 border rounded-lg p-2 mt-1"
                  />
                </label>
                <label className="text-sm flex items-center gap-2 pb-2">
                  <input type="checkbox" name="isAvailable" defaultChecked={l.isAvailable} />
                  Available for booking
                </label>
                <button className="bg-teal-600 text-white rounded-lg px-4 py-2 text-sm">Save</button>
              </div>
            </form>
          );
        })}
        {listings.length === 0 && <p className="text-gray-600">You have not listed any tests yet.</p>}
      </div>

      {notListed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Add a test</h2>
          <form action={addListing} className="mt-3 border rounded-xl bg-white p-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Test
              <select name="testId" required className="block border rounded-lg p-2 mt-1 bg-white">
                {notListed.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Price (INR)
              <input name="price" type="number" min={1} max={100000} step={1} required className="block w-28 border rounded-lg p-2 mt-1" />
            </label>
            <label className="text-sm">
              Discount (%)
              <input name="discount" type="number" min={0} max={90} step={1} defaultValue={0} required className="block w-24 border rounded-lg p-2 mt-1" />
            </label>
            <button className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm">Add</button>
          </form>
        </section>
      )}
    </main>
  );
}
