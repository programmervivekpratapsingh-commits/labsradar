"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SLOTS = [
  { value: "07:00", label: "7:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

export default function BookingForm({ labTestId }: { labTestId: string }) {
  const router = useRouter();
  const [type, setType] = useState<"IN_LAB" | "HOME_VISIT">("IN_LAB");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        labTestId,
        type,
        date: String(form.get("date")),
        slot: String(form.get("slot")),
        address: String(form.get("address") ?? ""),
        notes: String(form.get("notes") ?? ""),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    router.push("/booking/confirm?id=" + data.id);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <p className="font-medium mb-2">How would you like to give your sample?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("IN_LAB")}
            className={"border rounded-lg p-3 text-left " + (type === "IN_LAB" ? "border-teal-600 bg-teal-50" : "bg-white")}
          >
            <strong>Visit the lab</strong>
            <span className="block text-xs text-gray-600">Walk in at your chosen time</span>
          </button>
          <button
            type="button"
            onClick={() => setType("HOME_VISIT")}
            className={"border rounded-lg p-3 text-left " + (type === "HOME_VISIT" ? "border-teal-600 bg-teal-50" : "bg-white")}
          >
            <strong>Home visit</strong>
            <span className="block text-xs text-gray-600">We collect the sample at home</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input name="date" type="date" min={today} required className="w-full border rounded-lg p-3" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time slot</label>
          <select name="slot" required className="w-full border rounded-lg p-3 bg-white">
            {SLOTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {type === "HOME_VISIT" && (
        <div>
          <label className="block text-sm font-medium mb-1">Collection address</label>
          <textarea
            name="address"
            required
            minLength={10}
            rows={3}
            placeholder="House/flat number, building, street, area, pincode"
            className="w-full border rounded-lg p-3"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea name="notes" rows={2} maxLength={500} className="w-full border rounded-lg p-3" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button disabled={loading} className="w-full bg-teal-600 text-white rounded-lg p-3 font-medium disabled:opacity-50">
        {loading ? "Booking..." : "Confirm booking"}
      </button>
    </form>
  );
}
