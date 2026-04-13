"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";
import { getUserData } from "@/app/utils/authUtil";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Download, FileText, RefreshCcw, Trash2, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";

type ReportPeriod = "weekly" | "monthly";

type AppointmentItem = {
  appointment_id?: number | string | null;
  status?: string | null;
  appointment_source?: string | null;
  date?: string | Date | null;
  no_show_at?: string | Date | null;
};

type UsageItem = {
  log_id?: number | string | null;
  date_used?: string | Date | null;
};

type MicrobialItem = {
  _id?: string;
  created_at?: string | Date | null;
};

type ChemicalItem = {
  chemical_id?: number | string | null;
  type?: string | null;
};

type BatchItem = {
  chemical_id?: number | string | null;
  quantity?: number | string | null;
  used_quantity?: number | string | null;
};

type UserItem = {
  user_id?: number | string | null;
  created_at?: string | Date | null;
};

type UsersResponse = {
  users?: UserItem[];
};

type StatusBreakdown = {
  name: string;
  value: number;
};

type ActivityByDay = {
  day: string;
  appointments: number;
  usageLogs: number;
  specimens: number;
  users: number;
};

type ReportSummary = {
  appointments: number;
  internalAppointments?: number;
  outsiderAppointments?: number;
  usageLogs: number;
  newSpecimens: number;
  newUsers: number;
  activeChemicals: number;
};

type ReportSnapshot = {
  id: string;
  createdAt: string;
  period: ReportPeriod;
  rangeLabel: string;
  summary: ReportSummary;
  statusBreakdown: StatusBreakdown[];
  appointmentSourceBreakdown?: StatusBreakdown[];
  activityByDay: ActivityByDay[];
};

const PIE_COLORS = ["#113F67", "#10B981", "#F59E0B", "#EF4444", "#6B7280", "#3B82F6"];

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dayLabel = (date: Date) => {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getRange = (period: ReportPeriod) => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (period === "weekly" ? 6 : 29));
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const inRange = (input: string | Date | null | undefined, start: Date, end: Date) => {
  const date = parseDate(input);
  if (!date) return false;
  return date >= start && date <= end;
};

const getStatusLabel = (status: string) => {
  const normalized = String(status || "unknown").toLowerCase();
  if (normalized === "no_show") return "No-Show";
  return normalized.replace(/_/g, " ");
};

const getAppointmentReportDate = (appointment: AppointmentItem) => {
  const status = String(appointment.status || "").toLowerCase();
  if (status === "no_show") {
    return appointment.no_show_at || appointment.date || null;
  }
  return appointment.date || null;
};

const makeCsv = (report: ReportSnapshot) => {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Meta,Generated At,${report.createdAt}`);
  lines.push(`Meta,Period,${report.period}`);
  lines.push(`Meta,Range,${report.rangeLabel}`);
  lines.push(`Summary,Appointments,${report.summary.appointments}`);
  lines.push(`Summary,Internal Appointments,${report.summary.internalAppointments ?? 0}`);
  lines.push(`Summary,Outsider Appointments,${report.summary.outsiderAppointments ?? 0}`);
  lines.push(`Summary,Usage Logs,${report.summary.usageLogs}`);
  lines.push(`Summary,New Specimens,${report.summary.newSpecimens}`);
  lines.push(`Summary,New Users,${report.summary.newUsers}`);
  lines.push(`Summary,Active Chemicals,${report.summary.activeChemicals}`);

  lines.push("\nStatus Breakdown,Status,Count");
  report.statusBreakdown.forEach((item) => {
    lines.push(`Status Breakdown,${item.name},${item.value}`);
  });

  lines.push("\nAppointment Source Breakdown,Source,Count");
  (report.appointmentSourceBreakdown || []).forEach((item) => {
    lines.push(`Appointment Source Breakdown,${item.name},${item.value}`);
  });

  lines.push("\nActivity Timeline,Day,Appointments,Usage Logs,Specimens,Users");
  report.activityByDay.forEach((item) => {
    lines.push(
      `Activity Timeline,${item.day},${item.appointments},${item.usageLogs},${item.specimens},${item.users}`
    );
  });

  return lines.join("\n");
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const toImageDataUrl = async (path: string) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Unable to load report logo");
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to convert report logo"));
    };
    reader.onerror = () => reject(new Error("Unable to read report logo"));
    reader.readAsDataURL(blob);
  });
};

const exportReportPdf = async (report: ReportSnapshot) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const printedAt = new Date();

  const addDivider = (y: number) => {
    doc.setDrawColor(214, 222, 231);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const ensureRoom = (currentY: number, needed: number) => {
    if (currentY + needed <= pageHeight - 20) {
      return currentY;
    }
    doc.addPage();
    return margin;
  };

  const noShowCount = report.statusBreakdown.reduce((count, item) => {
    const normalized = item.name.toLowerCase().replace(/\s+/g, "-");
    return normalized === "no-show" ? count + item.value : count;
  }, 0);

  let y = margin;
  const logoWidth = 16;
  const logoHeight = 16;

  try {
    const logoDataUrl = await toImageDataUrl("/UI/img/logo-biocella.png");
    doc.addImage(logoDataUrl, "PNG", margin, y - 1, logoWidth, logoHeight);
  } catch {
    doc.setDrawColor(17, 63, 103);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, logoWidth, logoHeight);
    doc.setFontSize(8);
    doc.setTextColor(17, 63, 103);
    doc.text("LOGO", margin + 3.5, y + 9.5);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 63, 103);
  doc.setFontSize(18);
  doc.text("BIOCELLA Analytics Report", margin + logoWidth + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(67, 84, 99);
  doc.text(`Date Range: ${report.rangeLabel}`, margin + logoWidth + 4, y + 12);
  y += 22;

  addDivider(y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 63, 103);
  doc.setFontSize(12);
  doc.text("Summary", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 39, 51);
  doc.setFontSize(10.5);
  doc.text(`New Users: ${report.summary.newUsers}`, margin, y);
  y += 5.5;
  doc.text(`Appointments: ${report.summary.appointments}`, margin, y);
  y += 5.5;
  doc.text(`No-Shows: ${noShowCount}`, margin, y);
  y += 8;

  addDivider(y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 63, 103);
  doc.setFontSize(12);
  doc.text("Charts", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 39, 51);
  doc.setFontSize(10.5);
  doc.text("- Appointments per Day (Line Chart)", margin, y);
  y += 5.5;
  doc.text("- User Activity (Bar Chart)", margin, y);
  y += 5.5;
  doc.text("- No-show Rate (Pie Chart)", margin, y);
  y += 8;

  addDivider(y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 63, 103);
  doc.setFontSize(12);
  doc.text("Detailed Table", margin, y);
  y += 6;

  const drawTableHeader = (tableY: number) => {
    doc.setFillColor(235, 242, 247);
    doc.rect(margin, tableY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 63, 103);
    doc.setFontSize(9.5);
    doc.text("Date", margin + 2, tableY + 4.8);
    doc.text("User", margin + 42, tableY + 4.8);
    doc.text("Action", margin + 84, tableY + 4.8);
    doc.text("Status", margin + 148, tableY + 4.8);
  };

  const detailedRows = report.activityByDay.flatMap((item) => {
    return [
      [item.day, "System", "Appointments", String(item.appointments)],
      [item.day, "System", "Usage Logs", String(item.usageLogs)],
      [item.day, "System", "New Specimens", String(item.specimens)],
      [item.day, "System", "New Users", String(item.users)],
    ];
  });

  y = ensureRoom(y, 20);
  drawTableHeader(y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 39, 51);
  doc.setFontSize(9.2);

  detailedRows.forEach((row, index) => {
    y = ensureRoom(y, 6.5);
    if (y === margin) {
      drawTableHeader(y);
      y += 7;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 251, 253);
      doc.rect(margin, y, contentWidth, 6, "F");
    }

    const [date, user, action, status] = row;
    doc.text(String(date), margin + 2, y + 4.2);
    doc.text(String(user), margin + 42, y + 4.2);
    doc.text(String(action), margin + 84, y + 4.2);
    doc.text(String(status), margin + 148, y + 4.2);
    y += 6;
  });

  const footerText = `Printed by Biocella on ${printedAt.toLocaleDateString()} ${printedAt.toLocaleTimeString()}`;
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(108, 117, 125);
    doc.text(footerText, margin, pageHeight - 8);
  }

  doc.save(`biocella-report-${report.period}-${report.id}.pdf`);
};

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<ReportSnapshot[]>([]);
  const [currentReport, setCurrentReport] = useState<ReportSnapshot | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchSavedReports = async (userId: number) => {
    const response = await fetch(`/API/reports?user_id=${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch saved reports");
    }

    const reports = Array.isArray(data.reports) ? (data.reports as ReportSnapshot[]) : [];
    setSavedReports(reports);
    if (!currentReport && reports.length > 0) {
      setCurrentReport(reports[0]);
    }
  };

  useEffect(() => {
    setInitialLoading(true);
    const user = getUserData();
    const userId = Number(user?.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      setError("Unable to identify your account. Please sign in again.");
      setInitialLoading(false);
      return;
    }

    setCurrentUserId(userId);
    fetchSavedReports(userId).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to fetch saved reports");
    }).finally(() => {
      setInitialLoading(false);
    });
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!currentUserId) {
        throw new Error("Unable to identify your account. Please sign in again.");
      }

      const { start, end } = getRange(period);
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const [appointmentsRes, usageRes, microbialsRes, usersRes, chemicalsRes, batchesRes] = await Promise.all([
        fetch(`${API_URL}/appointments`, { headers }),
        fetch(`${API_URL}/usage`, { headers }),
        fetch(`${API_URL}/microbials?role=staff`, { headers }),
        fetch(`${API_URL}/auth/users`, { headers }),
        fetch(`${API_URL}/chemicals`, { headers }),
        fetch(`${API_URL}/batches`, { headers }),
      ]);

      const appointments = (appointmentsRes.ok ? await appointmentsRes.json() : []) as AppointmentItem[];
      const usageLogs = (usageRes.ok ? await usageRes.json() : []) as UsageItem[];
      const microbials = (microbialsRes.ok ? await microbialsRes.json() : []) as MicrobialItem[];
      const usersData = (usersRes.ok ? await usersRes.json() : { users: [] }) as UsersResponse;
      const chemicals = (chemicalsRes.ok ? await chemicalsRes.json() : []) as ChemicalItem[];
      const batches = (batchesRes.ok ? await batchesRes.json() : []) as BatchItem[];
      const users = Array.isArray(usersData.users) ? usersData.users : [];

      const appointmentsInRange = appointments.filter((a) => inRange(getAppointmentReportDate(a), start, end));
      const usageInRange = usageLogs.filter((u) => inRange(u.date_used, start, end));
      const specimensInRange = microbials.filter((m) => inRange(m.created_at, start, end));
      const usersInRange = users.filter((u) => inRange(u.created_at, start, end));

      const activeChemicalIds = new Set(
        batches.map((batch) => toNumber(batch.chemical_id)).filter((id) => id > 0)
      );
      const activeChemicals = chemicals.filter((chemical) =>
        activeChemicalIds.has(toNumber(chemical.chemical_id))
      );

      const statusMap = new Map<string, number>();
      appointmentsInRange.forEach((appointment) => {
        const status = getStatusLabel(String(appointment.status || "unknown"));
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusBreakdown: StatusBreakdown[] = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const sourceMap = new Map<string, number>();
      appointmentsInRange.forEach((appointment) => {
        const source = String(appointment.appointment_source || "internal").toLowerCase() === "outsider"
          ? "Outsider"
          : "Internal";
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });

      const appointmentSourceBreakdown: StatusBreakdown[] = Array.from(sourceMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const internalAppointments = appointmentSourceBreakdown.find((item) => item.name === "Internal")?.value || 0;
      const outsiderAppointments = appointmentSourceBreakdown.find((item) => item.name === "Outsider")?.value || 0;

      const dayMap = new Map<string, ActivityByDay>();
      const cursor = new Date(start);
      while (cursor <= end) {
        dayMap.set(dayKey(cursor), {
          day: dayLabel(cursor),
          appointments: 0,
          usageLogs: 0,
          specimens: 0,
          users: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      appointmentsInRange.forEach((item) => {
        const d = parseDate(getAppointmentReportDate(item));
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.appointments += 1;
      });

      usageInRange.forEach((item) => {
        const d = parseDate(item.date_used);
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.usageLogs += 1;
      });

      specimensInRange.forEach((item) => {
        const d = parseDate(item.created_at);
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.specimens += 1;
      });

      usersInRange.forEach((item) => {
        const d = parseDate(item.created_at);
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.users += 1;
      });

      const report: ReportSnapshot = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        period,
        rangeLabel: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        summary: {
          appointments: appointmentsInRange.length,
          internalAppointments,
          outsiderAppointments,
          usageLogs: usageInRange.length,
          newSpecimens: specimensInRange.length,
          newUsers: usersInRange.length,
          activeChemicals: activeChemicals.length,
        },
        statusBreakdown,
        appointmentSourceBreakdown,
        activityByDay: Array.from(dayMap.values()),
      };

      const saveResponse = await fetch("/API/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          period,
          range_start: dayKey(start),
          range_end: dayKey(end),
          range_label: report.rangeLabel,
          report_payload: report,
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.error || "Failed to save report");
      }

      setCurrentReport(report);
      await fetchSavedReports(currentUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      if (!currentUserId) {
        throw new Error("Unable to identify your account. Please sign in again.");
      }

      const response = await fetch(`/API/reports/${id}?user_id=${currentUserId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete report");
      }

      const nextReports = savedReports.filter((item) => item.id !== id);
      setSavedReports(nextReports);
      if (currentReport?.id === id) {
        setCurrentReport(nextReports[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete report");
    }
  };

  const canExport = useMemo(() => !!currentReport, [currentReport]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {initialLoading && (
        <div className="fixed right-4 top-20 z-50 rounded-lg border border-blue-200 bg-white px-3 py-2 shadow-md">
          <div className="flex items-center gap-2 text-sm text-[#113F67]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved reports...
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#113F67]">Reporting and Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">
          Generate weekly/monthly reports, review trends, and export insights as PDF or CSV.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="weekly">Weekly Report (last 7 days)</option>
            <option value="monthly">Monthly Report (last 30 days)</option>
          </select>

          <button
            onClick={generateReport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#113F67] px-4 py-2 text-white hover:bg-[#0d3253] disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Generating..." : "Generate and Save Report"}
          </button>

          <button
            onClick={() => currentReport && exportReportPdf(currentReport)}
            disabled={!canExport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </button>

          <button
            onClick={() => {
              if (!currentReport) return;
              const csv = makeCsv(currentReport);
              downloadTextFile(
                `biocella-report-${currentReport.period}-${currentReport.id}.csv`,
                csv,
                "text/csv;charset=utf-8"
              );
            }}
            disabled={!canExport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {currentReport && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Appointments</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.appointments}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Internal Appointments</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.internalAppointments ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Outsider Appointments</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.outsiderAppointments ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Usage Logs</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.usageLogs}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">New Specimens</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.newSpecimens}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">New Users</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.newUsers}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Active Chemicals</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.activeChemicals}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">System Activity Timeline ({currentReport.rangeLabel})</h2>
              <div className="h-[280px] min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentReport.activityByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="appointments" fill="#113F67" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="usageLogs" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="specimens" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Appointment Status Breakdown</h2>
              <div className="h-[280px] min-h-[280px]">
                {currentReport.statusBreakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No appointment records for the selected period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentReport.statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {currentReport.statusBreakdown.map((item, index) => (
                          <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Appointment Source Breakdown</h2>
              <div className="h-[280px] min-h-[280px]">
                {(currentReport.appointmentSourceBreakdown || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No appointment source records for the selected period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentReport.appointmentSourceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {currentReport.appointmentSourceBreakdown?.map((item, index) => (
                          <Cell key={`source-${item.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Saved Reports</h2>
        {savedReports.length === 0 ? (
          <p className="text-sm text-gray-500">No saved reports yet. Generate your first report above.</p>
        ) : (
          <div className="space-y-2">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#113F67]">
                    {report.period.toUpperCase()} Report - {new Date(report.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{report.rangeLabel}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentReport(report)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => exportReportPdf(report)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      const csv = makeCsv(report);
                      downloadTextFile(
                        `biocella-report-${report.period}-${report.id}.csv`,
                        csv,
                        "text/csv;charset=utf-8"
                      );
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
