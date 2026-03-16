import { Suspense } from 'react';
import FinalizeSignup from './FinalizeSignup';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function FinalizeSignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FinalizeSignup />
    </Suspense>
  );
}
