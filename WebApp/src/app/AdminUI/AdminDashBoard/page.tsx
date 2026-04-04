"use client";

import { Microscope,FlaskConical,AlertTriangle,CalendarClock,Users,Package,QrCode,Clock,} from "lucide-react";

import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,} from "recharts";

/* ================= SINGLE DATA OBJECT ================= */
const dashboardData = {
  cards: [
    {
      title: "Total Specimens",
      value: "1,248",
      sub: "+12 this week",
      icon: Microscope,
      trend: "up",
    },
    {
      title: "Chemical Stocks",
      value: "342",
      sub: "Available items",
      icon: FlaskConical,
      trend: "neutral",
    },
    {
      title: "Low Stock Alerts",
      value: "8",
      sub: "Requires attention",
      icon: AlertTriangle,
      trend: "warning",
    },
    {
      title: "Pending Appointments",
      value: "15",
      sub: "3 today",
      icon: CalendarClock,
      trend: "neutral",
    },
    {
      title: "Registered Users",
      value: "64",
      sub: "+5 this month",
      icon: Users,
      trend: "up",
    },
  ],

  activities: [
    { text: "New specimen added — Amoeba proteus", time: "2 min ago" },
    { text: "User registered — Maria Santos", time: "18 min ago" },
    { text: "Appointment approved — Lab Room 3", time: "1 hr ago" },
    { text: "Chemical stock updated — Ethanol 95%", time: "2 hrs ago" },
    { text: "Specimen archived — Paramecium sp.", time: "3 hrs ago" },
    { text: "Appointment completed — Dr. Reyes", time: "5 hrs ago" },
  ],

  inventory: [
    { name: "Ethanol", stock: 85 },
    { name: "HCl", stock: 42 },
    { name: "NaOH", stock: 67 },
    { name: "Methanol", stock: 23 },
    { name: "Acetone", stock: 91 },
    { name: "H₂SO₄", stock: 35 },
  ],

  actions: [
    { label: "Add Specimen", icon: Microscope },
    { label: "Add Chemical Stock", icon: FlaskConical },
    { label: "Create Appointment", icon: CalendarClock },
    { label: "Print QR Code", icon: QrCode },
  ],

  appointments: [
    { time: "9:00 AM", title: "Lab Room 1 — Microbiology", status: "confirmed" },
    { time: "10:30 AM", title: "Lab Room 3 — Chemistry", status: "pending" },
    { time: "1:00 PM", title: "Lab Room 2 — Biology", status: "confirmed" },
    { time: "3:00 PM", title: "Lab Room 1 — Pathology", status: "pending" },
  ],

  specimens: [
    { name: "Amoeba proteus", category: "Protozoa", date: "Mar 15, 2026", qr: "Active" },
    { name: "Paramecium sp.", category: "Protozoa", date: "Mar 14, 2026", qr: "Active" },
    { name: "E. coli K-12", category: "Bacteria", date: "Mar 12, 2026", qr: "Pending" },
    { name: "Saccharomyces", category: "Fungi", date: "Mar 10, 2026", qr: "Active" },
    { name: "Spirogyra sp.", category: "Algae", date: "Mar 8, 2026", qr: "Inactive" },
  ],
};

/* ================= HELPERS ================= */
const getActivityConfig = (text: string) => {
  const lower = text.toLowerCase();

  if (lower.includes("specimen")) {
    return { icon: Microscope, color: "text-[#113F67]", bg: "bg-purple-100" };
  }
  if (lower.includes("user")) {
    return { icon: Users, color: "text-[#113F67]", bg: "bg-green-100" };
  }
  if (lower.includes("appointment")) {
    return { icon: CalendarClock, color: "text-[#113F67]", bg: "bg-blue-100" };
  }
  if (lower.includes("chemical") || lower.includes("stock")) {
    return { icon: Package, color: "text-[#113F67]", bg: "bg-orange-100" };
  }

  return { icon: AlertTriangle, color: "text-[#113F67]", bg: "bg-gray-100" };
};

/* ================= COMPONENT ================= */
export default function AdminHome() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[#113F67]">Dashboard</h1>
      <p className="text-sm text-[#113F67] mb-6">
        Laboratory Information & Inventory Management
      </p>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {dashboardData.cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p
                  className={`text-xs ${
                    card.trend === "warning"
                      ? "text-yellow-500"
                      : card.trend === "up"
                      ? "text-green-500"
                      : "text-gray-400"
                  }`}
                >
                  {card.sub}
                </p>
              </div>

              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100">
                <card.icon className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ACTIVITY */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>

            <div className="space-y-3">
              {dashboardData.activities.map((a) => {
                const config = getActivityConfig(a.text);
                const Icon = config.icon;

                return (
                  <div
                    key={a.text}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition w-full"
                  >
                    <div className={`h-8 w-8 flex items-center justify-center rounded-md ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{a.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CHART */}
        <div className="lg:col-span-1">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Inventory Status
            </h3>

            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.inventory} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  />
                  <Bar dataKey="stock" fill="#113F67" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ACTIONS */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>

            <div className="flex justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-md">
                {dashboardData.actions.map((a) => {
                  const Icon = a.icon;

                  return (
                    <button
                      key={a.label}
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 py-4 text-xs font-medium rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-[#113F67] transition-all duration-150"
                    >
                      <Icon className="h-5 w-5 text-[#113F67]" />
                      <span className="text-[#113F67]">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* APPOINTMENTS */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="pb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Today's Appointments
              </h3>
            </div>

            <div className="space-y-3">
              {dashboardData.appointments.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium w-16">{a.time}</span>
                    </div>

                    <span className="text-sm text-gray-900">{a.title}</span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      a.status === "confirmed"
                        ? "bg-green-100 text-green-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3 - TABLE */}
      <div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="pb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Specimen Overview
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Name</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Category</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Date Added</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">QR Status</th>
                </tr>
              </thead>

              <tbody>
                {dashboardData.specimens.map((s) => (
                  <tr key={s.name} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="text-sm font-medium text-gray-900 py-2">{s.name}</td>
                    <td className="text-sm text-gray-500 py-2">{s.category}</td>
                    <td className="text-sm text-gray-500 py-2">{s.date}</td>
                    <td className="py-2">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                          s.qr === "Active"
                            ? "bg-green-100 text-green-600"
                            : s.qr === "Pending"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {s.qr}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}