import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionFields } from './surveyFields.js';
import type { RawSession } from './dataverse.js';

describe('buildSessionFields', () => {
  it('includes session satisfaction and found-useful student feedback', () => {
    const fields = buildSessionFields(
      {
        'cr89a_studentsatisfactiontodayssession@OData.Community.Display.V1.FormattedValue': 'Very Helpful',
        'cr89a_whatdidyoufindusefulintodayssession@OData.Community.Display.V1.FormattedValue': 'Career planning',
      } as RawSession,
      '30 Minutes',
      'Unpack',
    );

    assert.ok(fields.some(f => f.label === 'Session Satisfaction' && f.value === 'Very Helpful'));
    assert.ok(fields.some(f => f.label === 'Found Useful' && f.value === 'Career planning'));
  });
});
