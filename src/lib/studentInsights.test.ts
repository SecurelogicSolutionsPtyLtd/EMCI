import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeQuickInsights,
  detectWorkExperienceCompleted,
  buildTimelineNotes,
  buildQuickInsightDetails,
  hasStudentVoiceData,
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

function survey(id: string): TimelineEvent {
  return {
    type: 'survey',
    id,
    date: '2026-01-01T00:00:00Z',
    modifiedDate: '2026-01-01T00:00:00Z',
    title: 'Pilot survey',
    status: 'Completed',
    by: 'Student',
    description: 'Survey completed.',
    notes: null,
    track: 'above',
    surveyFields: [{ label: 'Preparedness', value: 'Agree' }],
  };
}

function note(title: string, notes = ''): TimelineEvent {
  return {
    type: 'note',
    id: `note-${title}`,
    date: '2025-05-15T00:00:00Z',
    modifiedDate: '2025-05-15T00:00:00Z',
    title,
    status: '',
    by: 'Alex Counsellor',
    description: '',
    notes: notes || title,
    track: 'below',
    surveyFields: [],
  };
}

describe('computeQuickInsights — intervention areas', () => {
  it('detects each area from session intervention type', () => {
    const insights = computeQuickInsights(baseStudent, [
      session('Unpack', [{ label: 'Intervention Type', value: 'Unpack' }]),
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

  it('does not mis-detect intervention areas from student satisfaction feedback', () => {
    const insights = computeQuickInsights(baseStudent, [
      session('Unpack', [
        { label: 'Intervention Type', value: 'Unpack' },
        { label: 'Session Satisfaction', value: 'Other' },
        { label: 'Found Useful', value: 'Industry engagement; Other' },
      ]),
    ]);
    assert.equal(insights.other.yes, false);
    assert.equal(insights.industryEngagement.yes, false);
    assert.equal(insights.unpack.yes, true);
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

  it('counts timeline notes recording an absence', () => {
    const insights = computeQuickInsights(baseStudent, [
      note('Student absent 14.05.25'),
      note('Email from Principal'),
    ]);
    assert.equal(insights.absenceCount, 1);
  });

  it('does not flag absences at or below threshold', () => {
    const insights = computeQuickInsights(
      { ...baseStudent, absenceCount: 3 },
      [],
    );
    assert.equal(insights.absencesFlagged, false);
  });

  it('counts completed pilot survey stages out of 3', () => {
    const none = computeQuickInsights(baseStudent, []);
    assert.equal(none.surveyCount, 0);

    const initialOnly = computeQuickInsights(baseStudent, [
      survey('init-survey-legacy-1'),
    ]);
    assert.equal(initialOnly.surveyCount, 1);

    const allThree = computeQuickInsights(baseStudent, [
      survey('init-survey-2026-1'),
      survey('mid-survey-legacy-1'),
      survey('end-survey-2026-1'),
    ]);
    assert.equal(allThree.surveyCount, 3);

    const duplicateStages = computeQuickInsights(baseStudent, [
      survey('init-survey-legacy-1'),
      survey('init-survey-2026-1'),
      survey('mid-survey-2026-1'),
    ]);
    assert.equal(duplicateStages.surveyCount, 2);
  });
});

describe('buildQuickInsightDetails', () => {
  it('lists sessions, absences, and survey stages behind each tile', () => {
    const absence: TimelineEvent = {
      type: 'absence',
      id: 'absence-1',
      date: '2026-02-01T00:00:00Z',
      modifiedDate: '2026-02-01T00:00:00Z',
      title: 'EMCI Student Absence',
      status: '',
      by: 'Alex Counsellor',
      description: 'Reason: Illness',
      notes: 'Illness',
      track: 'below',
      surveyFields: [],
    };
    const details = buildQuickInsightDetails([
      session('CAP'),
      session('Unpack', [{ label: 'Intervention Type', value: 'Unpack' }]),
      absence,
      survey('init-survey-2026-1'),
    ]);

    assert.equal(details.sessions.length, 2);
    assert.equal(details.absences.length, 1);
    assert.equal(details.absences[0].note, 'Illness');
    assert.equal(details.surveys.length, 1);
    assert.equal(details.surveys[0].note, 'Initial pilot survey');
  });

  it('lists absence notes behind the Absences tile', () => {
    const details = buildQuickInsightDetails([
      note('Student absent 14.05.25'),
      note('Email from Principal'),
    ]);
    assert.equal(details.absences.length, 1);
    assert.equal(details.absences[0].title, 'Student absent 14.05.25');
  });

  it('attributes sessions to areas with the same matching as the yes/no flags', () => {
    const details = buildQuickInsightDetails([
      session('CAP'),
      session('Session', [{ label: 'Intervention Areas', value: 'CAP; WEX Preparation' }]),
    ]);
    assert.equal(details.cap.length, 2);
    assert.equal(details.wexPreparation.length, 1);
    assert.equal(details.unpack.length, 0);
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

describe('hasStudentVoiceData', () => {
  it('returns false when there are no surveys, feedback, or voice notes', () => {
    assert.equal(
      hasStudentVoiceData(baseStudent, [{
        ...session('CAP'),
        title: 'Counselling session',
        notes: 'Practitioner observation only.',
      }]),
      false,
    );
  });

  it('returns true for survey field values', () => {
    assert.equal(
      hasStudentVoiceData(baseStudent, [
        {
          type: 'survey',
          id: 'init-survey-1',
          date: '2026-01-01T00:00:00Z',
          modifiedDate: '2026-01-01T00:00:00Z',
          title: 'Start survey',
          status: 'Completed',
          by: 'Alex Counsellor',
          description: 'Start survey',
          notes: null,
          track: 'above',
          surveyFields: [{ label: 'What do you enjoy at school?', value: 'Sport and science.' }],
        },
      ]),
      true,
    );
  });

  it('returns true for session satisfaction feedback', () => {
    assert.equal(
      hasStudentVoiceData(baseStudent, [
        session('CAP', [{ label: 'Session Satisfaction', value: 'Very satisfied' }]),
      ]),
      true,
    );
  });

  it('returns true for timeline notes containing student voice keywords', () => {
    assert.equal(
      hasStudentVoiceData(baseStudent, [
        {
          ...session('CAP'),
          notes: 'Student feels more confident about career options.',
        },
      ]),
      true,
    );
  });
});
