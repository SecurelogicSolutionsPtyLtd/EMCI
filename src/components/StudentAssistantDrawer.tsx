import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUp, AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../hooks/useStudentChat';
import { MessageBubble } from './ChatMessageBubble';
import { EmciAssistantLogo } from './EmciAssistantLogo';

interface StudentAssistantDrawerProps {
  open:      boolean;
  onClose:   () => void;
  messages:  ChatMessage[];
  isSending: boolean;
  error:     string | null;
  send:      (text: string) => void;
}

const SUGGESTED_PROMPTS = [
  'Summarise this student in three bullet points',
  'What should I focus on in the next session?',
  'Are there any attendance or wellbeing concerns?',
  'How have their survey responses shifted?',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3.5 py-3">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay }}
        />
      ))}
    </div>
  );
}

export default function StudentAssistantDrawer({
  open,
  onClose,
  messages,
  isSending,
  error,
  send,
}: StudentAssistantDrawerProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || isSending) return;
    setDraft('');
    send(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(draft);
    }
  };

  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const followUps =
    !isSending && !error && lastMessage?.role === 'assistant' ? lastMessage.followUps ?? [] : [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-40 cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            key="chat-drawer"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[440px] max-w-full bg-white border-l border-slate-200 z-50 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 p-1">
                  <EmciAssistantLogo className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">EMCI Assistant</h3>
                  <p className="text-[11px] text-slate-400 leading-tight">Grounded in this student&apos;s record</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
              {isEmpty && (
                <div className="flex flex-col items-center text-center px-2 pt-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 p-2">
                    <EmciAssistantLogo className="w-full h-full" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Ask about this student</p>
                  <p className="mt-1 mb-5 text-sm text-slate-500 max-w-xs leading-relaxed">
                    I have their stage, insights, sessions and survey shifts. I never see their name.
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    {SUGGESTED_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => submit(prompt)}
                        className="text-left text-sm text-slate-600 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {followUps.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex flex-col gap-1.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                    Suggested follow-ups
                  </span>
                  {followUps.map(question => (
                    <button
                      key={question}
                      onClick={() => submit(question)}
                      className="flex items-center gap-2 text-left text-[13px] text-primary px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      {question}
                    </button>
                  ))}
                </motion.div>
              )}

              {isSending && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                    <button
                      onClick={() => {
                        const last = [...messages].reverse().find(m => m.role === 'user');
                        if (last) submit(last.content);
                      }}
                      className="flex items-center gap-1 text-xs text-red-600 underline mt-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Try again
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 focus-within:border-primary/50 transition-colors">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Ask about this student…"
                  className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none max-h-32 leading-relaxed"
                />
                <button
                  onClick={() => submit(draft)}
                  disabled={!draft.trim() || isSending}
                  className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-primary/90 enabled:active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2 uppercase tracking-wider">
                AI-generated · For guidance purposes only
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
