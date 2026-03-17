"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, QrCode, Printer, Lock } from "lucide-react";
import Image from "next/image";
import { isAuthenticated, getUserData } from "@/app/utils/authUtil";

interface SpecimenPublicViewProps {
  params: {
    id: string;
  };
  searchParams: {
    token?: string;
  };
}

export default function SpecimenPublicView({ params, searchParams }: SpecimenPublicViewProps) {
  const [specimen, setSpecimen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const isAuth = isAuthenticated();
      
      if (!isAuth) {
        // Redirect to login if not authenticated
        setRedirecting(true);
        router.push('/Login');
        return;
      }
      
      // Get user data and role
      const userData = getUserData();
      const role = userData?.role || localStorage.getItem('userRole');
      
      // If admin or RA, redirect to admin edit page
      if (role === 'admin' || role === 'RA' || role === 'ra') {
        setRedirecting(true);
        router.push(`/AdminUI/AdminDashBoard/Features/AdminCollection/specimen/${params.id}`);
        return;
      }
      
      // For students, show the specimen view
      setAuthenticated(true);
      setUserRole(role || null);
      fetchSpecimenDetails();
    };
    
    checkAuth();
  }, [params.id, router]);

  const fetchSpecimenDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/microbials/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSpecimen(data);
      }
    } catch (error) {
      console.error("Error fetching specimen details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintQR = () => {
    window.print();
  };

  const canEdit = () => {
    // Allow editing for Admin and RA (Research Assistant) roles
    return userRole === 'admin' || userRole === 'RA' || userRole === 'ra' || userRole === 'research_assistant';
  };

  const isStudent = () => {
    return userRole === 'student';
  };

  // Show redirecting message
  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching specimen data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading specimen details...</p>
        </div>
      </div>
    );
  }

  if (!specimen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Specimen not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d]"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hide on print */}
      <div className="bg-white shadow-md p-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#113F67]">BIOCELLA</h1>
              <p className="text-sm text-gray-600">Specimen Information Sheet</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            {/* Role Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              canEdit() 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {canEdit() ? (
                <span className="flex items-center gap-1">
                  <Edit className="w-3 h-3" />
                  {userRole === 'admin' ? 'Admin' : 'RA'} Access
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Read-Only (Student)
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePrintQR}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {canEdit() && (
              <button
                onClick={() => router.push(`/AdminUI/AdminDashBoard/Features/AdminCollection?edit=${params.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            {isStudent() && (
              <div className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                View Only
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Student Read-Only Notice */}
        {isStudent() && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Read-Only Access</p>
              <p className="text-sm text-blue-800">You can view specimen information but cannot edit. Contact an admin or RA to make changes.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images & QR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">Specimen Image</h2>
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                {specimen.image_url ? (
                  <Image
                    src={`${API_URL}${specimen.image_url}`}
                    alt={specimen.code_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No image available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow rounded-xl p-4 print:break-inside-avoid">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <QrCode className="h-5 w-5" />
                QR Code
              </h2>
              <div className="relative w-full h-48 bg-white border rounded-lg overflow-hidden flex items-center justify-center">
                {specimen.qr_code ? (
                  <Image
                    src={specimen.qr_code}
                    alt="QR Code"
                    width={180}
                    height={180}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-gray-400">QR code not generated</div>
                )}
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                Scan to view specimen details
              </p>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="Code Name" value={specimen.code_name} />
                <InfoItem label="Accession Number" value={specimen.accession_number || "N/A"} />
                <InfoItem label="Project" value={specimen.project_id?.title || "N/A"} />
                <InfoItem label="Project Code" value={specimen.project_id?.code || "N/A"} />
                <InfoItem label="Classification" value={specimen.project_id?.classification || "N/A"} badge />
                <InfoItem label="Locale" value={specimen.custom_fields?.locale || "N/A"} />
                <InfoItem label="Source" value={specimen.custom_fields?.source || "N/A"} />
                <InfoItem label="Storage Type" value={specimen.custom_fields?.storage_type || "N/A"} />
                <InfoItem label="Shelf" value={specimen.custom_fields?.shelf || "N/A"} />
                <InfoItem label="Funded By" value={specimen.custom_fields?.funded_by || "N/A"} />
              </div>
            </div>

            {/* Description */}
            {specimen.description && (
              <div className="bg-white shadow rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-3">Description</h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {specimen.description}
                </p>
              </div>
            )}

            {/* Additional Information */}
            {specimen.custom_fields && Object.keys(specimen.custom_fields).length > 0 && (
              <div className="bg-white shadow rounded-xl p-6 print:break-inside-avoid">
                <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(specimen.custom_fields).map(([key, value]: [string, any]) => {
                    if (!value) return null;
                    return <InfoItem key={key} label={key.replace(/_/g, " ")} value={value} />;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Only visible on print */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>BIOCELLA - Specimen Information System</p>
          <p>Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function InfoItem({ label, value, badge = false }: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
      <div className="mt-1">
        {badge ? (
          <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full capitalize">
            {value}
          </span>
        ) : (
          <p className="text-sm text-gray-800">{value}</p>
        )}
      </div>
    </div>
  );
}
