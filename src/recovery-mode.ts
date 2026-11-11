declare const __FLEET_RECOVERY__:boolean;
export const IS_RECOVERY=typeof __FLEET_RECOVERY__!=='undefined'&&__FLEET_RECOVERY__===true;
export class RecoveryStateError extends Error {constructor(){super('RECOVERY_STATE_REQUIRED');}}
