import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeQuickInsights } from './studentInsights.js';
import type { Student } from '../data/studentsData.js';
import type { TimelineEvent } from '../services/dataverse.js';

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

function session(interventionType: string): TimelineEvent {
  return {
    type: 'session',
    id: `session-${interventionType}`,
    date: '2026-01-01T00:00:00Z',
    title: 'Career guidance session',
    notes: 'Session notes.',
    interventionType,
    surveyFields: [],
  };
}

describe('computeQuickInsights — work experience', () => {
  it('detects work experience from a session intervention type', () => {
    const insights = computeQuickInsights(baseStudent, [session('Work Experience')]);
    assert.equal(insights.workExperience.yes, true);
  });

  it('stays false when no session or survey indicates work experience', () => {
    const insights = computeQuickInsights(baseStudent, [session('Career Action Plan')]);
    assert.equal(insights.workExperience.yes, false);
  });
});
