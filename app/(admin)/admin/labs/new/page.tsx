import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CreateLabForm from "./CreateLabForm";

export default async function NewLabPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link href="/admin/labs" className="text-sm text-teal-700 underline">
        All labs
      </Link>
      <h1 className="text-2xl font-bold mt-2">Add a lab</h1>
      <p className="text-sm text-gray-600">
        Check the NABL certificate before you create the lab. You approve it afterwards on the Labs page.
      </p>
      <CreateLabForm />
    </main>
  );
}
