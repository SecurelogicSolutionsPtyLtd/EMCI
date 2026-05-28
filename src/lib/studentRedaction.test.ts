import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRedactionLiterals,
  buildFuzzyNameTokens,
  redactText,
  studentPseudonym,
  buildRedactedOverview,
  toRedactedStudentView,
} from './studentRedaction.js';
import type { Student } from '../data/studentsData.js';

const sampleStudent: Student = {
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

describe('studentRedaction', () => {
  it('studentPseudonym uses last 6 hex chars of id', () => {
    assert.equal(studentPseudonym(sampleStudent.id), 'Student · EEEEEE');
  });

  it('redactText replaces canonical name', () => {
    const literals = buildRedactionLiterals(sampleStudent);
    const tokens = buildFuzzyNameTokens(sampleStudent);
    assert.equal(
      redactText('Initial referral received for James Smith.', literals, tokens),
      'Initial referral received for [Redacted].',
    );
  });

  it('redactText fuzzy-matches common typo', () => {
    const literals = buildRedactionLiterals(sampleStudent);
    const tokens = buildFuzzyNameTokens(sampleStudent);
    const out = redactText('Follow-up with Jamees about career plan.', literals, tokens);
    assert.ok(out.includes('[Redacted]'), `expected redaction in: ${out}`);
    assert.ok(!out.includes('Jamees'));
  });

  it('buildRedactedOverview omits name', () => {
    const overview = buildRedactedOverview(sampleStudent);
    assert.ok(!overview.includes('James'));
    assert.ok(overview.includes('This student'));
  });

  it('toRedactedStudentView clears PII fields', () => {
    const view = toRedactedStudentView(sampleStudent)!;
    assert.equal(view.firstName, 'Student');
    assert.equal(view.morrisbyId, '—');
    assert.equal(view.email, undefined);
    assert.equal(view.preferredName, undefined);
  });
});
