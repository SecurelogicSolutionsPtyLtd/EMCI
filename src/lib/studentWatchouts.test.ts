import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeWatchouts } from './studentWatchouts.js';
import type { Student } from '../data/studentsData.js';
import type { StudentRating } from './studentRating.js';
import type { TimelineEvent } from '../services/dataverse.js';

const baseStudent: Student = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  firstName: 'James',
  lastName: 'Smith',
  yearLevel: 10,
  morrisbyId: 'MORR-1',
  status: 'Active',
  currentStage: 'career_guidance',
  stageProgress: 3,
  riskLevel: 'none',
  absenceCount: 0,
  counsellor: 'Alex Counsellor',
  interviewed: true,
  hasProfile: true,
  studentType: 'Standard',
  lastActivity: new Date().toISOString(),
};

function session(date: string, interventionType = ''): TimelineEvent {
  return {
    id: `sess-${date}`,
    date,
    modifiedDate: date,
    type: 'session',
    title: 'Session',
    status: '',
    by: '',
    description: '',
    notes: '',
    track: '',
    interventionType,
  };
}

/** A recent session that includes a Career Action Plan intervention. */
function capSession(): TimelineEvent {
  return session(new Date().toISOString(), 'Career Action Plan');
}

function ids(student: Student, events: TimelineEvent[] = [], rating: StudentRating | null = null): string[] {
  return computeWatchouts(student, events, rating).map(w => w.id);
}

describe('computeWatchouts — deterministic', () => {
  it('flags an Active student with no activity for >90 days as an action', () => {
    const s = { ...baseStudent, lastActivity: '2024-01-01T00:00:00Z' };
    const w = computeWatchouts(s, []);
    const dormant = w.find(x => x.id === 'active-dormant');
    assert.ok(dormant, 'expected active-dormant watch-out');
    assert.equal(dormant!.severity, 'action');
  });

  it('flags Career Guidance with no sessions logged', () => {
    assert.ok(ids(baseStudent, []).includes('guidance-no-sessions'));
  });

  it('does not flag no-sessions once a session exists', () => {
    const recent = session(new Date().toISOString());
    assert.ok(!ids(baseStudent, [recent]).includes('guidance-no-sessions'));
  });

  it('flags interview / profile mismatch', () => {
    assert.ok(ids({ ...baseStudent, hasProfile: false }, [session(new Date().toISOString())]).includes('interview-no-profile'));
    assert.ok(ids({ ...baseStudent, interviewed: false }, [session(new Date().toISOString())]).includes('profile-no-interview'));
  });

  it('flags a completed student missing key outcomes', () => {
    const s: Student = { ...baseStudent, currentStage: 'complete', stageProgress: 4, hasProfile: false };
    assert.ok(ids(s, []).includes('complete-missing-outcomes'));
  });

  it('flags deactivation recorded while still Active', () => {
    const s: Student = { ...baseStudent, studentDeactivation: 1, studentDeactivationLabel: 'Left school' };
    assert.ok(ids(s, [session(new Date().toISOString())]).includes('deactivated-active'));
  });

  it('flags attendance issues when absences are high', () => {
    const w = computeWatchouts(
      { ...baseStudent, absenceCount: 6 },
      [session(new Date().toISOString())],
    );
    const issue = w.find(x => x.id === 'attendance-issues');
    assert.ok(issue);
    assert.equal(issue!.label, 'Attendance Issues');
  });

  it('stays quiet for a healthy, recently-active student', () => {
    assert.deepEqual(ids(baseStudent, [capSession()]), []);
  });

  it('does not flag inactivity for a completed student', () => {
    const s: Student = {
      ...baseStudent,
      currentStage: 'complete',
      stageProgress: 4,
      lastActivity: '2024-01-01T00:00:00Z',
    };
    const w = computeWatchouts(s, []);
    assert.ok(!w.some(x => x.id === 'active-dormant'), 'completed student should not be flagged active-dormant');
    assert.ok(!w.some(x => x.id === 'stalled'), 'completed student should not be flagged stalled');
  });
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

describe('computeWatchouts — AI-flag derived', () => {
  function rating(partial: Partial<StudentRating>): StudentRating {
    return {
      overall: 80,
      band: 'on_track',
      categories: [],
      flags: [],
      confidence: 'high',
      ...partial,
    };
  }

  it('adds a sentiment concern action with a verify hint when confidence is low', () => {
    const recent = session(new Date().toISOString());
    const w = computeWatchouts(baseStudent, [recent], rating({ flags: ['sentiment_concern'], confidence: 'low' }));
    const concern = w.find(x => x.id === 'sentiment-concern');
    assert.ok(concern);
    assert.equal(concern!.severity, 'action');
    assert.match(concern!.detail ?? '', /verify/i);
  });

  it('labels the AI thriving flag as Engaged', () => {
    const recent = session(new Date().toISOString());
    const w = computeWatchouts(baseStudent, [recent], rating({ flags: ['thriving'] }));
    const engaged = w.find(x => x.id === 'engaged');
    assert.ok(engaged);
    assert.equal(engaged!.label, 'Engaged');
  });

  it('adds attendance issues from the AI attendance_risk flag', () => {
    const recent = session(new Date().toISOString());
    const w = computeWatchouts(baseStudent, [recent], rating({ flags: ['attendance_risk'] }));
    assert.ok(w.some(x => x.id === 'attendance-issues' && x.label === 'Attendance Issues'));
  });

  it('adds disengaged, stalled, and no_career_plan from AI flags as priority actions', () => {
    const recent = session(new Date().toISOString());
    const w = computeWatchouts(
      baseStudent,
      [recent],
      rating({ flags: ['disengaged', 'stalled', 'no_career_plan'] }),
    );
    const disengaged = w.find(x => x.id === 'disengaged');
    const stalled = w.find(x => x.id === 'stalled');
    const noPlan = w.find(x => x.id === 'no-career-plan');
    assert.ok(disengaged);
    assert.equal(disengaged!.severity, 'action');
    assert.equal(disengaged!.label, 'Disengaged');
    assert.ok(stalled);
    assert.equal(stalled!.label, 'Stalled');
    assert.ok(noPlan);
    assert.equal(noPlan!.label, 'No Career Plan');
  });

  it('labels deterministic no-career-plan and stalled watch-outs as priority actions', () => {
    const stalledStudent: Student = {
      ...baseStudent,
      lastActivity: daysAgo(75),
    };
    const stalledWatch = computeWatchouts(stalledStudent, []).find(x => x.id === 'stalled');
    assert.ok(stalledWatch);
    assert.equal(stalledWatch!.severity, 'action');
    assert.equal(stalledWatch!.label, 'Stalled');

    const noPlan = computeWatchouts(baseStudent, [session(new Date().toISOString())]).find(x => x.id === 'no-career-plan');
    assert.ok(noPlan);
    assert.equal(noPlan!.severity, 'action');
    assert.equal(noPlan!.label, 'No Career Plan');
  });

  it('orders actions before watches before positives', () => {
    const recent = session(new Date().toISOString());
    const s: Student = { ...baseStudent, hasProfile: false, absenceCount: 6 };
    const w = computeWatchouts(s, [recent], rating({ flags: ['sentiment_concern', 'thriving'] }));
    assert.ok(w.some(x => x.id === 'engaged'));
    const order = w.map(x => x.severity);
    const sorted = [...order].sort((a, b) =>
      ({ action: 0, watch: 1, positive: 2 })[a] - ({ action: 0, watch: 1, positive: 2 })[b]);
    assert.deepEqual(order, sorted);
  });
});
