import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { query } from "@/app/API/lib/mysql";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await ensureReportsTable();

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = toUserId(searchParams.get("user_id"));

    if (!id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Valid user_id is required" }, { status: 400 });
    }

    const result = await query<ResultSetHeader>(
      `
        DELETE FROM admin_reports
        WHERE report_uuid = ? AND user_id = ?
      `,
      [id, userId]
    );

    if (!result[0] || result[0].affectedRows === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Report deleted" }, { status: 200 });
  } catch (error) {
    console.error("[API Route] Delete Report Error:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
