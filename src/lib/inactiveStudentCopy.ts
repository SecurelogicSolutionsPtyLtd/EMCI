import type { Student } from '../data/studentsData';

/** Approved inactive-student summary copy (P4-T2). */
export const INACTIVE_STUDENT_SUMMARY_PRIMARY =
  'This student is no longer active in the EMCI program.';

export const INACTIVE_STUDENT_SUMMARY_SECONDARY =
  'Participation ceased before program completion.';

export const INACTIVE_STUDENT_SUMMARY = `${INACTIVE_STUDENT_SUMMARY_PRIMARY} ${INACTIVE_STUDENT_SUMMARY_SECONDARY}`;

export function isInactiveStudent(
  student: Pick<Student, 'status'> | null | undefined,
): boolean {
  return student?.status === 'Inactive';
}
