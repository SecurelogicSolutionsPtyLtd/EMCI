import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SENSITIVE_TOKEN,
  applyAiSpans,
  redactSensitiveText,
  redactSensitiveEvents,
} from './smartRedaction.js';
import type { TimelineEvent } from '../services/dataverse.js';

describe('redactSensitiveText', () => {
  it('redacts sentences mentioning medication', () => {
    const out = redactSensitiveText(
      'Student attended on time. Takes Ritalin each morning for ADHD. Career interests discussed.',
    );
    assert.ok(!out.includes('Ritalin'));
    assert.ok(!out.includes('ADHD'));
    assert.ok(out.includes(SENSITIVE_TOKEN));
    assert.ok(out.includes('Student attended on time.'));
    assert.ok(out.includes('Career interests discussed.'));
  });

  it('redacts disability disclosures', () => {
    const out = redactSensitiveText('Has dyslexia and receives NDIS support.');
    assert.equal(out, SENSITIVE_TOKEN);
  });

  it('redacts parent/family details', () => {
    const out = redactSensitiveText(
      "Mum works night shifts so dad will attend the meeting.",
    );
    assert.equal(out, SENSITIVE_TOKEN);
  });

  it('keeps routine parental consent wording', () => {
    const out = redactSensitiveText('Parental consent obtained for the programme.');
    assert.equal(out, 'Parental consent obtained for the programme.');
  });

  it('redacts emails and phone numbers in place', () => {
    const out = redactSensitiveText(
      'Contact via jane.doe@example.com or 0412 345 678 to confirm.',
    );
    assert.ok(!out.includes('jane.doe@example.com'));
    assert.ok(!out.includes('0412 345 678'));
    assert.ok(out.includes('to confirm'));
  });

  it('redacts street addresses', () => {
    const out = redactSensitiveText('Lives at 12 Example Street with family.');
    assert.ok(!out.includes('12 Example Street'));
  });

  it('collapses adjacent redaction tokens', () => {
    const out = redactSensitiveText('Diagnosed with anxiety. Takes medication daily.');
    assert.equal(out, SENSITIVE_TOKEN);
  });

  it('passes clean text through unchanged', () => {
    const text = 'Session 2 completed; student found the career mapping useful.';
    assert.equal(redactSensitiveText(text), text);
  });

  it('handles empty values', () => {
    assert.equal(redactSensitiveText(''), '');
    assert.equal(redactSensitiveText(null), '');
    assert.equal(redactSensitiveText(undefined), '');
  });
});

describe('applyAiSpans', () => {
  it('replaces AI-detected spans verbatim and case-insensitively', () => {
    const out = applyAiSpans(
      'Student mentioned struggles at home with their older brother.',
      ['struggles at home with their older brother'],
    );
    assert.equal(out, `Student mentioned ${SENSITIVE_TOKEN}.`);
  });

  it('ignores trivial spans', () => {
    const text = 'No sensitive content here.';
    assert.equal(applyAiSpans(text, ['', ' ']), text);
  });
});

describe('redactSensitiveEvents', () => {
  it('redacts notes and survey field values', () => {
    const events: TimelineEvent[] = [{
      id: 'session-1',
      date: '2026-01-01',
      modifiedDate: '2026-01-01',
      type: 'session',
      title: 'Career guidance session',
      status: 'Completed',
      by: 'Counsellor',
      description: 'Discussed pathways.',
      notes: 'Student takes medication for epilepsy.',
      track: 'main',
      surveyFields: [
        { label: 'What do you enjoy at school?', value: 'Maths, but my anxiety makes exams hard.' },
      ],
    }];

    const [out] = redactSensitiveEvents(events);
    assert.equal(out.title, 'Career guidance session');
    assert.equal(out.description, 'Discussed pathways.');
    assert.equal(out.notes, SENSITIVE_TOKEN);
    assert.ok(!out.surveyFields![0].value.includes('anxiety'));
  });
});
