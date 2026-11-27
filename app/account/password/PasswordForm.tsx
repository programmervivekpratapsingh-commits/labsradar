"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";

const initial: PasswordState = {};

export default function PasswordForm({ homeHref }: { homeHref: string }) {
  const [state, formAction, pending] = useActionState(changePassword, initial);

  if (state.done) {
    return (
      <div className="mt-6 border border-green-200 bg-green-50 rounded-xl p-5">
        <p className="font-semibold text-green-900">Your password has been changed.</p>
        <Link href={homeHref} className="inline-block mt-3 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm">
          Continue
        </Link>
      </div>
    );
  }

  const input = "w-full border rounded-lg p-3";

  return (
    <form action={formAction} className="mt-6 border rounded-xl bg-white p-5 space-y-4">
      <input
        name="current"
        type="password"
        placeholder="Current password"
        autoComplete="current-password"
        required
        className={input}
      />
      <input
        name="next"
        type="password"
        placeholder="New password (at least 8 characters)"
        autoComplete="new-password"
        required
        minLength={8}
        className={input}
      />
      <input
        name="confirm"
        type="password"
        placeholder="Repeat the new password"
        autoComplete="new-password"
        required
        minLength={8}
        className={input}
      />

      {state.error && <p className="text-red-600 text-sm">{state.error}</p>}

      <button disabled={pending} className="bg-teal-600 text-white rounded-lg px-5 py-3 font-medium disabled:opacity-50">
        {pending ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
