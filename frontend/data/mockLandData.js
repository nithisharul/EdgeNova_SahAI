/**
 * My Land -- prototype field profile.
 *
 * THIS IS THE ONE PLACE IN THE APP THAT IS NOT BACKEND-BACKED, and it says so
 * on screen. There is no land, plot or farm table in the SahAI backend and no
 * endpoint that serves one, so this record is local to the device and is
 * labelled "Prototype field profile" wherever it appears.
 *
 * It is a fictional holding, not a real farm. Nothing here is presented as a
 * sensor reading or a server record -- the section statuses below describe the
 * prototype only. Live field readings arrive in the upcoming hardware phase,
 * and this file is what they will replace.
 *
 * Self-contained on purpose: it used to import the crop name from the crop
 * service and plot statuses from a crop-health fixture, which meant deleting
 * either one broke this screen.
 */

const SECTIONS = [
  { id: 'north-field', name: 'North Field', acres: 2.0, crop: 'Rice', sownOn: '2026-06-18', status: 'Healthy', tone: 'success' },
  { id: 'south-field', name: 'South Field', acres: 1.8, crop: 'Rice', sownOn: '2026-06-22', status: 'Needs water', tone: 'warning' },
  { id: 'nursery', name: 'Nursery', acres: 1.0, crop: 'Seedlings', sownOn: '2026-07-04', status: 'Healthy', tone: 'success' },
];

export const fieldSections = SECTIONS;

export const farmProfile = {
  farmName: 'Green Valley Farm',
  totalAcres: SECTIONS.reduce((sum, section) => sum + section.acres, 0),
  primaryCrop: 'Rice',
  soilType: 'Loamy',
  village: 'Rampur',
  irrigation: 'Canal and borewell',
  season: 'Kharif 2026',
};

export default { farmProfile, fieldSections };
