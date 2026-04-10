import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { query } from "@/app/API/lib/mysql";

type ReportPeriod = "weekly" | "monthly";

interface ReportRow extends RowDataPacket {
  report_uuid: string;
  user_id: number;
  period: ReportPeriod;
  range_label: string;
  report_payload: string;
  created_at: string;
}

let reportsTableReady = false;

const ensureReportsTable = async () => {
  if (reportsTableReady) return;

  await query<ResultSetHeader>(`
    CREATE TABLE IF NOT EXISTS admin_reports (
      report_id INT AUTO_INCREMENT PRIMARY KEY,
      report_uuid VARCHAR(36) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      period ENUM('weekly', 'monthly') NOT NULL,
      range_label VARCHAR(120) NOT NULL,
      report_payload LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_reports_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  reportsTableReady = true;
};

const toUserId = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePayload = (input: string) => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    await ensureReportsTable();

    const { searchParams } = new URL(request.url);
    const userId = toUserId(searchParams.get("user_id"));

    if (!userId) {
      return NextResponse.json({ error: "Valid user_id is required" }, { status: 400 });
    }

    const rows = await query<ReportRow>(
      `
        SELECT report_uuid, user_id, period, range_label, report_payload, created_at
        FROM admin_reports
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [userId]
    );

    const reports = rows
      .map((row) => {
        const payload = parsePayload(row.report_payload);
        if (!payload) return null;

        return {
          ...payload,
          id: row.report_uuid,
          period: row.period,
          rangeLabel: row.range_label,
          createdAt: payload.createdAt || new Date(row.created_at).toISOString(),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("[API Route] Get Reports Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureReportsTable();

    const body = await request.json();
    const userId = toUserId(String(body?.user_id ?? ""));
    const period = body?.period as ReportPeriod;
    const rangeLabel = String(body?.range_label || "").trim();
    const reportPayload = body?.report_payload;

    if (!userId) {
      return NextResponse.json({ error: "Valid user_id is required" }, { status: 400 });
    }

    if (period !== "weekly" && period !== "monthly") {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    if (!rangeLabel || !reportPayload || typeof reportPayload !== "object") {
      return NextResponse.json({ error: "range_label and report_payload are required" }, { status: 400 });
    }

    const reportId =
      typeof reportPayload.id === "string" && reportPayload.id.length > 0
        ? reportPayload.id
        : crypto.randomUUID();

    const payloadToSave = {
      ...reportPayload,
      id: reportId,
      period,
      rangeLabel,
    };

    await query<ResultSetHeader>(
      `
        INSERT INTO admin_reports (report_uuid, user_id, period, range_label, report_payload)
        VALUES (?, ?, ?, ?, ?)
      `,
      [reportId, userId, period, rangeLabel, JSON.stringify(payloadToSave)]
    );

    return NextResponse.json({ report: payloadToSave }, { status: 201 });
  } catch (error) {
    console.error("[API Route] Save Report Error:", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
