import { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Student } from '../data/studentsData';
import type { TimelineEvent } from '../services/dataverse';
import { useStudentChat } from '../hooks/useStudentChat';
import { EmciAssistantLogo } from './EmciAssistantLogo';

// Lazy so the drawer — and the markdown renderer it pulls in — only loads on
// first open, keeping it out of the initial bundle.
const StudentAssistantDrawer = lazy(() => import('./StudentAssistantDrawer'));

interface StudentAssistantChatProps {
  student:     Student;
  events:      TimelineEvent[];
  schoolName?: string;
}

export function StudentAssistantChat({ student, events, schoolName }: StudentAssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const { messages, isSending, error, send } = useStudentChat(student, events, schoolName);

  const handleOpen = () => {
    setHasOpened(true);
    setOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            type="button"
            onClick={handleOpen}
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full bg-primary text-white shadow-lg shadow-primary/30 cursor-pointer"
          >
            <EmciAssistantLogo className="w-5 h-5" />
            <span className="text-sm font-semibold">Ask EMCI Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      {hasOpened && (
        <Suspense fallback={null}>
          <StudentAssistantDrawer
            open={open}
            onClose={() => setOpen(false)}
            messages={messages}
            isSending={isSending}
            error={error}
            send={send}
          />
        </Suspense>
      )}
    </>
  );
}
