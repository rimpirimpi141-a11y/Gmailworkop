import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Send,
  RotateCcw,
  Terminal,
  Database,
  Code2,
  MessageSquare,
  ExternalLink,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  WORKER_JS_SOURCE,
  WRANGLER_TOML_SOURCE,
  WORKER_PACKAGE_JSON,
  createInitialUser,
  renderHomeText,
  buildMainMenuKeyboard,
  dispatchCallbackQuery,
  processTextInput,
  BotUserSchema,
  InlineKeyboardGrid,
  AdminChannelAlert,
  MIN_WITHDRAWAL_INR,
} from './botEngine';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  keyboard?: InlineKeyboardGrid;
  timestamp: string;
  editedAt?: string;
}

const KV_STORAGE_KEY = 'grammy_worker_bot_kv_v1';

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
      const saved = localStorage.getItem(KV_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return createInitialUser();
  });

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
        keyboard: buildMainMenuKeyboard(),
        timestamp: '21:35:01',
      },
    ];
  });

  const [activeScreenLabel, setActiveScreenLabel] = useState<string>('Home Dashboard (/start)');
  const [lastCallbackData, setLastCallbackData] = useState<string>('/start');
  const [chatInput, setChatInput] = useState<string>('');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'sandbox' | 'code' | 'kv' | 'deploy'>('sandbox');
  const [selectedCodeFile, setSelectedCodeFile] = useState<'worker.js' | 'wrangler.toml' | 'package.json'>('worker.js');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Telegram answerCallbackQuery popup/toast state
  const [tgPopup, setTgPopup] = useState<{ text: string; showAlert: boolean } | null>(null);

  // Admin channel alerts (env.ADMIN_CHAT_ID)
  const [adminAlerts, setAdminAlerts] = useState<AdminChannelAlert[]>([
    {
      id: 'UPI-M91X74K2',
      txId: 'UPI-M91X74K2',
      userId: '749201842',
      userName: 'Aarav (@aarav_dev)',
      amountInr: 50,
      upiId: 'aarav.dev@okaxis',
      holderName: 'Aarav Sharma',
      timestamp: '2026-10-23T18:05:00.000Z',
      rawMarkdown:
        `🚨 *NEW UPI WITHDRAWAL REQUEST*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *Transaction ID:* \`UPI-M91X74K2\`\n` +
        `👤 *User:* Aarav (@aarav_dev)\n` +
        `🔢 *User ID:* \`749201842\`\n` +
        `💰 *Payout Amount:* *₹50.00*\n` +
        `🏦 *UPI Handle:* \`aarav.dev@okaxis\`\n` +
        `🪪 *Account Holder:* \`Aarav Sharma\`\n` +
        `✅ *Verified Accounts:* \`3\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
    },
  ]);

  // Webhook URL generator inputs
  const [webhookBotToken, setWebhookBotToken] = useState<string>('7182930412:AAH_your_telegram_bot_token_here');
  const [webhookWorkerUrl, setWebhookWorkerUrl] = useState<string>('https://grammy-telegram-task-bot.your-subdomain.workers.dev');

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KV_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }, [user]);

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

  const handleInlineButtonClick = (callbackData?: string, url?: string) => {
    if (url) {
      setTgPopup({
        text: `🔗 External Telegram URL Triggered:\n${url}`,
        showAlert: false,
      });
      setTimeout(() => setTgPopup(null), 3500);
      return;
    }

    if (!callbackData) return;

    setLastCallbackData(callbackData);
    const { updatedUser, result } = dispatchCallbackQuery(callbackData, user);
    setUser(updatedUser);
    setActiveScreenLabel(result.activeScreenLabel);

    const nowTime = new Date().toTimeString().slice(0, 8);

    setMessages((prev) => {
      // Edit last bot message in-place (simulating grammY ctx.editMessageText)
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

  const handleSendTextMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend) return;

    const nowTime = new Date().toTimeString().slice(0, 8);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: nowTime,
    };

    const { updatedUser, result } = processTextInput(textToSend, user);
    setUser(updatedUser);
    setLastCallbackData(`message:text ("${textToSend}")`);
    setActiveScreenLabel(result.activeScreenLabel);

    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      sender: 'bot',
      text: result.messageText,
      keyboard: result.keyboard,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    if (!customText) setChatInput('');

    if (result.adminAlert) {
      setAdminAlerts((prev) => [result.adminAlert!, ...prev]);
    }

    if (result.toast) {
      setTgPopup(result.toast);
      if (!result.toast.showAlert) {
        setTimeout(() => setTgPopup(null), 3000);
      }
    }
  };

  const handleQuickAddBalance = (amount: number) => {
    const updated: BotUserSchema = {
      ...user,
      balanceInr: user.balanceInr + amount,
      lifetimeInr: user.lifetimeInr + amount,
      updatedAt: new Date().toISOString(),
    };
    setUser(updated);
    // Re-render current screen if on home or balance
    if (lastCallbackData === 'menu_balance') {
      const { result } = dispatchCallbackQuery('menu_balance', updated);
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.length - 1;
        if (idx >= 0 && copy[idx].sender === 'bot') {
          copy[idx] = { ...copy[idx], text: result.messageText, keyboard: result.keyboard };
        }
        return copy;
      });
    } else if (lastCallbackData === 'menu_home' || lastCallbackData === '/start') {
      const { result } = dispatchCallbackQuery('menu_home', updated);
      setMessages((prev) => {
        const copy = [...prev];
        const idx = copy.length - 1;
        if (idx >= 0 && copy[idx].sender === 'bot') {
          copy[idx] = { ...copy[idx], text: result.messageText, keyboard: result.keyboard };
        }
        return copy;
      });
    }
  };

  const handleResetKvState = () => {
    const fresh = createInitialUser();
    setUser(fresh);
    setLastCallbackData('/start');
    setActiveScreenLabel('Home Dashboard (/start)');
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
        text: renderHomeText(fresh),
        keyboard: buildMainMenuKeyboard(),
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
          WORKSPACE SUMMARY STRIP (Tabular Numerals, Unboxed Metadata)
         =================================================================== */}
      <section className="border-b border-slate-800 bg-[#131C31] px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-200 font-medium">Cloudflare Workers Runtime</span>
            <span aria-hidden="true">·</span>
            <span>grammY Webhook Engine</span>
            <span aria-hidden="true">·</span>
            <span>Pure InlineKeyboardMarkup</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-sky-300">
              KV State: {user.state}
            </span>
          </div>

          {/* Mobile view switcher + Quick testing actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex md:hidden items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(['sandbox', 'code', 'kv', 'deploy'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveWorkspaceTab(tab)}
                  className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
                    activeWorkspaceTab === tab
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'sandbox'
                    ? 'Sandbox'
                    : tab === 'code'
                    ? 'Code'
                    : tab === 'kv'
                    ? 'KV'
                    : 'Deploy'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleQuickAddBalance(30)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add +₹30 Test Balance
            </button>

            <button
              type="button"
              onClick={() => handleSendTextMessage(undefined, '/start ref_991827')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Simulate Referral (/start ref_991827)
            </button>

            <button
              type="button"
              onClick={handleResetKvState}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset KV
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
            <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[740px]">
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
                      @GmailTaskRewardsBot · bot · editMessageText mode
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInlineButtonClick('menu_home')}
                  className="px-2.5 py-1 text-xs font-medium text-sky-300 bg-slate-800/80 hover:bg-slate-700 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  /home
                </button>
              </div>

              {/* Quick Submenu Jump Bar */}
              <div className="px-3 py-2 bg-[#131C27] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] text-slate-400 shrink-0 mr-1">Jump:</span>
                {[
                  { label: '🏠 Home', cb: 'menu_home' },
                  { label: '📩 Register', cb: 'menu_register' },
                  { label: '📑 Accounts', cb: 'menu_accounts' },
                  { label: '👛 Balance', cb: 'menu_balance' },
                  { label: '👥 Referrals', cb: 'menu_referrals' },
                  { label: '🎁 Rewards', cb: 'menu_rewards' },
                  { label: '⚙️ Settings', cb: 'menu_settings' },
                  { label: '❓ Help', cb: 'menu_help' },
                ].map((item) => (
                  <button
                    key={item.cb}
                    type="button"
                    onClick={() => handleInlineButtonClick(item.cb)}
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
                    {msg.sender === 'bot' && msg.keyboard && (
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

              {/* Stateful AWAITING_UPI Helper Banner when in AWAITING_UPI state */}
              {user.state === 'AWAITING_UPI' && (
                <div className="px-4 py-2 bg-amber-950/60 border-t border-amber-700/50 flex items-center justify-between gap-2 text-xs text-amber-200">
                  <span className="truncate">
                    State is <strong>AWAITING_UPI</strong> — enter UPI ID & Name below:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendTextMessage(undefined, 'aarav.sharma@okaxis Aarav Sharma')
                    }
                    className="px-2 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Fill Sample UPI
                  </button>
                </div>
              )}

              {/* Telegram Message Input Bar (No ReplyKeyboardMarkup — strictly text/commands) */}
              <form
                onSubmit={(e) => handleSendTextMessage(e)}
                className="p-3 bg-[#17212B] border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    user.state === 'AWAITING_UPI'
                      ? 'Send UPI ID & Name (e.g. rahul@okaxis Rahul Sharma)...'
                      : 'Send /start, /home, or UPI ID when prompted...'
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

            {/* RIGHT 7 COLUMNS: KV STATE INSPECTOR, ADMIN CHANNEL FEED & SOURCE CODE */}
            <div className="lg:col-span-7 space-y-6">
              {/* Top KPI Strip (Tabular Numerals, Single-Elevation Surface) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Wallet Balance (INR)</div>
                  <div className="mt-1 text-xl font-bold text-white font-mono tabular-nums">
                    ₹{user.balanceInr.toFixed(2)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                    Min Payout: ₹{MIN_WITHDRAWAL_INR.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Verified Accounts</div>
                  <div className="mt-1 text-xl font-bold text-emerald-400 font-mono tabular-nums">
                    {user.accounts.approved}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                    +₹15.00 ($0.20) / task
                  </div>
                </div>

                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Session State (BOT_KV)</div>
                  <div
                    className={`mt-1 text-base font-bold font-mono tabular-nums ${
                      user.state === 'AWAITING_UPI' ? 'text-amber-400' : 'text-sky-400'
                    }`}
                  >
                    {user.state}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    Last: {lastCallbackData}
                  </div>
                </div>

                <div className="p-4 bg-[#1E293B] border border-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Referrals & Streak</div>
                  <div className="mt-1 text-xl font-bold text-white font-mono tabular-nums">
                    {user.referrals.invitedCount} · {user.rewards.streakDays}d
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
                    Earned: ₹{user.referrals.totalCommissionInr.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Live Cloudflare Workers KV (env.BOT_KV) & Admin Alert Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Live KV JSON State Viewer */}
                <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[310px]">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Database className="w-4 h-4 text-sky-400" />
                      <span>env.BOT_KV (`user:{user.userId}`)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(JSON.stringify(user, null, 2), 'copy_kv_json')
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
                          Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="flex-1 p-4 overflow-auto text-[11.5px] leading-relaxed font-mono tabular-nums text-sky-200 bg-[#0B1120]">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>

                {/* Admin Channel Feed (env.ADMIN_CHAT_ID) */}
                <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[310px]">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>Admin Payout Feed (`env.ADMIN_CHAT_ID`)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {adminAlerts.length} alert(s)
                    </span>
                  </div>
                  <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0B1120]">
                    {adminAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                          <span className="text-emerald-400 font-semibold">
                            {alert.txId}
                          </span>
                          <span>{alert.timestamp.slice(0, 19).replace('T', ' ')}</span>
                        </div>
                        <div className="text-slate-200 font-mono tabular-nums">
                          Amount: <strong>₹{alert.amountInr.toFixed(2)}</strong> →{' '}
                          <span className="text-sky-300">{alert.upiId}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          User: {alert.userName} (ID: {alert.userId}) · Holder:{' '}
                          {alert.holderName}
                        </div>
                      </div>
                    ))}
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
                  Production Cloudflare Worker Source (`worker.js`)
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  ES Module exporting <code className="text-sky-300">fetch(request, env, ctx)</code> with grammY <code className="text-sky-300">webhookCallback(bot, &quot;cloudflare-mod&quot;)</code> and <code className="text-sky-300">env.BOT_KV</code> persistence.
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
                  KV State Controls (`env.BOT_KV`)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Test edge cases such as threshold checks (`balance &lt; ₹50` vs `balance &gt;= ₹50`), milestone unlocking, and `AWAITING_UPI` state recovery.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
                  <span className="text-slate-400">Current KV Key</span>
                  <code className="text-sky-300 font-mono">user:{user.userId}</code>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
                  <span className="text-slate-400">Session State</span>
                  <span className="font-mono font-semibold text-amber-300">{user.state}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
                  <span className="text-slate-400">Available Balance</span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-400">
                    ₹{user.balanceInr.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
                  <span className="text-slate-400">Approved Accounts</span>
                  <span className="font-mono tabular-nums text-white">
                    {user.accounts.approved}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleQuickAddBalance(50)}
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  +₹50.00 Balance
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUser((prev) => ({
                      ...prev,
                      balanceInr: 30,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Set Balance to ₹30 (Below Min)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUser((prev) => ({
                      ...prev,
                      accounts: { ...prev.accounts, approved: prev.accounts.approved + 5 },
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  +5 Approved Accounts
                </button>
                <button
                  type="button"
                  onClick={handleResetKvState}
                  className="px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Reset Default KV
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono">
                  Raw JSON Value in env.BOT_KV.get(&quot;user:{user.userId}&quot;)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(user, null, 2), 'kv_tab_copy')}
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
              <pre className="p-5 overflow-auto text-xs font-mono tabular-nums leading-relaxed text-sky-200 bg-[#0B1120] flex-1">
                {JSON.stringify(user, null, 2)}
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
                  01. Deploy to Cloudflare Workers
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Follow these 4 commands to provision your <code className="text-sky-300">BOT_KV</code> namespace, configure secrets, and deploy the serverless webhook worker.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">
                    Step 1: Install dependencies & create KV namespace
                  </div>
                  <pre className="font-mono text-sky-300 overflow-x-auto">
{`npm install grammy
npx wrangler kv namespace create BOT_KV`}
                  </pre>
                </div>

                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">
                    Step 2: Add Secrets (`BOT_TOKEN` & `ADMIN_CHAT_ID`)
                  </div>
                  <pre className="font-mono text-sky-300 overflow-x-auto">
{`npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_CHAT_ID`}
                  </pre>
                </div>

                <div className="p-4 rounded-lg bg-[#0B1120] border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">
                    Step 3: Deploy Worker to Cloudflare Edge
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
                  02. Interactive Webhook Command Builder
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Bind your Telegram Bot Token to your deployed Cloudflare Worker URL.
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
