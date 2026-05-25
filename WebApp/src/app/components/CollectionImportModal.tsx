"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload, X } from "lucide-react";

type ProjectOption = {
  _id: string;
  title: string;
  code: string;
  classification: string;
};

type ImportRow = Record<string, string>;

type NormalizedSpecimenRow = {
  project_id: string;
  code_name: string;
  classification: string;
  source: string;
  date_accessed: string;
  publish_status: "published" | "unpublished";
  locale?: string;
  project_fund?: string;
  accession_no?: string;
  similarity_percent?: string;
  description?: string;
  created_by?: string;
  updated_by?: string;
  update_notes?: string;
  image_url?: string;
  fasta_file?: string;
  fasta_sequence?: string;
  biochemical_tests?: Record<string, string>;
  morphology?: Record<string, string>;
  custom_fields?: Record<string, string>;
};

type PreviewRow = {
  index: number;
  values: NormalizedSpecimenRow | null;
  warnings: string[];
  errors: string[];
};

interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  onImport: (rows: NormalizedSpecimenRow[]) => Promise<{ created: number; failed: number }> | void;
  roleLabel: string;
}

const BASE_FIELDS = [
  { value: "project_id", label: "Project" },
  { value: "code_name", label: "Code Name" },
  { value: "classification", label: "Classification" },
  { value: "source", label: "Source" },
  { value: "date_accessed", label: "Date Accessed" },
  { value: "locale", label: "Locale" },
  { value: "project_fund", label: "Project Fund" },
  { value: "accession_no", label: "Accession No." },
  { value: "similarity_percent", label: "Similarity %" },
  { value: "description", label: "Description" },
  { value: "publish_status", label: "Publish Status" },
  { value: "update_notes", label: "Update Notes" },
  { value: "created_by", label: "Created By" },
  { value: "updated_by", label: "Updated By" },
  { value: "image_url", label: "Image URL" },
  { value: "fasta_file", label: "FASTA File Path" },
  { value: "fasta_sequence", label: "FASTA Sequence" },
];

const BIOCHEMICAL_FIELDS = ["onpg", "glu", "adh", "man", "ldc", "ino", "odc", "sor", "cit", "rha", "h2s", "sac", "ure", "mel", "tda", "amy", "ind", "ara", "vp", "no2", "gel"];

const MORPHOLOGY_FIELDS = ["shape", "cell_size", "colony_size", "pigmentation", "form", "elevation", "margin", "colony_surface", "opacity", "texture", "spore_formation", "mycelium_formation", "description"];

const SYNONYMS: Record<string, string[]> = {
  project_id: ["project", "project id", "project_code", "project code", "project title", "project_name", "project name"],
  code_name: ["code", "code name", "specimen code", "sample code", "sample id", "specimen id"],
  classification: ["classification", "organism", "species", "type"],
  source: ["source", "origin", "sample source"],
  date_accessed: ["date accessed", "accessed", "collection date", "date"],
  locale: ["locale", "location", "place", "site"],
  project_fund: ["project fund", "fund", "funding"],
  accession_no: ["accession no", "accession number", "accession", "accession_no"],
  similarity_percent: ["similarity percent", "similarity", "% similarity"],
  description: ["description", "notes", "remark", "remarks"],
  publish_status: ["publish status", "status", "visibility"],
  update_notes: ["update notes", "update note", "notes"],
  created_by: ["created by", "creator"],
  updated_by: ["updated by", "modifier"],
  image_url: ["image url", "image", "photo", "picture"],
  fasta_file: ["fasta file", "sequence file", "sequence path"],
  fasta_sequence: ["fasta sequence", "sequence", "dna sequence"],
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[_\-\/]+/g, " ")
    .replace(/\s+/g, " ");

const labelForField = (field: string) => {
  const base = BASE_FIELDS.find((item) => item.value === field);
  if (base) return base.label;
  if (field.startsWith("biochemical_tests.")) return `Biochemical: ${field.split(".")[1] || field}`;
  if (field.startsWith("morphology.")) return `Morphology: ${field.split(".")[1] || field}`;
  return field;
};

const headerMatches = (header: string, candidate: string) => {
  const normalizedHeader = normalizeText(header);
  const normalizedCandidate = normalizeText(candidate);
  return normalizedHeader === normalizedCandidate || normalizedHeader.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedHeader);
};

const guessTargetField = (header: string) => {
  const normalizedHeader = normalizeText(header);

  for (const field of BASE_FIELDS.map((item) => item.value)) {
    const synonyms = SYNONYMS[field] || [];
    if (headerMatches(header, field) || synonyms.some((entry) => headerMatches(normalizedHeader, entry))) {
      return field;
    }
  }

  for (const field of BIOCHEMICAL_FIELDS) {
    if (headerMatches(normalizedHeader, field)) return `biochemical_tests.${field}`;
  }

  for (const field of MORPHOLOGY_FIELDS) {
    if (headerMatches(normalizedHeader, field)) return `morphology.${field}`;
  }

  return "custom_fields";
};

const parseDateValue = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return trimmed;
};

const resolveProjectId = (value: string, projects: ProjectOption[]) => {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const exactMatch = projects.find((project) => project._id === value || normalizeText(project.title) === normalized || normalizeText(project.code) === normalized);
  return exactMatch?._id || "";
};

const buildRow = (row: ImportRow, headers: string[], mapping: Record<string, string>, projects: ProjectOption[]): PreviewRow => {
  const values: NormalizedSpecimenRow = {
    project_id: "",
    code_name: "",
    classification: "",
    source: "",
    date_accessed: "",
    publish_status: "unpublished",
    biochemical_tests: {},
    morphology: {},
    custom_fields: {},
  };

  const warnings: string[] = [];
  const errors: string[] = [];

  headers.forEach((header) => {
    const rawValue = String(row[header] ?? "").trim();
    if (!rawValue) return;

    const target = mapping[header] || "custom_fields";
    if (target === "custom_fields") {
      values.custom_fields![header] = rawValue;
      return;
    }

    if (target.startsWith("biochemical_tests.")) {
      values.biochemical_tests![target.split(".")[1]] = rawValue;
      return;
    }

    if (target.startsWith("morphology.")) {
      values.morphology![target.split(".")[1]] = rawValue;
      return;
    }

    if (target === "project_id") {
      values.project_id = resolveProjectId(rawValue, projects);
      if (!values.project_id) {
        warnings.push(`Project "${rawValue}" did not match an existing project.`);
      }
      return;
    }

    if (target === "date_accessed") {
      values.date_accessed = parseDateValue(rawValue);
      return;
    }

    if (target === "similarity_percent") {
      const numeric = Number(String(rawValue).replace(/%/g, ""));
      values.similarity_percent = Number.isFinite(numeric) ? String(numeric) : rawValue;
      return;
    }

    if (target === "publish_status") {
      const normalized = normalizeText(rawValue);
      values.publish_status = normalized === "published" ? "published" : "unpublished";
      return;
    }

    if (target === "accession_no") {
      values.accession_no = rawValue;
      return;
    }

    if (target === "image_url" || target === "fasta_file" || target === "fasta_sequence" || target === "created_by" || target === "updated_by" || target === "update_notes") {
      values[target] = rawValue;
      return;
    }

    (values as Record<string, string>)[target] = rawValue;
  });

  if (!values.project_id) errors.push("Missing project match.");
  if (!values.code_name) errors.push("Missing code name.");
  if (!values.classification) errors.push("Missing classification.");

  return { index: 0, values, warnings, errors };
};

export default function CollectionImportModal({ isOpen, onClose, projects, onImport, roleLabel }: CollectionImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [importSummary, setImportSummary] = useState<{ created: number; failed: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setColumnMapping({});
      setParseError("");
      setImportSummary(null);
      setIsParsing(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  const previewRows = useMemo(() => {
    if (!headers.length || !rows.length) return [];
    return rows.map((row, index) => ({ ...buildRow(row, headers, columnMapping, projects), index }));
  }, [columnMapping, headers, projects, rows]);

  const detectedCount = previewRows.filter((row) => row.errors.length === 0).length;
  const invalidCount = previewRows.length - detectedCount;

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setParseError("");
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("The selected file does not contain any sheets.");
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
      const [headerRow, ...bodyRows] = rawRows;

      if (!headerRow || headerRow.length === 0) {
        throw new Error("The first sheet does not contain a header row.");
      }

      const nextHeaders = headerRow.map((header) => String(header || "").trim()).filter(Boolean);
      const nextRows = bodyRows
        .filter((row) => Array.isArray(row) && row.some((value) => String(value || "").trim().length > 0))
        .map((row) => {
          const entry: ImportRow = {};
          nextHeaders.forEach((header, index) => {
            entry[header] = String(row[index] ?? "").trim();
          });
          return entry;
        });

      const nextMapping = nextHeaders.reduce((acc, header) => {
        acc[header] = guessTargetField(header);
        return acc;
      }, {} as Record<string, string>);

      setFileName(file.name);
      setHeaders(nextHeaders);
      setRows(nextRows);
      setColumnMapping(nextMapping);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse the spreadsheet.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const validRows = previewRows
      .filter((row) => row.errors.length === 0 && row.values)
      .map((row) => row.values as NormalizedSpecimenRow);

    if (validRows.length === 0) {
      setParseError("No valid rows were found to import.");
      return;
    }

    setIsImporting(true);
    try {
      const result = await onImport(validRows);
      const summary = result || { created: validRows.length, failed: 0 };
      setImportSummary(summary);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to import spreadsheet rows.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <FileSpreadsheet className="h-5 w-5 text-[#113F67]" />
              <h2 className="text-xl font-semibold">Import specimens from spreadsheet</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Upload Excel or CSV files, let the system auto-detect fields, review the mapping, then approve the staged import for {roleLabel}.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/70">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">1. Upload file</p>
                  <p className="text-sm text-slate-600">Excel and CSV are supported. First sheet only.</p>
                </div>
                <Upload className="h-5 w-5 text-[#113F67]" />
              </div>

              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-[#113F67] hover:bg-[#f7fbff]">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleFile(file);
                    }
                  }}
                />
                <Sparkles className="h-8 w-8 text-[#113F67]" />
                <span className="mt-3 text-sm font-medium text-slate-900">Click to choose a spreadsheet</span>
                <span className="mt-1 text-xs text-slate-500">Auto-detect headers and stage rows before import.</span>
              </label>

              {fileName && (
                <p className="mt-3 text-sm text-slate-700">
                  Selected file: <span className="font-semibold">{fileName}</span>
                </p>
              )}

              {isParsing && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#113F67]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing spreadsheet...
                </div>
              )}

              {parseError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {importSummary && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Import finished. Created {importSummary.created} row{importSummary.created === 1 ? "" : "s"} and skipped {importSummary.failed} invalid row{importSummary.failed === 1 ? "" : "s"}.
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">2. Smart mapping</p>
              <p className="mt-1 text-sm text-slate-600">
                Headers are matched locally using fuzzy rules. Unmatched values go into custom fields automatically.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Columns</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{headers.length}</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">Valid rows</div>
                  <div className="mt-1 text-xl font-semibold text-emerald-800">{detectedCount}</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Needs review</div>
                  <div className="mt-1 text-xl font-semibold text-amber-800">{invalidCount}</div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This first pass keeps the workflow free and fast without a paid AI service. If you want, we can wire an optional AI mapping helper later.
                </span>
              </div>
            </div>
          </div>

          {headers.length > 0 && rows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">3. Review mapping</p>
                  <p className="text-sm text-slate-600">Adjust any column before staging the rows.</p>
                </div>
                <div className="text-sm text-slate-500">{previewRows.length} parsed row{previewRows.length === 1 ? "" : "s"}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Spreadsheet column</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Maps to</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Sample value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {headers.map((header) => (
                      <tr key={header}>
                        <td className="px-4 py-3 font-medium text-slate-900">{header}</td>
                        <td className="px-4 py-3">
                          <select
                            value={columnMapping[header] || "custom_fields"}
                            onChange={(event) => setColumnMapping((current) => ({ ...current, [header]: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                          >
                            <option value="custom_fields">Custom field</option>
                            <optgroup label="Core fields">
                              {BASE_FIELDS.map((field) => (
                                <option key={field.value} value={field.value}>
                                  {field.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Biochemical tests">
                              {BIOCHEMICAL_FIELDS.map((field) => (
                                <option key={field} value={`biochemical_tests.${field}`}>
                                  {field.toUpperCase()}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Morphology">
                              {MORPHOLOGY_FIELDS.map((field) => (
                                <option key={field} value={`morphology.${field}`}>
                                  {labelForField(`morphology.${field}`)}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{rows[0]?.[header] || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">4. Validation preview</p>
                  <p className="text-sm text-slate-600">Invalid rows are excluded from import until fixed.</p>
                </div>
                <button
                  onClick={() => void handleImport()}
                  disabled={isImporting || detectedCount === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#113F67] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d2f4d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve Import
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Row</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Code Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.slice(0, 8).map((row) => (
                      <tr key={row.index}>
                        <td className="px-4 py-3 text-slate-600">{row.index + 2}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.values?.code_name || "N/A"}</td>
                        <td className="px-4 py-3 text-slate-700">{projects.find((project) => project._id === row.values?.project_id)?.title || row.values?.project_id || "N/A"}</td>
                        <td className="px-4 py-3">
                          {row.errors.length > 0 ? (
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Needs fix</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Ready</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{[...row.errors, ...row.warnings].join(" • ") || "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { NormalizedSpecimenRow, ProjectOption };