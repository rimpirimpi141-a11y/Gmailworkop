import workerSourceRaw from '../worker.js?raw';
import wranglerSourceRaw from '../wrangler.toml?raw';

export const WORKER_JS_SOURCE = workerSourceRaw;
export const WRANGLER_TOML_SOURCE = wranglerSourceRaw;

export const WORKER_PACKAGE_JSON = `{
  "name": "grammy-cloudflare-worker-bot",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "grammy": "^1.35.0"
  },
  "devDependencies": {
    "wrangler": "^3.109.0"
  }
}`;

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type InlineKeyboardGrid = InlineButton[][];

export interface TaskData {
  taskId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthYear: number;
  createdAt: string;
}

export interface AccountHistoryItem {
  taskId: string;
  email: string;
  rewardInr: number;
  date: string;
}

export interface InvitedUserItem {
  id: string;
  name: string;
  bonusInr: number;
  date: string;
}

export interface WithdrawalItem {
  txId: string;
  userId?: string;
  firstName?: string;
  username?: string;
  amountInr: number;
  upiId: string;
  holderName: string;
  status: 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  rejectReason?: string;
  date: string;
}

export interface DynamicRatesConfig {
  taskRewardInr: number;
  taskRewardUsd: number;
  minWithdrawalInr: number;
  referralBonusInr: number;
  dailyStreakBaseInr: number;
}

export interface ForceChannelItem {
  id: string;
  title: string;
  inviteLink: string;
}

export interface SecondaryAdminItem {
  id: string;
  addedBy: string;
  addedAt: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type BotSessionState =
  | 'IDLE'
  | 'AWAITING_UPI'
  | 'AWAITING_RATE_TASK'
  | 'AWAITING_RATE_MIN_WITHDRAW'
  | 'AWAITING_RATE_REFERRAL'
  | 'AWAITING_FORCE_CHANNEL'
  | 'AWAITING_ADMIN_ID'
  | 'AWAITING_BROADCAST'
  | 'AWAITING_INSPECT_USER_ID'
  | 'AWAITING_USER_ADD_BAL'
  | 'AWAITING_USER_DEDUCT_BAL'
  | 'AWAITING_REJECT_REASON';

export interface BotUserSchema {
  userId: string;
  firstName: string;
  username: string;
  isBanned: boolean;
  state: BotSessionState;
  adminContext: {
    targetTxId?: string;
    targetUserId?: string;
  };
  balanceInr: number;
  lifetimeInr: number;
  accounts: {
    approved: number;
    pending: number;
    rejected: number;
    history: AccountHistoryItem[];
  };
  currentTask: TaskData | null;
  referrals: {
    referredBy: string | null;
    invitedUsers: InvitedUserItem[];
    invitedCount: number;
    totalCommissionInr: number;
  };
  rewards: {
    streakDays: number;
    lastCheckInDate: string | null;
    claimedMilestones: string[];
  };
  withdrawals: WithdrawalItem[];
  settings: {
    notifications: boolean;
    currency: 'INR' | 'USD';
    language: string;
    sessionId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GlobalKvConfig {
  superAdminId: string;
  rates: DynamicRatesConfig;
  forceChannels: ForceChannelItem[];
  admins: SecondaryAdminItem[];
  maintenance: MaintenanceConfig;
  payoutQueue: WithdrawalItem[];
  usersIndex: string[];
}

export interface AdminChannelAlert {
  id: string;
  txId: string;
  userId: string;
  userName: string;
  amountInr: number;
  upiId: string;
  holderName: string;
  timestamp: string;
  status: 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  rawMarkdown: string;
}

export interface CallbackExecutionResult {
  messageText: string;
  keyboard: InlineKeyboardGrid;
  editInPlace: boolean;
  toast?: {
    text: string;
    showAlert: boolean;
  };
  adminAlert?: AdminChannelAlert;
  activeScreenLabel: string;
}

export const DEFAULT_RATES: DynamicRatesConfig = {
  taskRewardInr: 15,
  taskRewardUsd: 0.20,
  minWithdrawalInr: 50,
  referralBonusInr: 5,
  dailyStreakBaseInr: 2,
};

export const MILESTONES = [
  { id: 'm_5', count: 5, bonusInr: 20, label: 'Register 5 Accounts' },
  { id: 'm_15', count: 15, bonusInr: 75, label: 'Register 15 Accounts' },
  { id: 'm_50', count: 50, bonusInr: 300, label: 'Register 50 Accounts' },
  { id: 'm_100', count: 100, bonusInr: 750, label: 'Register 100 Accounts' },
];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Ayaan', 'Krishna',
  'Ishaan', 'Shaurya', 'Ananya', 'Diya', 'Advika', 'Riya', 'Aadhya', 'Kavya',
  'Meera', 'Neha', 'Rohan', 'Vikram', 'Karan', 'Nikhil', 'Siddharth', 'Tanvi',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Mehta', 'Joshi',
  'Kapoor', 'Malhotra', 'Chauhan', 'Gupta', 'Bhatia', 'Deshmukh', 'Kulkarni', 'Saxena',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '#!@%&*';
  const pick = (str: string) => str[Math.floor(Math.random() * str.length)];
  return `${pick(upper)}${pick(lower)}${pick(digits)}${pick(symbols)}${pick(lower)}${pick(upper)}${pick(symbols)}${pick(digits)}${pick(digits)}`;
}

export function generateNewTask(): TaskData {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const digits = randomInt(1000, 9999);
  const emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${digits}`;
  return {
    taskId: `TSK-${randomInt(100000, 999999)}`,
    firstName,
    lastName,
    email: `${emailPrefix}@gmail.com`,
    password: generatePassword(),
    birthYear: randomInt(1988, 2003),
    createdAt: new Date().toISOString(),
  };
}

export function createInitialUser(
  userId = '749201842',
  firstName = 'Aarav',
  username = 'aarav_dev'
): BotUserSchema {
  return {
    userId,
    firstName,
    username,
    isBanned: false,
    state: 'IDLE',
    adminContext: {},
    balanceInr: 45,
    lifetimeInr: 145,
    accounts: {
      approved: 3,
      pending: 1,
      rejected: 0,
      history: [
        {
          taskId: 'TSK-841920',
          email: 'rohan.sharma4821@gmail.com',
          rewardInr: 15,
          date: '2026-10-25T16:10:00.000Z',
        },
        {
          taskId: 'TSK-739104',
          email: 'ananya.patel9102@gmail.com',
          rewardInr: 15,
          date: '2026-10-25T12:40:00.000Z',
        },
        {
          taskId: 'TSK-618293',
          email: 'vikram.verma3094@gmail.com',
          rewardInr: 15,
          date: '2026-10-24T19:15:00.000Z',
        },
      ],
    },
    currentTask: null,
    referrals: {
      referredBy: null,
      invitedUsers: [
        {
          id: '892341022',
          name: 'Ishaan Gupta',
          bonusInr: 5,
          date: '2026-10-24T14:22:10.000Z',
        },
      ],
      invitedCount: 1,
      totalCommissionInr: 5,
    },
    rewards: {
      streakDays: 2,
      lastCheckInDate: null,
      claimedMilestones: [],
    },
    withdrawals: [
      {
        txId: 'UPI-P84K19X',
        userId: '749201842',
        firstName: 'Aarav',
        username: 'aarav_dev',
        amountInr: 50,
        upiId: 'aarav.dev@okaxis',
        holderName: 'Aarav Sharma',
        status: 'PROCESSING',
        date: '2026-10-25T19:20:00.000Z',
      },
      {
        txId: 'UPI-M91X74K2',
        userId: '749201842',
        firstName: 'Aarav',
        username: 'aarav_dev',
        amountInr: 50,
        upiId: 'aarav.dev@okaxis',
        holderName: 'Aarav Sharma',
        status: 'COMPLETED',
        date: '2026-10-23T18:05:00.000Z',
      },
    ],
    settings: {
      notifications: true,
      currency: 'INR',
      language: 'English (EN)',
      sessionId: `SES-1842-K9P4X`,
    },
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: new Date().toISOString(),
  };
}

export function createInitialGlobalKv(): GlobalKvConfig {
  return {
    superAdminId: '749201842',
    rates: { ...DEFAULT_RATES },
    forceChannels: [
      {
        id: '@GmailTaskOfficial',
        title: 'Gmail Task Hub Official',
        inviteLink: 'https://t.me/GmailTaskOfficial',
      },
    ],
    admins: [
      {
        id: '892341022',
        addedBy: '749201842',
        addedAt: '2026-10-22T11:30:00.000Z',
      },
    ],
    maintenance: {
      enabled: false,
      updatedAt: '2026-10-25T18:00:00.000Z',
      updatedBy: '749201842',
    },
    payoutQueue: [
      {
        txId: 'UPI-P84K19X',
        userId: '749201842',
        firstName: 'Aarav',
        username: 'aarav_dev',
        amountInr: 50,
        upiId: 'aarav.dev@okaxis',
        holderName: 'Aarav Sharma',
        status: 'PROCESSING',
        date: '2026-10-25T19:20:00.000Z',
      },
      {
        txId: 'UPI-M91X74K2',
        userId: '749201842',
        firstName: 'Aarav',
        username: 'aarav_dev',
        amountInr: 50,
        upiId: 'aarav.dev@okaxis',
        holderName: 'Aarav Sharma',
        status: 'COMPLETED',
        date: '2026-10-23T18:05:00.000Z',
      },
    ],
    usersIndex: ['749201842', '892341022', '648192031'],
  };
}

function formatMoney(amountInr: number, currency: 'INR' | 'USD' = 'INR'): string {
  if (currency === 'USD') {
    const usd = (amountInr / 75).toFixed(2);
    return `$${usd} (₹${amountInr.toFixed(2)})`;
  }
  return `₹${amountInr.toFixed(2)}`;
}

function getReferralTier(invitedCount: number, baseRateInr = 5) {
  if (invitedCount >= 25) {
    return { name: '💎 Diamond Partner', rateInr: baseRateInr + 5, nextAt: null };
  }
  if (invitedCount >= 10) {
    return { name: '🥇 Gold Partner', rateInr: baseRateInr + 2, nextAt: 25 };
  }
  return { name: '🥈 Silver Starter', rateInr: baseRateInr, nextAt: 10 };
}

export function isValidUpi(upi: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
}

// ============================================================================
// KEYBOARD BUILDERS (USER & ADMIN)
// ============================================================================
export function buildMainMenuKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '📩 Register an Account', callback_data: 'menu_register' },
      { text: '📑 My Accounts', callback_data: 'menu_accounts' },
    ],
    [
      { text: '👛 Balance', callback_data: 'menu_balance' },
      { text: '👥 Referrals', callback_data: 'menu_referrals' },
    ],
    [{ text: '🎁 Rewards', callback_data: 'menu_rewards' }],
    [
      { text: '⚙️ Settings', callback_data: 'menu_settings' },
      { text: '❓ Help', callback_data: 'menu_help' },
    ],
  ];
}

export function buildAdminDashboardKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '📊 Real-Time Analytics', callback_data: 'admin_analytics' },
      { text: '💳 Manage Payouts', callback_data: 'admin_payouts' },
    ],
    [
      { text: '🎁 Set Reward Rates', callback_data: 'admin_rates' },
      { text: '📢 Force Channels', callback_data: 'admin_channels' },
    ],
    [
      { text: '👥 Manage Admins', callback_data: 'admin_admins' },
      { text: '📣 Broadcast Message', callback_data: 'admin_broadcast' },
    ],
    [
      { text: '🔍 Inspect User', callback_data: 'admin_inspect' },
      { text: '⚙️ Maintenance Mode', callback_data: 'admin_maintenance' },
    ],
    [{ text: '🔙 Close Admin Panel', callback_data: 'admin_close' }],
  ];
}

function buildForceJoinKeyboard(channels: ForceChannelItem[]): InlineKeyboardGrid {
  const rows: InlineKeyboardGrid = channels.map((ch) => [
    { text: `📢 Join ${ch.title || ch.id}`, url: ch.inviteLink },
  ]);
  rows.push([{ text: '🔄 Check / Verified', callback_data: 'force_join_check' }]);
  return rows;
}

function buildTaskKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '✅ Done', callback_data: 'task_done' },
      { text: '🚫 Cancel', callback_data: 'task_cancel' },
    ],
    [{ text: '❓ How to create account?', callback_data: 'task_guide' }],
    [{ text: '🔙 Back to Main Menu', callback_data: 'menu_home' }],
  ];
}

function buildTaskGuideKeyboard(): InlineKeyboardGrid {
  return [
    [{ text: '🔙 Back to Task', callback_data: 'menu_register' }],
    [{ text: '🏠 Main Menu', callback_data: 'menu_home' }],
  ];
}

function buildMyAccountsKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '🔄 Refresh Stats', callback_data: 'accounts_refresh' },
      { text: '📥 Export History', callback_data: 'accounts_export' },
    ],
    [{ text: '🔙 Back', callback_data: 'menu_home' }],
  ];
}

function buildBalanceKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '💳 Withdraw via UPI', callback_data: 'balance_withdraw' },
      { text: '📜 Withdrawal History', callback_data: 'balance_history' },
    ],
    [{ text: '🔙 Back', callback_data: 'menu_home' }],
  ];
}

function buildWithdrawalHistoryKeyboard(): InlineKeyboardGrid {
  return [
    [{ text: '💳 Withdraw via UPI', callback_data: 'balance_withdraw' }],
    [
      { text: '🔙 Back to Balance', callback_data: 'menu_balance' },
      { text: '🏠 Main Menu', callback_data: 'menu_home' },
    ],
  ];
}

function buildCancelUpiKeyboard(): InlineKeyboardGrid {
  return [
    [{ text: '🚫 Cancel Withdrawal', callback_data: 'balance_cancel_upi' }],
    [{ text: '🔙 Back to Balance', callback_data: 'menu_balance' }],
  ];
}

function buildReferralsKeyboard(
  botUsername: string,
  userId: string,
  rates: DynamicRatesConfig
): InlineKeyboardGrid {
  const inviteLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  const shareText = encodeURIComponent(
    `🔥 Earn ₹${rates.taskRewardInr} ($${rates.taskRewardUsd.toFixed(2)}) per registered account with instant UPI payouts! Join using my invite link:`
  );
  const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareText}`;

  return [
    [
      { text: '📢 Share Link', url: tgShareUrl },
      { text: '📊 Referral Analytics', callback_data: 'referrals_analytics' },
    ],
    [{ text: '🔙 Back', callback_data: 'menu_home' }],
  ];
}

function buildReferralAnalyticsKeyboard(): InlineKeyboardGrid {
  return [
    [{ text: '🔄 Refresh Analytics', callback_data: 'referrals_analytics' }],
    [
      { text: '🔙 Back to Referrals', callback_data: 'menu_referrals' },
      { text: '🏠 Main Menu', callback_data: 'menu_home' },
    ],
  ];
}

function buildRewardsKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '🎯 Claim Daily Check-in', callback_data: 'rewards_checkin' },
      { text: '🏆 Milestones', callback_data: 'rewards_milestones' },
    ],
    [{ text: '🔙 Back', callback_data: 'menu_home' }],
  ];
}

function buildMilestonesKeyboard(user: BotUserSchema): InlineKeyboardGrid {
  const rows: InlineKeyboardGrid = MILESTONES.map((m) => {
    const claimed = user.rewards.claimedMilestones.includes(m.id);
    const eligible = user.accounts.approved >= m.count;
    if (claimed) {
      return [{ text: `✅ ${m.label} (Claimed)`, callback_data: `milestone_claim_${m.id}` }];
    }
    if (eligible) {
      return [{ text: `🎁 Claim ₹${m.bonusInr} (${m.label})`, callback_data: `milestone_claim_${m.id}` }];
    }
    return [{ text: `🔒 ${m.label} (${user.accounts.approved}/${m.count})`, callback_data: `milestone_claim_${m.id}` }];
  });
  rows.push([
    { text: '🔙 Back to Rewards', callback_data: 'menu_rewards' },
    { text: '🏠 Main Menu', callback_data: 'menu_home' },
  ]);
  return rows;
}

function buildSettingsKeyboard(user: BotUserSchema): InlineKeyboardGrid {
  const notifLabel = user.settings.notifications ? '🔔 Notifications: ON' : '🔕 Notifications: OFF';
  return [
    [
      { text: notifLabel, callback_data: 'settings_toggle_notif' },
      { text: `💱 Currency: ${user.settings.currency}`, callback_data: 'settings_toggle_currency' },
    ],
    [
      { text: `🌐 Language: ${user.settings.language}`, callback_data: 'settings_language' },
      { text: '🔑 Rotate Session ID', callback_data: 'settings_rotate_session' },
    ],
    [{ text: '🔙 Back', callback_data: 'menu_home' }],
  ];
}

function buildLanguageSubmenuKeyboard(currentLang: string): InlineKeyboardGrid {
  const langs = ['English (EN)', 'हिन्दी (HI)', 'বাংলা (BN)', 'தமிழ் (TA)'];
  return [
    [
      { text: `${currentLang === langs[0] ? '✅ ' : ''}${langs[0]}`, callback_data: 'set_lang_0' },
      { text: `${currentLang === langs[1] ? '✅ ' : ''}${langs[1]}`, callback_data: 'set_lang_1' },
    ],
    [
      { text: `${currentLang === langs[2] ? '✅ ' : ''}${langs[2]}`, callback_data: 'set_lang_2' },
      { text: `${currentLang === langs[3] ? '✅ ' : ''}${langs[3]}`, callback_data: 'set_lang_3' },
    ],
    [{ text: '🔙 Back to Settings', callback_data: 'menu_settings' }],
  ];
}

function buildHelpKeyboard(): InlineKeyboardGrid {
  return [
    [{ text: '🕒 What is a hold?', callback_data: 'faq_hold' }],
    [{ text: '💬 How to avoid SMS confirmation?', callback_data: 'faq_sms' }],
    [{ text: '🔴 Why is my account unavailable?', callback_data: 'faq_unavailable' }],
    [{ text: '🛡️ How can I avoid blocking my Gmail?', callback_data: 'faq_avoid_block' }],
    [{ text: '🪪 How many accounts can I register?', callback_data: 'faq_limit' }],
    [{ text: '👥 How does the referral program work?', callback_data: 'faq_referral' }],
    [
      { text: '💬 Support', url: 'https://t.me/TelegramSupport' },
      { text: '📢 Project News', url: 'https://t.me/TelegramTips' },
    ],
    [{ text: '🔙 Back', callback_data: 'menu_home' }],
  ];
}

function buildFaqBackKeyboard(): InlineKeyboardGrid {
  return [
    [
      { text: '🔙 Back to Help', callback_data: 'menu_help' },
      { text: '🏠 Main Menu', callback_data: 'menu_home' },
    ],
  ];
}

// ============================================================================
// SCREEN TEXT RENDERERS
// ============================================================================
export function renderHomeText(user: BotUserSchema): string {
  return (
    `✨ *Welcome to Gmail Task Hub, ${user.firstName}!*\n\n` +
    `💼 *Account Overview*\n` +
    `├ 👛 *Available Balance:* \`${formatMoney(user.balanceInr, user.settings.currency)}\`\n` +
    `├ ✅ *Verified Accounts:* \`${user.accounts.approved}\`\n` +
    `└ 🔥 *Daily Streak:* \`${user.rewards.streakDays} Days\`\n\n` +
    `👇 *Choose an option from the menu below:*`
  );
}

export function renderAdminDashboardText(kv: GlobalKvConfig): string {
  const pendingCount = kv.payoutQueue.filter((p) => p.status === 'PROCESSING').length;
  return (
    `🛡️ *Enterprise Admin Control Panel*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Admin Role:* \`SUPER ADMIN\`\n` +
    `⚙️ *Maintenance Mode:* ${
      kv.maintenance.enabled ? '🔴 *ENABLED (Users Blocked)*' : '🟢 *DISABLED (Live)*'
    }\n` +
    `📢 *Force-Join Channels:* \`${kv.forceChannels.length} Active\`\n` +
    `💳 *Pending UPI Payouts:* \`${pendingCount} Request(s)\`\n\n` +
    `📊 *Live Dynamic Rates:*\n` +
    `├ 💰 *Task Reward:* \`₹${kv.rates.taskRewardInr.toFixed(2)}\`\n` +
    `├ 🎯 *Min Withdrawal:* \`₹${kv.rates.minWithdrawalInr.toFixed(2)}\`\n` +
    `└ 👥 *Referral Bonus:* \`₹${kv.rates.referralBonusInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 *Select a management module below:*`
  );
}

function renderForceJoinText(channels: ForceChannelItem[]): string {
  const list = channels
    .map((ch, i) => `${i + 1}. *${ch.title || ch.id}* (\`${ch.id}\`)`)
    .join('\n');
  return (
    `🔒 *Mandatory Channel Verification*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `To use this bot and earn instant UPI rewards, you must join our official channel(s) below:\n\n` +
    `${list}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Join all channels above, then tap_ *🔄 Check / Verified* _to unlock the dashboard:_`
  );
}

function renderRegisterTaskText(task: TaskData, rates: DynamicRatesConfig): string {
  return (
    `📩 *Register a New Gmail Account*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${task.taskId}\`\n` +
    `💰 *Payout:* *₹${rates.taskRewardInr.toFixed(2)}* (\`$${rates.taskRewardUsd.toFixed(2)}\`)\n\n` +
    `📋 *Use these exact credentials:*\n` +
    `• *First Name:* \`${task.firstName}\`\n` +
    `• *Last Name:* \`${task.lastName}\`\n` +
    `• *Target Email:* \`${task.email}\`\n` +
    `• *Suggested Password:* \`${task.password}\`\n` +
    `• *Year of Birth:* \`${task.birthYear}\`\n\n` +
    `⚠️ *Be sure to use the specified data, otherwise the account will not be paid.*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 _Tap any credential above to copy it to your clipboard, create the account, then press_ *✅ Done* _below._`
  );
}

function renderTaskGuideText(task: TaskData): string {
  return (
    `📘 *Step-by-Step Account Creation Guide*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*1️⃣ Open Incognito / Private Tab*\n` +
    `Open a fresh incognito window in your browser or add a new Google account in device settings.\n\n` +
    `*2️⃣ Enter Assigned Profile Data*\n` +
    `• Name: \`${task.firstName} ${task.lastName}\`\n` +
    `• Username: \`${task.email.split('@')[0]}\`\n` +
    `• Password: \`${task.password}\`\n` +
    `• Birth Year: \`${task.birthYear}\`\n\n` +
    `*3️⃣ Complete Setup Without Recovery Email*\n` +
    `Skip phone/recovery email if prompted, accept Google Terms, and wait for the inbox to load.\n\n` +
    `*4️⃣ Sign Out & Submit*\n` +
    `Remove the account from your device so it remains clean, then return here and press *✅ Done*!`
  );
}

function renderMyAccountsText(user: BotUserSchema): string {
  const total = user.accounts.approved + user.accounts.pending + user.accounts.rejected;
  const recentLines =
    user.accounts.history.length > 0
      ? user.accounts.history
          .slice(0, 5)
          .map(
            (item, i) =>
              `${i + 1}. \`${item.email}\` — *+₹${item.rewardInr}* (${item.date.slice(0, 10)})`
          )
          .join('\n')
      : `_No registered accounts yet. Tap 'Register an Account' on the main menu to start earning!_`;

  return (
    `📑 *My Registered Accounts*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Verification Statistics:*\n` +
    `├ ✅ *Total Approved:* \`${user.accounts.approved}\`\n` +
    `├ ⏳ *Pending Verification:* \`${user.accounts.pending}\`\n` +
    `├ ❌ *Rejected:* \`${user.accounts.rejected}\`\n` +
    `└ 📦 *Total Submitted:* \`${total}\`\n\n` +
    `🗂️ *Recent Approved Submissions:*\n` +
    `${recentLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🕒 _Last synced: ${new Date().toISOString().slice(11, 19)} UTC_`
  );
}

function renderBalanceText(user: BotUserSchema, rates: DynamicRatesConfig): string {
  const needed = Math.max(0, rates.minWithdrawalInr - user.balanceInr);
  const statusLine =
    needed === 0
      ? `🟢 *Status:* Eligible for instant UPI payout!`
      : `🟡 *Status:* Need \`₹${needed.toFixed(2)}\` more to unlock withdrawal`;

  return (
    `👛 *Wallet & UPI Withdrawal*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Available Balance:* \`₹${user.balanceInr.toFixed(2)}\` (\`$${(user.balanceInr / 75).toFixed(2)}\`)\n` +
    `📈 *Lifetime Earnings:* \`₹${user.lifetimeInr.toFixed(2)}\`\n` +
    `🎯 *Minimum Withdrawal:* \`₹${rates.minWithdrawalInr.toFixed(2)}\`\n\n` +
    `${statusLine}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ _Payouts are processed via UPI (GPay, PhonePe, Paytm, BHIM) within 5–30 minutes._`
  );
}

function renderWithdrawalHistoryText(user: BotUserSchema, rates: DynamicRatesConfig): string {
  const list =
    user.withdrawals.length > 0
      ? user.withdrawals
          .slice(0, 8)
          .map((w, idx) => {
            const icon = w.status === 'COMPLETED' ? '✅' : w.status === 'REJECTED' ? '❌' : '⏳';
            const reasonLine = w.rejectReason ? `\n   └ 💬 _Reason: ${w.rejectReason}_` : '';
            return `${idx + 1}. *₹${w.amountInr.toFixed(2)}* → \`${w.upiId}\`\n   └ 🆔 \`${w.txId}\` • ${icon} _${w.status}_ (${w.date.slice(0, 10)})${reasonLine}`;
          })
          .join('\n\n')
      : `_No withdrawals found yet. Reach ₹${rates.minWithdrawalInr.toFixed(2)} to request your first UPI payout!_`;

  return (
    `📜 *UPI Withdrawal History*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${list}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function renderAwaitingUpiText(user: BotUserSchema): string {
  return (
    `💳 *UPI Withdrawal Request*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💵 *Withdrawable Amount:* \`₹${user.balanceInr.toFixed(2)}\`\n\n` +
    `📝 *Please send your UPI ID and Account Holder Name in a single message.*\n\n` +
    `*Accepted Format Examples:*\n` +
    `• \`rahulsharma@okaxis Rahul Sharma\`\n` +
    `• \`9876543210@ybl Priya Patel\`\n` +
    `• \`vivaan@paytm Vivaan Verma\`\n\n` +
    `⚠️ _Double-check your UPI handle before sending. Incorrect UPI IDs cannot be reversed._`
  );
}

function renderReferralsText(
  user: BotUserSchema,
  botUsername: string,
  rates: DynamicRatesConfig
): string {
  const inviteLink = `https://t.me/${botUsername}?start=ref_${user.userId}`;
  const tier = getReferralTier(user.referrals.invitedCount, rates.referralBonusInr);

  return (
    `👥 *Partner Referral Program*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *Your Personal Invite Link:*\n` +
    `\`${inviteLink}\`\n\n` +
    `🏆 *Current Tier:* ${tier.name}\n` +
    `💸 *Commission Rate:* *₹${tier.rateInr.toFixed(2)}* per active invite\n` +
    `👨‍👩‍👧‍👦 *Total Invited Users:* \`${user.referrals.invitedCount}\`\n` +
    `💰 *Total Referral Earnings:* \`₹${user.referrals.totalCommissionInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 _Share your personal link with friends and earn instant rewards when they join!_`
  );
}

function renderReferralAnalyticsText(user: BotUserSchema, rates: DynamicRatesConfig): string {
  const tier = getReferralTier(user.referrals.invitedCount, rates.referralBonusInr);
  const progressText = tier.nextAt
    ? `${user.referrals.invitedCount}/${tier.nextAt} invites to next tier`
    : `Maximum Diamond Tier unlocked!`;

  const recentReferrals =
    user.referrals.invitedUsers.length > 0
      ? user.referrals.invitedUsers
          .slice(0, 6)
          .map((u, i) => `${i + 1}. User \`#${u.id}\` — Joined ${u.date.slice(0, 10)} (*+₹${u.bonusInr}*)`)
          .join('\n')
      : `_No referrals recorded yet. Share your link to start building your network!_`;

  return (
    `📊 *Referral Network Analytics*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏅 *Tier Progression:* ${progressText}\n` +
    `├─ 🥈 *Silver (0–9):* ₹${rates.referralBonusInr} / invite\n` +
    `├─ 🥇 *Gold (10–24):* ₹${rates.referralBonusInr + 2} / invite\n` +
    `└─ 💎 *Diamond (25+):* ₹${rates.referralBonusInr + 5} / invite\n\n` +
    `📋 *Recent Referral Tree:*\n` +
    `${recentReferrals}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function renderRewardsText(user: BotUserSchema, rates: DynamicRatesConfig): string {
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = user.rewards.lastCheckInDate === today;

  return (
    `🎁 *Daily Streak & Milestone Rewards*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 *Current Daily Streak:* \`${user.rewards.streakDays} Days\`\n` +
    `📅 *Today's Check-In:* ${checkedInToday ? '✅ *Claimed*' : '🟢 *Available Now!*'}\n` +
    `💎 *Next Check-In Bonus:* \`₹${(rates.dailyStreakBaseInr + Math.min(user.rewards.streakDays, 5)).toFixed(2)}\`\n\n` +
    `🏆 *Milestone Bonus Table:*\n` +
    `• Register *5* accounts  ➔ *Get ₹20 bonus*\n` +
    `• Register *15* accounts ➔ *Get ₹75 bonus*\n` +
    `• Register *50* accounts ➔ *Get ₹300 bonus*\n` +
    `• Register *100* accounts ➔ *Get ₹750 bonus*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📈 _Your Approved Accounts:_ \`${user.accounts.approved}\``
  );
}

function renderMilestonesText(user: BotUserSchema): string {
  const rows = MILESTONES.map((m) => {
    const claimed = user.rewards.claimedMilestones.includes(m.id);
    const done = user.accounts.approved >= m.count;
    const badge = claimed ? '✅ Claimed' : done ? '🎁 Ready to Claim!' : `⏳ ${user.accounts.approved}/${m.count}`;
    return `• *${m.label}* → *+₹${m.bonusInr}* — [${badge}]`;
  }).join('\n');

  return (
    `🏆 *Account Registration Milestones*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Complete registration targets to unlock instant lump-sum INR bonuses directly to your wallet!\n\n` +
    `${rows}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Tap an unlocked milestone button below to claim your bonus:_`
  );
}

function renderSettingsText(user: BotUserSchema): string {
  return (
    `⚙️ *Account & Bot Settings*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔔 *Task & Payout Notifications:* \`${user.settings.notifications ? 'ENABLED (ON)' : 'MUTED (OFF)'}\`\n` +
    `💱 *Default Currency Display:* \`${user.settings.currency === 'INR' ? 'INR (₹)' : 'USD ($) + INR (₹)'}\`\n` +
    `🌐 *Interface Language:* \`${user.settings.language}\`\n` +
    `🔑 *Connected Session ID:* \`${user.settings.sessionId}\`\n` +
    `🆔 *Telegram User ID:* \`${user.userId}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Customize your preferences using the buttons below:_`
  );
}

function renderHelpText(): string {
  return (
    `❓ *Help Center & Frequently Asked Questions*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select any topic below to view detailed troubleshooting guides, payout rules, and anti-ban best practices:`
  );
}

function getFaqAnswers(rates: DynamicRatesConfig): Record<string, string> {
  return {
    faq_hold:
      `🕒 *What is a hold?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `A *hold* is a temporary verification window during which our automated system checks that a newly registered Gmail account remains active and hasn't been locked by Google's automated filters.\n\n` +
      `• *Instant Tasks:* Credited immediately (*₹${rates.taskRewardInr.toFixed(2)}*) upon clicking *✅ Done* when using our exact profile parameters.\n` +
      `• *Quality Checks:* Ensure you sign out of the Gmail account on your device after creation so no security prompts trigger during verification.`,

    faq_sms:
      `💬 *How to avoid SMS confirmation?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `If Google asks for a phone number during registration, follow these proven tips:\n\n` +
      `1️⃣ *Use Mobile Gmail App or Device Settings:* Create the account via *Settings → Accounts → Add Account → Google* on Android/iOS instead of a desktop browser.\n` +
      `2️⃣ *Reset IP Address:* Toggle Airplane Mode ON for 10 seconds and turn it OFF to obtain a fresh mobile carrier IP.\n` +
      `3️⃣ *Clear Browser Data:* Always use a clean Incognito tab and wait at least 15–30 minutes between consecutive registrations.`,

    faq_unavailable:
      `🔴 *Why is my account unavailable?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `An account may be marked unavailable or rejected if:\n\n` +
      `• The *First Name, Last Name, or Email handle* did not match the assigned task credentials.\n` +
      `• The password was changed after submission or 2-Step Verification (2FA) was left enabled.\n` +
      `• A recovery email or phone number remained linked to the account.\n\n` +
      `⚠️ _Always copy-paste the exact credentials generated on the task screen._`,

    faq_avoid_block:
      `🛡️ *How can I avoid blocking my Gmail?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `To maintain a 100% approval rate and prevent Google from disabling newly created accounts:\n\n` +
      `• Never register more than *2–3 accounts per IP address* per day.\n` +
      `• Switch from Wi-Fi to Mobile Data (4G/5G) and cycle Airplane Mode between tasks.\n` +
      `• Type the credentials naturally or paste carefully without using automated browser extensions.\n` +
      `• Log out of the account immediately after reaching the Gmail inbox.`,

    faq_limit:
      `🪪 *How many accounts can I register?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `There is *no hard cap* on the total number of accounts you can register with our bot!\n\n` +
      `• *Recommended Pace:* 3 to 8 high-quality accounts per day per device.\n` +
      `• *Milestone Bonuses:* Unlock extra rewards at *5, 15, 50, and 100* total approved accounts in the *🎁 Rewards* section.`,

    faq_referral:
      `👥 *How does the referral program work?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Invite friends using your personal referral link in the *👥 Referrals* menu:\n\n` +
      `• *🥈 Silver Tier (0–9 invites):* Earn *₹${rates.referralBonusInr.toFixed(2)}* per referral.\n` +
      `• *🥇 Gold Tier (10–24 invites):* Earn *₹${(rates.referralBonusInr + 2).toFixed(2)}* per referral.\n` +
      `• *💎 Diamond Tier (25+ invites):* Earn *₹${(rates.referralBonusInr + 5).toFixed(2)}* per referral.\n\n` +
      `All referral bonuses are credited directly to your withdrawable INR balance!`,
  };
}

// ============================================================================
// ADMIN SCREEN RENDERERS FOR SIMULATOR
// ============================================================================
function renderAdminAnalyticsView(user: BotUserSchema, kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const totalSubmitted =
    user.accounts.approved + user.accounts.pending + user.accounts.rejected + 14;
  const totalApproved = user.accounts.approved + 12;
  const totalPaid = kv.payoutQueue
    .filter((p) => p.status === 'COMPLETED')
    .reduce((acc, p) => acc + p.amountInr, 0);
  const pendingPayouts = kv.payoutQueue.filter((p) => p.status === 'PROCESSING');
  const totalPending = pendingPayouts.reduce((acc, p) => acc + p.amountInr, 0);

  const text =
    `📊 *Real-Time Platform Analytics*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 *User Metrics:*\n` +
    `├ 🪪 *Total Registered Users:* \`${kv.usersIndex.length}\`\n` +
    `└ 🚫 *Banned Accounts:* \`${user.isBanned ? 1 : 0}\`\n\n` +
    `📑 *Task Submissions:*\n` +
    `├ 📦 *Total Submitted:* \`${totalSubmitted}\`\n` +
    `└ ✅ *Total Approved:* \`${totalApproved}\`\n\n` +
    `💰 *Financial Ledger (INR):*\n` +
    `├ 👛 *Active Wallet Liability:* \`₹${user.balanceInr.toFixed(2)}\`\n` +
    `├ 💸 *Total Money Paid Out:* \`₹${totalPaid.toFixed(2)}\`\n` +
    `└ ⏳ *Pending UPI Queue:* \`₹${totalPending.toFixed(2)}\` (\`${pendingPayouts.length}\` tx)\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🕒 _Live KV Snapshot: ${new Date().toISOString().slice(11, 19)} UTC_`;

  return {
    text,
    keyboard: [
      [{ text: '🔄 Refresh Metrics', callback_data: 'admin_analytics' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
    ],
  };
}

function renderAdminPayoutsView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const pending = kv.payoutQueue.filter((p) => p.status === 'PROCESSING');
  if (pending.length === 0) {
    return {
      text:
        `💳 *Manage UPI Payout Queue*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *All caught up!* There are currently \`0\` pending withdrawal requests in the queue.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
      keyboard: [
        [{ text: '🔄 Refresh Queue', callback_data: 'admin_payouts' }],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
      ],
    };
  }

  const itemsText = pending
    .slice(0, 5)
    .map(
      (item, idx) =>
        `*#${idx + 1} • ${item.txId}*\n` +
        `├ 👤 *User:* ${item.firstName || 'Aarav'} (@${item.username || 'aarav_dev'}) [\`${item.userId || '749201842'}\`]\n` +
        `├ 💰 *Amount:* *₹${item.amountInr.toFixed(2)}*\n` +
        `├ 🏦 *UPI ID:* \`${item.upiId}\`\n` +
        `├ 🪪 *Holder:* \`${item.holderName}\`\n` +
        `└ 🕒 *Time:* \`${item.date.slice(0, 19).replace('T', ' ')}\``
    )
    .join('\n\n');

  const kb: InlineKeyboardGrid = pending.slice(0, 5).map((item) => [
    {
      text: `✅ Approve ${item.txId} (₹${item.amountInr})`,
      callback_data: `admin_payout_approve_${item.txId}`,
    },
    {
      text: `❌ Reject & Refund`,
      callback_data: `admin_payout_reject_${item.txId}`,
    },
  ]);

  kb.push([{ text: '🔄 Refresh Queue', callback_data: 'admin_payouts' }]);
  kb.push([{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]);

  return {
    text:
      `💳 *Manage Pending UPI Payouts (${pending.length})*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${itemsText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Select an action below to mark paid or refund to user wallet:_`,
    keyboard: kb,
  };
}

function renderAdminRatesView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  return {
    text:
      `🎁 *Set Dynamic Reward Rates*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Update platform payout rates and thresholds in real time without redeploying code:\n\n` +
      `• 💰 *Task Reward:* \`₹${kv.rates.taskRewardInr.toFixed(2)}\` (\`$${kv.rates.taskRewardUsd.toFixed(2)}\`)\n` +
      `• 🎯 *Min Withdrawal:* \`₹${kv.rates.minWithdrawalInr.toFixed(2)}\`\n` +
      `• 👥 *Referral Base Bonus:* \`₹${kv.rates.referralBonusInr.toFixed(2)}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Click any parameter below to enter a new value in chat:_`,
    keyboard: [
      [{ text: `💰 Task Reward (₹${kv.rates.taskRewardInr})`, callback_data: 'admin_rate_task' }],
      [{ text: `🎯 Min Withdrawal (₹${kv.rates.minWithdrawalInr})`, callback_data: 'admin_rate_min_withdraw' }],
      [{ text: `👥 Referral Bonus (₹${kv.rates.referralBonusInr})`, callback_data: 'admin_rate_referral' }],
      [{ text: '🔄 Reset to Default Rates', callback_data: 'admin_rate_reset' }],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
    ],
  };
}

function renderAdminChannelsView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const list =
    kv.forceChannels.length > 0
      ? kv.forceChannels
          .map((ch, idx) => `${idx + 1}. *${ch.title}* — \`${ch.id}\``)
          .join('\n')
      : `_No mandatory channels configured. Users can currently access the bot without joining any channel._`;

  const topRow: InlineButton[] = [{ text: '➕ Add Channel', callback_data: 'admin_channel_add' }];
  if (kv.forceChannels.length > 0) {
    topRow.push({ text: '➖ Remove Channel', callback_data: 'admin_channel_remove_menu' });
  }

  return {
    text:
      `📢 *Manage Force-Join Channels*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Users must be a member of all channels listed below before they can access \`/start\` or any bot submenu.\n\n` +
      `📋 *Active Required Channels (${kv.forceChannels.length}):*\n` +
      `${list}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ _Ensure this bot is added as an Administrator in every channel so it can call \`getChatMember\`._`,
    keyboard: [topRow, [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]],
  };
}

function renderAdminManageAdminsView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const subList =
    kv.admins.length > 0
      ? kv.admins
          .map((a, i) => `${i + 1}. \`${a.id}\` — Added ${a.addedAt.slice(0, 10)} (by \`${a.addedBy}\`)`)
          .join('\n')
      : `_No secondary admins added yet._`;

  const topRow: InlineButton[] = [{ text: '➕ Add Admin', callback_data: 'admin_sub_add' }];
  if (kv.admins.length > 0) {
    topRow.push({ text: '➖ Remove Admin', callback_data: 'admin_sub_remove_menu' });
  }

  return {
    text:
      `👥 *Manage Platform Administrators*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👑 *Super Admin (env.ADMIN_CHAT_ID):*\n` +
      `• \`${kv.superAdminId}\` _(Protected — Cannot be removed)_\n\n` +
      `🛡️ *Secondary Admins (config:admins — ${kv.admins.length}):*\n` +
      `${subList}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Add or revoke secondary admin privileges below:_`,
    keyboard: [topRow, [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]],
  };
}

function renderAdminInspectUserView(targetUser: BotUserSchema): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const lastUpi =
    targetUser.withdrawals.length > 0
      ? `${targetUser.withdrawals[0].upiId} (${targetUser.withdrawals[0].holderName})`
      : 'None submitted yet';

  return {
    text:
      `🔍 *User Profile Inspector*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *User ID:* \`${targetUser.userId}\`\n` +
      `👤 *Name:* ${targetUser.firstName} (@${targetUser.username})\n` +
      `🚦 *Account Status:* ${targetUser.isBanned ? '🚫 *BANNED*' : '🟢 *ACTIVE*'}\n` +
      `🔄 *Current Session State:* \`${targetUser.state}\`\n\n` +
      `💰 *Wallet & Task Ledger:*\n` +
      `├ 👛 *Available Balance:* \`₹${targetUser.balanceInr.toFixed(2)}\`\n` +
      `├ 📈 *Lifetime Earnings:* \`₹${targetUser.lifetimeInr.toFixed(2)}\`\n` +
      `├ ✅ *Approved Tasks:* \`${targetUser.accounts.approved}\`\n` +
      `├ 👥 *Referrals Invited:* \`${targetUser.referrals.invitedCount}\`\n` +
      `└ 🏦 *Last UPI Used:* \`${lastUpi}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Modify balance or ban status using the controls below:_`,
    keyboard: [
      [
        { text: '➕ Add Balance', callback_data: `admin_user_addbal_${targetUser.userId}` },
        { text: '➖ Deduct Balance', callback_data: `admin_user_deductbal_${targetUser.userId}` },
      ],
      [
        {
          text: targetUser.isBanned ? '🟢 Unban User' : '🚫 Ban User',
          callback_data: `admin_user_toggleban_${targetUser.userId}`,
        },
        { text: '🔄 Refresh Profile', callback_data: `admin_user_view_${targetUser.userId}` },
      ],
      [
        { text: '🔍 Search Another User', callback_data: 'admin_inspect' },
        { text: '🔙 Admin Panel', callback_data: 'admin_home' },
      ],
    ],
  };
}

function renderAdminMaintenanceView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  return {
    text:
      `⚙️ *System Maintenance Mode*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📡 *Current Status:* ${
        kv.maintenance.enabled ? '🔴 *MAINTENANCE ACTIVE*' : '🟢 *NORMAL OPERATION*'
      }\n` +
      `🕒 *Last Toggled:* \`${kv.maintenance.updatedAt.slice(0, 19).replace('T', ' ')} UTC\`\n\n` +
      `ℹ️ *How Maintenance Mode Works:*\n` +
      `• When *ENABLED*, all non-admin users receive a clean maintenance notice when clicking buttons or sending messages.\n` +
      `• Super Admins and Secondary Admins bypass maintenance mode completely for live testing.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
    keyboard: [
      [
        {
          text: kv.maintenance.enabled
            ? '🟢 Disable Maintenance Mode'
            : '🔴 Enable Maintenance Mode',
          callback_data: 'admin_maintenance_toggle',
        },
      ],
      [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
    ],
  };
}

// ============================================================================
// UNIFIED SIMULATOR DISPATCHER (WITH MIDDLEWARE CHECKS & ADMIN MODULES)
// ============================================================================
export function dispatchCallbackQuery(
  callbackData: string,
  user: BotUserSchema,
  globalKv: GlobalKvConfig,
  simContext: { isAdminRole: boolean; hasJoinedForceChannels: boolean },
  botUsername = 'GmailTaskRewardsBot'
): {
  updatedUser: BotUserSchema;
  updatedKv: GlobalKvConfig;
  result: CallbackExecutionResult;
} {
  const nextUser: BotUserSchema = JSON.parse(JSON.stringify(user));
  const nextKv: GlobalKvConfig = JSON.parse(JSON.stringify(globalKv));
  nextUser.updatedAt = new Date().toISOString();

  // 1. Access control for admin_* callbacks
  if (callbackData.startsWith('admin_')) {
    if (!simContext.isAdminRole) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderHomeText(nextUser),
          keyboard: buildMainMenuKeyboard(),
          editInPlace: true,
          toast: {
            text: '⛔ Unauthorized: Admin privileges required.',
            showAlert: true,
          },
          activeScreenLabel: 'Access Denied (Non-Admin)',
        },
      };
    }
  }

  // 2. Non-admin middleware checks: Ban, Maintenance, Force-Join
  if (!simContext.isAdminRole) {
    if (nextUser.isBanned) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `🚫 *Account Suspended*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Your account (\`#${nextUser.userId}\`) has been restricted by an administrator due to policy violations.`,
          keyboard: [],
          editInPlace: true,
          toast: {
            text: '🚫 Your account has been suspended by an administrator.',
            showAlert: true,
          },
          activeScreenLabel: 'Account Banned Screen',
        },
      };
    }

    if (nextKv.maintenance.enabled) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `🛠️ *Scheduled Maintenance in Progress*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `We are currently upgrading our verification servers and payout gateway.\n\n` +
            `⏳ _Your wallet balance and task history are 100% safe. Please check back shortly!_`,
          keyboard: [[{ text: '🔄 Check Status', callback_data: 'menu_home' }]],
          editInPlace: true,
          toast: {
            text: '🛠️ System is currently under maintenance. Please try again shortly!',
            showAlert: true,
          },
          activeScreenLabel: 'Maintenance Mode Screen',
        },
      };
    }

    if (callbackData === 'force_join_check') {
      if (nextKv.forceChannels.length > 0 && !simContext.hasJoinedForceChannels) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: renderForceJoinText(nextKv.forceChannels),
            keyboard: buildForceJoinKeyboard(nextKv.forceChannels),
            editInPlace: true,
            toast: {
              text: "❌ You haven't joined all required channels yet! Toggle 'Joined Channels' in the simulator bar to pass verification.",
              showAlert: true,
            },
            activeScreenLabel: 'Force-Join Gate (Unverified)',
          },
        };
      }
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderHomeText(nextUser),
          keyboard: buildMainMenuKeyboard(),
          editInPlace: true,
          toast: {
            text: '✅ Verification successful! Welcome to the dashboard.',
            showAlert: false,
          },
          activeScreenLabel: 'Home Dashboard (/start)',
        },
      };
    }

    if (nextKv.forceChannels.length > 0 && !simContext.hasJoinedForceChannels) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderForceJoinText(nextKv.forceChannels),
          keyboard: buildForceJoinKeyboard(nextKv.forceChannels),
          editInPlace: true,
          toast: {
            text: '🔒 Please join our required channel(s) first to continue.',
            showAlert: true,
          },
          activeScreenLabel: 'Force-Join Gate',
        },
      };
    }
  }

  // ==========================================================================
  // ADMIN PANEL CALLBACKS
  // ==========================================================================
  if (callbackData === 'admin_home') {
    nextUser.state = 'IDLE';
    nextUser.adminContext = {};
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderAdminDashboardText(nextKv),
        keyboard: buildAdminDashboardKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Admin Panel (/admin)',
      },
    };
  }

  if (callbackData === 'admin_close') {
    nextUser.state = 'IDLE';
    nextUser.adminContext = {};
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(),
        editInPlace: true,
        toast: { text: 'Admin panel closed.', showAlert: false },
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  if (callbackData === 'admin_analytics') {
    const view = renderAdminAnalyticsView(nextUser, nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: { text: '📊 Live KV analytics refreshed!', showAlert: false },
        activeScreenLabel: 'Admin → Real-Time Analytics',
      },
    };
  }

  if (callbackData === 'admin_payouts') {
    nextUser.state = 'IDLE';
    const view = renderAdminPayoutsView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Manage Payouts',
      },
    };
  }

  if (callbackData.startsWith('admin_payout_approve_')) {
    const txId = callbackData.replace('admin_payout_approve_', '');
    const qItem = nextKv.payoutQueue.find((p) => p.txId === txId);
    if (qItem && qItem.status === 'PROCESSING') {
      qItem.status = 'COMPLETED';
      const uTx = nextUser.withdrawals.find((w) => w.txId === txId);
      if (uTx) uTx.status = 'COMPLETED';
    }
    const view = renderAdminPayoutsView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: `✅ Payout ${txId} marked as PAID! Private confirmation sent to user.`,
          showAlert: true,
        },
        activeScreenLabel: 'Admin → Manage Payouts',
      },
    };
  }

  if (callbackData.startsWith('admin_payout_reject_')) {
    const txId = callbackData.replace('admin_payout_reject_', '');
    const qItem = nextKv.payoutQueue.find((p) => p.txId === txId && p.status === 'PROCESSING');
    if (!qItem) {
      const view = renderAdminPayoutsView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: view.text,
          keyboard: view.keyboard,
          editInPlace: true,
          toast: { text: '⚠️ Payout already processed.', showAlert: true },
          activeScreenLabel: 'Admin → Manage Payouts',
        },
      };
    }

    nextUser.state = 'AWAITING_REJECT_REASON';
    nextUser.adminContext = { targetTxId: txId };

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `❌ *Reject & Refund UPI Payout*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 *Transaction:* \`${qItem.txId}\`\n` +
          `👤 *User ID:* \`${qItem.userId || nextUser.userId}\`\n` +
          `💰 *Amount to Refund:* *₹${qItem.amountInr.toFixed(2)}*\n` +
          `🏦 *UPI ID:* \`${qItem.upiId}\`\n\n` +
          `📝 *Please type and send the rejection reason in chat:*\n` +
          `_(e.g. "Invalid UPI ID handle" or "Bank server timeout — please re-submit")_`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_payouts' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Reject Payout Reason',
      },
    };
  }

  if (callbackData === 'admin_rates') {
    nextUser.state = 'IDLE';
    const view = renderAdminRatesView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Dynamic Reward Rates',
      },
    };
  }

  if (callbackData === 'admin_rate_task') {
    nextUser.state = 'AWAITING_RATE_TASK';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `💰 *Update Task Reward Rate*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Current Rate: \`₹${nextKv.rates.taskRewardInr.toFixed(2)}\`\n\n` +
          `📝 *Send the new Task Reward amount (in INR) as a number in chat:*`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Set Task Reward',
      },
    };
  }

  if (callbackData === 'admin_rate_min_withdraw') {
    nextUser.state = 'AWAITING_RATE_MIN_WITHDRAW';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `🎯 *Update Minimum Withdrawal Threshold*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Current Threshold: \`₹${nextKv.rates.minWithdrawalInr.toFixed(2)}\`\n\n` +
          `📝 *Send the new Minimum UPI Withdrawal amount (in INR) in chat:*`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Set Min Withdrawal',
      },
    };
  }

  if (callbackData === 'admin_rate_referral') {
    nextUser.state = 'AWAITING_RATE_REFERRAL';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `👥 *Update Referral Base Bonus*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Current Base Bonus: \`₹${nextKv.rates.referralBonusInr.toFixed(2)}\`\n\n` +
          `📝 *Send the new Referral Bonus amount (in INR) in chat:*`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Set Referral Bonus',
      },
    };
  }

  if (callbackData === 'admin_rate_reset') {
    nextKv.rates = { ...DEFAULT_RATES };
    const view = renderAdminRatesView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: { text: '✅ Dynamic reward rates reset to defaults!', showAlert: true },
        activeScreenLabel: 'Admin → Dynamic Reward Rates',
      },
    };
  }

  if (callbackData === 'admin_channels') {
    nextUser.state = 'IDLE';
    const view = renderAdminChannelsView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Force-Join Channels',
      },
    };
  }

  if (callbackData === 'admin_channel_add') {
    nextUser.state = 'AWAITING_FORCE_CHANNEL';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➕ *Add Mandatory Force-Join Channel*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `1️⃣ Add this bot as an *Administrator* in your target Telegram channel.\n` +
          `2️⃣ *Forward any message* from that channel here, OR send the channel's \`@username\` (e.g. \`@OfficialNewsChannel\`).\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_channels' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Add Force Channel',
      },
    };
  }

  if (callbackData === 'admin_channel_remove_menu') {
    const rows: InlineKeyboardGrid = nextKv.forceChannels.map((ch, idx) => [
      {
        text: `🗑️ Remove ${ch.title} (${ch.id})`,
        callback_data: `admin_channel_del_${idx}`,
      },
    ]);
    rows.push([{ text: '🔙 Back to Force Channels', callback_data: 'admin_channels' }]);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➖ *Remove Force-Join Channel*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Tap any channel below to immediately remove it from mandatory verification:`,
        keyboard: rows,
        editInPlace: true,
        activeScreenLabel: 'Admin → Remove Force Channel',
      },
    };
  }

  if (callbackData.startsWith('admin_channel_del_')) {
    const idx = Number(callbackData.replace('admin_channel_del_', ''));
    const removed = nextKv.forceChannels.splice(idx, 1)[0];
    const view = renderAdminChannelsView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: `🗑️ Channel ${removed ? removed.id : ''} removed from config:force_channels!`,
          showAlert: true,
        },
        activeScreenLabel: 'Admin → Force-Join Channels',
      },
    };
  }

  if (callbackData === 'admin_admins') {
    nextUser.state = 'IDLE';
    const view = renderAdminManageAdminsView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Manage Admins',
      },
    };
  }

  if (callbackData === 'admin_sub_add') {
    nextUser.state = 'AWAITING_ADMIN_ID';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➕ *Grant Secondary Admin Access*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 *Send the numerical Telegram User ID of the new admin in chat:*\n` +
          `_(e.g. \`948102934\`)_`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_admins' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Add Secondary Admin',
      },
    };
  }

  if (callbackData === 'admin_sub_remove_menu') {
    const rows: InlineKeyboardGrid = nextKv.admins.map((a) => [
      { text: `🗑️ Revoke Admin #${a.id}`, callback_data: `admin_sub_del_${a.id}` },
    ]);
    rows.push([{ text: '🔙 Back to Manage Admins', callback_data: 'admin_admins' }]);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➖ *Revoke Secondary Admin Access*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Select a secondary admin below to revoke their \`/admin\` privileges _(Super Admin cannot be removed)_:`,
        keyboard: rows,
        editInPlace: true,
        activeScreenLabel: 'Admin → Revoke Secondary Admin',
      },
    };
  }

  if (callbackData.startsWith('admin_sub_del_')) {
    const idToRemove = callbackData.replace('admin_sub_del_', '');
    nextKv.admins = nextKv.admins.filter((a) => a.id !== idToRemove);
    const view = renderAdminManageAdminsView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: `🗑️ Admin access revoked for User #${idToRemove}.`,
          showAlert: true,
        },
        activeScreenLabel: 'Admin → Manage Admins',
      },
    };
  }

  if (callbackData === 'admin_broadcast') {
    nextUser.state = 'AWAITING_BROADCAST';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `📣 *Global Broadcast System*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👥 *Target Audience:* \`${nextKv.usersIndex.length} Registered Users\`\n\n` +
          `📝 *Send or forward the message you want to broadcast now:*\n` +
          `• Supports *Markdown text* formatting\n` +
          `• Supports *Photos with captions*\n` +
          `• Automatically tracks real-time delivery progress`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_home' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Broadcast System',
      },
    };
  }

  if (callbackData === 'admin_inspect') {
    nextUser.state = 'AWAITING_INSPECT_USER_ID';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `🔍 *Inspect & Edit User Profile*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 *Send the Telegram User ID you wish to inspect in chat:*\n` +
          `_(Tip: Send \`${nextUser.userId}\` to inspect the active sandbox user)_`,
        keyboard: [
          [{ text: `🔍 Inspect Active User (#${nextUser.userId})`, callback_data: `admin_user_view_${nextUser.userId}` }],
          [{ text: '🚫 Cancel Admin Input', callback_data: 'admin_home' }],
        ],
        editInPlace: true,
        activeScreenLabel: 'Admin → Inspect User Search',
      },
    };
  }

  if (callbackData.startsWith('admin_user_view_')) {
    nextUser.state = 'IDLE';
    const view = renderAdminInspectUserView(nextUser);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: `Admin → Inspect User #${nextUser.userId}`,
      },
    };
  }

  if (callbackData.startsWith('admin_user_addbal_')) {
    const targetId = callbackData.replace('admin_user_addbal_', '');
    nextUser.state = 'AWAITING_USER_ADD_BAL';
    nextUser.adminContext = { targetUserId: targetId };
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➕ *Add Balance to User #${targetId}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 *Send the INR amount to credit to this user's wallet:*`,
        keyboard: [[{ text: '🚫 Cancel', callback_data: `admin_user_view_${targetId}` }]],
        editInPlace: true,
        activeScreenLabel: `Admin → Add Balance (#${targetId})`,
      },
    };
  }

  if (callbackData.startsWith('admin_user_deductbal_')) {
    const targetId = callbackData.replace('admin_user_deductbal_', '');
    nextUser.state = 'AWAITING_USER_DEDUCT_BAL';
    nextUser.adminContext = { targetUserId: targetId };
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➖ *Deduct Balance from User #${targetId}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 *Send the INR amount to deduct from this user's wallet:*`,
        keyboard: [[{ text: '🚫 Cancel', callback_data: `admin_user_view_${targetId}` }]],
        editInPlace: true,
        activeScreenLabel: `Admin → Deduct Balance (#${targetId})`,
      },
    };
  }

  if (callbackData.startsWith('admin_user_toggleban_')) {
    nextUser.isBanned = !nextUser.isBanned;
    const view = renderAdminInspectUserView(nextUser);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: nextUser.isBanned
            ? `🚫 User #${nextUser.userId} has been BANNED.`
            : `🟢 User #${nextUser.userId} has been UNBANNED.`,
          showAlert: true,
        },
        activeScreenLabel: `Admin → Inspect User #${nextUser.userId}`,
      },
    };
  }

  if (callbackData === 'admin_maintenance') {
    const view = renderAdminMaintenanceView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Maintenance Mode',
      },
    };
  }

  if (callbackData === 'admin_maintenance_toggle') {
    nextKv.maintenance.enabled = !nextKv.maintenance.enabled;
    nextKv.maintenance.updatedAt = new Date().toISOString();
    const view = renderAdminMaintenanceView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: nextKv.maintenance.enabled
            ? '🔴 Maintenance Mode ENABLED! Regular users will now see the maintenance screen.'
            : '🟢 Maintenance Mode DISABLED! Bot is live for all users.',
          showAlert: true,
        },
        activeScreenLabel: 'Admin → Maintenance Mode',
      },
    };
  }

  // ==========================================================================
  // STANDARD USER CALLBACKS (UNCHANGED & DYNAMICALLY DRIVEN BY config:rates)
  // ==========================================================================
  if (callbackData === 'menu_home') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  if (callbackData === 'menu_register') {
    nextUser.state = 'IDLE';
    if (!nextUser.currentTask) {
      nextUser.currentTask = generateNewTask();
    }
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRegisterTaskText(nextUser.currentTask, nextKv.rates),
        keyboard: buildTaskKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Register an Account',
      },
    };
  }

  if (callbackData === 'task_done') {
    const completedTask = nextUser.currentTask || generateNewTask();
    const rewardInr = nextKv.rates.taskRewardInr;
    const rewardUsd = nextKv.rates.taskRewardUsd;

    nextUser.balanceInr += rewardInr;
    nextUser.lifetimeInr += rewardInr;
    nextUser.accounts.approved += 1;
    nextUser.accounts.history.unshift({
      taskId: completedTask.taskId,
      email: completedTask.email,
      rewardInr,
      date: new Date().toISOString(),
    });
    nextUser.currentTask = null;

    const confirmationText =
      `🎉 *Task Approved Successfully!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 *Account:* \`${completedTask.email}\`\n` +
      `💵 *Reward Credited:* *+₹${rewardInr.toFixed(2)}* (\`$${rewardUsd.toFixed(2)}\`)\n` +
      `👛 *Updated Balance:* \`₹${nextUser.balanceInr.toFixed(2)}\`\n` +
      `✅ *Total Verified Accounts:* \`${nextUser.accounts.approved}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 *Ready for another task?*`;

    const nextKb: InlineKeyboardGrid = [
      [
        { text: '📩 Register Another Account', callback_data: 'menu_register' },
        { text: '👛 View Balance', callback_data: 'menu_balance' },
      ],
      [{ text: '🔙 Back to Main Menu', callback_data: 'menu_home' }],
    ];

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: confirmationText,
        keyboard: nextKb,
        editInPlace: true,
        toast: {
          text: `✅ Account Verified & Approved!\n+₹${rewardInr.toFixed(2)} ($${rewardUsd.toFixed(2)}) credited to your balance.\nNew Balance: ₹${nextUser.balanceInr.toFixed(2)}`,
          showAlert: true,
        },
        activeScreenLabel: 'Task Approved Confirmation',
      },
    };
  }

  if (callbackData === 'task_cancel') {
    nextUser.currentTask = null;
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(),
        editInPlace: true,
        toast: {
          text: '🚫 Current registration task cancelled.',
          showAlert: false,
        },
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  if (callbackData === 'task_guide') {
    if (!nextUser.currentTask) {
      nextUser.currentTask = generateNewTask();
    }
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderTaskGuideText(nextUser.currentTask),
        keyboard: buildTaskGuideKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'How to Create Account Guide',
      },
    };
  }

  if (callbackData === 'menu_accounts') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderMyAccountsText(nextUser),
        keyboard: buildMyAccountsKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'My Accounts',
      },
    };
  }

  if (callbackData === 'accounts_refresh') {
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderMyAccountsText(nextUser),
        keyboard: buildMyAccountsKeyboard(),
        editInPlace: true,
        toast: {
          text: '🔄 Account statistics synced with verification server!',
          showAlert: false,
        },
        activeScreenLabel: 'My Accounts (Refreshed)',
      },
    };
  }

  if (callbackData === 'accounts_export') {
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderMyAccountsText(nextUser),
        keyboard: buildMyAccountsKeyboard(),
        editInPlace: true,
        toast: {
          text: `📥 Export Ready: accounts_${nextUser.userId}_report.csv (${nextUser.accounts.approved} approved records) generated!`,
          showAlert: true,
        },
        activeScreenLabel: 'My Accounts',
      },
    };
  }

  if (callbackData === 'menu_balance') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderBalanceText(nextUser, nextKv.rates),
        keyboard: buildBalanceKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Balance & UPI Withdrawal',
      },
    };
  }

  if (callbackData === 'balance_withdraw') {
    if (nextUser.balanceInr < nextKv.rates.minWithdrawalInr) {
      const needed = (nextKv.rates.minWithdrawalInr - nextUser.balanceInr).toFixed(2);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderBalanceText(nextUser, nextKv.rates),
          keyboard: buildBalanceKeyboard(),
          editInPlace: true,
          toast: {
            text: `⚠️ Minimum withdrawal is ₹${nextKv.rates.minWithdrawalInr.toFixed(2)}!\nYou need ₹${needed} more to request a UPI payout.`,
            showAlert: true,
          },
          activeScreenLabel: 'Balance & UPI Withdrawal',
        },
      };
    }

    nextUser.state = 'AWAITING_UPI';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderAwaitingUpiText(nextUser),
        keyboard: buildCancelUpiKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Awaiting UPI Input (state: AWAITING_UPI)',
      },
    };
  }

  if (callbackData === 'balance_cancel_upi') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderBalanceText(nextUser, nextKv.rates),
        keyboard: buildBalanceKeyboard(),
        editInPlace: true,
        toast: {
          text: 'Withdrawal request cancelled.',
          showAlert: false,
        },
        activeScreenLabel: 'Balance & UPI Withdrawal',
      },
    };
  }

  if (callbackData === 'balance_history') {
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderWithdrawalHistoryText(nextUser, nextKv.rates),
        keyboard: buildWithdrawalHistoryKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'UPI Withdrawal History',
      },
    };
  }

  if (callbackData === 'menu_referrals') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderReferralsText(nextUser, botUsername, nextKv.rates),
        keyboard: buildReferralsKeyboard(botUsername, nextUser.userId, nextKv.rates),
        editInPlace: true,
        activeScreenLabel: 'Referrals Program',
      },
    };
  }

  if (callbackData === 'referrals_analytics') {
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderReferralAnalyticsText(nextUser, nextKv.rates),
        keyboard: buildReferralAnalyticsKeyboard(),
        editInPlace: true,
        toast: {
          text: '📊 Referral network analytics updated!',
          showAlert: false,
        },
        activeScreenLabel: 'Referral Analytics',
      },
    };
  }

  if (callbackData === 'menu_rewards') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRewardsText(nextUser, nextKv.rates),
        keyboard: buildRewardsKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Rewards & Daily Streak',
      },
    };
  }

  if (callbackData === 'rewards_checkin') {
    const today = new Date().toISOString().slice(0, 10);
    if (nextUser.rewards.lastCheckInDate === today) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderRewardsText(nextUser, nextKv.rates),
          keyboard: buildRewardsKeyboard(),
          editInPlace: true,
          toast: {
            text: '⏳ You have already claimed your Daily Check-In reward today! Come back tomorrow.',
            showAlert: true,
          },
          activeScreenLabel: 'Rewards & Daily Streak',
        },
      };
    }

    const bonusInr = nextKv.rates.dailyStreakBaseInr + Math.min(nextUser.rewards.streakDays, 5);
    nextUser.rewards.streakDays += 1;
    nextUser.rewards.lastCheckInDate = today;
    nextUser.balanceInr += bonusInr;
    nextUser.lifetimeInr += bonusInr;

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRewardsText(nextUser, nextKv.rates),
        keyboard: buildRewardsKeyboard(),
        editInPlace: true,
        toast: {
          text: `🎯 Daily Check-In Claimed!\n🔥 Day ${nextUser.rewards.streakDays} Streak Bonus: +₹${bonusInr.toFixed(2)} added to wallet!`,
          showAlert: true,
        },
        activeScreenLabel: 'Rewards & Daily Streak',
      },
    };
  }

  if (callbackData === 'rewards_milestones') {
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderMilestonesText(nextUser),
        keyboard: buildMilestonesKeyboard(nextUser),
        editInPlace: true,
        activeScreenLabel: 'Account Milestones',
      },
    };
  }

  if (callbackData.startsWith('milestone_claim_')) {
    const milestoneId = callbackData.replace('milestone_claim_', '');
    const milestone = MILESTONES.find((m) => m.id === milestoneId);
    if (!milestone) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderMilestonesText(nextUser),
          keyboard: buildMilestonesKeyboard(nextUser),
          editInPlace: true,
          activeScreenLabel: 'Account Milestones',
        },
      };
    }

    if (nextUser.rewards.claimedMilestones.includes(milestone.id)) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderMilestonesText(nextUser),
          keyboard: buildMilestonesKeyboard(nextUser),
          editInPlace: true,
          toast: {
            text: `✅ You already claimed the "${milestone.label}" milestone bonus!`,
            showAlert: true,
          },
          activeScreenLabel: 'Account Milestones',
        },
      };
    }

    if (nextUser.accounts.approved < milestone.count) {
      const remaining = milestone.count - nextUser.accounts.approved;
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderMilestonesText(nextUser),
          keyboard: buildMilestonesKeyboard(nextUser),
          editInPlace: true,
          toast: {
            text: `🔒 Locked! Register ${remaining} more account(s) to unlock the ₹${milestone.bonusInr} bonus.`,
            showAlert: true,
          },
          activeScreenLabel: 'Account Milestones',
        },
      };
    }

    nextUser.rewards.claimedMilestones.push(milestone.id);
    nextUser.balanceInr += milestone.bonusInr;
    nextUser.lifetimeInr += milestone.bonusInr;

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderMilestonesText(nextUser),
        keyboard: buildMilestonesKeyboard(nextUser),
        editInPlace: true,
        toast: {
          text: `🏆 Milestone Unlocked!\n+₹${milestone.bonusInr}.00 bonus credited to your balance!`,
          showAlert: true,
        },
        activeScreenLabel: 'Account Milestones',
      },
    };
  }

  if (callbackData === 'menu_settings') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderSettingsText(nextUser),
        keyboard: buildSettingsKeyboard(nextUser),
        editInPlace: true,
        activeScreenLabel: 'Settings',
      },
    };
  }

  if (callbackData === 'settings_toggle_notif') {
    nextUser.settings.notifications = !nextUser.settings.notifications;
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderSettingsText(nextUser),
        keyboard: buildSettingsKeyboard(nextUser),
        editInPlace: true,
        toast: {
          text: `🔔 Notifications turned ${nextUser.settings.notifications ? 'ON' : 'OFF'}`,
          showAlert: false,
        },
        activeScreenLabel: 'Settings',
      },
    };
  }

  if (callbackData === 'settings_toggle_currency') {
    nextUser.settings.currency = nextUser.settings.currency === 'INR' ? 'USD' : 'INR';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderSettingsText(nextUser),
        keyboard: buildSettingsKeyboard(nextUser),
        editInPlace: true,
        toast: {
          text: `💱 Default currency switched to ${nextUser.settings.currency}`,
          showAlert: false,
        },
        activeScreenLabel: 'Settings',
      },
    };
  }

  if (callbackData === 'settings_language') {
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `🌐 *Select Interface Language*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Current Language: \`${nextUser.settings.language}\`\n\n` +
          `Choose your preferred language below:`,
        keyboard: buildLanguageSubmenuKeyboard(nextUser.settings.language),
        editInPlace: true,
        activeScreenLabel: 'Settings → Language',
      },
    };
  }

  if (callbackData.startsWith('set_lang_')) {
    const langs = ['English (EN)', 'हिन्दी (HI)', 'বাংলা (BN)', 'தமிழ் (TA)'];
    const idx = Number(callbackData.replace('set_lang_', ''));
    nextUser.settings.language = langs[idx] || 'English (EN)';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderSettingsText(nextUser),
        keyboard: buildSettingsKeyboard(nextUser),
        editInPlace: true,
        toast: {
          text: `🌐 Language updated to ${nextUser.settings.language}`,
          showAlert: false,
        },
        activeScreenLabel: 'Settings',
      },
    };
  }

  if (callbackData === 'settings_rotate_session') {
    nextUser.settings.sessionId = `SES-${String(nextUser.userId).slice(-4).padStart(4, '0')}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderSettingsText(nextUser),
        keyboard: buildSettingsKeyboard(nextUser),
        editInPlace: true,
        toast: {
          text: `🔑 New Session ID generated: ${nextUser.settings.sessionId}`,
          showAlert: true,
        },
        activeScreenLabel: 'Settings',
      },
    };
  }

  if (callbackData === 'menu_help') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHelpText(),
        keyboard: buildHelpKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Help & FAQ',
      },
    };
  }

  if (callbackData.startsWith('faq_')) {
    const answers = getFaqAnswers(nextKv.rates);
    const answerText = answers[callbackData] || '❓ Topic not found.';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: answerText,
        keyboard: buildFaqBackKeyboard(),
        editInPlace: true,
        activeScreenLabel: `Help → ${callbackData.replace('faq_', '').toUpperCase()}`,
      },
    };
  }

  return {
    updatedUser: nextUser,
    updatedKv: nextKv,
    result: {
      messageText: renderHomeText(nextUser),
      keyboard: buildMainMenuKeyboard(),
      editInPlace: true,
      activeScreenLabel: 'Home Dashboard (/start)',
    },
  };
}

// ============================================================================
// TEXT INPUT DISPATCHER (COMMANDS, ADMIN INPUTS & USER AWAITING_UPI)
// ============================================================================
export function processTextInput(
  rawText: string,
  user: BotUserSchema,
  globalKv: GlobalKvConfig,
  simContext: { isAdminRole: boolean; hasJoinedForceChannels: boolean }
): {
  updatedUser: BotUserSchema;
  updatedKv: GlobalKvConfig;
  result: CallbackExecutionResult;
} {
  const text = rawText.trim();
  const nextUser: BotUserSchema = JSON.parse(JSON.stringify(user));
  const nextKv: GlobalKvConfig = JSON.parse(JSON.stringify(globalKv));
  nextUser.updatedAt = new Date().toISOString();

  // 1. /admin Command
  if (text.startsWith('/admin')) {
    if (!simContext.isAdminRole) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: `⛔ *Access Denied:* You are not authorized to access the Admin Panel.`,
          keyboard: [],
          editInPlace: false,
          toast: {
            text: '⛔ Unauthorized: Switch Simulator Role to Admin to access /admin.',
            showAlert: true,
          },
          activeScreenLabel: 'Unauthorized /admin Attempt',
        },
      };
    }

    nextUser.state = 'IDLE';
    nextUser.adminContext = {};
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderAdminDashboardText(nextKv),
        keyboard: buildAdminDashboardKeyboard(),
        editInPlace: false,
        activeScreenLabel: 'Admin Panel (/admin)',
      },
    };
  }

  // 2. Non-Admin Middleware Checks on Text / Commands
  if (!simContext.isAdminRole) {
    if (nextUser.isBanned) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `🚫 *Account Suspended*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Your account (\`#${nextUser.userId}\`) has been restricted by an administrator due to policy violations.`,
          keyboard: [],
          editInPlace: false,
          activeScreenLabel: 'Account Banned Screen',
        },
      };
    }

    if (nextKv.maintenance.enabled) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `🛠️ *Scheduled Maintenance in Progress*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `We are currently upgrading our verification servers and payout gateway.\n\n` +
            `⏳ _Your wallet balance and task history are 100% safe. Please check back shortly!_`,
          keyboard: [[{ text: '🔄 Check Status', callback_data: 'menu_home' }]],
          editInPlace: false,
          activeScreenLabel: 'Maintenance Mode Screen',
        },
      };
    }

    if (nextKv.forceChannels.length > 0 && !simContext.hasJoinedForceChannels) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderForceJoinText(nextKv.forceChannels),
          keyboard: buildForceJoinKeyboard(nextKv.forceChannels),
          editInPlace: false,
          activeScreenLabel: 'Force-Join Gate',
        },
      };
    }
  }

  // 3. /start and /home Commands
  if (text.startsWith('/start') || text.startsWith('/home')) {
    nextUser.state = 'IDLE';
    const parts = text.split(/\s+/);
    let toast: { text: string; showAlert: boolean } | undefined;

    if (parts[1] && parts[1].startsWith('ref_')) {
      const refId = parts[1].replace('ref_', '').trim();
      const tier = getReferralTier(nextUser.referrals.invitedCount, nextKv.rates.referralBonusInr);
      const bonusInr = tier.rateInr;
      nextUser.referrals.invitedCount += 1;
      nextUser.referrals.totalCommissionInr += bonusInr;
      nextUser.referrals.invitedUsers.unshift({
        id: refId || String(randomInt(100000000, 999999999)),
        name: `Referral #${refId.slice(-4)}`,
        bonusInr,
        date: new Date().toISOString(),
      });
      nextUser.balanceInr += bonusInr;
      nextUser.lifetimeInr += bonusInr;
      toast = {
        text: `🎉 Referral Deep-Link Simulated!\n+₹${bonusInr.toFixed(2)} referral commission credited to KV state.`,
        showAlert: true,
      };
    }

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(),
        editInPlace: false,
        toast,
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  // 4. Admin Stateful Text Inputs
  if (
    simContext.isAdminRole &&
    nextUser.state.startsWith('AWAITING_') &&
    nextUser.state !== 'AWAITING_UPI'
  ) {
    const state = nextUser.state;

    if (state === 'AWAITING_BROADCAST') {
      nextUser.state = 'IDLE';
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `📣 *Broadcast Completed!*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 *Total Target Users:* \`${nextKv.usersIndex.length}\`\n` +
            `✅ *Delivered Successfully:* \`${nextKv.usersIndex.length}\`\n` +
            `❌ *Failed / Blocked:* \`0\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `💬 *Broadcast Preview:*\n${text}`,
          keyboard: [[{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]],
          editInPlace: false,
          toast: {
            text: `📣 Broadcast delivered to ${nextKv.usersIndex.length} users!`,
            showAlert: true,
          },
          activeScreenLabel: 'Admin → Broadcast Completed',
        },
      };
    }

    if (state === 'AWAITING_FORCE_CHANNEL') {
      const handle = text.startsWith('@') ? text.split(/\s+/)[0] : `@${text.split(/\s+/)[0]}`;
      if (!nextKv.forceChannels.some((c) => c.id.toLowerCase() === handle.toLowerCase())) {
        nextKv.forceChannels.push({
          id: handle,
          title: handle.replace('@', ''),
          inviteLink: `https://t.me/${handle.replace('@', '')}`,
        });
      }
      nextUser.state = 'IDLE';
      const view = renderAdminChannelsView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `✅ *Force-Join Channel Added & Bot Admin Rights Verified!*\n` +
            `Channel: \`${handle}\`\n\n` +
            view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          activeScreenLabel: 'Admin → Force-Join Channels',
        },
      };
    }

    if (
      state === 'AWAITING_RATE_TASK' ||
      state === 'AWAITING_RATE_MIN_WITHDRAW' ||
      state === 'AWAITING_RATE_REFERRAL'
    ) {
      const val = parseFloat(text);
      if (isNaN(val) || val <= 0) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please send a valid positive number (e.g. \`20\` or \`50\`).`,
            keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid Rate Input',
          },
        };
      }

      if (state === 'AWAITING_RATE_TASK') {
        nextKv.rates.taskRewardInr = val;
        nextKv.rates.taskRewardUsd = Number((val / 75).toFixed(2));
      } else if (state === 'AWAITING_RATE_MIN_WITHDRAW') {
        nextKv.rates.minWithdrawalInr = val;
      } else if (state === 'AWAITING_RATE_REFERRAL') {
        nextKv.rates.referralBonusInr = val;
      }

      nextUser.state = 'IDLE';
      const view = renderAdminRatesView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: `✅ *Dynamic Rate Saved to config:rates!*\n\n` + view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          toast: { text: '✅ Dynamic rate updated in KV!', showAlert: false },
          activeScreenLabel: 'Admin → Dynamic Reward Rates',
        },
      };
    }

    if (state === 'AWAITING_ADMIN_ID') {
      const newAdminId = text.replace(/\D/g, '');
      if (!newAdminId || newAdminId.length < 5) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please send a valid numeric Telegram User ID.`,
            keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_admins' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid User ID',
          },
        };
      }

      if (!nextKv.admins.some((a) => a.id === newAdminId)) {
        nextKv.admins.push({
          id: newAdminId,
          addedBy: nextKv.superAdminId,
          addedAt: new Date().toISOString(),
        });
      }
      nextUser.state = 'IDLE';
      const view = renderAdminManageAdminsView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: `✅ *Secondary Admin #${newAdminId} Granted Access!*\n\n` + view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          activeScreenLabel: 'Admin → Manage Admins',
        },
      };
    }

    if (state === 'AWAITING_REJECT_REASON') {
      const txId = nextUser.adminContext.targetTxId;
      const reason = text || 'UPI details could not be verified';
      const qItem = nextKv.payoutQueue.find((p) => p.txId === txId && p.status === 'PROCESSING');

      nextUser.state = 'IDLE';
      nextUser.adminContext = {};

      if (qItem) {
        qItem.status = 'REJECTED';
        qItem.rejectReason = reason;
        nextUser.balanceInr += qItem.amountInr;
        const uTx = nextUser.withdrawals.find((w) => w.txId === txId);
        if (uTx) {
          uTx.status = 'REJECTED';
          uTx.rejectReason = reason;
        }
      }

      const view = renderAdminPayoutsView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `✅ *Payout ${txId} Rejected & ₹${qItem ? qItem.amountInr.toFixed(2) : '0.00'} Refunded to User Wallet!*\n` +
            `💬 *Reason Sent to User:* _${reason}_\n\n` +
            view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          toast: {
            text: `💰 Full amount refunded to user wallet & rejection notice sent!`,
            showAlert: true,
          },
          activeScreenLabel: 'Admin → Manage Payouts',
        },
      };
    }

    if (state === 'AWAITING_INSPECT_USER_ID') {
      nextUser.state = 'IDLE';
      const view = renderAdminInspectUserView(nextUser);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          activeScreenLabel: `Admin → Inspect User #${nextUser.userId}`,
        },
      };
    }

    if (state === 'AWAITING_USER_ADD_BAL' || state === 'AWAITING_USER_DEDUCT_BAL') {
      const amount = parseFloat(text);
      if (isNaN(amount) || amount <= 0) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please enter a valid positive INR amount.`,
            keyboard: [[{ text: '🚫 Cancel', callback_data: 'admin_home' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Inspect User',
          },
        };
      }

      if (state === 'AWAITING_USER_ADD_BAL') {
        nextUser.balanceInr += amount;
        nextUser.lifetimeInr += amount;
      } else {
        nextUser.balanceInr = Math.max(0, nextUser.balanceInr - amount);
      }
      nextUser.state = 'IDLE';
      nextUser.adminContext = {};
      const view = renderAdminInspectUserView(nextUser);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: `✅ *User Wallet Balance Updated!*\n\n` + view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          toast: { text: '✅ User wallet balance updated in KV!', showAlert: false },
          activeScreenLabel: `Admin → Inspect User #${nextUser.userId}`,
        },
      };
    }
  }

  // 5. User Stateful AWAITING_UPI Input
  if (nextUser.state === 'AWAITING_UPI') {
    const tokens = text.split(/\s+/);
    const upiTokenIndex = tokens.findIndex((t) => t.includes('@'));
    const upiId = upiTokenIndex !== -1 ? tokens[upiTokenIndex] : '';
    const holderName =
      tokens.filter((_, i) => i !== upiTokenIndex).join(' ').trim() ||
      nextUser.firstName ||
      'Account Holder';

    if (!upiId || !isValidUpi(upiId)) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `❌ *Invalid UPI ID Format!*\n\n` +
            `Please enter a valid UPI handle (e.g. \`name@okaxis\` or \`9876543210@ybl\`) followed by your full name.\n\n` +
            `*Example:* \`rahul@okaxis Rahul Sharma\``,
          keyboard: buildCancelUpiKeyboard(),
          editInPlace: false,
          activeScreenLabel: 'Awaiting Valid UPI Input',
        },
      };
    }

    const payoutAmount = nextUser.balanceInr;
    const txId = `UPI-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    nextUser.balanceInr = 0;
    nextUser.state = 'IDLE';
    const newWithdrawal: WithdrawalItem = {
      txId,
      userId: nextUser.userId,
      firstName: nextUser.firstName,
      username: nextUser.username,
      amountInr: payoutAmount,
      upiId,
      holderName,
      status: 'PROCESSING',
      date: timestamp,
    };
    nextUser.withdrawals.unshift(newWithdrawal);
    nextKv.payoutQueue.unshift(newWithdrawal);

    const adminRawMarkdown =
      `🚨 *NEW UPI WITHDRAWAL REQUEST*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Transaction ID:* \`${txId}\`\n` +
      `👤 *User:* ${nextUser.firstName} (@${nextUser.username})\n` +
      `🔢 *User ID:* \`${nextUser.userId}\`\n` +
      `💰 *Payout Amount:* *₹${payoutAmount.toFixed(2)}*\n` +
      `🏦 *UPI Handle:* \`${upiId}\`\n` +
      `🪪 *Account Holder:* \`${holderName}\`\n` +
      `✅ *Verified Accounts:* \`${nextUser.accounts.approved}\`\n` +
      `🕒 *Timestamp:* \`${timestamp}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;

    const confirmMsg =
      `✅ *UPI Withdrawal Submitted Successfully!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Reference ID:* \`${txId}\`\n` +
      `💵 *Amount Deducted:* *₹${payoutAmount.toFixed(2)}*\n` +
      `🏦 *Destination UPI:* \`${upiId}\`\n` +
      `👤 *Beneficiary Name:* \`${holderName}\`\n` +
      `👛 *Remaining Balance:* \`₹0.00\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ _Your withdrawal has been forwarded to our payout desk and will be credited shortly._`;

    const postWithdrawKb: InlineKeyboardGrid = [
      [
        { text: '📜 Withdrawal History', callback_data: 'balance_history' },
        { text: '📩 Earn More', callback_data: 'menu_register' },
      ],
      [{ text: '🔙 Back to Main Menu', callback_data: 'menu_home' }],
    ];

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: confirmMsg,
        keyboard: postWithdrawKb,
        editInPlace: false,
        adminAlert: {
          id: txId,
          txId,
          userId: nextUser.userId,
          userName: `${nextUser.firstName} (@${nextUser.username})`,
          amountInr: payoutAmount,
          upiId,
          holderName,
          timestamp,
          status: 'PROCESSING',
          rawMarkdown: adminRawMarkdown,
        },
        activeScreenLabel: 'UPI Withdrawal Confirmed',
      },
    };
  }

  return {
    updatedUser: nextUser,
    updatedKv: nextKv,
    result: {
      messageText: renderHomeText(nextUser),
      keyboard: buildMainMenuKeyboard(),
      editInPlace: false,
      activeScreenLabel: 'Home Dashboard (/start)',
    },
  };
}
