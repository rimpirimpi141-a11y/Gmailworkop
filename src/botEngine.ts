import workerSourceRaw from '../worker.js?raw';
import wranglerSourceRaw from '../wrangler.toml?raw';

export const WORKER_JS_SOURCE = workerSourceRaw;
export const WRANGLER_TOML_SOURCE = wranglerSourceRaw;

export const WORKER_PACKAGE_JSON = `{
  "name": "grammy-cloudflare-worker-bot",
  "version": "1.0.0",
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
  amountInr: number;
  upiId: string;
  holderName: string;
  status: 'PROCESSING' | 'COMPLETED';
  date: string;
}

export interface BotUserSchema {
  userId: string;
  firstName: string;
  username: string;
  state: 'IDLE' | 'AWAITING_UPI';
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

export interface AdminChannelAlert {
  id: string;
  txId: string;
  userId: string;
  userName: string;
  amountInr: number;
  upiId: string;
  holderName: string;
  timestamp: string;
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

export const TASK_REWARD_INR = 15;
export const TASK_REWARD_USD = 0.20;
export const MIN_WITHDRAWAL_INR = 50;
export const REFERRAL_BONUS_INR = 5;
export const DAILY_STREAK_BASE_INR = 2;

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
    state: 'IDLE',
    balanceInr: 45,
    lifetimeInr: 95,
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
        txId: 'UPI-M91X74K2',
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

function formatMoney(amountInr: number, currency: 'INR' | 'USD' = 'INR'): string {
  if (currency === 'USD') {
    const usd = (amountInr / 75).toFixed(2);
    return `$${usd} (₹${amountInr.toFixed(2)})`;
  }
  return `₹${amountInr.toFixed(2)}`;
}

function getReferralTier(invitedCount: number) {
  if (invitedCount >= 25) {
    return { name: '💎 Diamond Partner', rateInr: 10, nextAt: null };
  }
  if (invitedCount >= 10) {
    return { name: '🥇 Gold Partner', rateInr: 7, nextAt: 25 };
  }
  return { name: '🥈 Silver Starter', rateInr: REFERRAL_BONUS_INR, nextAt: 10 };
}

export function isValidUpi(upi: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
}

// ============================================================================
// KEYBOARD BUILDERS
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

function buildReferralsKeyboard(botUsername: string, userId: string): InlineKeyboardGrid {
  const inviteLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  const shareText = encodeURIComponent(
    '🔥 Earn ₹15 ($0.20) per registered account with instant UPI payouts! Join using my invite link:'
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

function renderRegisterTaskText(task: TaskData): string {
  return (
    `📩 *Register a New Gmail Account*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${task.taskId}\`\n` +
    `💰 *Payout:* *₹${TASK_REWARD_INR}.00* (\`$${TASK_REWARD_USD.toFixed(2)}\`)\n\n` +
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

function renderBalanceText(user: BotUserSchema): string {
  const needed = Math.max(0, MIN_WITHDRAWAL_INR - user.balanceInr);
  const statusLine =
    needed === 0
      ? `🟢 *Status:* Eligible for instant UPI payout!`
      : `🟡 *Status:* Need \`₹${needed.toFixed(2)}\` more to unlock withdrawal`;

  return (
    `👛 *Wallet & UPI Withdrawal*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Available Balance:* \`₹${user.balanceInr.toFixed(2)}\` (\`$${(user.balanceInr / 75).toFixed(2)}\`)\n` +
    `📈 *Lifetime Earnings:* \`₹${user.lifetimeInr.toFixed(2)}\`\n` +
    `🎯 *Minimum Withdrawal:* \`₹${MIN_WITHDRAWAL_INR.toFixed(2)}\`\n\n` +
    `${statusLine}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ _Payouts are processed via UPI (GPay, PhonePe, Paytm, BHIM) within 5–30 minutes._`
  );
}

function renderWithdrawalHistoryText(user: BotUserSchema): string {
  const list =
    user.withdrawals.length > 0
      ? user.withdrawals
          .slice(0, 8)
          .map(
            (w, idx) =>
              `${idx + 1}. *₹${w.amountInr.toFixed(2)}* → \`${w.upiId}\`\n   └ 🆔 \`${w.txId}\` • _${w.status}_ (${w.date.slice(0, 10)})`
          )
          .join('\n\n')
      : `_No withdrawals found yet. Reach ₹50.00 to request your first UPI payout!_`;

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

function renderReferralsText(user: BotUserSchema, botUsername: string): string {
  const inviteLink = `https://t.me/${botUsername}?start=ref_${user.userId}`;
  const tier = getReferralTier(user.referrals.invitedCount);

  return (
    `👥 *Partner Referral Program*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *Your Personal Invite Link:*\n` +
    `\`${inviteLink}\`\n\n` +
    `🏆 *Current Tier:* ${tier.name}\n` +
    `💸 *Commission Rate:* *₹${tier.rateInr}.00* per active invite\n` +
    `👨‍👩‍👧‍👦 *Total Invited Users:* \`${user.referrals.invitedCount}\`\n` +
    `💰 *Total Referral Earnings:* \`₹${user.referrals.totalCommissionInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 _Share your personal link with friends and earn instant rewards when they join!_`
  );
}

function renderReferralAnalyticsText(user: BotUserSchema): string {
  const tier = getReferralTier(user.referrals.invitedCount);
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
    `├─ 🥈 *Silver (0–9):* ₹5 / invite\n` +
    `├─ 🥇 *Gold (10–24):* ₹7 / invite\n` +
    `└─ 💎 *Diamond (25+):* ₹10 / invite\n\n` +
    `📋 *Recent Referral Tree:*\n` +
    `${recentReferrals}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function renderRewardsText(user: BotUserSchema): string {
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = user.rewards.lastCheckInDate === today;

  return (
    `🎁 *Daily Streak & Milestone Rewards*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 *Current Daily Streak:* \`${user.rewards.streakDays} Days\`\n` +
    `📅 *Today's Check-In:* ${checkedInToday ? '✅ *Claimed*' : '🟢 *Available Now!*'}\n` +
    `💎 *Next Check-In Bonus:* \`₹${DAILY_STREAK_BASE_INR + Math.min(user.rewards.streakDays, 5)}.00\`\n\n` +
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

const FAQ_ANSWERS: Record<string, string> = {
  faq_hold:
    `🕒 *What is a hold?*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `A *hold* is a temporary verification window during which our automated system checks that a newly registered Gmail account remains active and hasn't been locked by Google's automated filters.\n\n` +
    `• *Instant Tasks:* Credited immediately (*₹15.00*) upon clicking *✅ Done* when using our exact profile parameters.\n` +
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
    `• *🥈 Silver Tier (0–9 invites):* Earn *₹5.00* per referral.\n` +
    `• *🥇 Gold Tier (10–24 invites):* Earn *₹7.00* per referral.\n` +
    `• *💎 Diamond Tier (25+ invites):* Earn *₹10.00* per referral.\n\n` +
    `All referral bonuses are credited directly to your withdrawable INR balance!`,
};

// ============================================================================
// SIMULATOR STATE MACHINE DISPATCHER
// ============================================================================
export function dispatchCallbackQuery(
  callbackData: string,
  user: BotUserSchema,
  botUsername = 'GmailTaskRewardsBot'
): { updatedUser: BotUserSchema; result: CallbackExecutionResult } {
  const nextUser: BotUserSchema = JSON.parse(JSON.stringify(user));
  nextUser.updatedAt = new Date().toISOString();

  if (callbackData === 'menu_home') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
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
      result: {
        messageText: renderRegisterTaskText(nextUser.currentTask),
        keyboard: buildTaskKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Register an Account',
      },
    };
  }

  if (callbackData === 'task_done') {
    const completedTask = nextUser.currentTask || generateNewTask();
    nextUser.balanceInr += TASK_REWARD_INR;
    nextUser.lifetimeInr += TASK_REWARD_INR;
    nextUser.accounts.approved += 1;
    nextUser.accounts.history.unshift({
      taskId: completedTask.taskId,
      email: completedTask.email,
      rewardInr: TASK_REWARD_INR,
      date: new Date().toISOString(),
    });
    nextUser.currentTask = null;

    const confirmationText =
      `🎉 *Task Approved Successfully!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 *Account:* \`${completedTask.email}\`\n` +
      `💵 *Reward Credited:* *+₹${TASK_REWARD_INR}.00* (\`$${TASK_REWARD_USD.toFixed(2)}\`)\n` +
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
      result: {
        messageText: confirmationText,
        keyboard: nextKb,
        editInPlace: true,
        toast: {
          text: `✅ Account Verified & Approved!\n+₹${TASK_REWARD_INR}.00 ($${TASK_REWARD_USD.toFixed(2)}) credited to your balance.\nNew Balance: ₹${nextUser.balanceInr.toFixed(2)}`,
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
      result: {
        messageText: renderBalanceText(nextUser),
        keyboard: buildBalanceKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Balance & UPI Withdrawal',
      },
    };
  }

  if (callbackData === 'balance_withdraw') {
    if (nextUser.balanceInr < MIN_WITHDRAWAL_INR) {
      const needed = (MIN_WITHDRAWAL_INR - nextUser.balanceInr).toFixed(2);
      return {
        updatedUser: nextUser,
        result: {
          messageText: renderBalanceText(nextUser),
          keyboard: buildBalanceKeyboard(),
          editInPlace: true,
          toast: {
            text: `⚠️ Minimum withdrawal is ₹${MIN_WITHDRAWAL_INR.toFixed(2)}!\nYou need ₹${needed} more to request a UPI payout.`,
            showAlert: true,
          },
          activeScreenLabel: 'Balance & UPI Withdrawal',
        },
      };
    }

    nextUser.state = 'AWAITING_UPI';
    return {
      updatedUser: nextUser,
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
      result: {
        messageText: renderBalanceText(nextUser),
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
      result: {
        messageText: renderWithdrawalHistoryText(nextUser),
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
      result: {
        messageText: renderReferralsText(nextUser, botUsername),
        keyboard: buildReferralsKeyboard(botUsername, nextUser.userId),
        editInPlace: true,
        activeScreenLabel: 'Referrals Program',
      },
    };
  }

  if (callbackData === 'referrals_analytics') {
    return {
      updatedUser: nextUser,
      result: {
        messageText: renderReferralAnalyticsText(nextUser),
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
      result: {
        messageText: renderRewardsText(nextUser),
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
        result: {
          messageText: renderRewardsText(nextUser),
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

    const bonusInr = DAILY_STREAK_BASE_INR + Math.min(nextUser.rewards.streakDays, 5);
    nextUser.rewards.streakDays += 1;
    nextUser.rewards.lastCheckInDate = today;
    nextUser.balanceInr += bonusInr;
    nextUser.lifetimeInr += bonusInr;

    return {
      updatedUser: nextUser,
      result: {
        messageText: renderRewardsText(nextUser),
        keyboard: buildRewardsKeyboard(),
        editInPlace: true,
        toast: {
          text: `🎯 Daily Check-In Claimed!\n🔥 Day ${nextUser.rewards.streakDays} Streak Bonus: +₹${bonusInr}.00 added to wallet!`,
          showAlert: true,
        },
        activeScreenLabel: 'Rewards & Daily Streak',
      },
    };
  }

  if (callbackData === 'rewards_milestones') {
    return {
      updatedUser: nextUser,
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
      result: {
        messageText: renderHelpText(),
        keyboard: buildHelpKeyboard(),
        editInPlace: true,
        activeScreenLabel: 'Help & FAQ',
      },
    };
  }

  if (callbackData.startsWith('faq_')) {
    const answerText = FAQ_ANSWERS[callbackData] || '❓ Topic not found.';
    return {
      updatedUser: nextUser,
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
    result: {
      messageText: renderHomeText(nextUser),
      keyboard: buildMainMenuKeyboard(),
      editInPlace: true,
      activeScreenLabel: 'Home Dashboard (/start)',
    },
  };
}

export function processTextInput(
  rawText: string,
  user: BotUserSchema
): { updatedUser: BotUserSchema; result: CallbackExecutionResult } {
  const text = rawText.trim();
  const nextUser: BotUserSchema = JSON.parse(JSON.stringify(user));
  nextUser.updatedAt = new Date().toISOString();

  // Command handling (/start, /home, /start ref_...)
  if (text.startsWith('/start') || text.startsWith('/home')) {
    nextUser.state = 'IDLE';
    const parts = text.split(/\s+/);
    let toast: { text: string; showAlert: boolean } | undefined;

    if (parts[1] && parts[1].startsWith('ref_')) {
      const refId = parts[1].replace('ref_', '').trim();
      const tier = getReferralTier(nextUser.referrals.invitedCount);
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
        text: `🎉 Referral Deep-Link Simulated!\n+₹${bonusInr}.00 referral commission credited to KV state.`,
        showAlert: true,
      };
    }

    return {
      updatedUser: nextUser,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(),
        editInPlace: false,
        toast,
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  // Stateful AWAITING_UPI text input handling
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
    nextUser.withdrawals.unshift({
      txId,
      amountInr: payoutAmount,
      upiId,
      holderName,
      status: 'PROCESSING',
      date: timestamp,
    });

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
          rawMarkdown: adminRawMarkdown,
        },
        activeScreenLabel: 'UPI Withdrawal Confirmed',
      },
    };
  }

  return {
    updatedUser: nextUser,
    result: {
      messageText: renderHomeText(nextUser),
      keyboard: buildMainMenuKeyboard(),
      editInPlace: false,
      activeScreenLabel: 'Home Dashboard (/start)',
    },
  };
}
