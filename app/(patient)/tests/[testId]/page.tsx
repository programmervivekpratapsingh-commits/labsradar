import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { locationWhere, isPincode } from "@/lib/location";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function TestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ testId: string }>;
  searchParams: Promise<{ loc?: string }>;
}) {
  const { testId } = await params;
  const { loc: rawLoc } = await searchParams;
  const loc = (rawLoc ?? "").trim().slice(0, 60);

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      labTests: {
        where: {
          isAvailable: true,
          lab: { isApproved: true, isActive: true, ...locationWhere(loc) },
        },
        include: { lab: true },
      },
    },
  });

  if (!test) notFound();

  const exactPin = isPincode(loc);

  const options = test.labTests
    .map((lt) => ({
      id: lt.id,
      lab: lt.lab,
      price: lt.price,
      discount: lt.discount,
      final: lt.price * (1 - lt.discount / 100),
      samePin: exactPin && lt.lab.pincode === loc,
    }))
    .sort((a, b) => Number(b.samePin) - Number(a.samePin) || a.final - b.final);

  const lowest = options.length ? Math.min(...options.map((o) => o.final)) : null;
  const backHref = "/tests" + (loc ? "?loc=" + encodeURIComponent(loc) : "");

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Link href={backHref} className="text-sm text-teal-700 underline">
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

      <form className="mt-3 flex gap-2">
        <input
          name="loc"
          defaultValue={loc}
          placeholder="City, area or pincode"
          className="flex-1 border rounded-lg p-3"
        />
        <button className="bg-teal-600 text-white rounded-lg px-5">Filter</button>
      </form>
      {loc && (
        <p className="mt-2 text-sm text-gray-600">
          Showing labs near <strong>{loc}</strong>.{" "}
          <Link href={"/tests/" + test.id} className="text-teal-700 underline">Clear</Link>
        </p>
      )}

      <div className="mt-4 space-y-3">
        {options.map((o) => (
          <div key={o.id} className="border rounded-xl p-5 bg-white flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">
                {o.lab.name}
                {o.final === lowest && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 rounded px-2 py-0.5">
                    Lowest price
                  </span>
                )}
                {o.samePin && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 rounded px-2 py-0.5">
                    Same pincode
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                {o.lab.address}, {o.lab.city} {o.lab.pincode}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                NABL certified{o.lab.rating ? " \u00B7 Rated " + o.lab.rating : ""}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm text-gray-500 line-through">{rupee(o.price)}</p>
              <p className="text-xl font-bold">{rupee(o.final)}</p>
              <p className="text-xs text-green-700">{o.discount}% off</p>
              <Link
                href={"/booking?labTestId=" + o.id}
                className="inline-block mt-2 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm"
              >
                Book
              </Link>
            </div>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-gray-600">
            {loc
              ? "No labs found near \u201C" + loc + "\u201D. Try a nearby city or pincode, or clear the filter."
              : "No labs offer this test right now."}
          </p>
        )}
      </div>
    </main>
  );
}
