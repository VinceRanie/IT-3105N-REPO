const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const MicrobialInfo = require('../models/MicrobialInfo');
const Project = require('../models/Project');
const CollectionActivity = require('../models/CollectionActivity');
const ImportBatch = require('../models/MicrobialImportBatch');
const {
  coerceDate,
  extractAccessionFromFasta,
  normalizePublishStatus,
  normalizeString,
} = require('../utils/microbialImportUtils');

const PRIVILEGED_ROLES = new Set(['admin', 'staff']);

const normalizeRole = (role) => {
  if (!role) return '';
  const normalized = String(role).trim().toLowerCase();
  return normalized === 'ra' ? 'staff' : normalized;
};

const getActor = (req) => {
  const userIdValue = req.headers?.['x-user-id'] || req.body?.user_id || req.query?.user_id || null;
  const parsedUserId = Number(userIdValue);
  const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
  const user = String(req.headers?.['x-user-name'] || req.body?.created_by || req.body?.updated_by || req.query?.user_name || '').trim();
  const role = normalizeRole(req.headers?.['x-user-role'] || req.body?.role || req.query?.role);

  return { userId, user, role };
};

const canManageImports = (req) => {
  const { role } = getActor(req);
  return PRIVILEGED_ROLES.has(role);
};

const buildActivityDescription = (specimen) => {
  if (!specimen) return 'Specimen activity';
  const parts = [specimen.code_name, specimen.classification].filter(Boolean);
  return parts.length > 0 ? parts.join(' - ') : 'Specimen activity';
};

const getActivityUserId = (req) => {
  const { userId } = getActor(req);
  return userId;
};

const logCollectionActivity = async ({ req, specimen, action, status }) => {
  try {
    const payload = {
      specimen_id: specimen?._id,
      project_id: specimen?.project_id?._id || specimen?.project_id || null,
      user_id: getActivityUserId(req),
      action: String(action || '').toLowerCase() || 'update',
      status: status ? String(status).toLowerCase() : undefined,
      description: buildActivityDescription(specimen),
    };

    if (!payload.specimen_id) return;
    await CollectionActivity.create(payload);
  } catch (error) {
    console.warn('Collection activity log failed:', error.message);
  }
};

const generateSpecimenQRCode = async (specimenId) => {
  const qrToken = crypto.randomBytes(16).toString('hex');
  const baseUrl = (process.env.FRONTEND_URL || 'https://testbiocella.dcism.org').replace(/\/+$/, '');
  const verificationUrl = `${baseUrl}/scan/specimen/${specimenId}?token=${qrToken}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);

  return { qrToken, qrCodeDataUrl, verificationUrl };
};

const parseMaybeJson = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const resolveProject = async (projectValue) => {
  const normalized = normalizeString(projectValue);
  if (!normalized) return null;

  const exactIdMatch = await Project.findById(normalized).catch(() => null);
  if (exactIdMatch) return exactIdMatch;

  const regex = new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return Project.findOne({
    $or: [
      { title: regex },
      { code: regex },
    ],
  });
};

const resolveOrCreateProject = async (rawRow) => {
  const projectValue = normalizeString(rawRow.project_id || rawRow.project || rawRow.project_code || rawRow.project_title || rawRow.project_name);
  if (!projectValue) return { project: null, created: false };

  const existing = await resolveProject(projectValue);
  if (existing) return { project: existing, created: false };

  const title = normalizeString(rawRow.project_title || rawRow.project_name || rawRow.project || projectValue);
  const code = normalizeString(rawRow.project_code || rawRow.project_id || rawRow.project || projectValue);
  const classification = normalizeString(rawRow.project_classification || rawRow.project_type || rawRow.project_group || rawRow.project_category || '');

  const createdProject = await Project.create({
    title: title || code || projectValue,
    code: code || title || projectValue,
    classification,
  });

  return { project: createdProject, created: true };
};

const normalizeImportRow = async (row, rowNumber) => {
  const errors = [];
  const warnings = [];
  const rawRow = row && typeof row === 'object' ? row : {};

  const { project, created } = await resolveOrCreateProject(rawRow);
  const projectValue = rawRow.project_id || rawRow.project || rawRow.project_code || rawRow.project_title || rawRow.project_name;
  if (!project) {
    errors.push(`Row ${rowNumber}: project not found`);
  } else if (created) {
    warnings.push(`Row ${rowNumber}: created project "${project.code || project.title}" because it did not exist.`);
  }

  const codeName = normalizeString(rawRow.code_name || rawRow.code || rawRow.sheet_name || rawRow.sheetName);
  if (!codeName) errors.push(`Row ${rowNumber}: code_name is required`);

  const classification = normalizeString(rawRow.classification);
  if (!classification) errors.push(`Row ${rowNumber}: classification is required`);

  const source = normalizeString(rawRow.source);
  const parsedDate = coerceDate(rawRow.date_accessed);
  if (rawRow.date_accessed && !parsedDate) {
    errors.push(`Row ${rowNumber}: invalid date_accessed value`);
  }

  const similarityValue = rawRow.similarity_percent;
  let similarityPercent = null;
  if (similarityValue !== undefined && similarityValue !== null && similarityValue !== '') {
    const numeric = Number(String(similarityValue).replace(/%/g, '').trim());
    if (Number.isFinite(numeric)) {
      similarityPercent = numeric;
    } else {
      warnings.push(`Row ${rowNumber}: similarity_percent could not be parsed`);
    }
  }

  const biochemicalTests = parseMaybeJson(rawRow.biochemical_tests) || {};
  const morphology = parseMaybeJson(rawRow.morphology) || {};
  const customFields = parseMaybeJson(rawRow.custom_fields) || {};

  const fastaSequence = normalizeString(rawRow.fasta_sequence);
  const accessionNo = normalizeString(rawRow.accession_no) || extractAccessionFromFasta(fastaSequence);

  if (codeName) {
    const existing = await MicrobialInfo.findOne({ code_name: codeName }).lean();
    if (existing) {
      errors.push(`Row ${rowNumber}: code_name already exists in the live collection`);
    }
  }

  const normalizedRow = {
    project_id: project ? String(project._id) : '',
    code_name: codeName,
    classification,
    source,
    date_accessed: parsedDate,
    publish_status: normalizePublishStatus(rawRow.publish_status, 'unpublished'),
    locale: normalizeString(rawRow.locale),
    project_fund: normalizeString(rawRow.project_fund),
    accession_no: accessionNo,
    similarity_percent: similarityPercent,
    description: normalizeString(rawRow.description),
    created_by: normalizeString(rawRow.created_by),
    updated_by: normalizeString(rawRow.updated_by),
    update_notes: normalizeString(rawRow.update_notes),
    image_url: normalizeString(rawRow.image_url),
    fasta_file: normalizeString(rawRow.fasta_file),
    fasta_sequence: fastaSequence,
    biochemical_tests: biochemicalTests,
    morphology,
    custom_fields,
  };

  if (!normalizedRow.created_by) {
    normalizedRow.created_by = normalizeString(rawRow.created_by || rawRow.creator);
  }

  return {
    row_number: rowNumber,
    original_row: rawRow,
    normalized_row: normalizedRow,
    errors,
    warnings,
    status: errors.length > 0 ? 'invalid' : 'ready',
  };
};

const buildSpecimenDataFromRow = (row, fallbackActor) => {
  const normalizedRow = row?.normalized_row || {};
  return {
    project_id: normalizedRow.project_id,
    code_name: normalizedRow.code_name,
    classification: normalizedRow.classification,
    source: normalizedRow.source,
    date_accessed: normalizedRow.date_accessed,
    publish_status: normalizePublishStatus(normalizedRow.publish_status, 'unpublished'),
    locale: normalizedRow.locale,
    project_fund: normalizedRow.project_fund,
    accession_no: normalizedRow.accession_no,
    similarity_percent: normalizedRow.similarity_percent,
    description: normalizedRow.description,
    created_by: normalizedRow.created_by || fallbackActor.user || '',
    updated_by: normalizedRow.updated_by || fallbackActor.user || '',
    update_notes: normalizedRow.update_notes,
    image_url: normalizedRow.image_url,
    fasta_file: normalizedRow.fasta_file,
    fasta_sequence: normalizedRow.fasta_sequence,
    biochemical_tests: normalizedRow.biochemical_tests,
    morphology: normalizedRow.morphology,
    custom_fields: normalizedRow.custom_fields,
  };
};

exports.createImportBatch = async (req, res) => {
  try {
    if (!canManageImports(req)) {
      return res.status(403).json({ error: 'Insufficient permissions to create import batches' });
    }

    const actor = getActor(req);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'rows are required' });
    }

    const normalizedRows = [];
    const seenCodeNames = new Set();
    for (let index = 0; index < rows.length; index += 1) {
      const normalized = await normalizeImportRow(rows[index], index + 1);
      const codeKey = normalizeString(normalized.normalized_row?.code_name).toLowerCase();
      if (codeKey) {
        if (seenCodeNames.has(codeKey)) {
          normalized.errors.push(`Row ${index + 1}: duplicate code_name "${normalized.normalized_row.code_name}" found in this batch`);
          normalized.status = 'invalid';
        } else {
          seenCodeNames.add(codeKey);
        }
      }
      normalizedRows.push(normalized);
    }

    const totalRows = normalizedRows.length;
    const readyRows = normalizedRows.filter((row) => row.status === 'ready').length;
    const invalidRows = totalRows - readyRows;

    const batch = await ImportBatch.create({
      source_file_name: normalizeString(req.body?.source_file_name || req.body?.file_name || 'Spreadsheet import'),
      role: normalizeString(req.body?.role || actor.role),
      created_by: normalizeString(req.body?.created_by || actor.user),
      created_by_user_id: actor.userId,
      reviewed_by: normalizeString(req.body?.reviewed_by || actor.user),
      reviewed_by_user_id: actor.userId,
      status: 'pending_review',
      headers: Array.isArray(req.body?.headers) ? req.body.headers : [],
      mapping: req.body?.mapping || {},
      summary: {
        total_rows: totalRows,
        ready_rows: readyRows,
        invalid_rows: invalidRows,
        approved_rows: 0,
        failed_rows: 0,
      },
      rows: normalizedRows,
      notes: normalizeString(req.body?.notes),
      audit_trail: [
        {
          action: 'created',
          user: normalizeString(req.body?.created_by || actor.user),
          user_id: actor.userId,
          note: `Imported ${totalRows} row(s) into staging`,
        },
      ],
      reviewed_at: new Date(),
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error('Failed to create import batch:', error);
    res.status(500).json({ error: 'Failed to create import batch', details: error.message });
  }
};

exports.listImportBatches = async (req, res) => {
  try {
    const filters = {};
    const status = normalizeString(req.query?.status);
    if (status) filters.status = status;

    const role = normalizeString(req.query?.role);
    if (role) filters.role = role;

    const batches = await ImportBatch.find(filters).sort({ createdAt: -1 }).lean();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch import batches', details: error.message });
  }
};

exports.getImportBatchById = async (req, res) => {
  try {
    const batch = await ImportBatch.findById(req.params.id).populate('rows.specimen_id').lean();
    if (!batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch import batch', details: error.message });
  }
};

exports.approveImportBatch = async (req, res) => {
  try {
    if (!canManageImports(req)) {
      return res.status(403).json({ error: 'Insufficient permissions to approve import batches' });
    }

    const actor = getActor(req);
    const batch = await ImportBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }

    if (batch.status === 'approved') {
      return res.json(batch);
    }

    let approvedCount = 0;
    let failedCount = 0;

    for (const row of batch.rows) {
      if (row.status !== 'ready') {
        continue;
      }

      try {
        const duplicate = await MicrobialInfo.findOne({ code_name: row.normalized_row?.code_name }).lean();
        if (duplicate) {
          throw new Error(`code_name "${row.normalized_row?.code_name}" already exists in the live collection`);
        }

        const specimenData = buildSpecimenDataFromRow(row, actor);
        const microbial = new MicrobialInfo(specimenData);
        await microbial.save();

        const qrData = await generateSpecimenQRCode(microbial._id);
        microbial.qr_code = qrData.qrCodeDataUrl;
        await microbial.save();
        await microbial.populate('project_id');

        await logCollectionActivity({
          req,
          specimen: microbial,
          action: 'create',
          status: microbial.publish_status || 'unpublished',
        });

        row.specimen_id = microbial._id;
        row.status = 'approved';
        row.approved_at = new Date();
        row.error_message = '';
        approvedCount += 1;
      } catch (error) {
        row.status = 'failed';
        row.error_message = error.message;
        failedCount += 1;
      }
    }

    batch.approved_count = approvedCount;
    batch.failed_count = failedCount;
    batch.summary.approved_rows = approvedCount;
    batch.summary.failed_rows = failedCount;
    batch.reviewed_by = batch.reviewed_by || actor.user;
    batch.reviewed_by_user_id = batch.reviewed_by_user_id || actor.userId;
    batch.approved_by = normalizeString(req.body?.approved_by || actor.user);
    batch.approved_by_user_id = actor.userId;
    batch.approved_at = new Date();
    batch.reviewed_at = batch.reviewed_at || new Date();
    batch.status = failedCount === 0 ? 'approved' : (approvedCount > 0 ? 'partially_approved' : 'failed');
    batch.audit_trail.push({
      action: 'approved',
      user: normalizeString(req.body?.approved_by || actor.user),
      user_id: actor.userId,
      note: `Approved ${approvedCount} row(s); ${failedCount} row(s) failed`,
    });

    await batch.save();
    await batch.populate('rows.specimen_id');

    res.json({
      message: 'Import batch processed',
      batch,
      created: approvedCount,
      failed: failedCount,
    });
  } catch (error) {
    console.error('Failed to approve import batch:', error);
    res.status(500).json({ error: 'Failed to approve import batch', details: error.message });
  }
};

exports.rejectImportBatch = async (req, res) => {
  try {
    if (!canManageImports(req)) {
      return res.status(403).json({ error: 'Insufficient permissions to reject import batches' });
    }

    const actor = getActor(req);
    const batch = await ImportBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }

    if (batch.status === 'approved') {
      return res.status(400).json({ error: 'Approved batches cannot be rejected' });
    }

    batch.status = 'rejected';
    batch.rejected_by = normalizeString(req.body?.rejected_by || actor.user);
    batch.rejected_by_user_id = actor.userId;
    batch.rejected_at = new Date();
    batch.audit_trail.push({
      action: 'rejected',
      user: normalizeString(req.body?.rejected_by || actor.user),
      user_id: actor.userId,
      note: normalizeString(req.body?.note || 'Batch rejected'),
    });
    await batch.save();

    res.json({ message: 'Import batch rejected', batch });
  } catch (error) {
    console.error('Failed to reject import batch:', error);
    res.status(500).json({ error: 'Failed to reject import batch', details: error.message });
  }
};