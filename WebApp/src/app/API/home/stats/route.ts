import { NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "https://22102959.dcism.org/biocella-api";
const ENV_API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

type MicrobialItem = {
  classification?: string | null;
  publish_status?: string | null;
};

type SpecimenTypeStat = {
  type: string;
  count: number;
};

type HomepageStats = {
  carolinianCount: number;
  totalSpecimens: number;
  specimenTypes: SpecimenTypeStat[];
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

const getApiBaseCandidates = (): string[] => {
  const normalized = ENV_API_BASE_URL;
  const candidates = new Set<string>([normalized, DEFAULT_API_BASE_URL]);

  if (normalized.endsWith("/biocella-api")) {
    candidates.add(normalized.replace(/\/biocella-api$/, ""));
  } else {
    candidates.add(`${normalized}/biocella-api`);
  }

  return Array.from(candidates).filter(Boolean);
};

const tryParseJson = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const fetchHomepageStats = async (apiBaseUrl: string): Promise<HomepageStats | null> => {
  const statsResponse = await fetch(`${apiBaseUrl}/microbials/public/stats`, {
    cache: "no-store",
  });

  if (statsResponse.ok) {
    const statsData = await tryParseJson(statsResponse);

    if (statsData) {
      return {
        carolinianCount: Number(statsData?.carolinianCount || 0),
        totalSpecimens: Number(statsData?.totalSpecimens || 0),
        specimenTypes: Array.isArray(statsData?.specimenTypes) ? statsData.specimenTypes : [],
      };
    }
  }

  // Fallback for production backends that do not yet expose /microbials/public/stats.
  const microbialResponse = await fetch(`${apiBaseUrl}/microbials`, {
    cache: "no-store",
  });

  if (!microbialResponse.ok) {
    return null;
  }

  const microbialData = await tryParseJson(microbialResponse);
  if (!Array.isArray(microbialData)) {
    return null;
  }

  const microbials = microbialData as MicrobialItem[];
  const publishedMicrobials = microbials.filter(isPublished);

  return {
    carolinianCount: 0,
    totalSpecimens: publishedMicrobials.length,
    specimenTypes: toSpecimenTypeStats(publishedMicrobials),
  };
};

export async function GET() {
  try {
    const apiBaseCandidates = getApiBaseCandidates();

    for (const apiBaseUrl of apiBaseCandidates) {
      try {
        const data = await fetchHomepageStats(apiBaseUrl);
        if (data) {
          return NextResponse.json(data);
        }
      } catch {
        // Continue trying other possible base URL variants.
      }
    }

    return NextResponse.json(
      {
        carolinianCount: 0,
        totalSpecimens: 0,
        specimenTypes: [],
        error: "Failed to fetch homepage stats",
      },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch homepage stats" },
      { status: 500 }
    );
  }
}
