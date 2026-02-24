"use client";

import { useState, useEffect, use } from "react";
import { API_URL } from "@/config/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, QrCode, Trash2, Plus, Download, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import jsPDF from "jspdf";

interface SpecimenDetailProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SpecimenDetailPage({ params }: SpecimenDetailProps) {
  const resolvedParams = use(params);
  const [specimen, setSpecimen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [expandedBlastResults, setExpandedBlastResults] = useState<Set<number>>(new Set());
  const [blastLoading, setBlastLoading] = useState(false);
  const [blastPolling, setBlastPolling] = useState(false);
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

  const downloadQRCode = () => {
    if (!specimen.qr_code) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = specimen.qr_code;
    link.download = `QR_${specimen.code_name}_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleBlastResult = (index: number) => {
    setExpandedBlastResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const submitBlast = async () => {
    if (!specimen.fasta_sequence) {
      alert("No FASTA sequence available to submit for BLAST");
      return;
    }

    setBlastLoading(true);
    try {
      const response = await fetch(`${API_URL}/microbials/${resolvedParams.id}/blast`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`BLAST submitted successfully! RID: ${data.rid}\n\nResults will be available in ${data.estimatedTime}`);
        
        // Refresh specimen to get the RID
        await fetchSpecimenDetails();
        
        // Start polling for results
        startBlastPolling();
      } else {
        const error = await response.json();
        alert(`Failed to submit BLAST: ${error.error}`);
      }
    } catch (error) {
      console.error("Error submitting BLAST:", error);
      alert("Error submitting BLAST");
    } finally {
      setBlastLoading(false);
    }
  };

  const checkBlastResults = async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        `${API_URL}/microbials/${resolvedParams.id}/blast/results`,
        { 
          signal: controller.signal,
          mode: 'cors'
        }
      );
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'completed') {
          // Refresh specimen to show results
          await fetchSpecimenDetails();
          setBlastPolling(false);
          alert("BLAST results are ready!");
          return true;
        } else if (data.status === 'pending') {
          console.log("BLAST still pending...");
          return false;
        } else if (data.status === 'failed') {
          setBlastPolling(false);
          alert("BLAST search failed");
          return true;
        }
      } else {
        console.warn(`BLAST check returned status ${response.status}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn("BLAST results check timed out - will retry");
      } else {
        console.error("Error checking BLAST results:", error);
      }
      // Don't stop polling on network errors, just log and continue
    }
    return false;
  };

  const startBlastPolling = () => {
    setBlastPolling(true);
    
    let pollCount = 0;
    const maxPolls = 30; // 30 attempts = 5 minutes
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      const isComplete = await checkBlastResults();
      if (isComplete) {
        clearInterval(pollInterval);
      } else if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setBlastPolling(false);
        console.log("BLAST polling stopped after 5 minutes");
      }
    }, 10000); // Check every 10 seconds
  };

  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const lineHeight = 7;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      // Helper function to add new page if needed
      const checkPageBreak = (additionalSpace = 10) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Helper function to convert image to base64 with timeout
      const getImageBase64 = async (url: string, timeoutMs: number = 8000): Promise<string | null> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          
          const response = await fetch(url, { 
            signal: controller.signal,
            mode: 'cors'
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status}`);
            return null;
          }
          
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => {
              console.error("FileReader error");
              resolve(null);
            };
            reader.readAsDataURL(blob);
          });
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.warn("Image fetch timeout - continuing without image");
          } else {
            console.error("Error loading image:", error.message);
          }
          return null;
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Specimen Information Report", margin, yPos);
      yPos += 10;

      // Horizontal line
      doc.setDrawColor(17, 63, 103);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Add specimen image on the left if available
      let imageHeight = 0;
      if (specimen.image_url) {
        const imageUrl = `${API_URL}${specimen.image_url}`;
        const imageData = await getImageBase64(imageUrl);
        
        if (imageData) {
          try {
            const imgWidth = 50;
            const imgHeight = 50;
            
            doc.addImage(imageData, 'JPEG', margin, yPos, imgWidth, imgHeight);
            imageHeight = imgHeight + 5; // Add spacing
          } catch (error) {
            console.error("Error adding image to PDF:", error);
          }
        }
      }

      // Basic Information (next to or below image)
      const infoStartX = specimen.image_url ? margin + 55 : margin;
      const infoStartY = yPos;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Basic Information", infoStartX, yPos);
      yPos += lineHeight;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const basicInfo = [
        ["Code Name:", specimen.code_name],
        ["Accession Number:", specimen.accession_no || specimen.accession_number || "N/A"],
        ["Classification:", specimen.classification || "N/A"],
        ["Source:", specimen.source || "N/A"],
        ["Locale:", specimen.locale || "N/A"],
        ["Project:", specimen.project_id?.title || "N/A"],
        ["Project Fund:", specimen.project_fund || "N/A"],
        ["Date Accessed:", specimen.date_accessed ? new Date(specimen.date_accessed).toLocaleDateString() : "N/A"],
        ["Similarity:", specimen.similarity_percent ? `${specimen.similarity_percent}%` : "N/A"],
      ];

      basicInfo.forEach(([label, value]) => {
        checkPageBreak();
        doc.setFont("helvetica", "bold");
        doc.text(label, infoStartX, yPos);
        doc.setFont("helvetica", "normal");
        const valueText = doc.splitTextToSize(String(value), pageWidth - infoStartX - margin - 45);
        doc.text(valueText, infoStartX + 45, yPos);
        yPos += lineHeight;
      });

      // Move yPos past image if it's taller than the info
      if (imageHeight > 0) {
        const textHeight = (basicInfo.length + 1) * lineHeight;
        if (imageHeight > textHeight) {
          yPos = infoStartY + imageHeight;
        }
      }

    // Description
    if (specimen.description) {
      yPos += 5;
      checkPageBreak(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Description", margin, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(specimen.description, contentWidth);
      descLines.forEach((line: string) => {
        checkPageBreak();
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
    }

    // Biochemical Tests
    if (specimen.biochemical_tests || specimen.catalase || specimen.oxidase) {
      yPos += 5;
      checkPageBreak(20);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Biochemical Characteristics", margin, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (specimen.catalase) {
        doc.text(`Catalase: ${specimen.catalase}`, margin, yPos);
        yPos += lineHeight;
      }
      if (specimen.oxidase) {
        doc.text(`Oxidase: ${specimen.oxidase}`, margin, yPos);
        yPos += lineHeight;
      }
      if (specimen.hemolysis) {
        doc.text(`Hemolysis: ${specimen.hemolysis}`, margin, yPos);
        yPos += lineHeight;
      }
      if (specimen.growth_media) {
        doc.text(`Growth Media: ${specimen.growth_media}`, margin, yPos);
        yPos += lineHeight;
      }

      if (specimen.biochemical_tests) {
        yPos += 3;
        doc.setFont("helvetica", "bold");
        doc.text("Test Results:", margin, yPos);
        yPos += lineHeight;
        doc.setFont("helvetica", "normal");

        const tests = Object.entries(specimen.biochemical_tests)
          .filter(([_, value]) => value && value !== '');
        
        let xPos = margin;
        tests.forEach(([key, value]: [string, any], index) => {
          if (index > 0 && index % 3 === 0) {
            yPos += lineHeight;
            xPos = margin;
            checkPageBreak();
          }
          doc.text(`${key.toUpperCase()}: ${value}`, xPos, yPos);
          xPos += 60;
        });
        yPos += lineHeight;
      }

      if (specimen.special_reqs) {
        yPos += 3;
        doc.text(`Special Requirements: ${specimen.special_reqs}`, margin, yPos);
        yPos += lineHeight;
      }
    }

    // Bioactivity
    if (specimen.activity || specimen.result) {
      yPos += 5;
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Bioactivity Data", margin, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (specimen.activity) {
        doc.text(`Activity: ${specimen.activity}`, margin, yPos);
        yPos += lineHeight;
      }
      if (specimen.result) {
        const resultLines = doc.splitTextToSize(`Result: ${specimen.result}`, contentWidth);
        resultLines.forEach((line: string) => {
          checkPageBreak();
          doc.text(line, margin, yPos);
          yPos += lineHeight;
        });
      }
    }

    // Genome Data
    if (specimen.fasta_file || specimen.fasta_sequence || specimen.blast_results) {
      yPos += 5;
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Genome Sequence Data", margin, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (specimen.fasta_file) {
        doc.text(`FASTA File: ${specimen.fasta_file}`, margin, yPos);
        yPos += lineHeight;
      }
      if (specimen.blast_rid) {
        doc.text(`BLAST RID: ${specimen.blast_rid}`, margin, yPos);
        yPos += lineHeight;
      }
      if (specimen.fasta_sequence) {
        yPos += 3;
        doc.setFont("helvetica", "bold");
        doc.text("FASTA Sequence:", margin, yPos);
        yPos += lineHeight;
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        const seqLines = specimen.fasta_sequence.match(/.{1,80}/g) || [];
        seqLines.forEach((line: string) => {
          checkPageBreak();
          doc.text(line, margin, yPos);
          yPos += 5;
        });
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
      }
    }

    // Custom Fields
    if (specimen.custom_fields && Object.keys(specimen.custom_fields).length > 0) {
      yPos += 5;
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Additional Information", margin, yPos);
      yPos += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      Object.entries(specimen.custom_fields).forEach(([key, value]) => {
        checkPageBreak();
        doc.setFont("helvetica", "bold");
        doc.text(`${key.replace(/_/g, ' ')}:`, margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), margin + 50, yPos);
        yPos += lineHeight;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

      // Save PDF
      doc.save(`Specimen_${specimen.code_name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
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
              onClick={generatePDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </button>
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
              {specimen.qr_code && (
                <button
                  onClick={downloadQRCode}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </button>
              )}
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Genome Sequence Data</h2>
                  {specimen.fasta_sequence && !specimen.blast_results && !blastLoading && !blastPolling && (
                    <button 
                      onClick={submitBlast}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Run BLAST Analysis
                    </button>
                  )}
                  {blastLoading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting to NCBI...
                    </div>
                  )}
                  {blastPolling && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for results...
                    </div>
                  )}
                </div>

                {specimen.fasta_sequence || specimen.fasta_file || specimen.blast_results ? (
                  <div className="space-y-6">
                    {/* FASTA File Name */}
                    {specimen.fasta_file && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">FASTA File</span>
                        <p className="mt-1 text-sm text-gray-800 font-mono">{specimen.fasta_file}</p>
                      </div>
                    )}

                    {/* FASTA Sequence */}
                    {specimen.fasta_sequence && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">FASTA Sequence</span>
                        <pre className="mt-2 p-4 bg-gray-50 rounded text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto border border-gray-200">
                          {specimen.fasta_sequence}
                        </pre>
                      </div>
                    )}

                    {/* BLAST Status */}
                    {specimen.blast_rid && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-blue-700 uppercase">BLAST Request ID</span>
                          <span className="text-sm font-mono text-blue-900">{specimen.blast_rid}</span>
                        </div>
                        {!specimen.blast_results && (
                          <p className="text-xs text-blue-600 mt-2">
                            BLAST analysis in progress. Results typically available in 30-60 seconds.
                          </p>
                        )}
                      </div>
                    )}

                    {/* BLAST Results - Top 10 Similar Sequences */}
                    {specimen.blast_results && specimen.blast_results.matches && specimen.blast_results.matches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            BLAST Results - Top {specimen.blast_results.matches.length} Similar Sequences
                          </span>
                          <span className="text-xs text-gray-500">
                            {specimen.blast_results.totalHits} total hits found
                          </span>
                        </div>

                        {/* Top Hit Summary */}
                        {specimen.blast_results.topHit && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-green-900">Best Match</p>
                                <p className="text-xs text-green-700 mt-1">
                                  {specimen.blast_results.topHit.title}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">
                                  {specimen.blast_results.topHit.similarity}%
                                </div>
                                <p className="text-xs text-green-700">Similarity</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* All Results - Collapsible */}
                        <div className="space-y-3">
                          {specimen.blast_results.matches.map((match: any, index: number) => {
                            const isExpanded = expandedBlastResults.has(index);
                            const ncbiUrl = `https://www.ncbi.nlm.nih.gov/nuccore/${match.accession}`;
                            
                            return (
                              <div 
                                key={index} 
                                className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors"
                              >
                                {/* Header - Always Visible */}
                                <div 
                                  className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => toggleBlastResult(index)}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      {/* Rank and Accession */}
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">
                                          {index + 1}
                                        </span>
                                        <a
                                          href={ncbiUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-mono text-sm font-medium"
                                        >
                                          {match.accession}
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                      
                                      {/* Title */}
                                      <p className="text-sm text-gray-800 line-clamp-2">
                                        {match.title}
                                      </p>
                                    </div>

                                    {/* Similarity Badge */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <div className="text-right">
                                        <div className={`text-lg font-bold ${
                                          match.similarity >= 95 ? 'text-green-600' :
                                          match.similarity >= 85 ? 'text-blue-600' :
                                          match.similarity >= 75 ? 'text-orange-600' :
                                          'text-gray-600'
                                        }`}>
                                          {match.similarity}%
                                        </div>
                                        <p className="text-xs text-gray-500">identity</p>
                                      </div>
                                      
                                      {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="p-4 bg-white border-t border-gray-200">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">E-value</p>
                                        <p className="text-sm text-gray-800 font-mono">
                                          {match.evalue.toExponential(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Bit Score</p>
                                        <p className="text-sm text-gray-800 font-mono">
                                          {match.score.toFixed(1)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Identity</p>
                                        <p className="text-sm text-gray-800 font-mono">
                                          {match.identity} / {match.alignLength}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Align Length</p>
                                        <p className="text-sm text-gray-800 font-mono">
                                          {match.alignLength} bp
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Full Title */}
                                    <div className="mt-4">
                                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Full Description</p>
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        {match.title}
                                      </p>
                                    </div>

                                    {/* View on NCBI Button */}
                                    <div className="mt-4">
                                      <a
                                        href={ncbiUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        View Full Details on NCBI
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Analysis Info */}
                        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs text-gray-600">
                            <strong>Note:</strong> Results are from NCBI BLAST against the nucleotide (nt) database. 
                            Click on any accession number or "View Full Details" to see complete information on the NCBI website.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No BLAST Results Yet */}
                    {specimen.blast_rid && (!specimen.blast_results || !specimen.blast_results.matches || specimen.blast_results.matches.length === 0) && (
                      <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          {blastPolling ? (
                            <>
                              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                              <p className="text-gray-700 font-medium">Checking for BLAST results...</p>
                              <p className="text-sm text-gray-600">
                                RID: <span className="font-mono">{specimen.blast_rid}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                Results typically available in 30-60 seconds after submission
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-700 mb-1">BLAST results not yet available</p>
                              <p className="text-xs text-gray-500 mb-3">
                                RID: <span className="font-mono">{specimen.blast_rid}</span>
                              </p>
                              <button
                                onClick={async () => {
                                  setBlastPolling(true);
                                  const isComplete = await checkBlastResults();
                                  if (!isComplete) {
                                    setTimeout(() => setBlastPolling(false), 2000);
                                  }
                                }}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Check Results Now
                              </button>
                              <p className="text-xs text-gray-500 mt-2">
                                Click to manually check if results are ready
                              </p>
                            </>
                          )}
                        </div>
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
