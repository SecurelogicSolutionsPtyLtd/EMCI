import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  finaliseRating,
  deriveSupportNeed,
  type AiRating,
} from './studentRating.js';
import type { Student } from '../data/studentsData.js';

const baseStudent: Student = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  firstName: 'James',
  lastName: 'Smith',
  preferredName: 'Jim',
  studentName: 'James Smith',
  email: 'james.smith@school.edu.au',
  yearLevel: 10,
  yearLevelLabel: 'Year 10',
  morrisbyId: 'MORR-12345',
  status: 'Active',
  currentStage: 'career_guidance',
  stageProgress: 3,
  riskLevel: 'none',
  absenceCount: 0,
  counsellor: 'Alex Counsellor',
  interviewed: true,
  hasProfile: true,
  studentType: 'Standard',
  lastActivity: '2026-01-01T00:00:00Z',
};

function ai(partial: Partial<AiRating>): AiRating {
  return {
    categories: [
      { key: 'engagement', score: 80, reason: '' },
      { key: 'career_outcomes', score: 80, reason: '' },
      { key: 'attendance_momentum', score: 80, reason: '' },
      { key: 'growth_wellbeing', score: 80, reason: '' },
    ],
    flags: [],
    confidence: 'high',
    ...partial,
  };
}

describe('finaliseRating', () => {
  it('computes weighted overall and band from all categories', () => {
    const r = finaliseRating(ai({}), baseStudent);
    assert.equal(r.overall, 80);
    assert.equal(r.band, 'on_track');
    assert.equal(r.categories.length, 4);
  });

  it('re-normalises over present weights when a category is null', () => {
    const r = finaliseRating(
      ai({
        categories: [
          { key: 'engagement', score: 60, reason: '' },
          { key: 'career_outcomes', score: 60, reason: '' },
          { key: 'attendance_momentum', score: null, reason: '' },
          { key: 'growth_wellbeing', score: null, reason: '' },
        ],
      }),
      baseStudent,
    );
    assert.equal(r.overall, 60);
    assert.equal(r.band, 'monitoring');
  });

  it('clamps out-of-range AI scores into 0–100', () => {
    const r = finaliseRating(
      ai({
        categories: [
          { key: 'engagement', score: 150, reason: '' },
          { key: 'career_outcomes', score: -20, reason: '' },
          { key: 'attendance_momentum', score: 100, reason: '' },
          { key: 'growth_wellbeing', score: 0, reason: '' },
        ],
      }),
      baseStudent,
    );
    const eng = r.categories.find(c => c.key === 'engagement')!;
    const career = r.categories.find(c => c.key === 'career_outcomes')!;
    assert.equal(eng.score, 100);
    assert.equal(career.score, 0);
  });

  it('returns 0 / needs_attention when every category is null', () => {
    const r = finaliseRating(
      ai({
        categories: [
          { key: 'engagement', score: null, reason: '' },
          { key: 'career_outcomes', score: null, reason: '' },
          { key: 'attendance_momentum', score: null, reason: '' },
          { key: 'growth_wellbeing', score: null, reason: '' },
        ],
      }),
      baseStudent,
    );
    assert.equal(r.overall, 0);
    assert.equal(r.band, 'needs_attention');
  });
});

describe('deriveSupportNeed', () => {
  it('is standard for a Year 10 standard student', () => {
    assert.equal(deriveSupportNeed(baseStudent), 'standard');
  });

  it('is elevated for a priority-cohort student', () => {
    assert.equal(
      deriveSupportNeed({ ...baseStudent, studentType: 'Disability' }),
      'elevated',
    );
  });

  it('is elevated for a Year 11 standard student (runway pressure)', () => {
    assert.equal(
      deriveSupportNeed({ ...baseStudent, yearLevel: 11 }),
      'elevated',
    );
  });

  it('never lowers the achievement score (support need is separate)', () => {
    const priority = finaliseRating(ai({}), { ...baseStudent, studentType: 'Disability' });
    assert.equal(priority.overall, 80);
    assert.equal(priority.supportNeed, 'elevated');
  });
});
