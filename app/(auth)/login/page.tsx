"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Log in to LabsRadar</h1>

        <input name="email" type="email" placeholder="Email" required className="w-full border rounded-lg p-3" />
        <input name="password" type="password" placeholder="Password" required className="w-full border rounded-lg p-3" />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button disabled={loading} className="w-full bg-teal-600 text-white rounded-lg p-3 font-medium disabled:opacity-50">
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-center">
          New here? <Link href="/register" className="text-teal-600 underline">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
