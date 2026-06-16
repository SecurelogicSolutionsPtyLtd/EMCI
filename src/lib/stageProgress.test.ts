import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  programmeProgressStep,
  programmeProgressPct,
  formatProgrammeProgressScore,
  formatProgrammeStageLabel,
} from './stageProgress';

describe('stageProgress', () => {
  it('maps raw progress to 0–3 excluding referral', () => {
    assert.equal(programmeProgressStep(0), 0);
    assert.equal(programmeProgressStep(1), 0);
    assert.equal(programmeProgressStep(2), 1);
    assert.equal(programmeProgressStep(3), 2);
    assert.equal(programmeProgressStep(4), 3);
  });

  it('formats progress score for display and AI', () => {
    assert.equal(formatProgrammeProgressScore(3), '2/3');
    assert.equal(formatProgrammeProgressScore(4), '3/3');
    assert.equal(formatProgrammeProgressScore(1), '0/3');
  });

  it('computes percentage from visible steps', () => {
    assert.equal(programmeProgressPct(3), 67);
    assert.equal(programmeProgressPct(4), 100);
    assert.equal(programmeProgressPct(1), 0);
  });

  it('labels programme stages without mentioning referral', () => {
    assert.match(formatProgrammeStageLabel('referral'), /Consent/);
    assert.doesNotMatch(formatProgrammeStageLabel('referral'), /referral/i);
    assert.equal(formatProgrammeStageLabel('career_guidance'), 'Career Guidance (Stage 2 of 3)');
  });
});
