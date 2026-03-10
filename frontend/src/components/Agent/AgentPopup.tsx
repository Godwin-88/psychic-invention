/**
 * AgentPopup — right-side drawer AI assistant for the current Transact workspace.
 *
 * Features:
 *  - Fixed right-side drawer (1/3 screen width, full height) — workspace remains visible
 *  - Slide-in / slide-out CSS transition
 *  - Chat history persists across open/close via AgentContext (localStorage-backed)
 *  - On close: completed conversations POSTed to backend for DRL graph enrichment
 *  - Reads WorkspaceAgentContext (live computed metrics + suggested questions)
 *  - Inline context summary strip (metric pills)
 *  - Suggested question chips that pre-fill the input
 *  - "Analyse my data" quick-send CTA when workspace data is available
 *  - Per-message thumbs up/down RLHF feedback → POST /agents/feedback
 *  - "Clear chat" button with confirmation
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { ChatInterface } from './ChatInterface';
import { AGENTS_CONFIG } from '@/config/agents';
import { useAgentContext, type Message } from '@/context/AgentContext';

interface AgentPopupProps {
  menuId: string;
  menuLabel: string;
  onClose: () => void;
}

// ── Feedback helpers ──────────────────────────────────────────────────────────

async function sendFeedback(params: {
  menuId: string;
  userMessage: string;
  agentReply: string;
  rating: number;
  correctedReply?: string;
}) {
  try {
    await axios.post(
      `${AGENTS_CONFIG.BASE_URL}/agents/feedback`,
      {
        menu_id: params.menuId,
        user_message: params.userMessage,
        agent_reply: params.agentReply,
        rating: params.rating,
        corrected_reply: params.correctedReply,
      },
      { timeout: 8000 },
    );
  } catch {
    // Feedback is best-effort — don't surface errors to the user
  }
}

/** POST completed conversation to backend for DRL Neo4j enrichment (best-effort). */
async function saveConversation(params: {
  menuId: string;
  messages: Message[];
  workspaceSnapshot?: Record<string, unknown>;
}) {
  try {
    await axios.post(
      `${AGENTS_CONFIG.BASE_URL}/agents/conversations/save`,
      {
        menu_id: params.menuId,
        messages: params.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        workspace_snapshot: params.workspaceSnapshot ?? null,
      },
      { timeout: 10000 },
    );
  } catch {
    // Best-effort — never block the UI on DRL save failures
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentPopup({ menuId, menuLabel, onClose }: AgentPopupProps) {
  const { workspaceContext, chatHistory, addMessage, clearChat } = useAgentContext();
  const messages = chatHistory[menuId] ?? [];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<number, 'up' | 'down'>>({});
  const [correcting, setCorrecting] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const lastUserMsg = useRef('');
  // Track whether this session had any new messages (for DRL save trigger)
  const hadNewMessageRef = useRef(false);

  // Trigger slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Slide-out, save conversation for DRL, then close
  const handleClose = useCallback(() => {
    setVisible(false);
    // POST to backend if conversation has assistant messages (DRL enrichment)
    const hasAssistant = messages.some(m => m.role === 'assistant');
    if (hasAssistant && hadNewMessageRef.current) {
      saveConversation({
        menuId,
        messages,
        workspaceSnapshot: workspaceContext?.rawData,
      });
    }
    setTimeout(onClose, 250);
  }, [onClose, messages, menuId, workspaceContext]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClose]);

  const suggestedQuestions = workspaceContext?.suggestedQuestions ?? [];

  const sendMessage = useCallback(
    async (content: string, workspaceData?: Record<string, unknown>) => {
      lastUserMsg.current = content;
      const userMsg: Message = { role: 'user', content, timestamp: Date.now() };
      addMessage(menuId, userMsg);
      hadNewMessageRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const contextPayload: Record<string, unknown> = {};
        const wd = workspaceData ?? workspaceContext?.rawData;
        if (wd && Object.keys(wd).length > 0) {
          contextPayload.workspace_data = wd;
        }
        const { data } = await axios.post<{ reply: string; sources?: unknown[] }>(
          AGENTS_CONFIG.CHAT,
          {
            menu_id: menuId,
            message: content,
            context: Object.keys(contextPayload).length > 0 ? contextPayload : undefined,
          },
          { timeout: AGENTS_CONFIG.TIMEOUT_MS },
        );
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
        };
        addMessage(menuId, assistantMsg);
      } catch (e) {
        const msg =
          axios.isAxiosError(e) && e.response?.data?.detail
            ? String(e.response.data.detail)
            : e instanceof Error
              ? e.message
              : 'Request failed';
        setError(msg);
        addMessage(menuId, {
          role: 'assistant',
          content: `Error: ${msg}\n\nMake sure the backend and Groq (or Ollama) are running.`,
          timestamp: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    },
    [menuId, workspaceContext, addMessage],
  );

  const handleAnalyseData = useCallback(() => {
    if (!workspaceContext?.rawData) return;
    sendMessage('Analyse my current results and give me key insights.');
  }, [sendMessage, workspaceContext]);

  const handleFeedback = useCallback(
    async (msgIndex: number, direction: 'up' | 'down') => {
      if (feedbackSent[msgIndex]) return;
      setFeedbackSent((prev) => ({ ...prev, [msgIndex]: direction }));
      const assistantMsg = messages[msgIndex];
      const userMsg = messages[msgIndex - 1];
      await sendFeedback({
        menuId,
        userMessage: userMsg?.content ?? '',
        agentReply: assistantMsg.content,
        rating: direction === 'up' ? 5 : 2,
      });
      if (direction === 'down') {
        setCorrecting(msgIndex);
      }
    },
    [feedbackSent, messages, menuId],
  );

  const submitCorrection = useCallback(
    async (msgIndex: number) => {
      if (!correctionText.trim()) return;
      const assistantMsg = messages[msgIndex];
      const userMsg = messages[msgIndex - 1];
      await sendFeedback({
        menuId,
        userMessage: userMsg?.content ?? '',
        agentReply: assistantMsg.content,
        rating: 1,
        correctedReply: correctionText.trim(),
      });
      setCorrecting(null);
      setCorrectionText('');
    },
    [correctionText, messages, menuId],
  );

  const handleClearChat = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000); // auto-reset after 3s
      return;
    }
    clearChat(menuId);
    setConfirmClear(false);
    setFeedbackSent({});
    setCorrecting(null);
    setCorrectionText('');
    hadNewMessageRef.current = false;
  }, [confirmClear, clearChat, menuId]);

  const hasWorkspaceData =
    workspaceContext?.rawData && Object.keys(workspaceContext.rawData).length > 0;

  const metricPills = Object.entries(workspaceContext?.metrics ?? {})
    .filter(([, v]) => v != null)
    .slice(0, 6);

  return (
    <>
      {/* ── Transparent click-away backdrop (no dimming — workspace stays visible) ── */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <div
        role="dialog"
        aria-label={`${menuLabel} Assistant`}
        className={[
          'fixed top-0 right-0 bottom-0 z-50',
          'w-[33vw] min-w-[320px] max-w-[480px]',
          'flex flex-col',
          'bg-slate-900 border-l border-slate-700/80 shadow-2xl',
          'transition-transform duration-[250ms] ease-in-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0">🤖</span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white leading-tight truncate">
                {menuLabel} Assistant
              </h2>
              {workspaceContext?.summary && (
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                  {workspaceContext.summary}
                </p>
              )}
            </div>
            {hasWorkspaceData && (
              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                title={confirmClear ? 'Click again to confirm clear' : 'Clear chat history'}
                className={[
                  'text-[10px] px-2 py-1 rounded-lg transition-colors',
                  confirmClear
                    ? 'bg-red-700/60 text-red-300 border border-red-600/50 hover:bg-red-700'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800',
                ].join(' ')}
              >
                {confirmClear ? 'Confirm clear?' : 'Clear'}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Metric pills ── */}
        {metricPills.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-800/50 flex flex-wrap gap-1.5 shrink-0 bg-slate-900/40">
            {metricPills.map(([label, value]) => (
              <span
                key={label}
                className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 border border-slate-700 text-slate-300"
              >
                <span className="text-slate-500">{label}: </span>
                <span className="font-mono font-semibold">{String(value)}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="px-4 py-2 bg-red-900/30 text-red-300 text-xs border-b border-slate-700 shrink-0">
            {error}
          </div>
        )}

        {/* ── Chat area ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ChatInterface
            messages={messages}
            loading={loading}
            onSend={sendMessage}
            disabled={false}
            feedbackSent={feedbackSent}
            onFeedback={handleFeedback}
            correcting={correcting}
            correctionText={correctionText}
            onCorrectionChange={setCorrectionText}
            onSubmitCorrection={submitCorrection}
            onCancelCorrection={() => { setCorrecting(null); setCorrectionText(''); }}
          />
        </div>

        {/* ── Suggested questions + Analyse CTA (shown only when no messages yet) ── */}
        {messages.length === 0 && (
          <div className="px-4 py-3 border-t border-slate-800/50 shrink-0 space-y-2.5 bg-slate-950/50">
            {hasWorkspaceData && (
              <button
                onClick={handleAnalyseData}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                Analyse my {menuLabel.toLowerCase()} data
              </button>
            )}
            {suggestedQuestions.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                  Suggested questions
                </p>
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
                  {suggestedQuestions.slice(0, 5).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
