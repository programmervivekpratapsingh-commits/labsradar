import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { locationWhere } from "@/lib/location";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; loc?: string }>;
}) {
  const { q, loc: rawLoc } = await searchParams;
  const loc = (rawLoc ?? "").trim().slice(0, 60);

  const tests = await prisma.test.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    include: {
      labTests: {
        where: {
          isAvailable: true,
          lab: { isApproved: true, isActive: true, ...locationWhere(loc) },
        },
        select: { price: true, discount: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const suffix = loc ? "?loc=" + encodeURIComponent(loc) : "";

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Book a diagnostic test</h1>
      <p className="text-gray-600 mt-1">Compare NABL certified labs and save with LabsRadar discounts.</p>

      <form className="mt-6 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search tests, e.g. thyroid, vitamin D"
          className="border rounded-lg p-3"
        />
        <input
          name="loc"
          defaultValue={loc}
          placeholder="City, area or pincode, e.g. Thane or 400601"
          className="border rounded-lg p-3"
        />
        <button className="bg-teal-600 text-white rounded-lg px-5 py-3">Search</button>
      </form>

      {loc && (
        <p className="mt-3 text-sm text-gray-600">
          Showing labs near <strong>{loc}</strong>.{" "}
          <Link href="/tests" className="text-teal-700 underline">Clear location</Link>
        </p>
      )}

      {tests.length === 0 && <p className="mt-8 text-gray-600">No tests found.</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tests.map((t) => {
          const finals = t.labTests.map((lt) => lt.price * (1 - lt.discount / 100));
          const lowest = finals.length ? Math.min(...finals) : null;
          return (
            <Link
              key={t.id}
              href={"/tests/" + t.id + suffix}
              className={"border rounded-xl p-5 bg-white hover:shadow transition " + (lowest === null ? "opacity-60" : "")}
            >
              <span className="text-xs uppercase tracking-wide text-teal-700">{t.category}</span>
              <h2 className="text-lg font-semibold mt-1">{t.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{t.description}</p>
              <p className="mt-3 text-sm">
                {lowest !== null ? (
                  <>
                    From <strong>{rupee(lowest)}</strong> at {finals.length} {finals.length === 1 ? "lab" : "labs"}
                  </>
                ) : loc ? (
                  "No labs in this area yet"
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
