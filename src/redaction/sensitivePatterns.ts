/**
 * Pattern definitions for the smart sensitive-information redaction system.
 *
 * These are the deterministic (tier 1) detectors. They are intentionally
 * broad — a sentence containing any match is fully redacted. The AI tier
 * (see useAiRedaction.ts) catches anything not listed here.
 */

export interface SensitiveCategory {
  name: 'medical' | 'disability' | 'family' | 'welfare';
  patterns: RegExp[];
}

/**
 * Routine programme phrases that must never trigger redaction on their own
 * (e.g. "Parental consent obtained" is standard workflow language, not
 * sensitive family information). They are masked before sentence scanning.
 */
export const ALLOWLIST_PHRASES: RegExp[] = [
  /parent(?:al)?(?:\s*\/\s*guardian)?\s+consent/gi,
  /consent\s+(?:from|of)\s+(?:a\s+)?(?:parent|guardian)/gi,
  /parent(?:al)?\s+(?:approval|permission)/gi,
];

export const SENSITIVE_CATEGORIES: SensitiveCategory[] = [
  {
    name: 'medical',
    patterns: [
      /\bmedicat(?:ion|ions|ed)\b/i,
      /\bprescri(?:bed|ption|ptions)\b/i,
      /\bdos(?:age|ages)\b/i,
      /\b(?:anti[- ]?depressants?|inhalers?|insulin|epipen)\b/i,
      /\b(?:ritalin|concerta|vyvanse|dex(?:amfetamine|amphetamine)|sertraline|zoloft|fluoxetine|prozac|escitalopram|lexapro|melatonin|ventolin|risperidone|quetiapine)\b/i,
      /\bdiagnos(?:is|es|ed)\b/i,
      /\b(?:adhd|autis(?:m|tic)|asd|asperger'?s?|ocd|ptsd|bipolar)\b/i,
      /\b(?:anxiety|anxious|depression|depressive|panic attacks?)\b/i,
      /\b(?:epilep(?:sy|tic)|diabet(?:es|ic)|asthma(?:tic)?|anaphyla(?:xis|ctic)|allerg(?:y|ies|ic))\b/i,
      /\b(?:eating disorder|anorexia|bulimia)\b/i,
      /\bself[- ]?harm\w*\b/i,
      /\bsuicid\w+\b/i,
      /\bmental health\b/i,
      /\b(?:psychologist|psychiatrist|therapist)\b/i,
      /\bmedical (?:condition|history|issue|appointment)\b/i,
    ],
  },
  {
    name: 'disability',
    patterns: [
      /\bdisab(?:ility|ilities|led)\b/i,
      /\bimpair(?:ment|ed)\b/i,
      /\bwheelchair\b/i,
      /\bndis\b/i,
      /\bspecial needs\b/i,
      /\blearning (?:difficult(?:y|ies)|disorder|disability)\b/i,
      /\bdys(?:lexi|calculi|praxi)\w*\b/i,
      /\bhearing aid\b/i,
      /\b(?:vision|visually|hearing) impaired\b/i,
      /\bindividual education plan\b/i,
    ],
  },
  {
    name: 'family',
    patterns: [
      /\b(?:mother|mum|father|dad|step(?:-| )?(?:mother|mum|father|dad))(?:'s)?\b/i,
      /\bparents?'?\s+(?:name|phone|email|address|contact|work|job|income|details)\b/i,
      /\bguardian(?:'s)?\b/i,
      /\b(?:custody|foster care|kinship care|out[- ]of[- ]home care)\b/i,
      /\b(?:divorced?|separat(?:ed|ion))\b/i,
      /\bsingle[- ]parent\b/i,
    ],
  },
  {
    name: 'welfare',
    patterns: [
      /\b(?:domestic|family) violence\b/i,
      /\bchild protection\b/i,
      /\b(?:dhhs|dffh)\b/i,
      /\bcourt order\w*\b/i,
      /\byoung carer\b/i,
      /\b(?:homeless\w*|housing instability)\b/i,
      /\bfinancial (?:hardship|difficulty|stress)\b/i,
      /\brefugee\b/i,
      /\b(?:juvenile justice|youth justice|police)\b/i,
    ],
  },
];

/**
 * Identifiers redacted in place (token-level) rather than by sentence:
 * emails, AU phone numbers, Medicare-style numbers, street addresses.
 */
export const TOKEN_PATTERNS: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  /(?:\+?61[ -]?|\(0\d\)[ -]?|0)\d(?:[ -]?\d){8}/g,
  /\b\d{4}[ ]?\d{5}[ ]?\d{1,2}\b/g,
  /\b\d+[a-z]?\s+[A-Za-z' ]+\s(?:street|st|road|rd|avenue|ave|court|ct|crescent|cres|drive|dr|place|pl|lane|ln|highway|hwy|parade|pde)\b/gi,
];
