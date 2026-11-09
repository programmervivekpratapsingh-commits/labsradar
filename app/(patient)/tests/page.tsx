import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const tests = await prisma.test.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    include: {
      labTests: {
        where: { isAvailable: true, lab: { isApproved: true, isActive: true } },
        select: { price: true, discount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Book a diagnostic test</h1>
      <p className="text-gray-600 mt-1">Compare NABL certified labs and save with LabsRadar discounts.</p>

      <form className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search tests, e.g. thyroid, vitamin D"
          className="flex-1 border rounded-lg p-3"
        />
        <button className="bg-teal-600 text-white rounded-lg px-5">Search</button>
      </form>

      {tests.length === 0 && <p className="mt-8 text-gray-600">No tests found.</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tests.map((t) => {
          const finals = t.labTests.map((lt) => lt.price * (1 - lt.discount / 100));
          const lowest = finals.length ? Math.min(...finals) : null;
          return (
            <Link
              key={t.id}
              href={`/tests/${t.id}`}
              className="border rounded-xl p-5 bg-white hover:shadow transition"
            >
              <span className="text-xs uppercase tracking-wide text-teal-700">{t.category}</span>
              <h2 className="text-lg font-semibold mt-1">{t.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{t.description}</p>
              <p className="mt-3 text-sm">
                {lowest !== null ? (
                  <>
                    From <strong>{rupee(lowest)}</strong> at {finals.length} labs
                  </>
                ) : (
                  "Not available right now"
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
