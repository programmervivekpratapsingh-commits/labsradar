import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Navbar() {
  const session = await auth();
  const role = session?.user?.role;

  const home =
    role === "ADMIN" ? "/admin/dashboard" : role === "LAB" ? "/lab/dashboard" : "/dashboard";
  const homeLabel =
    role === "ADMIN" ? "Admin" : role === "LAB" ? "Lab dashboard" : "My bookings";

  return (
    <header className="bg-white border-b">
      <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold text-teal-700">
          LabsRadar
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/tests" className="hover:text-teal-700">
            Tests
          </Link>

          {session ? (
            <>
              <Link href={home} className="hover:text-teal-700">
                {homeLabel}
              </Link><Link href="/account/password" className="hover:text-teal-700">Password</Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="border rounded-lg px-3 py-1.5 hover:bg-gray-50">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-teal-700">
                Log in
              </Link>
              <Link href="/register" className="bg-teal-600 text-white rounded-lg px-3 py-1.5">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

