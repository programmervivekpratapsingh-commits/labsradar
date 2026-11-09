import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "\u20B9" + Math.round(n).toLocaleString("en-IN");

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ labTestId?: string }>;
}) {
  const { labTestId } = await searchParams;

  const session = await auth();
  if (!session) redirect("/login");
  if (!labTestId) redirect("/tests");

  const lt = await prisma.labTest.findUnique({
    where: { id: labTestId },
    include: { lab: true, test: true },
  });
  if (!lt || !lt.isAvailable || !lt.lab.isApproved || !lt.lab.isActive) notFound();

  const final = lt.price * (1 - lt.discount / 100);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Book your test</h1>

      <div className="mt-6 border rounded-xl bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-teal-700">{lt.test.category}</p>
        <h2 className="text-xl font-semibold">{lt.test.name}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {lt.lab.name}, {lt.lab.address}, {lt.lab.city}
        </p>
        {lt.test.preparation && (
          <p className="text-sm mt-2"><strong>Preparation:</strong> {lt.test.preparation}</p>
        )}
        <p className="mt-3">
          <span className="text-gray-500 line-through mr-2">{rupee(lt.price)}</span>
          <span className="text-2xl font-bold">{rupee(final)}</span>
          <span className="ml-2 text-sm text-green-700">{lt.discount}% off</span>
        </p>
      </div>

      <BookingForm labTestId={lt.id} />
    </main>
  );
}
