"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import FinalizeSignup from "./FinalizeSignup";

function FinalizeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");
  const firstName = searchParams.get("first_name") || "";
  const lastName = searchParams.get("last_name") || "";
  const photo = searchParams.get("photo") || "";
  const email = searchParams.get("email") || "";

  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If there's an error from OAuth callback
    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }

    // If already verified via Google OAuth, show the form
    if (verified === "true" && token && email) {
      setStatus("verified");
      return;
    }

    // First visit from email link: verify token then redirect to Google OAuth
    if (token && !verified) {
      (async () => {
        try {
          const res = await fetch(`/API/auth/verify-token?token=${token}`);
          const data = await res.json();

          if (!res.ok) {
            setStatus("error");
            setErrorMsg(data.message || "Invalid token.");
            return;
          }

          // Token is valid — redirect to Google OAuth
          window.location.href = `/API/auth/google?token=${token}`;
        } catch {
          setStatus("error");
          setErrorMsg("Failed to verify token. Please try again.");
        }
      })();
      return;
    }

    // No token at all
    setStatus("error");
    setErrorMsg("No registration token provided. Please use the link from your email.");
  }, [token, verified, error, email]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto mb-4" />
          <p className="text-[#113F67] font-medium">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <h2 className="text-xl font-bold text-[#113F67] mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <a
            href="/signup"
            className="inline-block bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-6 rounded transition-colors"
          >
            Back to Signup
          </a>
        </div>
      </div>
    );
  }

  return (
    <FinalizeSignup
      token={token!}
      firstName={firstName}
      lastName={lastName}
      photo={photo}
      email={email}
    />
  );
}

export default function FinalizeSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67]" />
        </div>
      }
    >
      <FinalizeContent />
    </Suspense>
  );
}
