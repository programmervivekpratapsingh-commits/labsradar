import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function HomePage() {
  const labFilter = { isAvailable: true, lab: { isApproved: true, isActive: true } };

  const tests = await prisma.test.findMany({
    where: { labTests: { some: labFilter } },
    include: { labTests: { where: labFilter, select: { price: true, discount: true } } },
    orderBy: { name: "asc" },
    take: 6,
  });

  const steps = [
    { n: "1", title: "Choose your tests", text: "Search for the tests you need, from a simple blood count to a full health panel." },
    { n: "2", title: "Pick a lab near you", text: "Compare NABL certified labs by price and location, and see the discount on each test." },
    { n: "3", title: "Visit or get a home visit", text: "Go to the lab, or have your sample collected at home. Pay online and track it all in one place." },
  ];

  const perks = [
    { title: "Save on every test", text: "Book through LabsRadar and get a discount on your tests." },
    { title: "NABL certified labs", text: "We list labs that hold NABL certification, so your results come from accredited labs." },
    { title: "Home sample collection", text: "Skip the queue. We collect the sample at your door and our partner labs process it." },
  ];

  return (
    <main>
      <section className="bg-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold max-w-2xl">
            Book diagnostic tests with NABL certified labs near you
          </h1>
          <p className="mt-3 text-teal-50 max-w-xl">
            Compare labs, choose your tests, and save on every test. Visit the lab or get your sample
            collected at home.
          </p>

          <form action="/tests" className="mt-8 grid gap-2 sm:grid-cols-[1fr_1fr_auto] bg-white rounded-xl p-3">
            <input
              name="q"
              placeholder="Test name, e.g. thyroid, vitamin D"
              className="border rounded-lg p-3 text-gray-900"
            />
            <input
              name="loc"
              placeholder="City, area or pincode"
              className="border rounded-lg p-3 text-gray-900"
            />
            <button className="bg-teal-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-teal-700">
              Find tests
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="border rounded-xl bg-white p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-bold">
                {s.n}
              </span>
              <h3 className="font-semibold mt-3">{s.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {tests.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Tests you can book</h2>
            <Link href="/tests" className="text-sm text-teal-700 underline">
              See all tests
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((t) => {
              const finals = t.labTests.map((lt) => lt.price * (1 - lt.discount / 100));
              const lowest = Math.min(...finals);
              return (
                <Link
                  key={t.id}
                  href={"/tests/" + t.id}
                  className="border rounded-xl bg-white p-5 hover:shadow transition"
                >
                  <span className="text-xs uppercase tracking-wide text-teal-700">{t.category}</span>
                  <h3 className="font-semibold mt-1">{t.name}</h3>
                  <p className="text-sm mt-3">
                    From <strong>{rupee(lowest)}</strong> at {finals.length} {finals.length === 1 ? "lab" : "labs"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="bg-white border-y">
        <div className="max-w-5xl mx-auto px-6 py-12 grid gap-6 sm:grid-cols-3">
          {perks.map((p) => (
            <div key={p.title}>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
