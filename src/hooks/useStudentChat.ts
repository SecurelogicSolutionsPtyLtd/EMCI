import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { buildStudentChatPayload } from '../lib/studentChatContext';

export interface ChatMessage {
  id:         string;
  role:       'user' | 'assistant';
  content:    string;
  followUps?: string[];
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Multi-turn assistant chat grounded in the on-page student context. Sends the
 * trimmed conversation plus the name-free student payload to `chat-student`.
 * Resets whenever the viewed student changes.
 */
export function useStudentChat(
  student:     Student | null,
  events:      TimelineEvent[],
  schoolName?: string,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setIsSending(false);
  }, [student?.id]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !student || isSending) return;

      const userMessage: ChatMessage = { id: makeId(), role: 'user', content: trimmed };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setError(null);
      setIsSending(true);

      const payload = buildStudentChatPayload(student, events, schoolName);

      const { data, error: invokeError } = await supabase.functions.invoke('chat-student', {
        body: {
          ...payload,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        },
      });

      if (invokeError) {
        setError(invokeError.message ?? 'Failed to reach the assistant.');
        setIsSending(false);
        return;
      }

      const result = data as { reply?: string; followUps?: unknown } | null;
      const reply = result?.reply;
      if (!reply) {
        setError('No reply returned from the assistant.');
        setIsSending(false);
        return;
      }

      const followUps = Array.isArray(result?.followUps)
        ? result.followUps
            .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
            .map(q => q.trim())
            .slice(0, 3)
        : [];

      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: reply, followUps }]);
      setIsSending(false);
    },
    [student, events, schoolName, messages, isSending],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsSending(false);
  }, []);

  return { messages, isSending, error, send, reset };
}
