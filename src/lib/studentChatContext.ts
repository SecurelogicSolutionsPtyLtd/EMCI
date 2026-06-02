/**
 * Builds the grounded, name-free payload sent to the `chat-student` edge
 * function. Mirrors the inputs the Analysis Summary uses (programme data,
 * deterministic Quick Insights, counselling session detail, pilot survey
 * shifts) so the assistant reasons over exactly what the practitioner sees.
 *
 * No identifying fields (name, email, Morrisby ID, counsellor) are ever
 * included — the model is instructed to refer to "the student".
 */

import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import {
  computeQuickInsights,
  buildSurveyShifts,
  buildSessionDetails,
  buildTimelineNotes,
  type QuickInsights,
  type SurveyShift,
  type SessionDetail,
  type TimelineNote,
} from './studentInsights';

export interface StudentChatPayload {
  student: {
    stage:           Student['currentStage'];
    stageProgress:   number;
    status:          string;
    absenceCount:    number;
    interviewed:     boolean;
    hasProfile:      boolean;
    studentType:     string;
    yearLevel:       number;
    yearLevelLabel?: string;
  };
  schoolName:     string | null;
  insights:       QuickInsights;
  surveyShifts:   SurveyShift[];
  sessionDetails: SessionDetail[];
  timelineNotes:  TimelineNote[];
}

export function buildStudentChatPayload(
  student:    Student,
  events:     TimelineEvent[],
  schoolName?: string,
): StudentChatPayload {
  return {
    student: {
      stage:          student.currentStage,
      stageProgress:  student.stageProgress,
      status:         student.status,
      absenceCount:   student.absenceCount,
      interviewed:    student.interviewed,
      hasProfile:     student.hasProfile,
      studentType:    student.studentType,
      yearLevel:      student.yearLevel,
      yearLevelLabel: student.yearLevelLabel,
    },
    schoolName:     schoolName ?? null,
    insights:       computeQuickInsights(student, events),
    surveyShifts:   buildSurveyShifts(events),
    sessionDetails: buildSessionDetails(events),
    timelineNotes:  buildTimelineNotes(student, events),
  };
}
