import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRatingPacket,
  finaliseRating,
  checkScoreEligibility,
  isScoreEligible,
  isWithinCrmCreationGracePeriod,
  CRM_CREATION_GRACE_PERIOD_DAYS,
  CATEGORY_WEIGHTS,
  RATING_CATEGORY_KEYS,
  type AiRating,
  type AiRatingCategory,
} from './studentRating.js';
import { parseStoredRating } from './studentRatingStorage.js';
import type { TimelineEvent } from '../services/dataverse.js';
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
      { key: 'work_readiness', score: 80, reason: '' },
      { key: 'attendance_momentum', score: 80, reason: '' },
      { key: 'growth_sentiment', score: 80, reason: '' },
    ],
    flags: [],
    confidence: 'high',
    ...partial,
  };
}

function timelineNote(note: string): TimelineEvent {
  return {
    type: 'session',
    id: 'session-note',
    date: '2026-01-01T00:00:00Z',
    modifiedDate: '2026-01-01T00:00:00Z',
    title: 'Work readiness',
    status: 'Completed',
    by: 'Alex Counsellor',
    description: 'Career guidance session.',
    notes: note,
    track: 'above',
    interventionType: 'Work Readiness',
    surveyFields: [],
  };
}

function surveyEvent(id: string): TimelineEvent {
  return {
    type: 'survey',
    id,
    date: '2026-01-01T00:00:00Z',
    modifiedDate: '2026-01-01T00:00:00Z',
    title: 'Survey',
    status: 'Completed',
    by: 'Alex Counsellor',
    description: 'Survey completed.',
    notes: '',
    track: 'above',
    surveyFields: [{ label: 'Preparedness', value: 'Agree' }],
  };
}

function emciSession(id = 'session-abc'): TimelineEvent {
  return {
    ...timelineNote('Session completed.'),
    id,
  };
}

describe('score eligibility (P5-T2)', () => {
  it('is eligible when the student has at least two real EMCI sessions', () => {
    const events = [emciSession('session-1'), emciSession('session-2')];
    const gates = checkScoreEligibility(events);
    assert.equal(gates.emciSessionCount, 2);
    assert.equal(isScoreEligible(events), true);
  });

  it('is ineligible with fewer than two real EMCI sessions', () => {
    assert.equal(isScoreEligible([]), false);
    assert.equal(isScoreEligible([emciSession('session-1')]), false);
    assert.equal(isScoreEligible([surveyEvent('init-survey-1'), surveyEvent('mid-survey-1')]), false);
  });

  it('does not count synthetic fallback sessions toward the session count', () => {
    const events = [
      { ...emciSession(), id: 'step-3' },
      emciSession('session-1'),
    ];
    assert.equal(checkScoreEligibility(events).emciSessionCount, 1);
    assert.equal(isScoreEligible(events), false);
  });
});

describe('CRM creation grace period (P5-T3)', () => {
  const eligibleSessionEvents = [
    emciSession('session-1'),
    emciSession('session-2'),
  ];

  it('blocks scoring when the CRM record is younger than 30 days', () => {
    const referenceDate = new Date('2026-06-29T12:00:00Z');
    const student = { createdAt: '2026-06-15T00:00:00Z' };

    assert.equal(isWithinCrmCreationGracePeriod(student, referenceDate), true);
    assert.equal(isScoreEligible(eligibleSessionEvents, student, referenceDate), false);

    const gates = checkScoreEligibility(eligibleSessionEvents, student, referenceDate);
    assert.equal(gates.emciSessionCount, 2);
    assert.equal(gates.withinCrmCreationGracePeriod, true);
    assert.equal(gates.eligible, false);
  });

  it('allows scoring when the CRM record is at least 30 days old and gates are met', () => {
    const referenceDate = new Date('2026-06-29T12:00:00Z');
    const student = { createdAt: '2026-05-30T00:00:00Z' };

    assert.equal(isWithinCrmCreationGracePeriod(student, referenceDate), false);
    assert.equal(isScoreEligible(eligibleSessionEvents, student, referenceDate), true);
  });

  it('treats exactly 30 days since creation as outside the grace period', () => {
    const createdAt = '2026-05-30T12:00:00Z';
    const referenceDate = new Date('2026-06-29T12:00:00Z');
    const student = { createdAt };

    assert.equal(
      CRM_CREATION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      referenceDate.getTime() - new Date(createdAt).getTime(),
    );
    assert.equal(isWithinCrmCreationGracePeriod(student, referenceDate), false);
    assert.equal(isScoreEligible(eligibleSessionEvents, student, referenceDate), true);
  });

  it('does not block scoring when createdAt is missing or invalid', () => {
    const referenceDate = new Date('2026-06-29T12:00:00Z');

    assert.equal(isWithinCrmCreationGracePeriod({}, referenceDate), false);
    assert.equal(isWithinCrmCreationGracePeriod({ createdAt: '' }, referenceDate), false);
    assert.equal(isWithinCrmCreationGracePeriod({ createdAt: 'not-a-date' }, referenceDate), false);
    assert.equal(isScoreEligible(eligibleSessionEvents, {}, referenceDate), true);
  });
});

describe('finaliseRating', () => {
  it('computes weighted overall and band from all categories', () => {
    const r = finaliseRating(ai({}));
    assert.equal(r.overall, 80);
    assert.equal(r.band, 'on_track');
    assert.equal(r.categories.length, 5);
  });

  it('weights categories per the rubric (engagement = 20%, career & work = 25%)', () => {
    const r = finaliseRating(
      ai({
        categories: [
          { key: 'engagement', score: 100, reason: '' },
          { key: 'career_outcomes', score: 0, reason: '' },
          { key: 'work_readiness', score: 0, reason: '' },
          { key: 'attendance_momentum', score: 0, reason: '' },
          { key: 'growth_sentiment', score: 0, reason: '' },
        ],
      }),
    );
    assert.equal(r.overall, 20);
    const career = r.categories.find(c => c.key === 'career_outcomes')!;
    assert.equal(career.weight, 25);
    const work = r.categories.find(c => c.key === 'work_readiness')!;
    assert.equal(work.weight, 25);
    const sentiment = r.categories.find(c => c.key === 'growth_sentiment')!;
    assert.equal(sentiment.weight, 15);
  });

  it('rubric weights sum to 100%', () => {
    const total = RATING_CATEGORY_KEYS.reduce((sum, key) => sum + CATEGORY_WEIGHTS[key], 0);
    assert.equal(total, 100);
  });

  it('re-normalises over present weights when a category is null', () => {
    const r = finaliseRating(
      ai({
        categories: [
          { key: 'engagement', score: 60, reason: '' },
          { key: 'career_outcomes', score: 60, reason: '' },
          { key: 'work_readiness', score: null, reason: '' },
          { key: 'attendance_momentum', score: null, reason: '' },
          { key: 'growth_sentiment', score: null, reason: '' },
        ],
      }),
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
          { key: 'work_readiness', score: 50, reason: '' },
          { key: 'attendance_momentum', score: 100, reason: '' },
          { key: 'growth_sentiment', score: 0, reason: '' },
        ],
      }),
    );
    const eng = r.categories.find(c => c.key === 'engagement')!;
    const career = r.categories.find(c => c.key === 'career_outcomes')!;
    assert.equal(eng.score, 100);
    assert.equal(career.score, 0);
  });

  it('labels growth_sentiment as Student Sentiment', () => {
    const r = finaliseRating(ai({}));
    const sentiment = r.categories.find(c => c.key === 'growth_sentiment')!;
    assert.equal(sentiment.label, 'Student Sentiment');
  });

  it('labels career_outcomes as Career Planning & Exploration', () => {
    const r = finaliseRating(ai({}));
    const career = r.categories.find(c => c.key === 'career_outcomes')!;
    assert.equal(career.label, 'Career Planning & Exploration');
  });

  it('maps legacy growth_wellbeing AI key to growth_sentiment', () => {
    const categories: AiRatingCategory[] = [
      { key: 'engagement', score: 80, reason: '' },
      { key: 'career_outcomes', score: 80, reason: '' },
      { key: 'work_readiness', score: 80, reason: '' },
      { key: 'attendance_momentum', score: 80, reason: '' },
      { key: 'growth_wellbeing' as AiRatingCategory['key'], score: 80, reason: '' },
    ];
    const r = finaliseRating(ai({ categories }));
    const sentiment = r.categories.find(c => c.key === 'growth_sentiment')!;
    assert.equal(sentiment.label, 'Student Sentiment');
    assert.equal(sentiment.score, 80);
  });

  it('returns 0 / needs_attention when every category is null', () => {
    const r = finaliseRating(
      ai({
        categories: [
          { key: 'engagement', score: null, reason: '' },
          { key: 'career_outcomes', score: null, reason: '' },
          { key: 'work_readiness', score: null, reason: '' },
          { key: 'attendance_momentum', score: null, reason: '' },
          { key: 'growth_sentiment', score: null, reason: '' },
        ],
      }),
    );
    assert.equal(r.overall, 0);
    assert.equal(r.band, 'needs_attention');
  });
});

describe('parseStoredRating', () => {
  it('migrates legacy growth_wellbeing stored blobs to Student Sentiment', () => {
    const raw = JSON.stringify({
      v: 1,
      overall: 70,
      band: 'progressing',
      categories: [
        {
          key: 'growth_wellbeing',
          label: 'Growth & Wellbeing',
          score: 65,
          weight: 20,
          reason: 'Positive tone in notes',
        },
      ],
      flags: ['wellbeing_concern'],
      confidence: 'medium',
    });
    const parsed = parseStoredRating(raw);
    assert.ok(parsed);
    const sentiment = parsed!.categories.find(c => c.key === 'growth_sentiment')!;
    assert.equal(sentiment.label, 'Student Sentiment');
    assert.equal(parsed!.flags.includes('sentiment_concern'), true);
  });

  it('recomputes composite score with current rubric weights on read', () => {
    const raw = JSON.stringify({
      v: 1,
      overall: 80,
      band: 'on_track',
      categories: [
        { key: 'engagement', label: 'Engagement', score: 80, weight: 20, reason: '' },
        { key: 'career_outcomes', label: 'Career outcomes', score: 80, weight: 25, reason: '' },
        { key: 'work_readiness', label: 'Work readiness', score: 100, weight: 20, reason: '' },
        { key: 'attendance_momentum', label: 'Attendance & momentum', score: 80, weight: 15, reason: '' },
        { key: 'growth_sentiment', label: 'Student Sentiment', score: 60, weight: 20, reason: '' },
      ],
      flags: [],
      confidence: 'high',
    });
    const parsed = parseStoredRating(raw);
    assert.ok(parsed);
    assert.equal(parsed!.overall, 82);
    assert.equal(parsed!.categories.find(c => c.key === 'work_readiness')!.weight, 25);
    assert.equal(parsed!.categories.find(c => c.key === 'growth_sentiment')!.weight, 15);
  });
});

describe('buildRatingPacket', () => {
  it('includes redacted timeline notes for scoring context', () => {
    const packet = buildRatingPacket(baseStudent, [
      timelineNote('James reported feeling more confident after resume work.'),
    ]);

    assert.equal(packet.timelineNotes.length, 1);
    assert.equal(packet.timelineNotes[0].note.includes('James'), false);
    assert.equal(packet.timelineNotes[0].note.includes('[Redacted]'), true);
    assert.match(packet.notesRedacted, /more confident/);
  });
});
