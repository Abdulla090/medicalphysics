import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const trainingTables = {
  cohorts: defineTable({ name: v.string(), courseId: v.id('courses'), instructorIds: v.array(v.string()), createdBy: v.string() }),
  cohort_members: defineTable({ cohortId: v.id('cohorts'), userId: v.string() }).index('by_cohort',['cohortId']).index('by_user',['userId']).index('by_member',['cohortId','userId']),
  case_versions: defineTable({ caseId: v.string(), version: v.number(), snapshot: v.string(), approvedBy: v.string(), approvalNote: v.string(), publishedAt: v.number() }).index('by_case',['caseId']),
  rubric_versions: defineTable({ caseVersionId: v.id('case_versions'), version: v.number(), weights: v.array(v.object({ criterion: v.string(), points: v.number() })), approvedBy: v.string(), publishedAt: v.number() }).index('by_case',['caseVersionId']),
  assignments: defineTable({ cohortId: v.id('cohorts'), caseVersionId: v.id('case_versions'), rubricVersionId: v.id('rubric_versions'), title: v.string(), dueAt: v.number(), createdBy: v.string(), createdAt: v.number() }).index('by_cohort',['cohortId']),
  training_attempts: defineTable({
    userId: v.string(), assignmentId: v.id('assignments'), cohortId: v.id('cohorts'), caseVersionId: v.id('case_versions'), rubricVersionId: v.id('rubric_versions'),
    sessionJson: v.string(), revision: v.number(), status: v.union(v.literal('draft'),v.literal('submitted')),
    startedAt: v.number(), submittedAt: v.optional(v.number()), provisionalJson: v.optional(v.string()),
  }).index('by_user',['userId']).index('by_assignment',['assignmentId']).index('by_user_assignment',['userId','assignmentId']),
  training_evidence: defineTable({ attemptId: v.id('training_attempts'), acquisitionId: v.string(), owner: v.string(), pixels: v.bytes(), width: v.number(), height: v.number(), engineVersion: v.string() }).index('by_attempt',['attemptId']).index('by_acquisition',['attemptId','acquisitionId']),
  training_reviews: defineTable({ attemptId: v.id('training_attempts'), facultyId: v.string(), grade: v.number(), feedback: v.string(), publishedAt: v.number(), amendment: v.string() }).index('by_attempt',['attemptId']),
  training_audit: defineTable({ actor: v.string(), action: v.string(), target: v.string(), detail: v.string(), at: v.number() }).index('by_target',['target']),
  university_settings: defineTable({ key: v.literal('university'), name: v.string(), nameKu: v.string(), updatedBy: v.string() }).index('by_key',['key']),
};
