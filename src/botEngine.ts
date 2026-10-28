import workerSourceRaw from '../worker.js?raw';
import wranglerSourceRaw from '../wrangler.toml?raw';

export const WORKER_JS_SOURCE = workerSourceRaw;
export const WRANGLER_TOML_SOURCE = wranglerSourceRaw;

export const WORKER_PACKAGE_JSON = `{
  "name": "gmailworkop",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "worker.js",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "grammy": "^1.30.0"
  },
  "devDependencies": {
    "wrangler": "^3.80.0"
  }
}`;

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type InlineKeyboardGrid = InlineButton[][];

export type TaskTypeLabel = 'Normal Gmail' | '2-Step Gmail';

export interface AdminCustomTaskItem {
  customTaskId: string;
  taskType: TaskTypeLabel;
  emailPattern: string;
  password: string;
  rewardInr: number;
  rewardUsd: number;
  totalSlots: number;
  remainingSlots: number;
  createdBy: string;
  createdAt: string;
}

export interface TaskData {
  taskId: string;
  customTaskId?: string | null;
  isCustomAdminTask?: boolean;
  taskType: TaskTypeLabel;
  rewardInr: number;
  rewardUsd: number;
  firstName: string;
  lastName: string;
  emailPattern?: string;
  email: string;
  password: string;
  birthYear: number;
  createdAt: string;
}

export interface TaskReviewQueueItem {
  taskId: string;
  customTaskId?: string | null;
  userId: string;
  username: string;
  firstName: string;
  email: string;
  password: string;
  birthYear?: number;
  taskType: TaskTypeLabel;
  twoFactorData?: string | null;
  rewardInr: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface AccountHistoryItem {
  taskId: string;
  customTaskId?: string | null;
  email: string;
  password?: string;
  taskType: TaskTypeLabel;
  twoFactorData?: string | null;
  rewardInr: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
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
  standardTaskInr: number;
  standardTaskUsd: number;
  twoFactorTaskInr: number;
  twoFactorTaskUsd: number;
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
  | 'AWAITING_2FA_CODES'
  | 'AWAITING_USER_SUBMIT_GMAIL'
  | 'AWAITING_NEWTASK_EMAIL'
  | 'AWAITING_NEWTASK_PASSWORD'
  | 'AWAITING_NEWTASK_REWARD'
  | 'AWAITING_NEWTASK_SLOTS'
  | 'AWAITING_RATE_TASK'
  | 'AWAITING_RATE_2FA_TASK'
  | 'AWAITING_RATE_MIN_WITHDRAW'
  | 'AWAITING_RATE_REFERRAL'
  | 'AWAITING_FORCE_CHANNEL'
  | 'AWAITING_ADMIN_ID'
  | 'AWAITING_BROADCAST'
  | 'AWAITING_INSPECT_USER_ID'
  | 'AWAITING_HISTORY_USER_ID'
  | 'AWAITING_USER_ADD_BAL'
  | 'AWAITING_USER_DEDUCT_BAL'
  | 'AWAITING_REJECT_REASON'
  | 'AWAITING_TASK_REJECT_REASON';

export interface BotUserSchema {
  userId: string;
  firstName: string;
  username: string;
  isBanned: boolean;
  state: BotSessionState;
  adminContext: {
    targetTxId?: string;
    targetTaskId?: string;
    targetUserId?: string;
    newTaskType?: TaskTypeLabel;
    newTaskEmailPattern?: string;
    newTaskPassword?: string;
    newTaskRewardInr?: number;
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
    referralBonusPaid?: boolean;
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

export interface RegisteredUserSummary {
  userId: string;
  firstName: string;
  username: string;
  balanceInr: number;
  lifetimeInr: number;
  approved: number;
  pending: number;
  rejected: number;
  isBanned: boolean;
}

export interface GlobalKvConfig {
  superAdminId: string;
  rates: DynamicRatesConfig;
  forceChannels: ForceChannelItem[];
  admins: SecondaryAdminItem[];
  maintenance: MaintenanceConfig;
  adminTasks: AdminCustomTaskItem[];
  taskReviewQueue: TaskReviewQueueItem[];
  payoutQueue: WithdrawalItem[];
  usersIndex: string[];
  usersDirectory: Record<string, RegisteredUserSummary>;
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
  standardTaskInr: 15,
  standardTaskUsd: 0.20,
  twoFactorTaskInr: 30,
  twoFactorTaskUsd: 0.40,
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

export function resolveEmailPattern(patternRaw: string): string {
  let clean = (patternRaw || '').trim();
  if (!clean.includes('@')) {
    clean = `${clean}@gmail.com`;
  }
  const resolved = clean.replace(/[#*]/g, () => String(randomInt(0, 9)));
  return resolved.toLowerCase();
}

export function buildTaskFromAdminSlot(adminTask: AdminCustomTaskItem): TaskData {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const assignedEmail = resolveEmailPattern(adminTask.emailPattern);
  return {
    taskId: `TSK-${randomInt(100000, 999999)}`,
    customTaskId: adminTask.customTaskId,
    isCustomAdminTask: true,
    taskType: adminTask.taskType,
    rewardInr: Number(adminTask.rewardInr),
    rewardUsd: Number((Number(adminTask.rewardInr) / 75).toFixed(2)),
    firstName,
    lastName,
    emailPattern: adminTask.emailPattern,
    email: assignedEmail,
    password: adminTask.password,
    birthYear: randomInt(1988, 2003),
    createdAt: new Date().toISOString(),
  };
}

export function generateNewTask(
  taskType: TaskTypeLabel = 'Normal Gmail',
  rates: DynamicRatesConfig = DEFAULT_RATES
): TaskData {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const digits = randomInt(1000, 9999);
  const emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${digits}`;
  const isTwoFactor = taskType === '2-Step Gmail';
  const rewardInr = isTwoFactor ? rates.twoFactorTaskInr : rates.standardTaskInr;

  return {
    taskId: `TSK-${randomInt(100000, 999999)}`,
    customTaskId: null,
    isCustomAdminTask: false,
    taskType,
    rewardInr,
    rewardUsd: Number((rewardInr / 75).toFixed(2)),
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
    balanceInr: 60,
    lifetimeInr: 160,
    accounts: {
      approved: 3,
      pending: 1,
      rejected: 1,
      history: [
        {
          taskId: 'TSK-904128',
          customTaskId: 'CT-8401',
          email: 'roshan.work2026@gmail.com',
          password: 'SecurePass@2026',
          taskType: '2-Step Gmail',
          twoFactorData: '4920 1842 / 8391 0492 (Backup Codes)',
          rewardInr: 35,
          status: 'PENDING',
          date: '2026-10-26T09:15:00.000Z',
        },
        {
          taskId: 'TSK-841920',
          email: 'rohan.sharma4821@gmail.com',
          password: 'Rs4#mP!92',
          taskType: '2-Step Gmail',
          twoFactorData: 'abcd efgh ijkl mnop',
          rewardInr: 30,
          status: 'APPROVED',
          date: '2026-10-25T16:10:00.000Z',
        },
        {
          taskId: 'TSK-739104',
          email: 'ananya.patel9102@gmail.com',
          password: 'Ap7@kL!39',
          taskType: 'Normal Gmail',
          rewardInr: 15,
          status: 'APPROVED',
          date: '2026-10-25T12:40:00.000Z',
        },
        {
          taskId: 'TSK-618293',
          email: 'vikram.verma3094@gmail.com',
          password: 'Vv9#nQ!84',
          taskType: 'Normal Gmail',
          rewardInr: 15,
          status: 'APPROVED',
          date: '2026-10-24T19:15:00.000Z',
        },
        {
          taskId: 'TSK-512094',
          email: 'neha.gupta2109@gmail.com',
          password: 'Ng3%wZ!71',
          taskType: 'Normal Gmail',
          rewardInr: 15,
          status: 'REJECTED',
          rejectReason: 'User remained logged in on device during verification',
          date: '2026-10-24T11:05:00.000Z',
        },
      ],
    },
    currentTask: null,
    referrals: {
      referredBy: null,
      referralBonusPaid: false,
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
    adminTasks: [
      {
        customTaskId: 'CT-8401',
        taskType: '2-Step Gmail',
        emailPattern: 'roshan.work####@gmail.com',
        password: 'SecurePass@2026',
        rewardInr: 35,
        rewardUsd: 0.47,
        totalSlots: 10,
        remainingSlots: 8,
        createdBy: '749201842',
        createdAt: '2026-10-26T08:00:00.000Z',
      },
      {
        customTaskId: 'CT-5920',
        taskType: 'Normal Gmail',
        emailPattern: 'customname####@gmail.com',
        password: 'GmailUser#2026',
        rewardInr: 18,
        rewardUsd: 0.24,
        totalSlots: 25,
        remainingSlots: 19,
        createdBy: '749201842',
        createdAt: '2026-10-26T07:30:00.000Z',
      },
    ],
    taskReviewQueue: [
      {
        taskId: 'TSK-904128',
        customTaskId: 'CT-8401',
        userId: '749201842',
        username: 'aarav_dev',
        firstName: 'Aarav',
        email: 'roshan.work2026@gmail.com',
        password: 'SecurePass@2026',
        birthYear: 1996,
        taskType: '2-Step Gmail',
        twoFactorData: '4920 1842 / 8391 0492 (Backup Codes)',
        rewardInr: 35,
        status: 'PENDING',
        submittedAt: '2026-10-26T09:15:00.000Z',
      },
      {
        taskId: 'TSK-841920',
        userId: '749201842',
        username: 'aarav_dev',
        firstName: 'Aarav',
        email: 'rohan.sharma4821@gmail.com',
        password: 'Rs4#mP!92',
        birthYear: 1999,
        taskType: '2-Step Gmail',
        twoFactorData: 'abcd efgh ijkl mnop',
        rewardInr: 30,
        status: 'APPROVED',
        submittedAt: '2026-10-25T16:10:00.000Z',
      },
      {
        taskId: 'TSK-739104',
        userId: '749201842',
        username: 'aarav_dev',
        firstName: 'Aarav',
        email: 'ananya.patel9102@gmail.com',
        password: 'Ap7@kL!39',
        birthYear: 2001,
        taskType: 'Normal Gmail',
        rewardInr: 15,
        status: 'APPROVED',
        submittedAt: '2026-10-25T12:40:00.000Z',
      },
      {
        taskId: 'TSK-512094',
        userId: '749201842',
        username: 'aarav_dev',
        firstName: 'Aarav',
        email: 'neha.gupta2109@gmail.com',
        password: 'Ng3%wZ!71',
        birthYear: 1997,
        taskType: 'Normal Gmail',
        rewardInr: 15,
        status: 'REJECTED',
        rejectReason: 'User remained logged in on device during verification',
        submittedAt: '2026-10-24T11:05:00.000Z',
      },
    ],
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
    usersIndex: ['749201842', '892341022', '648192031', '519203844', '908172635'],
    usersDirectory: {
      '749201842': {
        userId: '749201842',
        firstName: 'Aarav',
        username: 'aarav_dev',
        balanceInr: 60,
        lifetimeInr: 160,
        approved: 3,
        pending: 1,
        rejected: 1,
        isBanned: false,
      },
      '892341022': {
        userId: '892341022',
        firstName: 'Ishaan Gupta',
        username: 'ishaan_g',
        balanceInr: 120,
        lifetimeInr: 270,
        approved: 9,
        pending: 0,
        rejected: 0,
        isBanned: false,
      },
      '648192031': {
        userId: '648192031',
        firstName: 'Priya Patel',
        username: 'priya_works',
        balanceInr: 45,
        lifetimeInr: 95,
        approved: 4,
        pending: 1,
        rejected: 0,
        isBanned: false,
      },
      '519203844': {
        userId: '519203844',
        firstName: 'Rohan Mehta',
        username: 'rohan_m99',
        balanceInr: 15,
        lifetimeInr: 15,
        approved: 1,
        pending: 0,
        rejected: 1,
        isBanned: false,
      },
      '908172635': {
        userId: '908172635',
        firstName: 'Kabir Verma',
        username: 'kabir_v',
        balanceInr: 0,
        lifetimeInr: 30,
        approved: 1,
        pending: 0,
        rejected: 2,
        isBanned: true,
      },
    },
  };
}

function syncActiveUserIntoDirectory(user: BotUserSchema, kv: GlobalKvConfig) {
  kv.usersDirectory[user.userId] = {
    userId: user.userId,
    firstName: user.firstName,
    username: user.username,
    balanceInr: user.balanceInr,
    lifetimeInr: user.lifetimeInr,
    approved: user.accounts.approved,
    pending: user.accounts.pending,
    rejected: user.accounts.rejected,
    isBanned: user.isBanned,
  };
  if (!kv.usersIndex.includes(user.userId)) {
    kv.usersIndex.unshift(user.userId);
  }
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
export function buildMainMenuKeyboard(isAdmin = false): InlineKeyboardGrid {
  const rows: InlineKeyboardGrid = [
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

  if (isAdmin) {
    rows.push([{ text: '🛡️ Admin Panel', callback_data: 'admin_home' }]);
  }

  return rows;
}

export function buildAdminDashboardKeyboard(isSuper = true): InlineKeyboardGrid {
  const rows: InlineKeyboardGrid = [
    [
      { text: '➕ Create / Add New Task', callback_data: 'admin_task_add' },
      { text: '📋 Manage Custom Tasks', callback_data: 'admin_tasks_manage' },
    ],
    [
      { text: '📝 Review Pending Tasks', callback_data: 'admin_tasks_queue' },
      { text: '📑 Task Submissions History', callback_data: 'admin_task_history' },
    ],
    [
      { text: '👥 View All Users', callback_data: 'admin_users_list' },
      { text: '🔍 Inspect User', callback_data: 'admin_inspect' },
    ],
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
    [{ text: '⚙️ Maintenance Mode', callback_data: 'admin_maintenance' }],
  ];

  if (isSuper) {
    rows.push([{ text: '⚠️ Wipe / Reset All Platform Data', callback_data: 'admin_system_reset' }]);
  }

  rows.push([{ text: '🔙 Close Admin Panel', callback_data: 'admin_close' }]);
  return rows;
}

function buildForceJoinKeyboard(channels: ForceChannelItem[]): InlineKeyboardGrid {
  const rows: InlineKeyboardGrid = channels.map((ch) => [
    { text: `📢 Join ${ch.title || ch.id}`, url: ch.inviteLink },
  ]);
  rows.push([{ text: '🔄 Check / Verified', callback_data: 'force_join_check' }]);
  return rows;
}

function buildTaskTypeSelectorKeyboard(
  rates: DynamicRatesConfig,
  adminTasks: AdminCustomTaskItem[] = []
): InlineKeyboardGrid {
  const activeAdminTasks = adminTasks.filter((t) => Number(t.remainingSlots) > 0);
  const rows: InlineKeyboardGrid = [];

  for (const t of activeAdminTasks.slice(0, 8)) {
    const icon = t.taskType === '2-Step Gmail' ? '🔐' : '📧';
    rows.push([
      {
        text: `${icon} ${t.emailPattern} (₹${t.rewardInr} • ${t.remainingSlots} left)`,
        callback_data: `claim_admin_task_${t.customTaskId}`,
      },
    ]);
  }

  rows.push([
    {
      text: `📧 Auto Standard Gmail (₹${rates.standardTaskInr})`,
      callback_data: 'register_type_standard',
    },
  ]);
  rows.push([
    {
      text: `🔐 Auto 2-Step Verification Gmail (₹${rates.twoFactorTaskInr})`,
      callback_data: 'register_type_2fa',
    },
  ]);
  rows.push([{ text: '🔙 Back to Main Menu', callback_data: 'menu_home' }]);
  return rows;
}

function buildTaskKeyboard(task: TaskData): InlineKeyboardGrid {
  const is2FA = task.taskType === '2-Step Gmail';
  return [
    [
      {
        text: is2FA ? '✅ Done (Submit Gmail & 2FA)' : '✅ Done (Submit Created Gmail)',
        callback_data: 'task_done',
      },
      { text: '🚫 Cancel', callback_data: 'task_cancel' },
    ],
    [
      { text: '🔄 Change / Pick Another Task', callback_data: 'task_change_type' },
      { text: '❓ How to create?', callback_data: 'task_guide' },
    ],
    [{ text: '🔙 Back to Main Menu', callback_data: 'menu_home' }],
  ];
}

function buildAwaitingUserSubmitGmailKeyboard(task: TaskData): InlineKeyboardGrid {
  const is2FA = task.taskType === '2-Step Gmail';
  const rows: InlineKeyboardGrid = [];
  if (!is2FA) {
    rows.push([
      {
        text: `⚡ Quick Submit: ${task.email}`,
        callback_data: 'task_quick_submit_assigned',
      },
    ]);
  }
  rows.push([
    { text: '🔙 Back to Task Credentials', callback_data: 'task_resume' },
    { text: '🚫 Cancel Task', callback_data: 'task_cancel' },
  ]);
  return rows;
}

function buildTaskGuideKeyboard(): InlineKeyboardGrid {
  return [
    [{ text: '🔙 Back to Task', callback_data: 'task_resume' }],
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
    `🔥 Earn ₹${rates.standardTaskInr}–₹${rates.twoFactorTaskInr} per registered Gmail account with fast UPI payouts! Join using my invite link:`
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
    `├ ⏳ *Pending Review:* \`${user.accounts.pending}\`\n` +
    `└ 🔥 *Daily Streak:* \`${user.rewards.streakDays} Days\`\n\n` +
    `👇 *Choose an option from the menu below:*`
  );
}

export function renderAdminDashboardText(kv: GlobalKvConfig): string {
  const pendingPayoutCount = kv.payoutQueue.filter((p) => p.status === 'PROCESSING').length;
  const pendingTaskCount = kv.taskReviewQueue.filter((t) => t.status === 'PENDING').length;
  const activeAdminTasks = (kv.adminTasks || []).filter((t) => Number(t.remainingSlots) > 0);
  const totalCustomSlots = activeAdminTasks.reduce((acc, t) => acc + Number(t.remainingSlots), 0);

  return (
    `🛡️ *Enterprise Admin Control Panel*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Admin Role:* \`SUPER ADMIN\`\n` +
    `⚙️ *Maintenance Mode:* ${
      kv.maintenance.enabled ? '🔴 *ENABLED (Users Blocked)*' : '🟢 *DISABLED (Live)*'
    }\n` +
    `📋 *Active Admin Tasks:* \`${activeAdminTasks.length} Task(s) (${totalCustomSlots} slots)\`\n` +
    `📝 *Pending Task Reviews:* \`${pendingTaskCount} Task(s)\`\n` +
    `💳 *Pending UPI Payouts:* \`${pendingPayoutCount} Request(s)\`\n` +
    `👥 *Registered Users:* \`${kv.usersIndex.length} User(s)\`\n` +
    `📢 *Force-Join Channels:* \`${kv.forceChannels.length} Active\`\n\n` +
    `📊 *Live Dynamic Rates:*\n` +
    `├ 📧 *Standard Gmail:* \`₹${kv.rates.standardTaskInr.toFixed(2)}\`\n` +
    `├ 🔐 *2-Step (2FA) Gmail:* \`₹${kv.rates.twoFactorTaskInr.toFixed(2)}\`\n` +
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
    `To use this bot and earn UPI rewards, you must join our official channel(s) below:\n\n` +
    `${list}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Join all channels above, then tap_ *🔄 Check / Verified* _to unlock the dashboard:_`
  );
}

function renderTaskTypeSelectText(
  rates: DynamicRatesConfig,
  adminTasks: AdminCustomTaskItem[] = []
): string {
  const activeAdminTasks = adminTasks.filter((t) => Number(t.remainingSlots) > 0);
  const customTaskSection =
    activeAdminTasks.length > 0
      ? `🎯 *Active Admin-Assigned Tasks (${activeAdminTasks.length} Available):*\n` +
        activeAdminTasks
          .slice(0, 8)
          .map(
            (t, idx) =>
              `*${idx + 1}. ${t.taskType === '2-Step Gmail' ? '🔐 2FA' : '📧 Std'}:* \`${t.emailPattern}\`\n` +
              `   ├ 🔑 *Password:* \`${t.password}\`\n` +
              `   └ 💰 *Reward:* *₹${Number(t.rewardInr).toFixed(2)}* • 📦 *Slots Left:* \`${t.remainingSlots}/${t.totalSlots}\``
          )
          .join('\n\n') +
        `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`
      : '';

  return (
    `📩 *Register an Account — Available Tasks*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    customTaskSection +
    `⚡ *Instant Task Categories:*\n` +
    `• *📧 Standard Gmail (No 2FA):* *₹${rates.standardTaskInr.toFixed(2)}* (\`$${rates.standardTaskUsd.toFixed(2)}\`)\n` +
    `• *🔐 2-Step Verification Gmail (2FA):* *₹${rates.twoFactorTaskInr.toFixed(2)}* (\`$${rates.twoFactorTaskUsd.toFixed(2)}\`)\n\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Tap an Admin-Assigned task or category below to start:_`
  );
}

function renderRegisterTaskText(task: TaskData): string {
  const is2FA = task.taskType === '2-Step Gmail';
  const sourceBadge = task.isCustomAdminTask
    ? `🎯 *Task Source:* \`Admin Assigned Task (${task.customTaskId})\`\n` +
      (task.emailPattern ? `📐 *Admin Pattern:* \`${task.emailPattern}\`\n` : '')
    : `⚡ *Task Source:* \`System Generated\`\n`;

  const twoFactorInstruction = is2FA
    ? `\n🔐 *2-STEP (2FA) REQUIREMENT:*\n` +
      `Enable 2-Step Verification on this Gmail account and generate *Backup Codes* or a *16-digit App Password*. When you tap *✅ Done*, you will submit the exact Gmail address created + your Backup Codes / App Password.\n`
    : `\n📧 *SUBMISSION REQUIREMENT:*\n` +
      `Create the Gmail account with the exact email and password above. When you tap *✅ Done*, you will confirm/submit the exact Gmail address you created.\n`;

  return (
    `📩 *Register a New Gmail Account*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${task.taskId}\`\n` +
    sourceBadge +
    `🏷️ *Task Type:* *${task.taskType}*\n` +
    `💰 *Payout (After Admin Verification):* *₹${task.rewardInr.toFixed(2)}* (\`$${task.rewardUsd.toFixed(2)}\`)\n\n` +
    `📋 *Use these exact credentials set by Admin:*\n` +
    `• *First Name:* \`${task.firstName}\`\n` +
    `• *Last Name:* \`${task.lastName}\`\n` +
    `• *Target Gmail:* \`${task.email}\`\n` +
    `• *Exact Password:* \`${task.password}\`\n` +
    `• *Year of Birth:* \`${task.birthYear}\`\n` +
    `${twoFactorInstruction}\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 _Tap any credential above to copy it, create the account, log out from your phone, then press_ *✅ Done* _below._`
  );
}

function renderAwaitingUserSubmitGmailText(task: TaskData): string {
  const is2FA = task.taskType === '2-Step Gmail';
  if (is2FA) {
    return (
      `🔐 *Submit Created 2-Step (2FA) Gmail & Backup Codes*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Task ID:* \`${task.taskId}\`\n` +
      `📧 *Assigned Target Gmail:* \`${task.email}\`\n` +
      `🔑 *Assigned Password:* \`${task.password}\`\n` +
      `💰 *Task Reward:* *₹${task.rewardInr.toFixed(2)}*\n\n` +
      `📝 *Please send the exact Gmail address you created followed by your 2FA Backup Codes or 16-digit App Password in chat now:*\n\n` +
      `*Accepted Format Examples:*\n` +
      `• \`${task.email} 49201842 83910492\`\n` +
      `• \`${task.email} | abcd efgh ijkl mnop\`\n` +
      `• Or simply paste your *Backup Codes / App Password* directly if you used \`${task.email}\`.\n\n` +
      `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*`
    );
  }

  return (
    `📧 *Confirm & Submit Your Created Gmail Account*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${task.taskId}\`\n` +
    `📧 *Assigned Target Gmail:* \`${task.email}\`\n` +
    `🔑 *Assigned Password:* \`${task.password}\`\n` +
    `💰 *Task Reward:* *₹${task.rewardInr.toFixed(2)}*\n\n` +
    `📝 *Please type/paste the exact Gmail address you created in chat (or tap Quick Submit below if you created \`${task.email}\`):*\n\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*`
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
    `*3️⃣ Task Type Instructions (${task.taskType})*\n` +
    (task.taskType === '2-Step Gmail'
      ? `Enable 2-Step Verification in Google Security settings, generate *Backup Codes* or an *App Password*, and copy them before signing out.\n\n`
      : `Skip phone/recovery email if prompted, accept Google Terms, and wait for the inbox to load. Do NOT enable 2FA on Standard tasks.\n\n`) +
    `*4️⃣ Sign Out & Submit for Review*\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*`
  );
}

function renderMyAccountsText(user: BotUserSchema): string {
  const total = user.accounts.approved + user.accounts.pending + user.accounts.rejected;
  const recentLines =
    user.accounts.history.length > 0
      ? user.accounts.history
          .slice(0, 6)
          .map((item, i) => {
            const st = item.status || 'APPROVED';
            const badge = st === 'APPROVED' ? '✅' : st === 'REJECTED' ? '❌' : '⏳';
            const typeTag = item.taskType === '2-Step Gmail' ? '🔐 2FA' : '📧 Std';
            return `${i + 1}. ${badge} \`${item.email}\` (${typeTag}) — *₹${item.rewardInr}* [${st}]`;
          })
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
    `🗂️ *Recent Account Submissions:*\n` +
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
    `💸 *Commission Rate:* *₹${tier.rateInr.toFixed(2)}* per verified invite\n` +
    `👨‍👩‍👧‍👦 *Total Invited Users:* \`${user.referrals.invitedCount}\`\n` +
    `💰 *Total Referral Earnings:* \`₹${user.referrals.totalCommissionInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 _Share your personal link with friends and earn rewards when they join and complete tasks!_`
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
      `🕒 *What is a verification review / hold?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `When you submit a Gmail task (*✅ Done*), it enters our *PENDING* verification queue so an administrator can verify the credentials and confirm you logged out of the device.\n\n` +
      `• *Standard Gmail Task:* Pays *₹${rates.standardTaskInr.toFixed(2)}* upon Admin approval.\n` +
      `• *2-Step Verification (2FA) Task:* Pays *₹${rates.twoFactorTaskInr.toFixed(2)}* upon Admin verification of your Backup Codes / App Password.\n` +
      `• *Mandatory Logout:* Always sign out of the Gmail account on your device immediately after creation.`,

    faq_sms:
      `💬 *How to avoid SMS confirmation?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `If Google asks for a phone number during registration, follow these proven tips:\n\n` +
      `1️⃣ *Use Mobile Gmail App or Device Settings:* Create the account via *Settings → Accounts → Add Account → Google* on Android/iOS instead of a desktop browser.\n` +
      `2️⃣ *Reset IP Address:* Toggle Airplane Mode ON for 10 seconds and turn it OFF to obtain a fresh mobile carrier IP.\n` +
      `3️⃣ *Clear Browser Data:* Always use a clean Incognito tab and wait at least 15–30 minutes between consecutive registrations.`,

    faq_unavailable:
      `🔴 *Why was my account rejected?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `An account submission will be marked *REJECTED* if:\n\n` +
      `• You remained logged in on your device (triggering device prompts during admin login).\n` +
      `• The *First Name, Last Name, Email, or Password* did not match the assigned task credentials.\n` +
      `• For 2-Step Verification tasks, valid Backup Codes or App Passwords were not provided.\n\n` +
      `⚠️ _Always copy-paste the exact credentials generated on the task screen and log out immediately._`,

    faq_avoid_block:
      `🛡️ *How can I avoid blocking my Gmail?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `To maintain a 100% approval rate and prevent Google from disabling newly created accounts:\n\n` +
      `• Never register more than *2–3 accounts per IP address* per day.\n` +
      `• Switch from Wi-Fi to Mobile Data (4G/5G) and cycle Airplane Mode between tasks.\n` +
      `• Remove the Google account from your phone settings immediately after reaching the Gmail inbox.`,

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
function renderAdminManageCustomTasksView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const active = (kv.adminTasks || []).filter((t) => Number(t.remainingSlots) > 0);
  if (active.length === 0) {
    return {
      text:
        `📋 *Manage Admin-Created Tasks (config:admin_tasks)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_No active custom tasks found in KV._\n\n` +
        `Tap *➕ Create / Add New Task* below to publish a task with your exact Gmail pattern, password, reward rate, and slot quantity!`,
      keyboard: [
        [{ text: '➕ Create / Add New Task', callback_data: 'admin_task_add' }],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
      ],
    };
  }

  const lines = active
    .slice(0, 8)
    .map(
      (t, i) =>
        `*#${i + 1} • ${t.customTaskId} (${t.taskType})*\n` +
        `├ 📧 *Target Gmail / Pattern:* \`${t.emailPattern}\`\n` +
        `├ 🔑 *Password:* \`${t.password}\`\n` +
        `├ 💰 *Reward:* *₹${Number(t.rewardInr).toFixed(2)}*\n` +
        `└ 📦 *Remaining Slots:* \`${t.remainingSlots} / ${t.totalSlots}\``
    )
    .join('\n\n');

  const kb: InlineKeyboardGrid = [
    [{ text: '➕ Create / Add New Task', callback_data: 'admin_task_add' }],
  ];
  for (const t of active.slice(0, 6)) {
    kb.push([
      {
        text: `🗑️ Delete ${t.customTaskId} (${t.emailPattern})`,
        callback_data: `admin_custom_task_del_${t.customTaskId}`,
      },
    ]);
  }
  kb.push([{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]);

  return {
    text:
      `📋 *Active Admin-Created Tasks (${active.length})*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${lines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Add a new task or delete an existing task below:_`,
    keyboard: kb,
  };
}

function renderAdminUsersListView(
  user: BotUserSchema,
  kv: GlobalKvConfig,
  page = 0
): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  syncActiveUserIntoDirectory(user, kv);
  const pageSize = 10;
  const totalUsers = kv.usersIndex.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const sliceIds = kv.usersIndex.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const kb: InlineKeyboardGrid = [];
  const rowsText: string[] = [];

  sliceIds.forEach((uid, idx) => {
    const num = safePage * pageSize + idx + 1;
    const uSummary = kv.usersDirectory[uid] || {
      userId: uid,
      firstName: 'User',
      username: 'none',
      balanceInr: 0,
      lifetimeInr: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      isBanned: false,
    };
    const statusIcon = uSummary.isBanned ? '🚫' : '🟢';
    const uname = uSummary.username && uSummary.username !== 'none' ? `@${uSummary.username}` : 'No username';
    rowsText.push(
      `*${num}.* ${statusIcon} *${uSummary.firstName}* (${uname})\n` +
        `   ├ 🆔 \`${uSummary.userId}\` • 👛 *₹${uSummary.balanceInr.toFixed(2)}*\n` +
        `   └ ✅ Approved: \`${uSummary.approved}\` | ⏳ Pending: \`${uSummary.pending}\``
    );
    kb.push([
      {
        text: `👤 #${uSummary.userId} • ${uSummary.firstName} (₹${uSummary.balanceInr.toFixed(0)} | ✅${uSummary.approved})`,
        callback_data: `admin_user_view_${uSummary.userId}`,
      },
    ]);
  });

  if (totalPages > 1) {
    const navRow: InlineButton[] = [];
    if (safePage > 0) {
      navRow.push({ text: '⬅️ Prev Page', callback_data: `admin_users_page_${safePage - 1}` });
    }
    if (safePage < totalPages - 1) {
      navRow.push({ text: 'Next Page ➡️', callback_data: `admin_users_page_${safePage + 1}` });
    }
    if (navRow.length > 0) kb.push(navRow);
  }

  kb.push([
    { text: '🔍 Search by User ID', callback_data: 'admin_inspect' },
    { text: '🔄 Refresh List', callback_data: `admin_users_page_${safePage}` },
  ]);
  kb.push([{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]);

  const bodyText =
    rowsText.length > 0
      ? rowsText.join('\n\n')
      : `_No registered users found in config:users_index._`;

  return {
    text:
      `👥 *All Registered Users (${totalUsers} Total)*\n` +
      `📄 *Page:* \`${safePage + 1} / ${totalPages}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${bodyText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Tap any user button below to open their full inspection profile:_`,
    keyboard: kb,
  };
}

function renderAdminTaskQueueView(kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const pending = kv.taskReviewQueue.filter((t) => t.status === 'PENDING');
  if (pending.length === 0) {
    return {
      text:
        `📝 *Manual Task Verification Queue (config:task_review_queue)*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *All caught up!* There are currently \`0\` pending Gmail tasks waiting for verification.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
      keyboard: [
        [
          { text: '📑 View Submissions History', callback_data: 'admin_task_history' },
          { text: '🔄 Refresh Queue', callback_data: 'admin_tasks_queue' },
        ],
        [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
      ],
    };
  }

  const itemsText = pending
    .slice(0, 5)
    .map((t, idx) => {
      const codeLine = t.twoFactorData
        ? `├ 🔐 *2FA Codes / App Pass:* \`${t.twoFactorData}\`\n`
        : '';
      return (
        `*#${idx + 1} • ${t.taskId} (${t.taskType})*\n` +
        `├ 👤 *User:* ${t.firstName} (@${t.username || 'user'}) [\`${t.userId}\`]\n` +
        `├ 📧 *Gmail:* \`${t.email}\`\n` +
        `├ 🔑 *Password:* \`${t.password}\`\n` +
        codeLine +
        `├ 💰 *Reward:* *₹${t.rewardInr.toFixed(2)}*\n` +
        `└ 🕒 *Submitted:* \`${t.submittedAt.slice(0, 19).replace('T', ' ')}\``
      );
    })
    .join('\n\n');

  const kb: InlineKeyboardGrid = pending.slice(0, 5).map((t) => [
    {
      text: `✅ Approve & Pay (${t.taskId})`,
      callback_data: `admin_task_approve_${t.taskId}`,
    },
    {
      text: `❌ Reject Task`,
      callback_data: `admin_task_reject_${t.taskId}`,
    },
  ]);

  kb.push([
    { text: '📑 Submissions History', callback_data: 'admin_task_history' },
    { text: '🔄 Refresh Queue', callback_data: 'admin_tasks_queue' },
  ]);
  kb.push([{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }]);

  return {
    text:
      `📝 *Pending Task Verification Queue (${pending.length})*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${itemsText}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Verify login credentials & confirm user logged out, then Approve or Reject below:_`,
    keyboard: kb,
  };
}

function renderAdminTaskSubmissionsHistoryView(
  user: BotUserSchema,
  kv: GlobalKvConfig
): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const totalSubmitted = kv.taskReviewQueue.length;
  const totalApproved = kv.taskReviewQueue.filter((t) => t.status === 'APPROVED').length;
  const totalPending = kv.taskReviewQueue.filter((t) => t.status === 'PENDING').length;
  const totalRejected = kv.taskReviewQueue.filter((t) => t.status === 'REJECTED').length;

  const stdCount = kv.taskReviewQueue.filter((t) => t.taskType !== '2-Step Gmail').length;
  const twoFaCount = kv.taskReviewQueue.filter((t) => t.taskType === '2-Step Gmail').length;
  const totalTaskEarningsPaid = kv.taskReviewQueue
    .filter((t) => t.status === 'APPROVED')
    .reduce((sum, t) => sum + t.rewardInr, 0);

  const recentLines =
    kv.taskReviewQueue.length > 0
      ? kv.taskReviewQueue
          .slice(0, 8)
          .map((t, idx) => {
            const badge =
              t.status === 'APPROVED' ? '✅' : t.status === 'REJECTED' ? '❌' : '⏳';
            const typeShort = t.taskType === '2-Step Gmail' ? '2FA' : 'Std';
            return (
              `${idx + 1}. ${badge} \`${t.email}\` (${typeShort} • ₹${t.rewardInr})\n` +
              `   └ 👤 User \`#${t.userId}\` • *${t.status}* • ${t.submittedAt.slice(0, 10)}`
            );
          })
          .join('\n')
      : `_No task submissions recorded in config:task_review_queue yet._`;

  return {
    text:
      `📑 *Task Submissions History & Audit Log*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *Platform-Wide Task Totals:*\n` +
      `├ 📦 *Total Submitted:* \`${totalSubmitted}\` (\`Std: ${stdCount}\` | \`2FA: ${twoFaCount}\`)\n` +
      `├ ✅ *Total Approved:* \`${totalApproved}\`\n` +
      `├ ⏳ *Currently Pending:* \`${totalPending}\`\n` +
      `├ ❌ *Total Rejected:* \`${totalRejected}\`\n` +
      `└ 💰 *Task Rewards Paid:* \`₹${totalTaskEarningsPaid.toFixed(2)}\`\n\n` +
      `🗂️ *Recent Global Submissions:*\n` +
      `${recentLines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Filter by User ID to inspect all Gmail IDs & payouts for a specific user:_`,
    keyboard: [
      [
        {
          text: `🔍 Inspect User #${user.userId} History`,
          callback_data: `admin_user_history_${user.userId}`,
        },
        { text: '🔍 Search by User ID', callback_data: 'admin_history_search_user' },
      ],
      [
        { text: '📝 Pending Queue', callback_data: 'admin_tasks_queue' },
        { text: '🔙 Admin Panel', callback_data: 'admin_home' },
      ],
    ],
  };
}

function renderAdminUserTaskAndPayoutHistoryView(targetUser: BotUserSchema): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  const historyList = targetUser.accounts.history || [];
  const totalTaskEarningsInr = historyList
    .filter((h) => h.status === 'APPROVED')
    .reduce((acc, h) => acc + h.rewardInr, 0);

  const gmailLines =
    historyList.length > 0
      ? historyList
          .slice(0, 10)
          .map((h, i) => {
            const icon =
              h.status === 'APPROVED' ? '✅' : h.status === 'REJECTED' ? '❌' : '⏳';
            const typeLabel = h.taskType === '2-Step Gmail' ? '🔐 2FA' : '📧 Std';
            const reasonNote = h.rejectReason ? ` _(Reason: ${h.rejectReason})_` : '';
            return (
              `${i + 1}. ${icon} \`${h.email}\` — *₹${h.rewardInr.toFixed(2)}* (${typeLabel})\n` +
              `   └ 📅 \`${h.date.slice(0, 10)}\` • Status: *${h.status}*${reasonNote}`
            );
          })
          .join('\n')
      : `_No Gmail accounts submitted by this user yet._`;

  const withdrawals = targetUser.withdrawals || [];
  const totalPaidUpi = withdrawals
    .filter((w) => w.status === 'COMPLETED')
    .reduce((s, w) => s + w.amountInr, 0);
  const totalPendingUpi = withdrawals
    .filter((w) => w.status === 'PROCESSING')
    .reduce((s, w) => s + w.amountInr, 0);

  const payoutLines =
    withdrawals.length > 0
      ? withdrawals
          .slice(0, 5)
          .map((w, i) => {
            const icon =
              w.status === 'COMPLETED' ? '✅' : w.status === 'REJECTED' ? '❌' : '⏳';
            return `${i + 1}. ${icon} *₹${w.amountInr.toFixed(2)}* → \`${w.upiId}\` [${w.status}] (${w.date.slice(0, 10)})`;
          })
          .join('\n')
      : `_No UPI withdrawal requests from this user._`;

  const totalSubmitted =
    targetUser.accounts.approved + targetUser.accounts.pending + targetUser.accounts.rejected;

  return {
    text:
      `📑 *User Task & Payout History Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *User:* ${targetUser.firstName} (@${targetUser.username}) [\`#${targetUser.userId}\`]\n` +
      `├ 📦 *Total Tasks Submitted:* \`${totalSubmitted}\`\n` +
      `├ ✅ *Approved:* \`${targetUser.accounts.approved}\` | ⏳ *Pending:* \`${targetUser.accounts.pending}\` | ❌ *Rejected:* \`${targetUser.accounts.rejected}\`\n` +
      `└ 💰 *Total Earnings from Tasks:* \`₹${totalTaskEarningsInr.toFixed(2)}\`\n\n` +
      `📧 *Submitted Gmail IDs (${historyList.length}):*\n` +
      `${gmailLines}\n\n` +
      `💳 *Payout History Summary (Paid: ₹${totalPaidUpi.toFixed(2)} | Pending: ₹${totalPendingUpi.toFixed(2)}):*\n` +
      `${payoutLines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`,
    keyboard: [
      [
        { text: '👤 Open User Inspector', callback_data: `admin_user_view_${targetUser.userId}` },
        { text: '🔍 Search Another User', callback_data: 'admin_history_search_user' },
      ],
      [
        { text: '🔙 Submissions History', callback_data: 'admin_task_history' },
        { text: '🛡️ Admin Panel', callback_data: 'admin_home' },
      ],
    ],
  };
}

function renderAdminAnalyticsView(user: BotUserSchema, kv: GlobalKvConfig): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  syncActiveUserIntoDirectory(user, kv);
  const totalSubmitted = kv.taskReviewQueue.length;
  const totalApproved = kv.taskReviewQueue.filter((t) => t.status === 'APPROVED').length;
  const totalPending = kv.taskReviewQueue.filter((t) => t.status === 'PENDING').length;
  const totalRejected = kv.taskReviewQueue.filter((t) => t.status === 'REJECTED').length;

  const totalPaid = kv.payoutQueue
    .filter((p) => p.status === 'COMPLETED')
    .reduce((acc, p) => acc + p.amountInr, 0);
  const pendingPayouts = kv.payoutQueue.filter((p) => p.status === 'PROCESSING');
  const totalPendingInr = pendingPayouts.reduce((acc, p) => acc + p.amountInr, 0);

  const bannedCount = Object.values(kv.usersDirectory).filter((u) => u.isBanned).length;
  const totalActiveBalances = Object.values(kv.usersDirectory).reduce(
    (acc, u) => acc + u.balanceInr,
    0
  );

  const text =
    `📊 *Real-Time Platform Analytics*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 *User Metrics:*\n` +
    `├ 🪪 *Total Registered Users:* \`${kv.usersIndex.length}\`\n` +
    `└ 🚫 *Banned Accounts:* \`${bannedCount}\`\n\n` +
    `📑 *Task Verification Ledger:*\n` +
    `├ 📦 *Total Tasks Submitted:* \`${totalSubmitted}\`\n` +
    `├ ✅ *Total Approved:* \`${totalApproved}\`\n` +
    `├ ⏳ *Pending Verification:* \`${totalPending}\`\n` +
    `└ ❌ *Total Rejected:* \`${totalRejected}\`\n\n` +
    `💰 *Financial Ledger (INR):*\n` +
    `├ 👛 *Active Wallet Liability:* \`₹${totalActiveBalances.toFixed(2)}\`\n` +
    `├ 💸 *Total Money Paid Out:* \`₹${totalPaid.toFixed(2)}\`\n` +
    `└ ⏳ *Pending UPI Queue:* \`₹${totalPendingInr.toFixed(2)}\` (\`${pendingPayouts.length}\` tx)\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🕒 _Live KV Snapshot: ${new Date().toISOString().slice(11, 19)} UTC_`;

  return {
    text,
    keyboard: [
      [
        { text: '👥 View All Users', callback_data: 'admin_users_list' },
        { text: '📑 Submissions History', callback_data: 'admin_task_history' },
      ],
      [
        { text: '🔄 Refresh Metrics', callback_data: 'admin_analytics' },
        { text: '🔙 Back to Admin Panel', callback_data: 'admin_home' },
      ],
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
      `Update platform payout rates for both task types and withdrawal thresholds in real time:\n\n` +
      `• 📧 *Standard Gmail Task (No 2FA):* \`₹${kv.rates.standardTaskInr.toFixed(2)}\` (\`$${kv.rates.standardTaskUsd.toFixed(2)}\`)\n` +
      `• 🔐 *2-Step Verification Gmail Task (With 2FA):* \`₹${kv.rates.twoFactorTaskInr.toFixed(2)}\` (\`$${kv.rates.twoFactorTaskUsd.toFixed(2)}\`)\n` +
      `• 🎯 *Min Withdrawal:* \`₹${kv.rates.minWithdrawalInr.toFixed(2)}\`\n` +
      `• 👥 *Referral Base Bonus:* \`₹${kv.rates.referralBonusInr.toFixed(2)}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Click any parameter below to enter a new INR value in chat:_`,
    keyboard: [
      [
        {
          text: `📧 Standard Gmail Rate (₹${kv.rates.standardTaskInr})`,
          callback_data: 'admin_rate_task',
        },
      ],
      [
        {
          text: `🔐 2-Step (2FA) Gmail Rate (₹${kv.rates.twoFactorTaskInr})`,
          callback_data: 'admin_rate_2fa_task',
        },
      ],
      [
        {
          text: `🎯 Min Withdrawal (₹${kv.rates.minWithdrawalInr})`,
          callback_data: 'admin_rate_min_withdraw',
        },
      ],
      [
        {
          text: `👥 Referral Bonus (₹${kv.rates.referralBonusInr})`,
          callback_data: 'admin_rate_referral',
        },
      ],
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

function renderAdminInspectUserView(
  targetUser: BotUserSchema,
  kv: GlobalKvConfig,
  requestedUserId?: string
): {
  text: string;
  keyboard: InlineKeyboardGrid;
} {
  syncActiveUserIntoDirectory(targetUser, kv);
  const uid = requestedUserId || targetUser.userId;
  const dirEntry = kv.usersDirectory[uid];

  if (uid !== targetUser.userId && dirEntry) {
    return {
      text:
        `🔍 *User Profile Inspector*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *User ID:* \`${dirEntry.userId}\`\n` +
        `👤 *Name:* ${dirEntry.firstName} (@${dirEntry.username})\n` +
        `🚦 *Account Status:* ${dirEntry.isBanned ? '🚫 *BANNED*' : '🟢 *ACTIVE*'}\n` +
        `🔄 *Current Session State:* \`IDLE\`\n\n` +
        `💰 *Wallet & Task Ledger:*\n` +
        `├ 👛 *Available Balance:* \`₹${dirEntry.balanceInr.toFixed(2)}\`\n` +
        `├ 📈 *Lifetime Earnings:* \`₹${dirEntry.lifetimeInr.toFixed(2)}\`\n` +
        `├ ✅ *Approved Tasks:* \`${dirEntry.approved}\`\n` +
        `├ ⏳ *Pending Tasks:* \`${dirEntry.pending}\`\n` +
        `└ ❌ *Rejected Tasks:* \`${dirEntry.rejected}\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👇 _Modify balance, inspect submission history, or toggle ban below:_`,
      keyboard: [
        [
          { text: '➕ Add Balance', callback_data: `admin_user_addbal_${dirEntry.userId}` },
          { text: '➖ Deduct Balance', callback_data: `admin_user_deductbal_${dirEntry.userId}` },
        ],
        [
          {
            text: '📑 User Task & Payout History',
            callback_data: `admin_user_history_${dirEntry.userId}`,
          },
        ],
        [
          {
            text: dirEntry.isBanned ? '🟢 Unban User' : '🚫 Ban User',
            callback_data: `admin_user_toggleban_${dirEntry.userId}`,
          },
          { text: '🔄 Refresh Profile', callback_data: `admin_user_view_${dirEntry.userId}` },
        ],
        [
          { text: '👥 View All Users', callback_data: 'admin_users_list' },
          { text: '🔙 Admin Panel', callback_data: 'admin_home' },
        ],
      ],
    };
  }

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
      `├ ⏳ *Pending Tasks:* \`${targetUser.accounts.pending}\`\n` +
      `├ ❌ *Rejected Tasks:* \`${targetUser.accounts.rejected}\`\n` +
      `├ 👥 *Referrals Invited:* \`${targetUser.referrals.invitedCount}\`\n` +
      `└ 🏦 *Last UPI Used:* \`${lastUpi}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Modify balance, inspect submission history, or toggle ban below:_`,
    keyboard: [
      [
        { text: '➕ Add Balance', callback_data: `admin_user_addbal_${targetUser.userId}` },
        { text: '➖ Deduct Balance', callback_data: `admin_user_deductbal_${targetUser.userId}` },
      ],
      [
        {
          text: '📑 User Task & Payout History',
          callback_data: `admin_user_history_${targetUser.userId}`,
        },
      ],
      [
        {
          text: targetUser.isBanned ? '🟢 Unban User' : '🚫 Ban User',
          callback_data: `admin_user_toggleban_${targetUser.userId}`,
        },
        { text: '🔄 Refresh Profile', callback_data: `admin_user_view_${targetUser.userId}` },
      ],
      [
        { text: '👥 View All Users', callback_data: 'admin_users_list' },
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
// HELPER FOR FINALIZING USER TASK SUBMISSION IN SIMULATOR
// ============================================================================
function finalizeUserTaskSubmissionInSim(
  nextUser: BotUserSchema,
  nextKv: GlobalKvConfig,
  submittedEmail: string,
  twoFactorData: string | null,
  editInPlace: boolean
): {
  updatedUser: BotUserSchema;
  updatedKv: GlobalKvConfig;
  result: CallbackExecutionResult;
} {
  const activeTask = nextUser.currentTask || generateNewTask('Normal Gmail', nextKv.rates);
  const submittedAt = new Date().toISOString();

  // Decrement remainingSlots if this was an Admin-created custom task
  if (activeTask.customTaskId) {
    const idx = nextKv.adminTasks.findIndex((t) => t.customTaskId === activeTask.customTaskId);
    if (idx !== -1 && nextKv.adminTasks[idx].remainingSlots > 0) {
      nextKv.adminTasks[idx].remainingSlots -= 1;
    }
  }

  const queueEntry: TaskReviewQueueItem = {
    taskId: activeTask.taskId,
    customTaskId: activeTask.customTaskId || null,
    userId: nextUser.userId,
    username: nextUser.username,
    firstName: nextUser.firstName,
    email: submittedEmail,
    password: activeTask.password,
    birthYear: activeTask.birthYear,
    taskType: activeTask.taskType,
    twoFactorData,
    rewardInr: activeTask.rewardInr,
    status: 'PENDING',
    submittedAt,
  };

  nextUser.accounts.pending += 1;
  nextUser.accounts.history.unshift({
    taskId: activeTask.taskId,
    customTaskId: activeTask.customTaskId || null,
    email: submittedEmail,
    password: activeTask.password,
    taskType: activeTask.taskType,
    twoFactorData,
    rewardInr: activeTask.rewardInr,
    status: 'PENDING',
    date: submittedAt,
  });
  nextUser.currentTask = null;
  nextUser.state = 'IDLE';

  nextKv.taskReviewQueue.unshift(queueEntry);
  syncActiveUserIntoDirectory(nextUser, nextKv);

  const twoFaLine = twoFactorData ? `🔐 *Submitted 2FA Secret:* \`${twoFactorData}\`\n` : '';
  const pendingConfirmationText =
    `⏳ *Task Submitted for Admin Verification!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${queueEntry.taskId}\`\n` +
    `🏷️ *Task Type:* *${queueEntry.taskType}*\n` +
    `📧 *Submitted Gmail:* \`${queueEntry.email}\`\n` +
    `🔑 *Password:* \`${queueEntry.password}\`\n` +
    twoFaLine +
    `💰 *Reward on Approval:* *+₹${queueEntry.rewardInr.toFixed(2)}*\n` +
    `🚦 *Current Status:* \`PENDING REVIEW\`\n` +
    `⏳ *Total Pending Accounts:* \`${nextUser.accounts.pending}\`\n\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔔 _An instant notification has been sent to the Admin. You will receive a DM alert once approved & paid!_`;

  const nextKb: InlineKeyboardGrid = [
    [
      { text: '📩 Register Another Account', callback_data: 'menu_register' },
      { text: '📑 My Accounts', callback_data: 'menu_accounts' },
    ],
    [{ text: '🔙 Back to Main Menu', callback_data: 'menu_home' }],
  ];

  return {
    updatedUser: nextUser,
    updatedKv: nextKv,
    result: {
      messageText: pendingConfirmationText,
      keyboard: nextKb,
      editInPlace,
      toast: {
        text: `⏳ Task (${queueEntry.taskId}) submitted to config:task_review_queue!\n⚠️ Make sure you have LOGGED OUT of ${queueEntry.email} from your phone!`,
        showAlert: true,
      },
      activeScreenLabel: 'Task Submitted (PENDING Review)',
    },
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
  if (!nextKv.adminTasks) nextKv.adminTasks = [];
  if (!nextKv.usersDirectory) nextKv.usersDirectory = {};
  syncActiveUserIntoDirectory(nextUser, nextKv);
  nextUser.updatedAt = new Date().toISOString();

  // 1. Access control for admin_* callbacks
  if (callbackData.startsWith('admin_')) {
    if (!simContext.isAdminRole) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderHomeText(nextUser),
          keyboard: buildMainMenuKeyboard(false),
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
          keyboard: buildMainMenuKeyboard(false),
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
        keyboard: buildAdminDashboardKeyboard(true),
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
        keyboard: buildMainMenuKeyboard(simContext.isAdminRole),
        editInPlace: true,
        toast: { text: 'Admin panel closed.', showAlert: false },
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  // --------------------------------------------------------------------------
  // FEATURE 1: MANUAL "ADD TASK" WIZARD & MANAGE CUSTOM TASKS
  // --------------------------------------------------------------------------
  if (callbackData === 'admin_task_add') {
    nextUser.state = 'IDLE';
    nextUser.adminContext = {};
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➕ *Create / Add New Custom Task (Step 1 of 5)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Select the *Task Type* you want users to register:\n\n` +
          `1️⃣ *Standard Gmail (Without 2FA)* — Default Rate: \`₹${nextKv.rates.standardTaskInr.toFixed(2)}\`\n` +
          `2️⃣ *2-Step Verification Gmail (With 2FA)* — Default Rate: \`₹${nextKv.rates.twoFactorTaskInr.toFixed(2)}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👇 _Choose a task type below:_`,
        keyboard: [
          [
            {
              text: `📧 Standard Gmail (₹${nextKv.rates.standardTaskInr})`,
              callback_data: 'admin_newtask_type_standard',
            },
          ],
          [
            {
              text: `🔐 2-Step Verification Gmail (2FA) (₹${nextKv.rates.twoFactorTaskInr})`,
              callback_data: 'admin_newtask_type_2fa',
            },
          ],
          [
            { text: '📋 Manage Existing Tasks', callback_data: 'admin_tasks_manage' },
            { text: '🔙 Admin Panel', callback_data: 'admin_home' },
          ],
        ],
        editInPlace: true,
        activeScreenLabel: 'Admin → Add New Task (Step 1/5)',
      },
    };
  }

  if (
    callbackData === 'admin_newtask_type_standard' ||
    callbackData === 'admin_newtask_type_2fa'
  ) {
    const selectedType: TaskTypeLabel =
      callbackData === 'admin_newtask_type_2fa' ? '2-Step Gmail' : 'Normal Gmail';
    nextUser.state = 'AWAITING_NEWTASK_EMAIL';
    nextUser.adminContext = { newTaskType: selectedType };

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➕ *Create / Add New Custom Task (Step 2 of 5)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ *Selected Type:* *${selectedType}*\n\n` +
          `📝 *Send the Target Gmail Address OR Username Pattern in chat:*\n\n` +
          `*Examples:*\n` +
          `• Exact Gmail: \`roshan.work2026@gmail.com\`\n` +
          `• Pattern with random digits (\`#\`): \`customname####@gmail.com\` _(auto-replaces \`#\` with random digits for each user)_`,
        keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Add New Task (Step 2/5: Email Pattern)',
      },
    };
  }

  if (callbackData === 'admin_newtask_skip_reward') {
    const is2FA = nextUser.adminContext?.newTaskType === '2-Step Gmail';
    const defaultReward = is2FA ? nextKv.rates.twoFactorTaskInr : nextKv.rates.standardTaskInr;
    nextUser.state = 'AWAITING_NEWTASK_SLOTS';
    nextUser.adminContext = {
      ...nextUser.adminContext,
      newTaskRewardInr: defaultReward,
    };

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `➕ *Create / Add New Custom Task (Step 5 of 5)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ *Type:* *${nextUser.adminContext.newTaskType}*\n` +
          `📧 *Target Gmail / Pattern:* \`${nextUser.adminContext.newTaskEmailPattern}\`\n` +
          `🔑 *Specified Password:* \`${nextUser.adminContext.newTaskPassword}\`\n` +
          `💰 *Reward Price:* *₹${defaultReward.toFixed(2)}* _(Default Rate)_\n\n` +
          `📝 *Send the Target Quantity / Slots available (e.g. \`10\` accounts needed):*`,
        keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Add New Task (Step 5/5: Slots)',
      },
    };
  }

  if (callbackData === 'admin_tasks_manage') {
    nextUser.state = 'IDLE';
    nextUser.adminContext = {};
    const view = renderAdminManageCustomTasksView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Manage Custom Tasks',
      },
    };
  }

  if (callbackData.startsWith('admin_custom_task_del_')) {
    const customTaskId = callbackData.replace('admin_custom_task_del_', '');
    nextKv.adminTasks = nextKv.adminTasks.filter((t) => t.customTaskId !== customTaskId);
    const view = renderAdminManageCustomTasksView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: { text: `🗑️ Custom Task ${customTaskId} deleted!`, showAlert: true },
        activeScreenLabel: 'Admin → Manage Custom Tasks',
      },
    };
  }

  // --------------------------------------------------------------------------
  // FEATURE 2: VIEW ALL REGISTERED USERS LIST (PAGINATED)
  // --------------------------------------------------------------------------
  if (callbackData === 'admin_users_list' || callbackData.startsWith('admin_users_page_')) {
    const page = callbackData.startsWith('admin_users_page_')
      ? parseInt(callbackData.replace('admin_users_page_', ''), 10) || 0
      : 0;
    nextUser.state = 'IDLE';
    const view = renderAdminUsersListView(nextUser, nextKv, page);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: `Admin → View All Users (Page ${page + 1})`,
      },
    };
  }

  // --------------------------------------------------------------------------
  // FEATURE 3: FACTORY RESET / WIPE PLATFORM DATA TO 0 (2-STEP CONFIRMATION)
  // --------------------------------------------------------------------------
  if (callbackData === 'admin_system_reset') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `⚠️ *DANGER ZONE: Factory Reset / Wipe All Platform Data*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `*Are you sure you want to reset all balances, users, tasks, and payout queues to 0?*\n\n` +
          `🧹 *What will be wiped to 0:*\n` +
          `• All registered users' Wallet Balances, Lifetime Earnings, Approved/Pending/Rejected counts, Referrals, and Withdrawals will be reset to \`0\`.\n` +
          `• Pending & Historical Task Review Queue (\`config:task_review_queue\`) cleared to \`[]\`.\n` +
          `• Pending & Historical UPI Payout Queue (\`config:payout_queue\`) cleared to \`[]\`.\n` +
          `• Active Admin Custom Tasks (\`config:admin_tasks\`) cleared to \`[]\`.\n\n` +
          `🛡️ *What will be preserved:*\n` +
          `• Super Admin (\`env.ADMIN_CHAT_ID\`) & Secondary Admins (\`config:admins\`)\n` +
          `• Force-Join Channels (\`config:channels\`) & Reward Rates (\`config:rates\`)\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👇 _Confirm below only if you want to permanently wipe all platform stats to 0:_`,
        keyboard: [
          [
            {
              text: '🚨 YES, WIPE & RESET ALL DATA TO 0',
              callback_data: 'admin_system_reset_confirm',
            },
          ],
          [{ text: '🔙 No, Cancel & Return to Admin Panel', callback_data: 'admin_home' }],
        ],
        editInPlace: true,
        toast: {
          text: '⚠️ Are you sure you want to reset all balances, users, tasks, and payout queues to 0?',
          showAlert: true,
        },
        activeScreenLabel: 'Admin → Factory Reset Confirmation',
      },
    };
  }

  if (callbackData === 'admin_system_reset_confirm') {
    // Reset active user
    nextUser.balanceInr = 0;
    nextUser.lifetimeInr = 0;
    nextUser.isBanned = false;
    nextUser.state = 'IDLE';
    nextUser.adminContext = {};
    nextUser.currentTask = null;
    nextUser.accounts = { approved: 0, pending: 0, rejected: 0, history: [] };
    nextUser.referrals = {
      referredBy: null,
      referralBonusPaid: false,
      invitedUsers: [],
      invitedCount: 0,
      totalCommissionInr: 0,
    };
    nextUser.rewards = { streakDays: 0, lastCheckInDate: null, claimedMilestones: [] };
    nextUser.withdrawals = [];

    // Reset all users in usersDirectory
    const resetUsersCount = nextKv.usersIndex.length;
    for (const uid of Object.keys(nextKv.usersDirectory)) {
      nextKv.usersDirectory[uid] = {
        ...nextKv.usersDirectory[uid],
        balanceInr: 0,
        lifetimeInr: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        isBanned: false,
      };
    }

    // Clear global queues and admin tasks
    nextKv.taskReviewQueue = [];
    nextKv.payoutQueue = [];
    nextKv.adminTasks = [];

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `✅ *Platform Factory Reset Complete!*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• 👥 *Users Reset to ₹0 & 0 Tasks:* \`${resetUsersCount} User(s)\`\n` +
          `• 📝 *Task Verification Queue:* \`0 (Cleared)\`\n` +
          `• 💳 *UPI Payout Queue:* \`0 (Cleared)\`\n` +
          `• 📋 *Custom Admin Tasks:* \`0 (Cleared)\`\n` +
          `• 🛡️ *Admin & Force-Join Config:* \`Preserved Intact\`\n\n` +
          renderAdminDashboardText(nextKv),
        keyboard: buildAdminDashboardKeyboard(true),
        editInPlace: true,
        toast: {
          text: `✅ Factory Reset Complete! Wiped ${resetUsersCount} user record(s) and cleared all task & payout queues to 0.`,
          showAlert: true,
        },
        activeScreenLabel: 'Admin Panel (Post-Factory Reset)',
      },
    };
  }

  if (callbackData === 'admin_tasks_queue') {
    nextUser.state = 'IDLE';
    const view = renderAdminTaskQueueView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Task Review Queue',
      },
    };
  }

  if (callbackData.startsWith('admin_task_approve_')) {
    const taskId = callbackData.replace('admin_task_approve_', '');
    const tItem = nextKv.taskReviewQueue.find((t) => t.taskId === taskId);
    if (tItem && tItem.status === 'PENDING') {
      tItem.status = 'APPROVED';
      tItem.reviewedAt = new Date().toISOString();
      nextUser.balanceInr += tItem.rewardInr;
      nextUser.lifetimeInr += tItem.rewardInr;
      nextUser.accounts.pending = Math.max(0, nextUser.accounts.pending - 1);
      nextUser.accounts.approved += 1;
      const uHist = nextUser.accounts.history.find((h) => h.taskId === taskId);
      if (uHist) {
        uHist.status = 'APPROVED';
      } else {
        nextUser.accounts.history.unshift({
          taskId: tItem.taskId,
          customTaskId: tItem.customTaskId,
          email: tItem.email,
          password: tItem.password,
          taskType: tItem.taskType,
          twoFactorData: tItem.twoFactorData,
          rewardInr: tItem.rewardInr,
          status: 'APPROVED',
          date: tItem.submittedAt,
        });
      }
      syncActiveUserIntoDirectory(nextUser, nextKv);
    }
    const view = renderAdminTaskQueueView(nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: `✅ Task ${taskId} Approved & Paid! +₹${tItem ? tItem.rewardInr.toFixed(2) : '15.00'} credited to user wallet & DM sent.`,
          showAlert: true,
        },
        activeScreenLabel: 'Admin → Task Review Queue',
      },
    };
  }

  if (callbackData.startsWith('admin_task_reject_')) {
    const taskId = callbackData.replace('admin_task_reject_', '');
    const tItem = nextKv.taskReviewQueue.find(
      (t) => t.taskId === taskId && t.status === 'PENDING'
    );
    if (!tItem) {
      const view = renderAdminTaskQueueView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: view.text,
          keyboard: view.keyboard,
          editInPlace: true,
          toast: { text: '⚠️ Task already processed.', showAlert: true },
          activeScreenLabel: 'Admin → Task Review Queue',
        },
      };
    }

    nextUser.state = 'AWAITING_TASK_REJECT_REASON';
    nextUser.adminContext = { targetTaskId: taskId };

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `❌ *Reject Gmail Task Submission*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 *Task ID:* \`${tItem.taskId}\`\n` +
          `👤 *User:* ${tItem.firstName} (\`#${tItem.userId}\`)\n` +
          `📧 *Email:* \`${tItem.email}\`\n` +
          `🏷️ *Type:* *${tItem.taskType}*\n\n` +
          `📝 *Please type and send the rejection reason in chat:*\n` +
          `_(e.g. "User remained logged in on device" or "Account not created / wrong password")_`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_tasks_queue' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Reject Task Reason',
      },
    };
  }

  if (callbackData === 'admin_task_history') {
    nextUser.state = 'IDLE';
    const view = renderAdminTaskSubmissionsHistoryView(nextUser, nextKv);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: 'Admin → Task Submissions History',
      },
    };
  }

  if (callbackData === 'admin_history_search_user') {
    nextUser.state = 'AWAITING_HISTORY_USER_ID';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `🔍 *Filter Task & Payout History by User ID*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 *Send the numerical Telegram User ID in chat to view their complete list of submitted Gmail IDs, statuses, task earnings, and UPI payout history:*\n` +
          `_(Tip: Send \`${nextUser.userId}\` or click the quick button below)_`,
        keyboard: [
          [
            {
              text: `📑 View User #${nextUser.userId} History`,
              callback_data: `admin_user_history_${nextUser.userId}`,
            },
          ],
          [{ text: '🚫 Cancel Admin Input', callback_data: 'admin_task_history' }],
        ],
        editInPlace: true,
        activeScreenLabel: 'Admin → Search User History',
      },
    };
  }

  if (callbackData.startsWith('admin_user_history_')) {
    nextUser.state = 'IDLE';
    const view = renderAdminUserTaskAndPayoutHistoryView(nextUser);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: `Admin → User #${nextUser.userId} History`,
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
          `📧 *Update Standard Gmail Task Rate (Without 2FA)*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Current Rate: \`₹${nextKv.rates.standardTaskInr.toFixed(2)}\`\n\n` +
          `📝 *Send the new Standard Gmail Task Reward amount (in INR) in chat:*`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Set Standard Task Rate',
      },
    };
  }

  if (callbackData === 'admin_rate_2fa_task') {
    nextUser.state = 'AWAITING_RATE_2FA_TASK';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText:
          `🔐 *Update 2-Step Verification (2FA) Gmail Task Rate*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Current 2FA Rate: \`₹${nextKv.rates.twoFactorTaskInr.toFixed(2)}\`\n\n` +
          `📝 *Send the new 2-Step Verification Gmail Task Reward amount (in INR) in chat:*`,
        keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
        editInPlace: true,
        activeScreenLabel: 'Admin → Set 2FA Task Rate',
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
          text: `🗑️ Channel ${removed ? removed.id : ''} removed from config:channels!`,
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
          `_(Tip: Send \`${nextUser.userId}\` or browse all users via View All Users)_`,
        keyboard: [
          [
            {
              text: `🔍 Inspect Active User (#${nextUser.userId})`,
              callback_data: `admin_user_view_${nextUser.userId}`,
            },
            {
              text: '👥 View All Users',
              callback_data: 'admin_users_list',
            },
          ],
          [{ text: '🚫 Cancel Admin Input', callback_data: 'admin_home' }],
        ],
        editInPlace: true,
        activeScreenLabel: 'Admin → Inspect User Search',
      },
    };
  }

  if (callbackData.startsWith('admin_user_view_')) {
    const requestedId = callbackData.replace('admin_user_view_', '');
    nextUser.state = 'IDLE';
    const view = renderAdminInspectUserView(nextUser, nextKv, requestedId);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        activeScreenLabel: `Admin → Inspect User #${requestedId}`,
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
    const targetId = callbackData.replace('admin_user_toggleban_', '');
    let nowBanned = false;
    if (targetId === nextUser.userId) {
      nextUser.isBanned = !nextUser.isBanned;
      nowBanned = nextUser.isBanned;
      syncActiveUserIntoDirectory(nextUser, nextKv);
    } else if (nextKv.usersDirectory[targetId]) {
      nextKv.usersDirectory[targetId].isBanned = !nextKv.usersDirectory[targetId].isBanned;
      nowBanned = nextKv.usersDirectory[targetId].isBanned;
    }
    const view = renderAdminInspectUserView(nextUser, nextKv, targetId);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: view.text,
        keyboard: view.keyboard,
        editInPlace: true,
        toast: {
          text: nowBanned
            ? `🚫 User #${targetId} has been BANNED.`
            : `🟢 User #${targetId} has been UNBANNED.`,
          showAlert: true,
        },
        activeScreenLabel: `Admin → Inspect User #${targetId}`,
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
  // STANDARD USER CALLBACKS (WITH ADMIN CUSTOM TASKS & MANUAL REVIEW QUEUE)
  // ==========================================================================
  if (callbackData === 'menu_home') {
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(simContext.isAdminRole),
        editInPlace: true,
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  if (callbackData === 'menu_register') {
    nextUser.state = 'IDLE';
    if (nextUser.currentTask) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderRegisterTaskText(nextUser.currentTask),
          keyboard: buildTaskKeyboard(nextUser.currentTask),
          editInPlace: true,
          activeScreenLabel: `Register Account (${nextUser.currentTask.taskType})`,
        },
      };
    }

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderTaskTypeSelectText(nextKv.rates, nextKv.adminTasks),
        keyboard: buildTaskTypeSelectorKeyboard(nextKv.rates, nextKv.adminTasks),
        editInPlace: true,
        activeScreenLabel: 'Select Task (Admin Tasks & Categories)',
      },
    };
  }

  if (callbackData === 'task_change_type') {
    nextUser.currentTask = null;
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderTaskTypeSelectText(nextKv.rates, nextKv.adminTasks),
        keyboard: buildTaskTypeSelectorKeyboard(nextKv.rates, nextKv.adminTasks),
        editInPlace: true,
        activeScreenLabel: 'Select Task (Admin Tasks & Categories)',
      },
    };
  }

  if (callbackData.startsWith('claim_admin_task_')) {
    const customTaskId = callbackData.replace('claim_admin_task_', '');
    const found = nextKv.adminTasks.find(
      (t) => t.customTaskId === customTaskId && Number(t.remainingSlots) > 0
    );
    if (!found) {
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderTaskTypeSelectText(nextKv.rates, nextKv.adminTasks),
          keyboard: buildTaskTypeSelectorKeyboard(nextKv.rates, nextKv.adminTasks),
          editInPlace: true,
          toast: {
            text: '⚠️ Sorry, all slots for this Admin task have been claimed!',
            showAlert: true,
          },
          activeScreenLabel: 'Select Task',
        },
      };
    }

    nextUser.state = 'IDLE';
    nextUser.currentTask = buildTaskFromAdminSlot(found);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRegisterTaskText(nextUser.currentTask),
        keyboard: buildTaskKeyboard(nextUser.currentTask),
        editInPlace: true,
        toast: {
          text: `🎯 Admin Task (${found.customTaskId}) assigned! Use the exact Gmail & Password shown.`,
          showAlert: false,
        },
        activeScreenLabel: `Admin Task (${found.customTaskId})`,
      },
    };
  }

  if (callbackData === 'register_type_standard') {
    nextUser.state = 'IDLE';
    const matchingAdminTask = nextKv.adminTasks.find(
      (t) => t.taskType === 'Normal Gmail' && Number(t.remainingSlots) > 0
    );
    nextUser.currentTask = matchingAdminTask
      ? buildTaskFromAdminSlot(matchingAdminTask)
      : generateNewTask('Normal Gmail', nextKv.rates);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRegisterTaskText(nextUser.currentTask),
        keyboard: buildTaskKeyboard(nextUser.currentTask),
        editInPlace: true,
        toast: { text: '📧 Standard Gmail Task generated!', showAlert: false },
        activeScreenLabel: 'Register Standard Gmail',
      },
    };
  }

  if (callbackData === 'register_type_2fa') {
    nextUser.state = 'IDLE';
    const matchingAdminTask = nextKv.adminTasks.find(
      (t) => t.taskType === '2-Step Gmail' && Number(t.remainingSlots) > 0
    );
    nextUser.currentTask = matchingAdminTask
      ? buildTaskFromAdminSlot(matchingAdminTask)
      : generateNewTask('2-Step Gmail', nextKv.rates);
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRegisterTaskText(nextUser.currentTask),
        keyboard: buildTaskKeyboard(nextUser.currentTask),
        editInPlace: true,
        toast: { text: '🔐 2-Step Verification Gmail Task generated!', showAlert: false },
        activeScreenLabel: 'Register 2-Step (2FA) Gmail',
      },
    };
  }

  if (callbackData === 'task_resume') {
    nextUser.state = 'IDLE';
    if (!nextUser.currentTask) {
      nextUser.currentTask = generateNewTask('Normal Gmail', nextKv.rates);
    }
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderRegisterTaskText(nextUser.currentTask),
        keyboard: buildTaskKeyboard(nextUser.currentTask),
        editInPlace: true,
        activeScreenLabel: `Register Account (${nextUser.currentTask.taskType})`,
      },
    };
  }

  if (callbackData === 'task_done') {
    const activeTask = nextUser.currentTask || generateNewTask('Normal Gmail', nextKv.rates);
    nextUser.currentTask = activeTask;
    nextUser.state = 'AWAITING_USER_SUBMIT_GMAIL';

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderAwaitingUserSubmitGmailText(activeTask),
        keyboard: buildAwaitingUserSubmitGmailKeyboard(activeTask),
        editInPlace: true,
        toast: {
          text:
            activeTask.taskType === '2-Step Gmail'
              ? '🔐 Please send the Gmail address you created + 2FA Backup Codes / App Password in chat.'
              : '📧 Please send the exact Gmail address you created (or tap Quick Submit).',
          showAlert: false,
        },
        activeScreenLabel: 'Awaiting User Gmail / 2FA Submission',
      },
    };
  }

  if (callbackData === 'task_quick_submit_assigned') {
    const activeTask = nextUser.currentTask || generateNewTask('Normal Gmail', nextKv.rates);
    if (activeTask.taskType === '2-Step Gmail') {
      nextUser.state = 'AWAITING_USER_SUBMIT_GMAIL';
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: renderAwaitingUserSubmitGmailText(activeTask),
          keyboard: buildAwaitingUserSubmitGmailKeyboard(activeTask),
          editInPlace: true,
          toast: {
            text: '🔐 For 2-Step Verification tasks, please type your Backup Codes or App Password in chat!',
            showAlert: true,
          },
          activeScreenLabel: 'Awaiting 2FA Backup Codes / App Pass',
        },
      };
    }

    return finalizeUserTaskSubmissionInSim(nextUser, nextKv, activeTask.email, null, true);
  }

  if (callbackData === 'task_cancel') {
    nextUser.currentTask = null;
    nextUser.state = 'IDLE';
    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(simContext.isAdminRole),
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
      nextUser.currentTask = generateNewTask('Normal Gmail', nextKv.rates);
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
          text: `📥 Export Ready: accounts_${nextUser.userId}_report.csv (${nextUser.accounts.approved} approved, ${nextUser.accounts.pending} pending) generated!`,
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
    syncActiveUserIntoDirectory(nextUser, nextKv);

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
            text: `🔒 Locked! You need ${remaining} more approved account(s) to unlock the ₹${milestone.bonusInr} bonus.`,
            showAlert: true,
          },
          activeScreenLabel: 'Account Milestones',
        },
      };
    }

    nextUser.rewards.claimedMilestones.push(milestone.id);
    nextUser.balanceInr += milestone.bonusInr;
    nextUser.lifetimeInr += milestone.bonusInr;
    syncActiveUserIntoDirectory(nextUser, nextKv);

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
      keyboard: buildMainMenuKeyboard(simContext.isAdminRole),
      editInPlace: true,
      activeScreenLabel: 'Home Dashboard (/start)',
    },
  };
}

// ============================================================================
// TEXT INPUT DISPATCHER (COMMANDS, ADMIN WIZARD INPUTS, GMAIL/2FA & UPI)
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
  if (!nextKv.adminTasks) nextKv.adminTasks = [];
  if (!nextKv.usersDirectory) nextKv.usersDirectory = {};
  syncActiveUserIntoDirectory(nextUser, nextKv);
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
        keyboard: buildAdminDashboardKeyboard(true),
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
      nextUser.referrals.referredBy = refId || '892341022';
      nextUser.referrals.referralBonusPaid = false;
      toast = {
        text: `🔗 Referral Deep-Link Linked (ref_${refId})!\nReferrer will receive commission once your first Gmail task is approved by Admin.`,
        showAlert: true,
      };
    }

    return {
      updatedUser: nextUser,
      updatedKv: nextKv,
      result: {
        messageText: renderHomeText(nextUser),
        keyboard: buildMainMenuKeyboard(simContext.isAdminRole),
        editInPlace: false,
        toast,
        activeScreenLabel: 'Home Dashboard (/start)',
      },
    };
  }

  // 4. Admin Stateful Text Inputs (including 5-step Add New Task wizard)
  if (
    simContext.isAdminRole &&
    nextUser.state.startsWith('AWAITING_') &&
    nextUser.state !== 'AWAITING_UPI' &&
    nextUser.state !== 'AWAITING_2FA_CODES' &&
    nextUser.state !== 'AWAITING_USER_SUBMIT_GMAIL'
  ) {
    const state = nextUser.state;

    // Step 2 of 5: Target Gmail / Pattern
    if (state === 'AWAITING_NEWTASK_EMAIL') {
      let emailPattern = text.split(/\s+/)[0];
      if (!emailPattern || emailPattern.length < 3) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please enter a valid Gmail address or pattern (e.g. \`roshan.work2026@gmail.com\` or \`customname####@gmail.com\`).`,
            keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid Email Pattern',
          },
        };
      }
      if (!emailPattern.includes('@')) {
        emailPattern = `${emailPattern}@gmail.com`;
      }

      nextUser.state = 'AWAITING_NEWTASK_PASSWORD';
      nextUser.adminContext = {
        ...nextUser.adminContext,
        newTaskEmailPattern: emailPattern,
      };

      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `➕ *Create / Add New Custom Task (Step 3 of 5)*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ *Type:* *${nextUser.adminContext.newTaskType}*\n` +
            `📧 *Target Gmail / Pattern:* \`${emailPattern}\`\n\n` +
            `🔑 *Send the Specific Password users must set for this Gmail account:*\n` +
            `_(e.g. \`SecurePass@2026\`)_`,
          keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
          editInPlace: false,
          activeScreenLabel: 'Admin → Add New Task (Step 3/5: Password)',
        },
      };
    }

    // Step 3 of 5: Specific Password
    if (state === 'AWAITING_NEWTASK_PASSWORD') {
      if (!text || text.length < 4) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Password must be at least 4 characters. Please send the desired password (e.g. \`SecurePass@2026\`).`,
            keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid Password',
          },
        };
      }

      const is2FA = nextUser.adminContext?.newTaskType === '2-Step Gmail';
      const defaultRate = is2FA ? nextKv.rates.twoFactorTaskInr : nextKv.rates.standardTaskInr;

      nextUser.state = 'AWAITING_NEWTASK_REWARD';
      nextUser.adminContext = {
        ...nextUser.adminContext,
        newTaskPassword: text,
      };

      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `➕ *Create / Add New Custom Task (Step 4 of 5)*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ *Type:* *${nextUser.adminContext.newTaskType}*\n` +
            `📧 *Target Gmail / Pattern:* \`${nextUser.adminContext.newTaskEmailPattern}\`\n` +
            `🔑 *Specified Password:* \`${text}\`\n\n` +
            `💰 *Send the Reward Price (in INR) for this task, OR tap the button below to use the default rate (₹${defaultRate.toFixed(2)}):*`,
          keyboard: [
            [
              {
                text: `⏭️ Skip (Use Default ₹${defaultRate})`,
                callback_data: 'admin_newtask_skip_reward',
              },
            ],
            [{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }],
          ],
          editInPlace: false,
          activeScreenLabel: 'Admin → Add New Task (Step 4/5: Reward Price)',
        },
      };
    }

    // Step 4 of 5: Reward Price
    if (state === 'AWAITING_NEWTASK_REWARD') {
      const is2FA = nextUser.adminContext?.newTaskType === '2-Step Gmail';
      const defaultRate = is2FA ? nextKv.rates.twoFactorTaskInr : nextKv.rates.standardTaskInr;
      const parsed =
        text.toLowerCase() === 'skip' ? defaultRate : parseFloat(text);

      if (isNaN(parsed) || parsed <= 0) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please send a valid positive INR reward amount (e.g. \`20\`) or tap Skip.`,
            keyboard: [
              [
                {
                  text: `⏭️ Skip (Use Default ₹${defaultRate})`,
                  callback_data: 'admin_newtask_skip_reward',
                },
              ],
              [{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }],
            ],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid Reward Input',
          },
        };
      }

      nextUser.state = 'AWAITING_NEWTASK_SLOTS';
      nextUser.adminContext = {
        ...nextUser.adminContext,
        newTaskRewardInr: parsed,
      };

      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `➕ *Create / Add New Custom Task (Step 5 of 5)*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ *Type:* *${nextUser.adminContext.newTaskType}*\n` +
            `📧 *Target Gmail / Pattern:* \`${nextUser.adminContext.newTaskEmailPattern}\`\n` +
            `🔑 *Specified Password:* \`${nextUser.adminContext.newTaskPassword}\`\n` +
            `💰 *Reward Price:* *₹${parsed.toFixed(2)}*\n\n` +
            `📦 *Send the Target Quantity / Slots available (e.g. \`10\` accounts needed):*`,
          keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
          editInPlace: false,
          activeScreenLabel: 'Admin → Add New Task (Step 5/5: Slots)',
        },
      };
    }

    // Step 5 of 5: Target Quantity / Slots
    if (state === 'AWAITING_NEWTASK_SLOTS') {
      const slots = parseInt(text.replace(/\D/g, ''), 10);
      if (isNaN(slots) || slots <= 0 || slots > 10000) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please send a valid slot quantity between \`1\` and \`10000\` (e.g. \`10\`).`,
            keyboard: [[{ text: '🚫 Cancel Task Creation', callback_data: 'admin_home' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid Slot Quantity',
          },
        };
      }

      const ctxData = nextUser.adminContext;
      const rewardInr = Number(ctxData.newTaskRewardInr || 15);
      const newTask: AdminCustomTaskItem = {
        customTaskId: `CT-${randomInt(1000, 9999)}`,
        taskType: ctxData.newTaskType || 'Normal Gmail',
        emailPattern: ctxData.newTaskEmailPattern || 'custom.work####@gmail.com',
        password: ctxData.newTaskPassword || 'SecurePass@2026',
        rewardInr,
        rewardUsd: Number((rewardInr / 75).toFixed(2)),
        totalSlots: slots,
        remainingSlots: slots,
        createdBy: nextUser.userId,
        createdAt: new Date().toISOString(),
      };

      nextKv.adminTasks.unshift(newTask);
      nextUser.state = 'IDLE';
      nextUser.adminContext = {};

      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `✅ *New Custom Admin Task Published to KV (config:admin_tasks)!*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 *Custom Task ID:* \`${newTask.customTaskId}\`\n` +
            `🏷️ *Task Type:* *${newTask.taskType}*\n` +
            `📧 *Target Gmail / Pattern:* \`${newTask.emailPattern}\`\n` +
            `🔑 *Exact Password:* \`${newTask.password}\`\n` +
            `💰 *Reward per Account:* *₹${newTask.rewardInr.toFixed(2)}*\n` +
            `📦 *Total Slots Available:* \`${newTask.remainingSlots} / ${newTask.totalSlots}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔔 _Users tapping "📩 Register an Account" will now see this task with your exact Gmail pattern & password!_`,
          keyboard: [
            [
              { text: '➕ Add Another Task', callback_data: 'admin_task_add' },
              { text: '📋 Manage Custom Tasks', callback_data: 'admin_tasks_manage' },
            ],
            [{ text: '🔙 Back to Admin Panel', callback_data: 'admin_home' }],
          ],
          editInPlace: false,
          toast: {
            text: `✅ Custom Task ${newTask.customTaskId} added to config:admin_tasks!`,
            showAlert: true,
          },
          activeScreenLabel: 'Admin → Custom Task Published',
        },
      };
    }

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
      state === 'AWAITING_RATE_2FA_TASK' ||
      state === 'AWAITING_RATE_MIN_WITHDRAW' ||
      state === 'AWAITING_RATE_REFERRAL'
    ) {
      const val = parseFloat(text);
      if (isNaN(val) || val <= 0) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText: `❌ Please send a valid positive number (e.g. \`15\`, \`30\`, or \`50\`).`,
            keyboard: [[{ text: '🚫 Cancel Admin Input', callback_data: 'admin_rates' }]],
            editInPlace: false,
            activeScreenLabel: 'Admin → Invalid Rate Input',
          },
        };
      }

      if (state === 'AWAITING_RATE_TASK') {
        nextKv.rates.standardTaskInr = val;
        nextKv.rates.standardTaskUsd = Number((val / 75).toFixed(2));
        nextKv.rates.taskRewardInr = val;
        nextKv.rates.taskRewardUsd = Number((val / 75).toFixed(2));
      } else if (state === 'AWAITING_RATE_2FA_TASK') {
        nextKv.rates.twoFactorTaskInr = val;
        nextKv.rates.twoFactorTaskUsd = Number((val / 75).toFixed(2));
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

    if (state === 'AWAITING_TASK_REJECT_REASON') {
      const taskId = nextUser.adminContext.targetTaskId;
      const reason = text || 'User remained logged in on device or invalid credentials';
      const tItem = nextKv.taskReviewQueue.find(
        (t) => t.taskId === taskId && t.status === 'PENDING'
      );

      nextUser.state = 'IDLE';
      nextUser.adminContext = {};

      if (tItem) {
        tItem.status = 'REJECTED';
        tItem.rejectReason = reason;
        tItem.reviewedAt = new Date().toISOString();
        nextUser.accounts.pending = Math.max(0, nextUser.accounts.pending - 1);
        nextUser.accounts.rejected += 1;
        const uHist = nextUser.accounts.history.find((h) => h.taskId === taskId);
        if (uHist) {
          uHist.status = 'REJECTED';
          uHist.rejectReason = reason;
        }
        syncActiveUserIntoDirectory(nextUser, nextKv);
      }

      const view = renderAdminTaskQueueView(nextKv);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText:
            `❌ *Task ${taskId} Marked as REJECTED & User Notified!*\n` +
            `💬 *Reason Sent to User:* _${reason}_\n\n` +
            view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          toast: {
            text: `❌ Task ${taskId} rejected (₹0 paid) & DM reason sent to user!`,
            showAlert: true,
          },
          activeScreenLabel: 'Admin → Task Review Queue',
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
        syncActiveUserIntoDirectory(nextUser, nextKv);
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

    if (state === 'AWAITING_HISTORY_USER_ID') {
      nextUser.state = 'IDLE';
      const view = renderAdminUserTaskAndPayoutHistoryView(nextUser);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          activeScreenLabel: `Admin → User #${nextUser.userId} History`,
        },
      };
    }

    if (state === 'AWAITING_INSPECT_USER_ID') {
      const cleanId = text.replace(/\D/g, '') || nextUser.userId;
      nextUser.state = 'IDLE';
      const view = renderAdminInspectUserView(nextUser, nextKv, cleanId);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          activeScreenLabel: `Admin → Inspect User #${cleanId}`,
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

      const targetId = nextUser.adminContext.targetUserId || nextUser.userId;
      if (targetId === nextUser.userId) {
        if (state === 'AWAITING_USER_ADD_BAL') {
          nextUser.balanceInr += amount;
          nextUser.lifetimeInr += amount;
        } else {
          nextUser.balanceInr = Math.max(0, nextUser.balanceInr - amount);
        }
        syncActiveUserIntoDirectory(nextUser, nextKv);
      } else if (nextKv.usersDirectory[targetId]) {
        if (state === 'AWAITING_USER_ADD_BAL') {
          nextKv.usersDirectory[targetId].balanceInr += amount;
          nextKv.usersDirectory[targetId].lifetimeInr += amount;
        } else {
          nextKv.usersDirectory[targetId].balanceInr = Math.max(
            0,
            nextKv.usersDirectory[targetId].balanceInr - amount
          );
        }
      }

      nextUser.state = 'IDLE';
      nextUser.adminContext = {};
      const view = renderAdminInspectUserView(nextUser, nextKv, targetId);
      return {
        updatedUser: nextUser,
        updatedKv: nextKv,
        result: {
          messageText: `✅ *User Wallet Balance Updated!*\n\n` + view.text,
          keyboard: view.keyboard,
          editInPlace: false,
          toast: { text: '✅ User wallet balance updated in KV!', showAlert: false },
          activeScreenLabel: `Admin → Inspect User #${targetId}`,
        },
      };
    }
  }

  // 5. User Stateful AWAITING_USER_SUBMIT_GMAIL or AWAITING_2FA_CODES
  if (
    nextUser.state === 'AWAITING_USER_SUBMIT_GMAIL' ||
    nextUser.state === 'AWAITING_2FA_CODES'
  ) {
    const activeTask = nextUser.currentTask || generateNewTask('Normal Gmail', nextKv.rates);
    const is2FA = activeTask.taskType === '2-Step Gmail';

    const tokens = text.split(/[\s,|]+/).filter(Boolean);
    const emailToken = tokens.find((t) => t.includes('@'));
    const submittedEmail = emailToken ? emailToken.toLowerCase() : activeTask.email;
    const remainingText = tokens
      .filter((t) => t !== emailToken)
      .join(' ')
      .trim();

    if (is2FA) {
      const twoFactorSecret = emailToken ? remainingText : text;
      if (!twoFactorSecret || twoFactorSecret.length < 4) {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText:
              `❌ *Missing 2FA Backup Codes / App Password!*\n\n` +
              `For *2-Step Verification Gmail* tasks, you must provide both the Gmail address and your 8-digit Backup Codes or 16-digit App Password.\n\n` +
              `*Example:* \`${activeTask.email} 49201842 83910492\``,
            keyboard: buildAwaitingUserSubmitGmailKeyboard(activeTask),
            editInPlace: false,
            activeScreenLabel: 'Awaiting Valid Gmail + 2FA Codes',
          },
        };
      }
      return finalizeUserTaskSubmissionInSim(
        nextUser,
        nextKv,
        submittedEmail,
        twoFactorSecret,
        false
      );
    }

    // Standard Gmail Task
    let finalEmail = emailToken ? emailToken.toLowerCase() : text.toLowerCase();
    if (!finalEmail.includes('@')) {
      if (finalEmail.length >= 3 && !finalEmail.includes(' ')) {
        finalEmail = `${finalEmail}@gmail.com`;
      } else {
        return {
          updatedUser: nextUser,
          updatedKv: nextKv,
          result: {
            messageText:
              `❌ *Invalid Gmail Address!*\nPlease send the exact Gmail address you created (e.g. \`${activeTask.email}\`).`,
            keyboard: buildAwaitingUserSubmitGmailKeyboard(activeTask),
            editInPlace: false,
            activeScreenLabel: 'Awaiting Valid Gmail Address',
          },
        };
      }
    }

    return finalizeUserTaskSubmissionInSim(nextUser, nextKv, finalEmail, null, false);
  }

  // 6. User Stateful AWAITING_UPI Input
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
    syncActiveUserIntoDirectory(nextUser, nextKv);

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
      keyboard: buildMainMenuKeyboard(simContext.isAdminRole),
      editInPlace: false,
      activeScreenLabel: 'Home Dashboard (/start)',
    },
  };
}
