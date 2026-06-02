export function EmciAssistantLogo({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.png"
      alt=""
      className={`object-contain ${className ?? ''}`}
      draggable={false}
    />
  );
}
