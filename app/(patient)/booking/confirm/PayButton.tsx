"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PayButton({
  bookingId,
  amountLabel,
  name,
  email,
}: {
  bookingId: string;
  amountLabel: string;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setError("");
    setLoading(true);

    const loaded = await loadCheckoutScript();
    if (!loaded || !window.Razorpay) {
      setError("Could not load the payment window. Check your internet and try again.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const order = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(order.error ?? "Could not start the payment");
      setLoading(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: "INR",
      name: "LabsRadar",
      description: "Diagnostic test booking",
      order_id: order.orderId,
      prefill: { name, email },
      theme: { color: "#0d9488" },
      modal: {
        ondismiss: () => setLoading(false),
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verify = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, ...response }),
        });
        if (!verify.ok) {
          const data = await verify.json().catch(() => ({}));
          setError(data.error ?? "Payment could not be verified");
          setLoading(false);
          return;
        }
        router.refresh();
      },
    });

    rzp.on("payment.failed", () => {
      setError("Payment failed. You can try again.");
      setLoading(false);
    });

    rzp.open();
  }

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={loading}
        className="bg-teal-600 text-white rounded-lg px-5 py-3 font-medium disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay " + amountLabel}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
