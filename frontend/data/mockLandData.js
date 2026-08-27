/**
 * Farm profile demo data.
 *
 * Fictional holding. The village is one of the villages in the member roster
 * and the primary crop is the one the crop service recommends, so the land
 * record never contradicts the rest of the app. Section names and statuses
 * come from data/mockCropHealthData.js rather than being retyped.
 *
 * No map SDK is involved: the screen draws each section as a block sized
 * from the acreage below.
 */

/** Placeholder crop for the sample plots below. */
const CROP = { crop: 'Rice' };
import { plotHealth } from './mockCropHealthData';

const SECTIONS = [
  { id: 'north-field', name: 'North Field', acres: 2.0, crop: CROP.crop, sownOn: '2026-06-18' },
  { id: 'south-field', name: 'South Field', acres: 1.8, crop: CROP.crop, sownOn: '2026-06-22' },
  { id: 'nursery', name: 'Nursery', acres: 1.0, crop: 'Seedlings', sownOn: '2026-07-04' },
];

/** Each section carries the status the health screen reports for that plot. */
export const fieldSections = SECTIONS.map((section) => {
  const health = plotHealth.find((plot) => plot.id === section.id) || {};
  return { ...section, status: health.status, tone: health.tone };
});

export const farmProfile = {
  farmName: 'Green Valley Farm',
  owner: 'Meera',
  totalAcres: fieldSections.reduce((sum, section) => sum + section.acres, 0),
  primaryCrop: CROP.crop,
  soilType: 'Loamy',
  village: 'Rampur',
  irrigation: 'Canal and borewell',
  season: 'Kharif 2026',
};

export default { farmProfile, fieldSections };
