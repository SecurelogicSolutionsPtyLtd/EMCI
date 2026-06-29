import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Student } from '../data/studentsData.js';
import type { TimelineEvent } from '../services/dataverse.js';
import { hasPriorityAlert, hasPriorityAlertWithFlags } from './priorityAlerts.js';

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

function session(date: string): TimelineEvent {
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
    interventionType: '',
  };
}

describe('priorityAlerts', () => {
  it('detects deterministic stalled journeys', () => {
    const s: Student = { ...baseStudent, lastActivity: '2024-01-01T00:00:00Z' };
    assert.equal(hasPriorityAlert(s, [session(new Date().toISOString())], null), true);
  });

  it('detects AI disengaged flag via bulk helper', () => {
    assert.equal(
      hasPriorityAlertWithFlags(baseStudent, [session(new Date().toISOString())], ['disengaged']),
      true,
    );
  });

  it('ignores completed students', () => {
    const s: Student = {
      ...baseStudent,
      currentStage: 'complete',
      stageProgress: 4,
      lastActivity: '2024-01-01T00:00:00Z',
    };
    assert.equal(hasPriorityAlert(s, [], null), false);
  });

  it('does not treat attendance issues alone as priority', () => {
    const recent = session(new Date().toISOString(), 'Career Action Plan');
    const flagged = hasPriorityAlert(
      { ...baseStudent, absenceCount: 8, currentStage: 'consent', stageProgress: 2 },
      [recent],
      null,
    );
    assert.equal(flagged, false);
  });
});
