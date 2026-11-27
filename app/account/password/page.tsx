import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PasswordForm from "./PasswordForm";

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { required } = await searchParams;
  const role = session.user.role;
  const homeHref =
    role === "ADMIN" ? "/admin/dashboard" : role === "LAB" ? "/lab/dashboard" : "/dashboard";

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold">Change your password</h1>
      {required ? (
        <p className="mt-3 rounded-lg bg-yellow-50 text-yellow-900 p-3 text-sm">
          For your security, please choose a new password before you continue.
        </p>
      ) : (
        <p className="text-sm text-gray-600 mt-1">{session.user.email}</p>
      )}
      <PasswordForm homeHref={homeHref} />
    </main>
  );
}
