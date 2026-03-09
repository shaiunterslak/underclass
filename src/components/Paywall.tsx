"use client";

import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface PaywallProps {
  onPaymentComplete: () => void;
  onContinueFree: () => void;
  personName?: string;
}

export default function Paywall({ onPaymentComplete, onContinueFree, personName }: PaywallProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleUnlock = useCallback(async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "" }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowCheckout(true);
      }
    } catch (err) {
      console.error("Failed to create checkout:", err);
    }
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem("underclass_paid", Date.now().toString());
    setShowCheckout(false);
    onPaymentComplete();
  }, [onPaymentComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop blur */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          {!showCheckout ? (
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center">
              {/* Icon */}
              <div className="text-4xl mb-4">⚡</div>

              <h2 className="text-xl font-bold text-white mb-3">
                This is expensive to run
              </h2>
              <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
                Each simulation costs real money in AI compute.
                {" "}This project is{" "}
                <a
                  href="https://github.com/shaiunterslak/underclass"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                >
                  100% open source
                </a>
                {" "}— feel free to run it locally for free, or help keep it running:
              </p>

              {/* Pay option */}
              <button
                onClick={handleUnlock}
                className="w-full py-3 px-6 bg-white text-black font-semibold rounded-xl 
                         hover:bg-zinc-200 active:scale-[0.98] transition-all
                         flex items-center justify-center gap-2 mb-3"
              >
                Pay $1.99 to continue
              </button>

              {/* Free option - cheaper model */}
              <button
                onClick={onContinueFree}
                className="w-full py-3 px-6 bg-zinc-800 text-zinc-300 font-medium rounded-xl 
                         hover:bg-zinc-700 hover:text-white active:scale-[0.98] transition-all
                         border border-zinc-700 text-sm"
              >
                Continue free with basic model
              </button>

              <p className="text-zinc-600 text-xs mt-4">
                Basic model is less creative but still fun
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-white font-semibold text-sm">Complete Payment</h3>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-zinc-500 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-white">
                {clientSecret && (
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      onComplete: handleComplete,
                    }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
