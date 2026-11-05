// OFFLINE SPIKE ONLY. No CLI, network, credential provider or operational app imports.
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

export const POLICY = '1.0';
const FORMAT = 'smart-fleet-offline-role-snapshot';
const roles = ['admin', 'staff', 'user', 'legacy-employee'];
const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'];
const clone = value => structuredClone(value);
const fail = code => { throw Error(code); };
const integer = v => Number.isSafeInteger(v) && v >= 0;
const text = v => typeof v === 'string' && v.length > 0;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).sort().join('|') === [...keys].sort().join('|');
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function unique(rows) {
  if (!Array.isArray(rows)) fail('ARRAY_REQUIRED');
  const ids = new Set();
  for (const r of rows) { if (!object(r) || !text(r.id) || ids.has(r.id)) fail('DUPLICATE_OR_INVALID_ID'); ids.add(r.id); }
}

// A bare Fleet is legacy only if its security fields are understood, never by fallback.
export function assertLegacy(fleet) {
  if (!object(fleet) || ['format', 'authorizationVersion', 'security', 'accountFormatVersion', 'policyVersion', 'formatVersion'].some(k => k in fleet)) fail('UNSUPPORTED_LEGACY_FORMAT');
  for (const k of ['cars', 'people', 'trips', 'audit']) unique(fleet[k]);
  if (!Array.isArray(fleet.projects) || typeof fleet.imported !== 'boolean') fail('INVALID_FLEET');
  unique(fleet.accounts ?? []);
  const claimed = new Set();
  for (const a of fleet.accounts ?? []) {
    if (['status', 'approvalStatus', 'personId', 'accessRevision', 'authorizationVersion'].some(k => k in a) ||
        a.role !== undefined && !['admin', 'employee'].includes(a.role)) fail('UNSUPPORTED_LEGACY_ACCOUNT');
    if (a.id === 'admin' || typeof a.active !== 'boolean' || !integer(a.passwordVersion) ||
        !fleet.people.some(p => p.id === a.driverId) || claimed.has(a.driverId) ||
        !text(a.username) || !text(a.name) || !text(a.salt) || !text(a.passwordHash)) fail('INVALID_LEGACY_ACCOUNT');
    claimed.add(a.driverId);
  }
  return fleet;
}

export function legacyReader(value) {
  // A reader boundary used by the isolated harness, NOT a patch to the old app.
  if (value?.format === FORMAT || value?.formatVersion !== undefined) fail('READER_VERSION_UNSUPPORTED');
  return clone(assertLegacy(value));
}

export function migrateSnapshot(fleet, ledger = []) {
  assertLegacy(fleet); unique(ledger);
  const document = {format: FORMAT, formatVersion: 2, policyVersion: POLICY, syntheticOnly: true,
    fleet: clone(fleet), ledger: clone(ledger), accounts: (fleet.accounts ?? []).map(a => ({
      id: a.id, origin: 'legacy', role: a.role === 'admin' ? 'admin' : 'legacy-employee',
      status: a.active ? 'APPROVED' : 'DISABLED', personId: a.driverId, revision: a.passwordVersion
    })), decisions: []};
  validateSnapshot(document);
  return document;
}

export function validateSnapshot(d) {
  if (!exact(d, ['format', 'formatVersion', 'policyVersion', 'syntheticOnly', 'fleet', 'ledger', 'accounts', 'decisions']) ||
      d.format !== FORMAT || d.formatVersion !== 2 || d.policyVersion !== POLICY || d.syntheticOnly !== true) fail('UNSUPPORTED_SNAPSHOT');
  assertLegacy(d.fleet); unique(d.ledger); unique(d.accounts);
  if (!Array.isArray(d.decisions)) fail('INVALID_DECISIONS');
  const claimed = new Set();
  for (const a of d.accounts) {
    if (!exact(a, ['id', 'origin', 'role', 'status', 'personId', 'revision']) || a.id === 'admin' ||
        !roles.includes(a.role) || !statuses.includes(a.status) || !integer(a.revision) ||
        !['legacy', 'new'].includes(a.origin) || !(a.personId === null || text(a.personId))) fail('INVALID_SECURITY_ACCOUNT');
    const old = d.fleet.accounts?.find(x => x.id === a.id);
    if (a.origin === 'legacy') {
      if (!old || a.role !== (old.role === 'admin' ? 'admin' : 'legacy-employee') || a.personId !== old.driverId || a.revision < old.passwordVersion ||
          a.revision === old.passwordVersion && a.status !== (old.active ? 'APPROVED' : 'DISABLED')) fail('LEGACY_CONVERSION_REFUSED');
    } else if (old || a.role === 'legacy-employee') fail('ROLE_ESCALATION_OR_ID_COLLISION');
    if (a.status === 'APPROVED' && a.personId === null) fail('APPROVAL_LINK_REQUIRED');
    if (a.personId !== null) {
      if (!d.fleet.people.some(p => p.id === a.personId) || claimed.has(a.personId)) fail('INVALID_OR_CLAIMED_PERSON');
      claimed.add(a.personId);
    }
    if (a.origin === 'new' && ['PENDING', 'REJECTED'].includes(a.status) && (a.personId !== null || a.role !== 'user')) fail('UNAPPROVED_LINK_OR_ROLE');
  }
  if ((d.fleet.accounts ?? []).some(a => !d.accounts.some(x => x.id === a.id && x.origin === 'legacy'))) fail('LEGACY_ACCOUNT_DROPPED');
  for (const e of d.decisions) {
    if (!exact(e, ['actorId', 'subjectId', 'before', 'after', 'at']) || !text(e.actorId) || !text(e.subjectId) ||
        !Number.isFinite(Date.parse(e.at)) || !d.accounts.some(a => a.id === e.subjectId)) fail('INVALID_DECISION');
  }
  return d;
}

export function principal(d, id, revision) {
  validateSnapshot(d);
  const a = d.accounts.find(a => a.id === id);
  if (!a || a.status !== 'APPROVED' || a.revision !== revision || !a.personId) fail('UNAUTHORIZED');
  return clone(a);
}

export function can(d, id, revision, action, trip) {
  const a = principal(d, id, revision);
  if (a.role === 'admin') return ['checkout', 'return', 'amend', 'history', 'personal-report', 'aggregate-report', 'maintenance-read', 'maintenance-write', 'account-manage', 'backup'].includes(action);
  const own = trip?.ownerUserId === id;
  switch (action) {
    case 'checkout': return d.fleet.people.some(p => p.id === a.personId && p.active);
    case 'return': return !!(own && !trip.end);
    case 'amend': return !!(a.role === 'legacy-employee' && own && !trip.end);
    case 'history': return a.role === 'staff' || own;
    case 'personal-report': case 'maintenance-read': return true;
    case 'aggregate-report': case 'maintenance-write': return a.role === 'staff';
    default: return false;
  }
}

export function pendingApplication(d, input) {
  validateSnapshot(d);
  if (!exact(input, ['id', 'displayName']) || !text(input.id) || !text(input.displayName) || input.id === 'admin' ||
      d.accounts.some(a => a.id === input.id)) fail('INVALID_APPLICATION');
  const next = clone(d);
  // Display name is untrusted; it is intentionally not used to search/create a Person.
  next.accounts.push({id: input.id, origin: 'new', role: 'user', status: 'PENDING', personId: null, revision: 0});
  return validateSnapshot(next);
}

function admin(d, actorId, revision) {
  const a = principal(d, actorId, revision);
  if (a.role !== 'admin') fail('FORBIDDEN');
}
export function reviewApplication(d, actorId, revision, subjectId, decision) {
  admin(d, actorId, revision);
  const subject = d.accounts.find(a => a.id === subjectId);
  if (!subject || subject.status !== 'PENDING' || !exact(decision, ['status', 'personId', 'identityVerified', 'at']) ||
      !['APPROVED', 'REJECTED'].includes(decision.status) || !Number.isFinite(Date.parse(decision.at))) fail('INVALID_REVIEW');
  if (decision.status === 'APPROVED' && (decision.identityVerified !== true || !d.fleet.people.some(p => p.id === decision.personId && p.active))) fail('IDENTITY_REVIEW_REQUIRED');
  if (decision.status === 'REJECTED' && (decision.personId !== null || decision.identityVerified !== false)) fail('INVALID_REJECTION');
  const next = clone(d), after = next.accounts.find(a => a.id === subjectId);
  Object.assign(after, {status: decision.status, personId: decision.personId, revision: after.revision + 1});
  next.decisions.push({actorId, subjectId, before: clone(subject), after: clone(after), at: decision.at});
  return validateSnapshot(next);
}

export function changeAccess(d, actorId, revision, subjectId, change) {
  admin(d, actorId, revision);
  const subject = d.accounts.find(a => a.id === subjectId);
  if (!subject || actorId === subjectId || !exact(change, ['role', 'status', 'at']) ||
      !['APPROVED', 'DISABLED'].includes(subject.status) || !['APPROVED', 'DISABLED'].includes(change.status) ||
      !roles.includes(change.role) || !Number.isFinite(Date.parse(change.at))) fail('INVALID_ACCESS_CHANGE');
  if (subject.origin === 'legacy' && change.role !== subject.role || subject.origin === 'new' && change.role === 'legacy-employee') fail('LEGACY_CONVERSION_REFUSED');
  if (change.role === subject.role && change.status === subject.status) fail('NO_CHANGE');
  const next = clone(d), after = next.accounts.find(a => a.id === subjectId);
  Object.assign(after, {role: change.role, status: change.status, revision: after.revision + 1});
  next.decisions.push({actorId, subjectId, before: clone(subject), after: clone(after), at: change.at});
  return validateSnapshot(next);
}

// Exact DTO allowlists. No spread of Fleet, Person, Trip, plans or account data.
export function staffReport(d, id, revision, month) {
  const a = principal(d, id, revision);
  if (!['admin', 'staff'].includes(a.role)) fail('FORBIDDEN');
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail('INVALID_MONTH');
  const history = d.fleet.trips.filter(t => t.start.startsWith(month)).map(t => ({
    id: t.id, carId: t.carId, plate: d.fleet.cars.find(c => c.id === t.carId)?.plate ?? '',
    start: t.start, end: t.end, odoStart: t.odoStart, odoEnd: t.odoEnd,
    distanceKm: t.end ? t.odoEnd - t.odoStart : null, isOwn: t.ownerUserId === id
  }));
  const cars = [...new Set(history.map(t => t.carId))].sort().map(carId => {
    const trips = history.filter(t => t.carId === carId);
    return {carId, trips: trips.length, open: trips.filter(t => !t.end).length,
      distanceKm: trips.reduce((n, t) => n + (t.distanceKm ?? 0), 0)};
  });
  return {policyVersion: POLICY, month, history, totals: {trips: history.length,
    open: history.filter(t => !t.end).length, distanceKm: cars.reduce((n, c) => n + c.distanceKm, 0)}, cars};
}

export function basicReminders(d, id, revision, statusForPlan, today) {
  principal(d, id, revision);
  if (typeof statusForPlan !== 'function') fail('STATUS_CALCULATOR_REQUIRED');
  return (d.fleet.maintenancePlans ?? []).filter(p => p.active && d.fleet.cars.some(c => c.id === p.carId && c.active)).map(p => {
    const status = statusForPlan(d.fleet, p, today);
    if (!['normal', 'near', 'overdue'].includes(status)) fail('INVALID_MAINTENANCE_STATUS');
    return {id: p.id, carId: p.carId, plate: d.fleet.cars.find(c => c.id === p.carId).plate,
      type: p.type, status, dueOdo: p.dueOdo ?? null, dueDate: p.dueDate ?? null};
  });
}

export function replayPrincipal(d, id, revision, record) {
  const a = principal(d, id, revision), role = a.role === 'legacy-employee' ? 'employee' : a.role;
  if (record.actorId !== id || record.actorRole !== role || record.actorDriverId !== a.personId) fail('REPLAY_SCOPE_CHANGED');
  return {id, role, driverId: a.personId, passwordVersion: a.revision};
}

export function backupDocument(document) {
  const payload = document?.format === FORMAT ? validateSnapshot(document) : assertLegacy(document);
  return JSON.stringify({format: 'smart-fleet-offline-role-backup', backupVersion: 1,
    payload: clone(payload), sha256: digest(payload)});
}
export async function inspectLegacyApplicationBackup(text, existingInspector) {
  let b; try { b = JSON.parse(text); } catch { fail('INVALID_BACKUP'); }
  assertLegacy(b?.state);
  if (typeof existingInspector !== 'function') fail('INSPECTOR_REQUIRED');
  return existingInspector(text);
}
export async function inspectDocumentBackup(text, readerVersion, inspectFleet) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 5_000_000) fail('BACKUP_SIZE');
  let b; try { b = JSON.parse(text); } catch { fail('INVALID_BACKUP'); }
  if (!exact(b, ['format', 'backupVersion', 'payload', 'sha256']) || b.format !== 'smart-fleet-offline-role-backup' ||
      b.backupVersion !== 1 || b.sha256 !== digest(b.payload)) fail('BACKUP_INTEGRITY');
  if (![1, 2].includes(readerVersion)) fail('READER_VERSION_UNSUPPORTED');
  const payload = b.payload?.format === FORMAT ? (readerVersion === 2 ? clone(validateSnapshot(b.payload)) : fail('READER_VERSION_UNSUPPORTED')) : legacyReader(b.payload);
  if (typeof inspectFleet !== 'function') fail('FLEET_INSPECTOR_REQUIRED');
  await inspectFleet(clone(payload.format === FORMAT ? payload.fleet : payload));
  return payload;
}

const stores = new WeakMap();
export function syntheticStore(fleet, ledger = []) {
  assertLegacy(fleet); unique(ledger);
  // No caller-selected path/binding/DB, no API transport. This handle can only be in memory.
  const sql = new DatabaseSync(':memory:');
  sql.exec('CREATE TABLE spike_snapshot(id INTEGER PRIMARY KEY, document TEXT NOT NULL, version INTEGER NOT NULL); CREATE TABLE spike_ledger(id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE spike_events(id INTEGER PRIMARY KEY, beforeSha TEXT, afterSha TEXT);');
  sql.prepare('INSERT INTO spike_snapshot VALUES (1,?,0)').run(JSON.stringify(fleet));
  for (const row of ledger) sql.prepare('INSERT INTO spike_ledger VALUES (?,?)').run(row.id, JSON.stringify(row));
  const handle = Object.freeze({}); stores.set(handle, sql); return handle;
}
function database(handle) { const sql = stores.get(handle); if (!sql) fail('SYNTHETIC_STORE_REQUIRED'); return sql; }
export function snapshot(handle) {
  const sql = database(handle);
  return {schema: sql.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name").all(),
    state: sql.prepare('SELECT * FROM spike_snapshot').all(), ledger: sql.prepare('SELECT * FROM spike_ledger ORDER BY id').all(),
    events: sql.prepare('SELECT * FROM spike_events ORDER BY id').all()};
}
export function readDocument(handle, readerVersion = 2) {
  const d = JSON.parse(database(handle).prepare('SELECT document FROM spike_snapshot WHERE id=1').get().document);
  if (readerVersion === 1) return legacyReader(d);
  if (readerVersion !== 2) fail('READER_VERSION_UNSUPPORTED');
  return d?.format === FORMAT ? clone(validateSnapshot(d)) : legacyReader(d);
}
export function migrationPlan(handle) {
  const sql = database(handle), row = sql.prepare('SELECT document,version FROM spike_snapshot WHERE id=1').get();
  const ledger = sql.prepare('SELECT payload FROM spike_ledger ORDER BY id').all().map(r => JSON.parse(r.payload));
  const candidate = migrateSnapshot(JSON.parse(row.document), ledger);
  return {sourceSha: digest(JSON.parse(row.document)), sourceVersion: row.version, candidate, candidateSha: digest(candidate)};
}
function commit(handle, candidate, expectedVersion, expectedSha, fault) {
  const sql = database(handle); sql.exec('BEGIN IMMEDIATE');
  try {
    const row = sql.prepare('SELECT document,version FROM spike_snapshot WHERE id=1').get();
    if (row.version !== expectedVersion || digest(JSON.parse(row.document)) !== expectedSha) fail('STALE_PLAN');
    sql.prepare('UPDATE spike_snapshot SET document=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(candidate), expectedVersion);
    if (fault === 'after-state') fail('SYNTHETIC_FAILURE');
    sql.prepare('INSERT INTO spike_events(beforeSha,afterSha) VALUES (?,?)').run(expectedSha, digest(candidate));
    if (fault === 'after-event') fail('SYNTHETIC_FAILURE');
    sql.exec('COMMIT');
  } catch (e) { sql.exec('ROLLBACK'); throw e; }
}
export function applyMigration(handle, plan, fault) {
  const current = readDocument(handle, 1), expected = migrationPlan(handle);
  if (digest(plan) !== digest(expected) || digest(current) !== plan.sourceSha) fail('PLAN_TAMPERED');
  commit(handle, plan.candidate, plan.sourceVersion, plan.sourceSha, fault);
}
export function replaceSynthetic(handle, document, version, fault) {
  // Only v2 is replaceable; no arbitrary downgrade escape hatch.
  validateSnapshot(document);
  const current = readDocument(handle, 2);
  if (current.format !== FORMAT || digest(document.fleet) !== digest(current.fleet) || digest(document.ledger) !== digest(current.ledger)) fail('HISTORY_REWRITE_REFUSED');
  commit(handle, document, version, digest(current), fault);
}
export function rollbackMigration(handle, plan, fault) {
  const d = readDocument(handle, 2);
  // Lossless rollback only for the exact untouched candidate. New approvals/data => refuse.
  if (digest(d) !== plan.candidateSha || digest(plan.candidate) !== plan.candidateSha) fail('ROLLBACK_UNSAFE');
  const original = legacyReader(d.fleet);
  if (digest(original) !== plan.sourceSha) fail('ROLLBACK_UNSAFE');
  commit(handle, original, plan.sourceVersion + 1, plan.candidateSha, fault);
}
export async function restoreSynthetic(handle, text, readerVersion, inspectFleet, fault) {
  // Inspection/reader guard happens before any transaction or write.
  const d = await inspectDocumentBackup(text, readerVersion, inspectFleet), current = readDocument(handle, 2);
  if (current.format === FORMAT || d?.format !== FORMAT) fail('RESTORE_SCOPE_REFUSED');
  const plan = migrationPlan(handle);
  if (digest(d) !== plan.candidateSha) fail('RESTORE_NOT_EXACT_CANDIDATE');
  commit(handle, d, plan.sourceVersion, plan.sourceSha, fault);
}
export function closeSynthetic(handle) { database(handle).close(); stores.delete(handle); }
