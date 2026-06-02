import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeQuickInsights,
  detectWorkExperienceCompleted,
  buildTimelineNotes,
} from './studentInsights.js';
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

function session(interventionType: string, surveyFields: TimelineEvent['surveyFields'] = []): TimelineEvent {
  return {
    type: 'session',
    id: `session-${interventionType}`,
    date: '2026-01-01T00:00:00Z',
    modifiedDate: '2026-01-01T00:00:00Z',
    title: 'Career guidance session',
    status: 'Completed',
    by: 'Alex Counsellor',
    description: 'Career guidance session.',
    notes: 'Session notes.',
    track: 'above',
    interventionType,
    surveyFields,
  };
}

describe('computeQuickInsights — intervention areas', () => {
  it('detects each area from session intervention type', () => {
    const insights = computeQuickInsights(baseStudent, [
      session('Unpack'),
      session('CAP'),
      session('Work Readiness'),
      session('Industry Engagement'),
      session('External Support'),
      session('WEX Preparation'),
      session('Introduction'),
      session('Other'),
    ]);
    assert.equal(insights.unpack.yes, true);
    assert.equal(insights.cap.yes, true);
    assert.equal(insights.workReadiness.yes, true);
    assert.equal(insights.industryEngagement.yes, true);
    assert.equal(insights.externalSupport.yes, true);
    assert.equal(insights.wexPreparation.yes, true);
    assert.equal(insights.introduction.yes, true);
    assert.equal(insights.other.yes, true);
  });

  it('detects areas from Intervention Areas multiselect', () => {
    const insights = computeQuickInsights(baseStudent, [
      session('Session', [{ label: 'Intervention Areas', value: 'CAP; WEX Preparation' }]),
    ]);
    assert.equal(insights.cap.yes, true);
    assert.equal(insights.wexPreparation.yes, true);
    assert.equal(insights.unpack.yes, false);
  });

  it('detects CAP and WEX independently', () => {
    const capOnly = computeQuickInsights(baseStudent, [session('CAP')]);
    assert.equal(capOnly.cap.yes, true);
    assert.equal(capOnly.wexPreparation.yes, false);

    const wexOnly = computeQuickInsights(baseStudent, [session('WEX Preparation')]);
    assert.equal(wexOnly.cap.yes, false);
    assert.equal(wexOnly.wexPreparation.yes, true);
  });
});

describe('detectWorkExperienceCompleted', () => {
  it('detects completed work experience from session intervention type', () => {
    assert.equal(
      detectWorkExperienceCompleted([session('Work Experience')]),
      true,
    );
  });

  it('stays false when only WEX preparation is recorded', () => {
    assert.equal(
      detectWorkExperienceCompleted([session('WEX Preparation')]),
      false,
    );
  });
});

describe('computeQuickInsights — session and absence counts', () => {
  it('includes session and absence counts', () => {
    const insights = computeQuickInsights(
      { ...baseStudent, absenceCount: 4 },
      [session('CAP'), session('Unpack')],
    );
    assert.equal(insights.sessionCount, 2);
    assert.equal(insights.absenceCount, 4);
    assert.equal(insights.absencesFlagged, true);
  });

  it('does not flag absences at or below threshold', () => {
    const insights = computeQuickInsights(
      { ...baseStudent, absenceCount: 3 },
      [],
    );
    assert.equal(insights.absencesFlagged, false);
  });
});

describe('buildTimelineNotes', () => {
  it('includes redacted timeline notes from events and note-like fields', () => {
    const notes = buildTimelineNotes(baseStudent, [
      {
        ...session('CAP', [{ label: 'Next Step', value: 'Ask James to bring resume notes.' }]),
        notes: 'James wants engineering pathways discussed next.',
      },
    ]);

    assert.equal(notes.length, 2);
    assert.equal(notes[0].note.includes('James'), false);
    assert.equal(notes[0].note.includes('[Redacted]'), true);
    assert.equal(notes[1].note, 'Next Step: Ask [Redacted] to bring resume notes.');
  });
});
