import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function LabPage({
  params,
}: {
  params: Promise<{ labId: string }>;
}) {
  const { labId } = await params;

  const lab = await prisma.lab.findFirst({
    where: { id: labId, isApproved: true, isActive: true },
    include: {
      labTests: {
        where: { isAvailable: true },
        include: { test: true },
        orderBy: { test: { name: "asc" } },
      },
    },
  });
  if (!lab) notFound();

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Link href="/tests" className="text-sm text-teal-700 underline">
        All tests
      </Link>
      <h1 className="text-3xl font-bold mt-3">{lab.name}</h1>
      <p className="text-gray-600">
        {lab.address}, {lab.city} {lab.pincode}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        NABL certified{lab.rating ? " \u00B7 Rated " + lab.rating : ""}
      </p>

      <h2 className="text-xl font-semibold mt-8">Select your tests</h2>
      <p className="text-sm text-gray-600">Tick one or more tests and book them together.</p>

      <form action="/booking" method="get" className="mt-4 space-y-3">
        {lab.labTests.map((lt) => {
          const final = lt.price * (1 - lt.discount / 100);
          return (
            <label
              key={lt.id}
              className="border rounded-xl bg-white p-4 flex items-center justify-between gap-4 cursor-pointer"
            >
              <span className="flex items-start gap-3">
                <input type="checkbox" name="t" value={lt.id} className="mt-1" />
                <span>
                  <span className="block font-semibold">{lt.test.name}</span>
                  <span className="block text-xs text-gray-500">{lt.test.category}</span>
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-xs text-gray-500 line-through">{rupee(lt.price)}</span>
                <span className="block font-bold">{rupee(final)}</span>
                <span className="block text-xs text-green-700">{lt.discount}% off</span>
              </span>
            </label>
          );
        })}
        {lab.labTests.length === 0 && <p className="text-gray-600">This lab has no tests listed yet.</p>}

        {lab.labTests.length > 0 && (
          <button className="w-full bg-teal-600 text-white rounded-lg p-3 font-medium">
            Book selected tests
          </button>
        )}
      </form>
    </main>
  );
}
