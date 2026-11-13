import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[]; labTestId?: string }>;
}) {
  const sp = await searchParams;

  const session = await auth();
  if (!session) redirect("/login");

  const raw = sp.t ?? sp.labTestId ?? [];
  const ids = Array.from(new Set((Array.isArray(raw) ? raw : [raw]).map(String))).slice(0, 10);
  if (ids.length === 0) redirect("/tests");

  const labTests = await prisma.labTest.findMany({
    where: { id: { in: ids } },
    include: { lab: true, test: true },
  });
  if (labTests.length !== ids.length) notFound();

  const lab = labTests[0].lab;
  const valid =
    lab.isApproved && lab.isActive && labTests.every((lt) => lt.labId === lab.id && lt.isAvailable);
  if (!valid) notFound();

  const lines = labTests.map((lt) => ({
    id: lt.id,
    name: lt.test.name,
    price: lt.price,
    discount: lt.discount,
    final: Math.round(lt.price * (1 - lt.discount / 100)),
    prep: lt.test.preparation,
  }));
  const total = lines.reduce((s, l) => s + l.final, 0);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Book your tests</h1>

      <div className="mt-6 border rounded-xl bg-white p-5">
        <h2 className="text-xl font-semibold">{lab.name}</h2>
        <p className="text-sm text-gray-600">
          {lab.address}, {lab.city}
        </p>

        <ul className="mt-4 divide-y">
          {lines.map((l) => (
            <li key={l.id} className="py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{l.name}</p>
                {l.prep && <p className="text-xs text-gray-600">Preparation: {l.prep}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500 line-through">{rupee(l.price)}</p>
                <p className="font-semibold">{rupee(l.final)}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 pt-3 border-t flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{rupee(total)}</span>
        </p>
      </div>

      <BookingForm labTestIds={labTests.map((lt) => lt.id)} />
    </main>
  );
}
