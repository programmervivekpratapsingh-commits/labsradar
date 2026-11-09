import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "LAB") redirect("/dashboard");

  return <>{children}</>;
}
