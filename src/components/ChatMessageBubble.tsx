import { motion } from 'motion/react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../hooks/useStudentChat';

// Compact markdown styling tuned for narrow chat bubbles.
const MARKDOWN_COMPONENTS: Components = {
  p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 last:mb-0 pl-4 list-disc space-y-1 marker:text-slate-400">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 pl-4 list-decimal space-y-1 marker:text-slate-400">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h1 className="text-sm font-bold text-slate-900 mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[13px] font-semibold text-slate-900 mt-3 mb-1 first:mt-0">{children}</h3>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-slate-200 text-[12px] font-mono text-slate-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 last:mb-0 p-3 rounded-lg bg-slate-900 text-slate-100 text-[12px] font-mono overflow-x-auto">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 last:mb-0 pl-3 border-l-2 border-slate-300 text-slate-500 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl ${
          isUser
            ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap'
            : 'bg-slate-100 text-slate-700 rounded-bl-md'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  );
}
