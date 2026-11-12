"use client";

import { useActionState } from "react";
import { createLab, type CreateLabState } from "./actions";

const initial: CreateLabState = {};

export default function CreateLabForm() {
  const [state, formAction, pending] = useActionState(createLab, initial);

  if (state.created) {
    return (
      <div className="mt-6 border border-green-200 bg-green-50 rounded-xl p-5">
        <h2 className="font-semibold text-green-900">{state.created.labName} was created</h2>
        <p className="text-sm mt-2">Send these login details to the lab. The password is shown only once.</p>
        <p className="mt-3 text-sm"><strong>Email:</strong> {state.created.managerEmail}</p>
        <p className="text-sm"><strong>Temporary password:</strong> <code>{state.created.password}</code></p>
        <p className="text-xs text-gray-600 mt-3">
          The lab is not visible to patients until you approve it on the Labs page.
        </p>
      </div>
    );
  }

  const input = "w-full border rounded-lg p-3";

  return (
    <form action={formAction} className="mt-6 border rounded-xl bg-white p-5 space-y-4">
      <input name="name" placeholder="Lab name" required className={input} />
      <input name="address" placeholder="Street address" required className={input} />
      <div className="grid grid-cols-2 gap-3">
        <input name="city" placeholder="City" required className={input} />
        <input name="pincode" placeholder="Pincode (6 digits)" required inputMode="numeric" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="phone" placeholder="Lab phone (10 digits)" required inputMode="numeric" className={input} />
        <input name="labEmail" type="email" placeholder="Lab email" required className={input} />
      </div>
      <input name="nablNumber" placeholder="NABL certificate number" required className={input} />

      <p className="text-sm font-medium pt-2">Lab manager login</p>
      <div className="grid grid-cols-2 gap-3">
        <input name="managerName" placeholder="Manager name" required className={input} />
        <input name="managerEmail" type="email" placeholder="Manager email (used to log in)" required className={input} />
      </div>

      {state.error && <p className="text-red-600 text-sm">{state.error}</p>}

      <button disabled={pending} className="bg-teal-600 text-white rounded-lg px-5 py-3 font-medium disabled:opacity-50">
        {pending ? "Creating..." : "Create lab"}
      </button>
    </form>
  );
}
