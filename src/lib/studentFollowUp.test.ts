import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Student } from '../data/studentsData';
import {
  deriveFollowUpRiskLevel,
  FOLLOW_UP_INACTIVITY_DAYS,
  isFlaggedForFollowUp,
} from './deAnalyticsMetrics';

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

const base: Student = {
  id: 's1',
  firstName: 'Test',
  lastName: 'Student',
  yearLevel: 10,
  morrisbyId: 'TST1',
  status: 'Active',
  currentStage: 'career_guidance',
  stageProgress: 3,
  riskLevel: 'none',
  absenceCount: 1,
  counsellor: 'Counsellor',
  interviewed: true,
  hasProfile: true,
  studentType: 'Standard',
  lastActivity: daysAgo(30),
};

describe('isFlaggedForFollowUp', () => {
  it(`does not flag when last activity is within ${FOLLOW_UP_INACTIVITY_DAYS} days`, () => {
    assert.equal(isFlaggedForFollowUp({ ...base, absenceCount: 5, lastActivity: daysAgo(30) }), false);
  });

  it(`flags when last activity is more than ${FOLLOW_UP_INACTIVITY_DAYS} days ago`, () => {
    assert.equal(isFlaggedForFollowUp({ ...base, lastActivity: daysAgo(91) }), true);
  });

  it('does not flag completed students', () => {
    assert.equal(
      isFlaggedForFollowUp({ ...base, currentStage: 'complete', lastActivity: daysAgo(120) }),
      false,
    );
  });

  it('does not flag inactive students', () => {
    assert.equal(
      isFlaggedForFollowUp({ ...base, status: 'Inactive', lastActivity: daysAgo(120) }),
      false,
    );
  });

  it('does not flag when last activity is unknown', () => {
    assert.equal(isFlaggedForFollowUp({ ...base, lastActivity: '' }), false);
  });
});

describe('deriveFollowUpRiskLevel', () => {
  it('returns none when not flagged', () => {
    assert.equal(deriveFollowUpRiskLevel({ ...base, lastActivity: daysAgo(30) }), 'none');
  });

  it('tiers severity by days inactive', () => {
    assert.equal(deriveFollowUpRiskLevel({ ...base, lastActivity: daysAgo(100) }), 'low');
    assert.equal(deriveFollowUpRiskLevel({ ...base, lastActivity: daysAgo(130) }), 'medium');
    assert.equal(deriveFollowUpRiskLevel({ ...base, lastActivity: daysAgo(200) }), 'high');
  });
});
