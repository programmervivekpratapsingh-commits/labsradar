"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name"));
    const email = String(form.get("email"));
    const phone = String(form.get("phone"));
    const password = String(form.get("password"));

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold">Create your LabsRadar account</h1>

        <input name="name" placeholder="Full name" required className="w-full border rounded-lg p-3" />
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded-lg p-3" />
        <input name="phone" type="tel" placeholder="Phone number" className="w-full border rounded-lg p-3" />
        <input name="password" type="password" placeholder="Password (min 8 characters)" required minLength={8} className="w-full border rounded-lg p-3" />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button disabled={loading} className="w-full bg-teal-600 text-white rounded-lg p-3 font-medium disabled:opacity-50">
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="text-sm text-center">
          Already have an account? <Link href="/login" className="text-teal-600 underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}
