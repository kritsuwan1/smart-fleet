// Synthetic scenario clock only. Never freeze authentication or production time.
export const SCENARIO_CLOCK='2026-11-10T00:00:00.000Z';
export const SCENARIO_MONTH='2026-11';
export const scenarioTime=hour=>'2026-11-10T'+String(hour).padStart(2,'0')+':00';
