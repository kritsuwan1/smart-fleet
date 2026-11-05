// Invented local fixtures. No real identities, credentials or cloud binding.
export function fixture() {
  const account = (id, driverId, role, active = true) => ({id, driverId, role, active,
    username: id, name: 'SYNTHETIC ' + id, passwordVersion: 3,
    salt: 'synthetic-salt', passwordHash: 'synthetic-hash', createdAt: '2026-11-05T00:00:00Z'});
  const trip = (id, carId, driverId, ownerUserId, start, end, odoStart, odoEnd) => ({
    id, seq: Number(id.slice(1)), carId, driverId, ownerUserId, start, end, odoStart, odoEnd,
    project: 'PRIVATE PROJECT', destination: 'PRIVATE DESTINATION', note: 'PRIVATE NOTE', reason: ''});
  const fleet = {
    cars: [{id: 'c1', plate: 'SYNTHETIC-1', province: 'Test', model: 'Test', active: true, initialOdo: 100},
      {id: 'c2', plate: 'SYNTHETIC-2', province: 'Test', model: 'Test', active: true, initialOdo: 200}],
    people: Array.from({length: 9}, (_, i) => ({id: 'p' + i, name: i > 3 ? 'SAME DISPLAY NAME' : 'PRIVATE PERSON ' + i, active: i !== 8})),
    accounts: [account('manager', 'p0', 'admin'), account('employee', 'p1', 'employee'),
      account('missing-role', 'p2', undefined), account('disabled', 'p3', 'employee', false)],
    trips: [trip('t1', 'c1', 'p1', 'employee', '2026-11-05T08:00', '2026-11-05T09:00', 100, 110),
      trip('t2', 'c1', 'p1', 'employee', '2026-11-05T10:00', '', 110, null),
      trip('t3', 'c2', 'p4', undefined, '2026-11-04T08:00', '2026-11-04T09:00', 200, 230)],
    projects: ['PRIVATE PROJECT'], audit: [{id: 'audit1', actor: 'PRIVATE ACTOR', action: 'test', time: '2026-11-05T00:00:00Z', before: null, after: null}],
    sessionKey: 'synthetic-session', imported: true, legacyExtra: {preserve: 'unchanged'},
    maintenancePlans: [{id: 'm1', carId: 'c1', name: 'PRIVATE MAINTENANCE NAME', type: 'oil', active: true,
      dueOdo: 120, dueDate: '2026-11-05', warnKm: 20, warnDays: 7}],
    maintenanceHistory: [{id: 'mh1', planId: 'm1', carId: 'c1', date: '2026-11-01', odometer: 100,
      details: 'PRIVATE SERVICE DETAIL', costSatang: 12345}]
  };
  return {fleet, ledger: [{id: 'trip-operation:v1:synthetic', payload: {retain: 'exact bytes', actorRole: 'employee'}}]};
}
