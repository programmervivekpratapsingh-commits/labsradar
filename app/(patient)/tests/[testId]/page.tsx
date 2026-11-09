import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      labTests: {
        where: { isAvailable: true, lab: { isApproved: true, isActive: true } },
        include: { lab: true },
      },
    },
  });

  if (!test) notFound();

  const options = test.labTests
    .map((lt) => ({
      id: lt.id,
      lab: lt.lab,
      price: lt.price,
      discount: lt.discount,
      final: lt.price * (1 - lt.discount / 100),
    }))
    .sort((a, b) => a.final - b.final);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Link href="/tests" className="text-sm text-teal-700 underline">
        All tests
      </Link>

      <span className="block mt-4 text-xs uppercase tracking-wide text-teal-700">{test.category}</span>
      <h1 className="text-3xl font-bold">{test.name}</h1>
      <p className="text-gray-600 mt-2">{test.description}</p>

      <div className="mt-4 text-sm bg-teal-50 border border-teal-100 rounded-lg p-4 space-y-1">
        {test.preparation && <p><strong>Preparation:</strong> {test.preparation}</p>}
        {test.duration && <p><strong>Turnaround:</strong> {test.duration}</p>}
      </div>

      <h2 className="text-xl font-semibold mt-8">Choose a lab</h2>

      <div className="mt-4 space-y-3">
        {options.map((o, i) => (
          <div key={o.id} className="border rounded-xl p-5 bg-white flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">
                {o.lab.name}
                {i === 0 && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 rounded px-2 py-0.5">
                    Lowest price
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                {o.lab.address}, {o.lab.city} {o.lab.pincode}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                NABL certified{o.lab.rating ? ` \u00B7 Rated ${o.lab.rating}` : ""}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm text-gray-500 line-through">{rupee(o.price)}</p>
              <p className="text-xl font-bold">{rupee(o.final)}</p>
              <p className="text-xs text-green-700">{o.discount}% off</p>
              <Link
                href={`/booking?labTestId=${o.id}`}
                className="inline-block mt-2 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm"
              >
                Book
              </Link>
            </div>
          </div>
        ))}
        {options.length === 0 && <p className="text-gray-600">No labs offer this test right now.</p>}
      </div>
    </main>
  );
}
