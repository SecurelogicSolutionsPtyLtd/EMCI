import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EMCI_BRAND,
  EMCI_PLATFORM,
  EMCI_PLATFORM_ADMINISTRATOR,
  EMCI_PROGRAM_NAME,
} from './programNaming';

describe('programNaming', () => {
  it('exports canonical program naming strings', () => {
    assert.equal(EMCI_PROGRAM_NAME, 'Enhanced My Career Insights (Pilot Program)');
    assert.equal(EMCI_BRAND, 'EMCI — Enhanced My Career Insights (Pilot Program)');
    assert.equal(EMCI_PLATFORM, `${EMCI_BRAND} platform`);
    assert.equal(EMCI_PLATFORM_ADMINISTRATOR, `${EMCI_BRAND} platform administrator`);
  });
});
