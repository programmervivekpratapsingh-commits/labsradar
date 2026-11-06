import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
      <p className="text-gray-600 mt-2">Role: {session.user.role}</p>
      <p className="text-gray-600">Email: {session.user.email}</p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6"
      >
        <button className="bg-gray-900 text-white rounded-lg px-4 py-2">Log out</button>
      </form>
    </main>
  );
}
