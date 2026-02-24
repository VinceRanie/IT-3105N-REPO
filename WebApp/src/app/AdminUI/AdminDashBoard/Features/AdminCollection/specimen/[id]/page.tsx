"use client";

import { useState, useEffect, use } from "react";
import { API_URL } from "@/config/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, QrCode, Trash2, Plus } from "lucide-react";
import Image from "next/image";

interface SpecimenDetailProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SpecimenDetailPage({ params }: SpecimenDetailProps) {
  const resolvedParams = use(params);
  const [specimen, setSpecimen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const router = useRouter();

  useEffect(() => {
    if (!resolvedParams.id || resolvedParams.id === 'undefined') {
      console.error("Invalid specimen ID:", resolvedParams.id);
      setLoading(false);
      return;
    }
    fetchSpecimenDetails();
  }, [resolvedParams.id]);

  const fetchSpecimenDetails = async () => {
    try {
      setLoading(true);
      console.log("Fetching specimen with ID:", resolvedParams.id);
      const response = await fetch(`${API_URL}/microbials/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setSpecimen(data);
      } else {
        console.error("Failed to fetch specimen:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching specimen details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this specimen?")) return;
    
    try {
      const response = await fetch(`${API_URL}/microbials/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Specimen deleted successfully!");
        router.push("/AdminUI/AdminDashBoard/Features/AdminCollection");
      } else {
        alert("Failed to delete specimen");
      }
    } catch (error) {
      console.error("Error deleting specimen:", error);
      alert("Error deleting specimen");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading specimen details...</p>
        </div>
      </div>
    );
  }

  if (!specimen) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-600">Specimen not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#113F67]">Specimen Details</h1>
              <p className="text-gray-600">Code: {specimen.code_name}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/AdminUI/AdminDashBoard/Features/AdminCollection?edit=${resolvedParams.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            {["info", "bioactivity", "biochemical", "morphology", "genome"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "text-[#113F67] border-b-2 border-[#113F67]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

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

            <div className="bg-white shadow rounded-xl p-4">
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
                Scan to view public specimen details
              </p>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "info" && (
              <>
                {/* Basic Information */}
                <div className="bg-white shadow rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem label="Code Name" value={specimen.code_name} />
                    <InfoItem label="Accession Number" value={specimen.accession_no || specimen.accession_number || "N/A"} />
                    <InfoItem label="Project" value={specimen.project_id?.title || "N/A"} />
                    <InfoItem label="Project Code" value={specimen.project_id?.code || "N/A"} />
                    <InfoItem label="Classification" value={specimen.classification || specimen.project_id?.classification || "N/A"} />
                    <InfoItem label="Locale" value={specimen.locale || "N/A"} />
                    <InfoItem label="Source" value={specimen.source || "N/A"} />
                    <InfoItem label="Project Fund" value={specimen.project_fund || "N/A"} />
                    <InfoItem label="Date Accessed" value={specimen.date_accessed ? new Date(specimen.date_accessed).toLocaleDateString() : "N/A"} />
                    <InfoItem label="Similarity" value={specimen.similarity_percent ? `${specimen.similarity_percent}%` : "N/A"} />
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

                {/* Custom Fields */}
                {specimen.custom_fields && Object.keys(specimen.custom_fields).length > 0 && (
                  <div className="bg-white shadow rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(specimen.custom_fields).map(([key, value]: [string, any]) => (
                        <InfoItem key={key} label={key.replace(/_/g, " ")} value={value || "N/A"} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "bioactivity" && (
              <div className="bg-white shadow rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Bioactivity Data</h2>
                {specimen.activity || specimen.result ? (
                  <div className="space-y-4">
                    {specimen.activity && <InfoItem label="Activity" value={specimen.activity} />}
                    {specimen.result && <InfoItem label="Result" value={specimen.result} />}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No bioactivity data available yet.</p>
                )}
              </div>
            )}

            {activeTab === "biochemical" && (
              <div className="bg-white shadow rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Biochemical Characteristics</h2>
                {specimen.biochemical_tests || specimen.catalase || specimen.oxidase || specimen.hemolysis ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {specimen.catalase && <InfoItem label="Catalase" value={specimen.catalase} badge />}
                      {specimen.oxidase && <InfoItem label="Oxidase" value={specimen.oxidase} badge />}
                      {specimen.hemolysis && <InfoItem label="Hemolysis" value={specimen.hemolysis} badge />}
                    </div>
                    
                    {specimen.biochemical_tests && (
                      <>
                        <h3 className="text-md font-medium mb-3 mt-4">Test Results</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {Object.entries(specimen.biochemical_tests)
                            .filter(([_, value]) => value && value !== '')
                            .map(([key, value]: [string, any]) => (
                              <div key={key} className="text-center p-2 border rounded">
                                <div className="text-xs font-medium text-gray-500 uppercase mb-1">{key}</div>
                                <div className={`text-lg font-bold ${
                                  value === '+' ? 'text-green-600' : 
                                  value === '-' ? 'text-red-600' : 
                                  'text-gray-800'
                                }`}>{value}</div>
                              </div>
                            ))
                          }
                        </div>
                      </>
                    )}
                    
                    {specimen.growth_media && (
                      <div className="mt-6">
                        <InfoItem label="Growth Media" value={specimen.growth_media} />
                      </div>
                    )}
                    {specimen.special_reqs && (
                      <div className="mt-4">
                        <InfoItem label="Special Requirements" value={specimen.special_reqs} />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">No biochemical data available yet.</p>
                )}
              </div>
            )}

            {activeTab === "morphology" && (
              <div className="bg-white shadow rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Morphology Data</h2>
                  <button className="flex items-center gap-2 px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                    <Plus className="w-4 h-4" />
                    Add Data
                  </button>
                </div>
                <p className="text-gray-500 text-sm">No morphology data available yet.</p>
              </div>
            )}

            {activeTab === "genome" && (
              <div className="bg-white shadow rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Genome Sequence Data</h2>
                {specimen.fasta_sequence || specimen.fasta_file || specimen.blast_results ? (
                  <div className="space-y-6">
                    {specimen.fasta_file && (
                      <InfoItem label="FASTA File" value={specimen.fasta_file} mono />
                    )}
                    {specimen.fasta_sequence && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">FASTA Sequence</span>
                        <pre className="mt-2 p-4 bg-gray-50 rounded text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                          {specimen.fasta_sequence}
                        </pre>
                      </div>
                    )}
                    {specimen.blast_rid && (
                      <InfoItem label="BLAST RID" value={specimen.blast_rid} mono />
                    )}
                    {specimen.blast_results && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">BLAST Results</span>
                        <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                          {JSON.stringify(specimen.blast_results, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No genome sequence data available yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono = false, italic = false, badge = false }: {
  label: string;
  value: string;
  mono?: boolean;
  italic?: boolean;
  badge?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
      <div className={`mt-1 ${mono ? "font-mono" : ""} ${italic ? "italic" : ""}`}>
        {badge ? (
          <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
            {value}
          </span>
        ) : (
          <p className="text-sm text-gray-800">{value}</p>
        )}
      </div>
    </div>
  );
}
