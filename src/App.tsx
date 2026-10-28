import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Send,
  RotateCcw,
  Database,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Lock,
} from 'lucide-react';
import {
  WORKER_JS_SOURCE,
  WRANGLER_TOML_SOURCE,
  WORKER_PACKAGE_JSON,
  createInitialUser,
  createInitialGlobalKv,
  renderHomeText,
  buildMainMenuKeyboard,
  dispatchCallbackQuery,
  processTextInput,
  BotUserSchema,
  GlobalKvConfig,
  InlineKeyboardGrid,
} from './botEngine';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  keyboard?: InlineKeyboardGrid;
  timestamp: string;
  editedAt?: string;
}

const KV_USER_STORAGE_KEY = 'grammy_worker_bot_kv_user_v4';
const KV_GLOBAL_STORAGE_KEY = 'grammy_worker_bot_kv_global_v4';

// Helper to render Telegram-style Markdown (*bold*, _italic_, `code`) cleanly in JSX
function renderTelegramMarkdown(text: string, onCopyCode?: (val: string) => void) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const tokens: React.ReactNode[] = [];
    const regex = /(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push(line.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('*') && token.endsWith('*')) {
        tokens.push(
          <strong key={`${lineIdx}-${match.index}`} className="font-semibold text-white">
            {token.slice(1, -1)}
          </strong>
        );
      } else if (token.startsWith('_') && token.endsWith('_')) {
        tokens.push(
          <em key={`${lineIdx}-${match.index}`} className="italic text-slate-300">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        const rawCode = token.slice(1, -1);
        tokens.push(
          <button
            key={`${lineIdx}-${match.index}`}
            type="button"
            onClick={() => onCopyCode && onCopyCode(rawCode)}
            title="Click to copy value"
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-sky-300 font-mono text-[12.5px] tabular-nums transition-colors cursor-pointer border border-slate-700/70"
          >
            {rawCode}
          </button>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push(line.slice(lastIndex));
    }

    return (
      <React.Fragment key={lineIdx}>
        {tokens.length > 0 ? tokens : '\u00A0'}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default function App() {
  const [user, setUser] = useState<BotUserSchema>(() => {
    try {
      const saved = localStorage.getItem(KV_USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return createInitialUser();
  });

  const [globalKv, setGlobalKv] = useState<GlobalKvConfig>(() => {
    try {
      const saved = localStorage.getItem(KV_GLOBAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return createInitialGlobalKv();
  });

  // Simulation controls for testing Admin vs Regular User & Force-Join channel membership
  const [isAdminRole, setIsAdminRole] = useState<boolean>(true);
  const [hasJoinedForceChannels, setHasJoinedForceChannels] = useState<boolean>(true);
  const [kvInspectorView, setKvInspectorView] = useState<'global' | 'user'>('global');
  const [queuePanelTab, setQueuePanelTab] = useState<'custom' | 'tasks' | 'payouts'>('custom');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial = createInitialUser();
    return [
      {
        id: 'msg-init-1',
        sender: 'user',
        text: '/start',
        timestamp: '21:35:00',
      },
      {
        id: 'msg-init-2',
        sender: 'bot',
        text: renderHomeText(initial),
        keyboard: buildMainMenuKeyboard(true),
        timestamp: '21:35:01',
      },
    ];
  });

  const [chatInput, setChatInput] = useState<string>('');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'sandbox' | 'code' | 'kv' | 'deploy'>('sandbox');
  const [selectedCodeFile, setSelectedCodeFile] = useState<'worker.js' | 'wrangler.toml' | 'package.json'>('worker.js');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Telegram answerCallbackQuery popup/toast state
  const [tgPopup, setTgPopup] = useState<{ text: string; showAlert: boolean } | null>(null);

  // Webhook URL generator inputs
  const [webhookBotToken, setWebhookBotToken] = useState<string>('7182930412:AAH_your_telegram_bot_token_here');
  const [webhookWorkerUrl, setWebhookWorkerUrl] = useState<string>('https://gmailworkop.your-subdomain.workers.dev');

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KV_USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(KV_GLOBAL_STORAGE_KEY, JSON.stringify(globalKv));
    } catch {
      // ignore
    }
  }, [globalKv]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInlineButtonClick = (callbackData?: string, url?: string, overrideAdmin?: boolean) => {
    if (url) {
      if (!hasJoinedForceChannels) {
        setHasJoinedForceChannels(true);
        setTgPopup({
          text: `📢 Joined Channel (${url})!\nNow click "🔄 Check / Verified" to unlock the bot.`,
          showAlert: false,
        });
      } else {
        setTgPopup({
          text: `🔗 External Telegram URL Triggered:\n${url}`,
          showAlert: false,
        });
      }
      setTimeout(() => setTgPopup(null), 3500);
      return;
    }

    if (!callbackData) return;

    const effectiveAdmin = overrideAdmin ?? isAdminRole;
    const { updatedUser, updatedKv, result } = dispatchCallbackQuery(
      callbackData,
      user,
      globalKv,
      { isAdminRole: effectiveAdmin, hasJoinedForceChannels }
    );
    setUser(updatedUser);
    setGlobalKv(updatedKv);

    const nowTime = new Date().toTimeString().slice(0, 8);

    setMessages((prev) => {
      const lastBotIndex = [...prev].reverse().findIndex((m) => m.sender === 'bot');
      if (result.editInPlace && lastBotIndex !== -1) {
        const targetIdx = prev.length - 1 - lastBotIndex;
        const updated = [...prev];
        updated[targetIdx] = {
          ...updated[targetIdx],
          text: result.messageText,
          keyboard: result.keyboard,
          editedAt: nowTime,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'bot',
          text: result.messageText,
          keyboard: result.keyboard,
          timestamp: nowTime,
        },
      ];
    });

    if (result.toast) {
      setTgPopup(result.toast);
      if (!result.toast.showAlert) {
        setTimeout(() => setTgPopup(null), 2800);
      }
    }
  };

  const handleSendTextMessage = (e?: React.FormEvent, customText?: string, overrideAdmin?: boolean) => {
    if (e) e.preventDefault();
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend) return;

    const effectiveAdmin = overrideAdmin ?? isAdminRole;
    const nowTime = new Date().toTimeString().slice(0, 8);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: nowTime,
    };

    const { updatedUser, updatedKv, result } = processTextInput(
      textToSend,
      user,
      globalKv,
      { isAdminRole: effectiveAdmin, hasJoinedForceChannels }
    );
    setUser(updatedUser);
    setGlobalKv(updatedKv);

    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: result.messageText,
      keyboard: result.keyboard,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    if (!customText) setChatInput('');

    if (result.toast) {
      setTgPopup(result.toast);
      if (!result.toast.showAlert) {
        setTimeout(() => setTgPopup(null), 3000);
      }
    }
  };

  const handleToggleAdminRole = () => {
    const nextAdmin = !isAdminRole;
    setIsAdminRole(nextAdmin);
    // Refresh main menu so the dynamic 🛡️ Admin Panel button updates immediately
    handleInlineButtonClick('menu_home', undefined, nextAdmin);
  };

  const handleTestForceJoinFlow = () => {
    setIsAdminRole(false);
    setHasJoinedForceChannels(false);
    const nowTime = new Date().toTimeString().slice(0, 8);
    const { updatedUser, updatedKv, result } = processTextInput(
      '/start',
      user,
      globalKv,
      { isAdminRole: false, hasJoinedForceChannels: false }
    );
    setUser(updatedUser);
    setGlobalKv(updatedKv);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: 'user', text: '/start', timestamp: nowTime },
      {
        id: `b-${Date.now() + 1}`,
        sender: 'bot',
        text: result.messageText,
        keyboard: result.keyboard,
        timestamp: nowTime,
      },
    ]);
  };

  const handleResetKvState = () => {
    const freshUser = createInitialUser();
    const freshKv = createInitialGlobalKv();
    setUser(freshUser);
    setGlobalKv(freshKv);
    setIsAdminRole(true);
    setHasJoinedForceChannels(true);
    const nowTime = new Date().toTimeString().slice(0, 8);
    setMessages([
      {
        id: `reset-user-${Date.now()}`,
        sender: 'user',
        text: '/start',
        timestamp: nowTime,
      },
      {
        id: `reset-bot-${Date.now() + 1}`,
        sender: 'bot',
        text: renderHomeText(freshUser),
        keyboard: buildMainMenuKeyboard(true),
        timestamp: nowTime,
      },
    ]);
  };

  const activeCodeContent =
    selectedCodeFile === 'worker.js'
      ? WORKER_JS_SOURCE
      : selectedCodeFile === 'wrangler.toml'
      ? WRANGLER_TOML_SOURCE
      : WORKER_PACKAGE_JSON;

  const webhookSetCommand = `curl -X POST "https://api.telegram.org/bot${webhookBotToken.trim()}/setWebhook?url=${encodeURIComponent(
    webhookWorkerUrl.trim()
  )}"`;

  const pendingTasksCount = globalKv.taskReviewQueue.filter((t) => t.status === 'PENDING').length;
  const pendingPayoutsCount = globalKv.payoutQueue.filter((p) => p.status === 'PROCESSING').length;
  const activeCustomTasksCount = (globalKv.adminTasks || []).filter(
    (t) => Number(t.remainingSlots) > 0
  ).length;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col">
      {/* ===================================================================
          TOP BAR CONTRACT: 3 Zones Separated by gap-8
         =================================================================== */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-[#0F172A]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveWorkspaceTab('sandbox');
          }}
          className="text-base font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          GrammY Worker Studio
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('sandbox')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeWorkspaceTab === 'sandbox' ? 'text-white underline underline-offset-8 decoration-sky-400' : ''
            }`}
          >
            Interactive Sandbox
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('code')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeWorkspaceTab === 'code' ? 'text-white underline underline-offset-8 decoration-sky-400' : ''
            }`}
          >
            Worker Source Code
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('kv')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeWorkspaceTab === 'kv' ? 'text-white underline underline-offset-8 decoration-sky-400' : ''
            }`}
          >
            Cloudflare KV Store
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('deploy')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeWorkspaceTab === 'deploy' ? 'text-white underline underline-offset-8 decoration-sky-400' : ''
            }`}
          >
            Deployment Guide
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleCopy(WORKER_JS_SOURCE, 'header_copy_worker')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedKey === 'header_copy_worker' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied worker.js
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy worker.js
              </>
            )}
          </button>
        </div>
      </header>

      {/* ===================================================================
          WORKSPACE SUMMARY & ADMIN / FORCE-JOIN SIMULATION CONTROLS
         =================================================================== */}
      <section className="border-b border-slate-800 bg-[#131C31] px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-200 font-medium">Custom Admin Tasks + Users Directory + Factory Reset</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-sky-300">
              State: {user.state}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-300">
              Admin Tasks: {activeCustomTasksCount}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-amber-300">
              Pending Reviews: {pendingTasksCount}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Toggle (Admin vs Regular User — dynamically toggles 🛡️ Admin Panel button on Main Menu) */}
            <button
              type="button"
              onClick={handleToggleAdminRole}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isAdminRole
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Toggle whether your simulated Telegram account is an authorized Admin (controls 🛡️ Admin Panel button on Main Menu)"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Role: {isAdminRole ? 'Super Admin (Shows 🛡️ Admin Button)' : 'Regular User (Hides Admin Button)'}
            </button>

            {/* Force-Join Membership Simulator Toggle */}
            <button
              type="button"
              onClick={() => setHasJoinedForceChannels((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                hasJoinedForceChannels
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              }`}
              title="Simulate getChatMember status for config:channels"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Channels: {hasJoinedForceChannels ? 'Joined' : 'Not Joined'}
            </button>

            <button
              type="button"
              onClick={handleTestForceJoinFlow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Test Force-Join
            </button>

            <button
              type="button"
              onClick={() => {
                setIsAdminRole(true);
                handleInlineButtonClick('admin_home', undefined, true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              🛡️ Admin Panel
            </button>

            <button
              type="button"
              onClick={handleResetKvState}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reload Demo Data
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================================
          MAIN WORKSPACE CONTENT
         =================================================================== */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {activeWorkspaceTab === 'sandbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 5 COLUMNS: LIVE TELEGRAM INLINE BOT SIMULATOR */}
            <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[760px]">
              {/* Telegram Client Header */}
              <div className="px-4 py-3 bg-[#17212B] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-display font-bold text-sm shrink-0">
                    GT
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      Gmail Task Hub Bot
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      @GmailTaskRewardsBot · Custom Tasks + Admin Suite
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendTextMessage(undefined, '/start')}
                    className="px-2.5 py-1 text-xs font-medium text-sky-300 bg-slate-800/80 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    /start
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminRole(true);
                      handleSendTextMessage(undefined, '/admin', true);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/50 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    /admin
                  </button>
                </div>
              </div>

              {/* Quick Submenu Jump Bar */}
              <div className="px-3 py-2 bg-[#131C27] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] text-slate-400 shrink-0 mr-1">Jump:</span>
                {[
                  { label: '🏠 Home', cb: 'menu_home', forceAdmin: false },
                  { label: '📩 Register Task', cb: 'menu_register', forceAdmin: false },
                  { label: '➕ Add Task', cb: 'admin_task_add', forceAdmin: true },
                  { label: '👥 All Users', cb: 'admin_users_list', forceAdmin: true },
                  { label: '📝 Task Queue', cb: 'admin_tasks_queue', forceAdmin: true },
                  { label: '⚠️ Wipe Data', cb: 'admin_system_reset', forceAdmin: true },
                ].map((item) => (
                  <button
                    key={item.cb}
                    type="button"
                    onClick={() => {
                      if (item.forceAdmin) setIsAdminRole(true);
                      handleInlineButtonClick(item.cb, undefined, item.forceAdmin ? true : undefined);
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/80 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0E1621] relative"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-4 py-3 text-[13.5px] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#2B5278] text-white rounded-br-sm'
                          : 'bg-[#182533] text-slate-100 rounded-bl-sm border border-slate-700/50'
                      }`}
                    >
                      <div className="break-words">
                        {renderTelegramMarkdown(msg.text, (copiedVal) =>
                          handleCopy(copiedVal, `inline_${copiedVal}`)
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400 font-mono tabular-nums">
                        {msg.editedAt && <span>edited {msg.editedAt}</span>}
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* Pure InlineKeyboardMarkup Grid */}
                    {msg.sender === 'bot' && msg.keyboard && msg.keyboard.length > 0 && (
                      <div className="w-full max-w-[92%] mt-1.5 space-y-1">
                        {msg.keyboard.map((row, rowIdx) => (
                          <div
                            key={rowIdx}
                            className="grid gap-1"
                            style={{
                              gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {row.map((btn, btnIdx) => (
                              <button
                                key={btnIdx}
                                type="button"
                                onClick={() =>
                                  handleInlineButtonClick(btn.callback_data, btn.url)
                                }
                                className="flex items-center justify-center gap-1 px-2.5 py-2 bg-[#202B36]/95 hover:bg-[#2A3948] active:scale-[0.99] text-white text-xs font-medium rounded-lg border border-slate-700/60 transition-all cursor-pointer truncate"
                                title={
                                  btn.callback_data
                                    ? `callback_data: "${btn.callback_data}"`
                                    : btn.url
                                }
                              >
                                <span className="truncate">{btn.text}</span>
                                {btn.url && (
                                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Telegram answerCallbackQuery Modal / Toast Overlay */}
                {tgPopup && (
                  <div className="sticky bottom-2 left-0 right-0 mx-auto max-w-[90%] z-20">
                    <div
                      className={`p-3.5 rounded-xl border shadow-lg ${
                        tgPopup.showAlert
                          ? 'bg-[#1C2733] border-sky-500/60 text-white'
                          : 'bg-slate-900/95 border-slate-700 text-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs whitespace-pre-line leading-relaxed">
                          <div className="font-semibold text-sky-300 mb-1">
                            {tgPopup.showAlert
                              ? 'Telegram Bot Alert (answerCallbackQuery)'
                              : 'Telegram Toast Notification'}
                          </div>
                          {tgPopup.text}
                        </div>
                        <button
                          type="button"
                          onClick={() => setTgPopup(null)}
                          className="px-2.5 py-1 text-xs font-semibold bg-sky-500 text-slate-950 rounded hover:bg-sky-400 transition-colors shrink-0 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contextual Input Helper Banner when bot is awaiting user or admin input */}
              {user.state !== 'IDLE' && (
                <div className="px-4 py-2 bg-amber-950/60 border-t border-amber-700/50 flex items-center justify-between gap-2 text-xs text-amber-200">
                  <span className="truncate font-mono">
                    State: <strong>{user.state}</strong>
                  </span>
                  {user.state === 'AWAITING_NEWTASK_EMAIL' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendTextMessage(undefined, 'roshan.work####@gmail.com')
                      }
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Pattern: roshan.work####@gmail.com
                    </button>
                  )}
                  {user.state === 'AWAITING_NEWTASK_PASSWORD' && (
                    <button
                      type="button"
                      onClick={() => handleSendTextMessage(undefined, 'SecurePass@2026')}
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Password: SecurePass@2026
                    </button>
                  )}
                  {user.state === 'AWAITING_NEWTASK_REWARD' && (
                    <button
                      type="button"
                      onClick={() => handleSendTextMessage(undefined, '25')}
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Reward: ₹25
                    </button>
                  )}
                  {user.state === 'AWAITING_NEWTASK_SLOTS' && (
                    <button
                      type="button"
                      onClick={() => handleSendTextMessage(undefined, '10')}
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Quantity: 10 Slots
                    </button>
                  )}
                  {(user.state === 'AWAITING_USER_SUBMIT_GMAIL' ||
                    user.state === 'AWAITING_2FA_CODES') && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendTextMessage(
                          undefined,
                          user.currentTask?.taskType === '2-Step Gmail'
                            ? `${user.currentTask?.email || 'roshan.work2026@gmail.com'} 49201842 83910492`
                            : `${user.currentTask?.email || 'customname4821@gmail.com'}`
                        )
                      }
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {user.currentTask?.taskType === '2-Step Gmail'
                        ? 'Send Gmail + 2FA Codes'
                        : 'Send Created Gmail'}
                    </button>
                  )}
                  {user.state === 'AWAITING_TASK_REJECT_REASON' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendTextMessage(
                          undefined,
                          'User remained logged in on phone during admin check'
                        )
                      }
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Sample Reject Reason
                    </button>
                  )}
                  {user.state === 'AWAITING_UPI' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendTextMessage(undefined, 'aarav.sharma@okaxis Aarav Sharma')
                      }
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Sample UPI
                    </button>
                  )}
                  {user.state === 'AWAITING_REJECT_REASON' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendTextMessage(
                          undefined,
                          'Invalid UPI handle — please verify and resubmit'
                        )
                      }
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send Sample UPI Reason
                    </button>
                  )}
                  {user.state === 'AWAITING_FORCE_CHANNEL' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendTextMessage(undefined, '@TelegramPayoutProofs')
                      }
                      className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Send @TelegramPayoutProofs
                    </button>
                  )}
                </div>
              )}

              {/* Telegram Message Input Bar */}
              <form
                onSubmit={(e) => handleSendTextMessage(e)}
                className="p-3 bg-[#17212B] border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    user.state !== 'IDLE'
                      ? `Enter input for ${user.state}...`
                      : 'Send /admin, /start, /home, or text...'
                  }
                  className="flex-1 bg-[#0E1621] text-white placeholder-slate-500 text-xs px-3.5 py-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </form>
            </div>

            {/* RIGHT 7 COLUMNS: KV STATE INSPECTOR, ADMIN CUSTOM TASKS & SOURCE CODE */}
            <div className="lg:col-span-7 space-y-6">
              {/* Top KPI Strip (Tabular Numerals, Single-Elevation Surface) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">User Wallet (INR)</div>
                  <div className="mt-1 text-xl font-bold text-white font-mono tabular-nums">
                    ₹{user.balanceInr.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                    Approved: {user.accounts.approved} | Pending: {user.accounts.pending}
                  </div>
                </div>

                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Admin Custom Tasks</div>
                  <div className="mt-1 text-xl font-bold text-emerald-400 font-mono tabular-nums">
                    {activeCustomTasksCount} active
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    config:admin_tasks
                  </div>
                </div>

                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Task Review Queue</div>
                  <div className="mt-1 text-xl font-bold text-amber-400 font-mono tabular-nums">
                    {pendingTasksCount} pending
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    config:task_review_queue
                  </div>
                </div>

                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Registered Users</div>
                  <div className="mt-1 text-xl font-bold text-sky-400 font-mono tabular-nums">
                    {globalKv.usersIndex.length} users
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    config:users_index
                  </div>
                </div>
              </div>

              {/* Live Cloudflare Workers KV (env.BOT_KV) & Admin Queues Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Live KV JSON State Viewer */}
                <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[320px]">
                  <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-sky-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setKvInspectorView('global')}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer ${
                          kvInspectorView === 'global'
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        config:*
                      </button>
                      <button
                        type="button"
                        onClick={() => setKvInspectorView('user')}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer ${
                          kvInspectorView === 'user'
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        user:{user.userId}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          JSON.stringify(
                            kvInspectorView === 'global' ? globalKv : user,
                            null,
                            2
                          ),
                          'copy_kv_json'
                        )
                      }
                      className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'copy_kv_json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="flex-1 p-4 overflow-auto text-[11.5px] leading-relaxed font-mono tabular-nums text-sky-200 bg-[#0B1120]">
                    {JSON.stringify(
                      kvInspectorView === 'global' ? globalKv : user,
                      null,
                      2
                    )}
                  </pre>
                </div>

                {/* Live Custom Tasks, Task Review Queue & UPI Payout Queue */}
                <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[320px]">
                  <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setQueuePanelTab('custom')}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                          queuePanelTab === 'custom'
                            ? 'bg-emerald-400 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Admin Tasks ({activeCustomTasksCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueuePanelTab('tasks')}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                          queuePanelTab === 'tasks'
                            ? 'bg-emerald-400 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Reviews ({pendingTasksCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueuePanelTab('payouts')}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded cursor-pointer ${
                          queuePanelTab === 'payouts'
                            ? 'bg-emerald-400 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Payouts ({pendingPayoutsCount})
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminRole(true);
                        handleInlineButtonClick(
                          queuePanelTab === 'custom'
                            ? 'admin_tasks_manage'
                            : queuePanelTab === 'tasks'
                            ? 'admin_tasks_queue'
                            : 'admin_payouts',
                          undefined,
                          true
                        );
                      }}
                      className="text-[11px] text-sky-300 hover:text-sky-200 font-medium cursor-pointer whitespace-nowrap"
                    >
                      Open in Chat →
                    </button>
                  </div>

                  <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-[#0B1120]">
                    {queuePanelTab === 'custom' ? (
                      (globalKv.adminTasks || []).length > 0 ? (
                        (globalKv.adminTasks || []).map((t) => (
                          <div
                            key={t.customTaskId}
                            className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                              <span className="text-white font-semibold">
                                {t.customTaskId} · {t.taskType}
                              </span>
                              <span className="text-emerald-400">
                                Slots: {t.remainingSlots}/{t.totalSlots}
                              </span>
                            </div>
                            <div className="text-slate-200 font-mono tabular-nums truncate">
                              Pattern: <span className="text-sky-300">{t.emailPattern}</span>
                            </div>
                            <div className="text-slate-300 font-mono tabular-nums flex items-center justify-between">
                              <span>Pass: {t.password}</span>
                              <span className="text-emerald-300 font-semibold">₹{t.rewardInr}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 p-4 text-center">
                          No active custom tasks in <code>config:admin_tasks</code>. Click{' '}
                          <strong>➕ Add Task</strong> in the Admin Panel to create one!
                        </div>
                      )
                    ) : queuePanelTab === 'tasks' ? (
                      globalKv.taskReviewQueue.map((item) => (
                        <div
                          key={item.taskId}
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                            <span className="text-white font-semibold">
                              {item.taskId} · {item.taskType}
                            </span>
                            <span
                              className={
                                item.status === 'APPROVED'
                                  ? 'text-emerald-400'
                                  : item.status === 'REJECTED'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="text-slate-200 font-mono tabular-nums truncate">
                            {item.email} · <span className="text-emerald-300">₹{item.rewardInr}</span>
                          </div>
                          {item.twoFactorData && (
                            <div className="text-[11px] text-sky-300 font-mono truncate">
                              2FA: {item.twoFactorData}
                            </div>
                          )}
                          {item.rejectReason && (
                            <div className="text-[11px] text-rose-300">
                              Reason: {item.rejectReason}
                            </div>
                          )}
                          {item.status === 'PENDING' && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdminRole(true);
                                  handleInlineButtonClick(
                                    `admin_task_approve_${item.taskId}`,
                                    undefined,
                                    true
                                  );
                                }}
                                className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-medium cursor-pointer"
                              >
                                ✅ Approve & Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdminRole(true);
                                  handleInlineButtonClick(
                                    `admin_task_reject_${item.taskId}`,
                                    undefined,
                                    true
                                  );
                                }}
                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[11px] font-medium cursor-pointer"
                              >
                                ❌ Reject Task
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      globalKv.payoutQueue.map((item) => (
                        <div
                          key={item.txId}
                          className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                            <span className="text-white font-semibold">{item.txId}</span>
                            <span
                              className={
                                item.status === 'COMPLETED'
                                  ? 'text-emerald-400'
                                  : item.status === 'REJECTED'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="text-slate-200 font-mono tabular-nums">
                            ₹{item.amountInr.toFixed(2)} →{' '}
                            <span className="text-sky-300">{item.upiId}</span> ({item.holderName})
                          </div>
                          {item.rejectReason && (
                            <div className="text-[11px] text-rose-300">
                              Reason: {item.rejectReason}
                            </div>
                          )}
                          {item.status === 'PROCESSING' && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdminRole(true);
                                  handleInlineButtonClick(
                                    `admin_payout_approve_${item.txId}`,
                                    undefined,
                                    true
                                  );
                                }}
                                className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-medium cursor-pointer"
                              >
                                ✅ Approve & Mark Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdminRole(true);
                                  handleInlineButtonClick(
                                    `admin_payout_reject_${item.txId}`,
                                    undefined,
                                    true
                                  );
                                }}
                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded text-[11px] font-medium cursor-pointer"
                              >
                                ❌ Reject & Refund
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Cloudflare Worker Code Panel */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[310px]">
                <div className="px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['worker.js', 'wrangler.toml', 'package.json'] as const).map(
                      (file) => (
                        <button
                          key={file}
                          type="button"
                          onClick={() => setSelectedCodeFile(file)}
                          className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            selectedCodeFile === file
                              ? 'bg-sky-500 text-slate-950 font-semibold'
                              : 'text-slate-400 hover:text-white bg-slate-900'
                          }`}
                        >
                          {file}
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(activeCodeContent, `copy_${selectedCodeFile}`)
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedKey === `copy_${selectedCodeFile}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy {selectedCodeFile}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(selectedCodeFile, activeCodeContent)
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWorkspaceTab('code')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-300 hover:text-sky-200 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Full Screen Code
                    </button>
                  </div>
                </div>

                <pre className="flex-1 p-4 overflow-auto text-xs font-mono leading-relaxed text-slate-200 bg-[#0B1120]">
                  {activeCodeContent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: FULL WORKER SOURCE CODE VIEWER
           =================================================================== */}
        {activeWorkspaceTab === 'code' && (
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold text-white font-display">
                  Complete Upgraded Cloudflare Worker (`worker.js` / `index.js`)
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Includes Manual Add Task Wizard (<code className="text-sky-300">config:admin_tasks</code>), Paginated Users List (<code className="text-sky-300">admin_users_list</code>), Factory Reset (<code className="text-sky-300">admin_system_reset</code>), Manual Task Verification Queue, and 2FA Tasks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(['worker.js', 'wrangler.toml', 'package.json'] as const).map((file) => (
                  <button
                    key={file}
                    type="button"
                    onClick={() => setSelectedCodeFile(file)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedCodeFile === file
                        ? 'bg-sky-500 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {file}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleCopy(activeCodeContent, 'full_code_copy')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedKey === 'full_code_copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy {selectedCodeFile}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(selectedCodeFile, activeCodeContent)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </div>

            <pre className="p-6 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200 bg-[#0B1120] max-h-[720px]">
              {activeCodeContent}
            </pre>
          </div>
        )}

        {/* ===================================================================
            TAB 3: CLOUDFLARE KV STORE INSPECTOR & MUTATOR
           =================================================================== */}
        {activeWorkspaceTab === 'kv' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-white font-display">
                  Cloudflare KV Namespace (`env.BOT_KV`)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect and test all dynamic keys (`config:admin_tasks`, `config:task_review_queue`, `config:users_index`, `config:rates`, `config:channels`, `config:admins`, `config:maintenance`, `config:payout_queue`, and `user:{user.userId}`).
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">Super Admin (`env.ADMIN_CHAT_ID`)</span>
                  <code className="text-sky-300 font-mono">{globalKv.superAdminId}</code>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">Custom Admin Tasks (`config:admin_tasks`)</span>
                  <span className="font-mono text-emerald-300">
                    {activeCustomTasksCount} active
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">Task Review Queue (`config:task_review_queue`)</span>
                  <span className="font-mono text-amber-300">
                    {pendingTasksCount} pending / {globalKv.taskReviewQueue.length} total
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">Registered Users (`config:users_index`)</span>
                  <span className="font-mono text-sky-300">{globalKv.usersIndex.length} users</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/70">
                  <span className="text-slate-400">User Session State</span>
                  <span className="font-mono font-semibold text-emerald-400">{user.state}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setUser((prev) => ({
                      ...prev,
                      balanceInr: prev.balanceInr + 50,
                      lifetimeInr: prev.lifetimeInr + 50,
                    }))
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  +₹50.00 User Balance
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setGlobalKv((prev) => ({
                      ...prev,
                      maintenance: {
                        ...prev.maintenance,
                        enabled: !prev.maintenance.enabled,
                        updatedAt: new Date().toISOString(),
                      },
                    }))
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Toggle Maintenance
                </button>
                <button
                  type="button"
                  onClick={handleResetKvState}
                  className="col-span-2 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Reload Initial Demo KV Data
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono">
                  Complete KV Dump (`config:*` + `user:{user.userId}`)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      JSON.stringify({ config: globalKv, user }, null, 2),
                      'kv_tab_copy'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                >
                  {copiedKey === 'kv_tab_copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 overflow-auto text-xs font-mono tabular-nums leading-relaxed text-sky-200 bg-[#0B1120] flex-1 max-h-[600px]">
                {JSON.stringify({ config: globalKv, user }, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: CLOUDFLARE WORKERS DEPLOYMENT & WEBHOOK REGISTRATION
           =================================================================== */}
        {activeWorkspaceTab === 'deploy' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white font-display">
                  01. Deploy Upgraded Worker & Admin Panel
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Provision <code className="text-sky-300">BOT_KV</code>, set your <code className="text-sky-300">BOT_TOKEN</code> and <code className="text-sky-300">ADMIN_CHAT_ID</code> (Super Admin Telegram User ID), and deploy.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">
                    Step 1: Install grammY & create KV namespace
                  </div>
                  <pre className="font-mono text-sky-300 overflow-x-auto">
{`npm install grammy
npx wrangler kv namespace create BOT_KV`}
                  </pre>
                </div>

                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">
                    Step 2: Configure `BOT_TOKEN` & Super Admin `ADMIN_CHAT_ID`
                  </div>
                  <pre className="font-mono text-sky-300 overflow-x-auto">
{`npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_CHAT_ID`}
                  </pre>
                </div>

                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">
                    Step 3: Deploy to Cloudflare Workers
                  </div>
                  <pre className="font-mono text-sky-300 overflow-x-auto">
{`npx wrangler deploy`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white font-display">
                  02. Register Telegram Webhook
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Point Telegram updates to your Cloudflare Worker endpoint.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Telegram Bot Token (@BotFather)
                  </label>
                  <input
                    type="text"
                    value={webhookBotToken}
                    onChange={(e) => setWebhookBotToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Deployed Cloudflare Worker URL
                  </label>
                  <input
                    type="text"
                    value={webhookWorkerUrl}
                    onChange={(e) => setWebhookWorkerUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="p-3.5 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Generated cURL Command</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(webhookSetCommand, 'copy_curl')}
                      className="text-sky-300 hover:text-sky-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'copy_curl' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Command
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="font-mono text-[11.5px] text-emerald-300 whitespace-pre-wrap break-all">
                    {webhookSetCommand}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
