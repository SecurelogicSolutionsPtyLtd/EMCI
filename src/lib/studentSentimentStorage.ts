export type SentimentValue = 'positive' | 'negative' | 'mixed' | 'insufficient_data';

export interface SentimentQuote {
  text:      string;
  context:   string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface StoredSentiment {
  sentiment: SentimentValue;
  summary:   string;
  quotes:    SentimentQuote[];
}

const SENTIMENT_VALUES = new Set<SentimentValue>([
  'positive',
  'negative',
  'mixed',
  'insufficient_data',
]);

function isValidQuote(value: unknown): value is SentimentQuote {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.text      === 'string' &&
    typeof q.context   === 'string' &&
    typeof q.sentiment === 'string' &&
    ['positive', 'negative', 'neutral'].includes(q.sentiment as string)
  );
}

/**
 * Serialises sentiment payload into the encrypted text blob stored in
 * `student_analysis.sentiment` (keyed by student_id).
 */
export function serializeSentiment(payload: StoredSentiment): string {
  return JSON.stringify({ v: 1, ...payload });
}

/**
 * Parses the decrypted sentiment blob from the database.
 */
export function parseStoredSentiment(raw: string): StoredSentiment | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    const sentiment = parsed.sentiment;
    if (typeof sentiment !== 'string' || !SENTIMENT_VALUES.has(sentiment as SentimentValue)) {
      return null;
    }

    const quotes = Array.isArray(parsed.quotes)
      ? parsed.quotes.filter(isValidQuote).slice(0, 4)
      : [];

    return {
      sentiment: sentiment as SentimentValue,
      summary:   typeof parsed.summary === 'string' ? parsed.summary : '',
      quotes,
    };
  } catch {
    return null;
  }
}
