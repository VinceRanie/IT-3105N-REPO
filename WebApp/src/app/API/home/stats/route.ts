import { NextResponse } from "next/server";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://22102959.dcism.org/biocella-api").replace(/\/$/, "");

type MicrobialItem = {
  classification?: string | null;
  publish_status?: string | null;
};

type SpecimenTypeStat = {
  type: string;
  count: number;
};

const isPublished = (item: MicrobialItem) => {
  const status = (item.publish_status || "published").toString().trim().toLowerCase();
  return status !== "unpublished";
};

const toSpecimenTypeStats = (items: MicrobialItem[]): SpecimenTypeStat[] => {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const typeRaw = (item.classification || "Unknown").toString().trim();
    const type = typeRaw.length > 0 ? typeRaw : "Unknown";
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
};

export async function GET() {
  try {
    const statsResponse = await fetch(`${API_BASE_URL}/microbials/public/stats`, {
      cache: "no-store",
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      return NextResponse.json({
        carolinianCount: Number(statsData?.carolinianCount || 0),
        totalSpecimens: Number(statsData?.totalSpecimens || 0),
        specimenTypes: Array.isArray(statsData?.specimenTypes) ? statsData.specimenTypes : [],
      });
    }

    // Fallback for production backends that do not yet expose /microbials/public/stats.
    const microbialResponse = await fetch(`${API_BASE_URL}/microbials`, {
      cache: "no-store",
    });

    if (!microbialResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch homepage stats" },
        { status: microbialResponse.status }
      );
    }

    const microbialData = await microbialResponse.json();
    const microbials = Array.isArray(microbialData) ? (microbialData as MicrobialItem[]) : [];
    const publishedMicrobials = microbials.filter(isPublished);

    return NextResponse.json({
      carolinianCount: 0,
      totalSpecimens: publishedMicrobials.length,
      specimenTypes: toSpecimenTypeStats(publishedMicrobials),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch homepage stats" },
      { status: 500 }
    );
  }
}
