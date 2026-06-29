/**
 * Full-screen branded EMCI loading screen.
 *
 * Shown while the page is loading (initial auth check, connecting to the
 * platform). Renders the animated growth-bars emblem, the EMCI wordmark and an
 * indeterminate progress bar on the brand navy background.
 */

import { EMCI_BRAND } from '../lib/programNaming';

interface EmciLoadingScreenProps {
  /** Small caption under the progress bar. Defaults to "Please wait…". */
  message?: string;
}

const STYLES = `
.emci-load-wrap {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36px;
  padding: 60px 40px;
  background: #0d1e35;
}
.emci-load-logo {
  display: flex;
  align-items: center;
  gap: 20px;
  opacity: 0;
  transform: translateY(12px);
  animation: emciFadeUp 0.7s ease forwards 0.2s;
}
.emci-load-icon { position: relative; width: 64px; height: 64px; }
.emci-load-bar {
  position: absolute;
  bottom: 8px;
  border-radius: 3px;
  transform-origin: bottom center;
  transform: scaleY(0);
}
.emci-load-bar-1 { left: 0;  width: 16px; height: 32px; background: #e05a2b; animation: emciBarUp 0.5s cubic-bezier(.4,0,.2,1) forwards 0.5s; }
.emci-load-bar-2 { left: 20px; width: 16px; height: 48px; background: #7c9bb5; animation: emciBarUp 0.5s cubic-bezier(.4,0,.2,1) forwards 0.65s; }
.emci-load-bar-3 { left: 40px; width: 16px; height: 60px; background: #1a3355; animation: emciBarUp 0.5s cubic-bezier(.4,0,.2,1) forwards 0.8s; }
.emci-load-swoosh {
  position: absolute;
  bottom: 4px;
  left: -4px;
  right: -4px;
  height: 10px;
  width: 72px;
  overflow: visible;
  opacity: 0;
  animation: emciFadeIn 0.4s ease forwards 1.1s;
}
.emci-load-word {
  font-family: Arial, 'Helvetica Neue', sans-serif;
  font-size: 52px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 3px;
  line-height: 1;
}
.emci-load-tag {
  font-family: Arial, 'Helvetica Neue', sans-serif;
  font-size: 13px;
  letter-spacing: 4px;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  opacity: 0;
  animation: emciFadeIn 0.6s ease forwards 1.3s;
}
.emci-load-progress {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  opacity: 0;
  animation: emciFadeIn 0.5s ease forwards 1.5s;
}
.emci-load-track {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.12);
  border-radius: 2px;
  overflow: hidden;
}
.emci-load-bar-fill {
  height: 100%;
  width: 0%;
  background: #e05a2b;
  border-radius: 2px;
  animation: emciLoadBar 2.2s cubic-bezier(.4,0,.2,1) forwards 1.6s;
}
.emci-load-label {
  font-family: Arial, sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.35);
  text-align: center;
}
@keyframes emciBarUp  { to { transform: scaleY(1); } }
@keyframes emciFadeUp { to { opacity: 1; transform: translateY(0); } }
@keyframes emciFadeIn { to { opacity: 1; } }
@keyframes emciLoadBar { 0% { width: 0%; } 60% { width: 70%; } 85% { width: 88%; } 100% { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .emci-load-logo, .emci-load-bar, .emci-load-swoosh, .emci-load-tag,
  .emci-load-progress, .emci-load-bar-fill {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .emci-load-bar-fill { width: 70%; }
}
`;

export function EmciLoadingScreen({ message = 'Please wait…' }: EmciLoadingScreenProps) {
  return (
    <div className="emci-load-wrap" role="status" aria-live="polite" aria-busy="true" aria-label={`Loading ${EMCI_BRAND}`}>
      <style>{STYLES}</style>
      <div className="emci-load-logo">
        <div className="emci-load-icon">
          <div className="emci-load-bar emci-load-bar-1" />
          <div className="emci-load-bar emci-load-bar-2" />
          <div className="emci-load-bar emci-load-bar-3" />
          <svg className="emci-load-swoosh" viewBox="0 0 72 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2 10 Q20 2 40 6 Q55 9 70 4" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div className="emci-load-word">EMCI</div>
      </div>
      <div className="emci-load-tag">Pilot&nbsp;&nbsp;Program</div>
      <div className="emci-load-progress">
        <div className="emci-load-track">
          <div className="emci-load-bar-fill" />
        </div>
        <div className="emci-load-label">{message}</div>
      </div>
    </div>
  );
}
