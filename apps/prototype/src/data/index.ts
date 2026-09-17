import { createCrowd } from './crowd';
import { deriveVisitors } from './derive';
import { createHeroScenarios } from './scenarios';

export const FIXED_NOW = '2026-09-17T14:00:00Z';
export const rawData = (() => { const heroes = createHeroScenarios(); const crowd = createCrowd(); return { visitors: [...heroes.visitors, ...crowd.visitors], visits: [...heroes.visits, ...crowd.visits] }; })();
export const visitorViewModels = deriveVisitors(rawData);
