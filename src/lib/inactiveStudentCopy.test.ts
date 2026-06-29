import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Student } from '../data/studentsData';
import {
  INACTIVE_STUDENT_SUMMARY,
  INACTIVE_STUDENT_SUMMARY_PRIMARY,
  INACTIVE_STUDENT_SUMMARY_SECONDARY,
  isInactiveStudent,
} from './inactiveStudentCopy';

const baseStudent = {
  id: 'stu-1',
  status: 'Active',
} as Student;

describe('inactiveStudentCopy', () => {
  it('exports approved inactive summary copy', () => {
    assert.equal(
      INACTIVE_STUDENT_SUMMARY_PRIMARY,
      'This student is no longer active in the EMCI program.',
    );
    assert.equal(
      INACTIVE_STUDENT_SUMMARY_SECONDARY,
      'Participation ceased before program completion.',
    );
    assert.equal(
      INACTIVE_STUDENT_SUMMARY,
      `${INACTIVE_STUDENT_SUMMARY_PRIMARY} ${INACTIVE_STUDENT_SUMMARY_SECONDARY}`,
    );
  });

  it('detects inactive students by status', () => {
    assert.equal(isInactiveStudent(null), false);
    assert.equal(isInactiveStudent(baseStudent), false);
    assert.equal(isInactiveStudent({ ...baseStudent, status: 'Inactive' }), true);
  });
});
