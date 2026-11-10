/**
 * Production-Ready Telegram Task & Rewards Bot + Enterprise Dynamic Admin Panel
 * Worker Name: gmailworkop
 * Framework: grammY (ES Module for Cloudflare Workers)
 * Storage: Cloudflare Workers KV (env.BOT_KV)
 */

import { Bot, InlineKeyboard, webhookCallback } from "grammy";

// ============================================================================
// 1. DEFAULT CONSTANTS & MILESTONES
// ============================================================================
const DEFAULT_RATES = {
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

const MILESTONES = [
  { id: "m_5", count: 5, bonusInr: 20, label: "Register 5 Accounts" },
  { id: "m_15", count: 15, bonusInr: 75, label: "Register 15 Accounts" },
  { id: "m_50", count: 50, bonusInr: 300, label: "Register 50 Accounts" },
  { id: "m_100", count: 100, bonusInr: 750, label: "Register 100 Accounts" },
];

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Ayaan", "Krishna",
  "Ishaan", "Shaurya", "Ananya", "Diya", "Advika", "Riya", "Aadhya", "Kavya",
  "Meera", "Neha", "Rohan", "Vikram", "Karan", "Nikhil", "Siddharth", "Tanvi"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Mehta", "Joshi",
  "Kapoor", "Malhotra", "Chauhan", "Gupta", "Bhatia", "Deshmukh", "Kulkarni", "Saxena"
];

// ============================================================================
// 2. KV PERSISTENCE & DYNAMIC CONFIGURATION HELPERS (env.BOT_KV)
// ============================================================================
async function getKvJson(kv, key, fallbackValue) {
  const raw = await kv.get(key);
  if (!raw) return fallbackValue;
  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

async function putKvJson(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
  return value;
}

async function getDynamicRates(kv) {
  const stored = await getKvJson(kv, "config:rates", null);
  if (!stored) {
    await putKvJson(kv, "config:rates", DEFAULT_RATES);
    return { ...DEFAULT_RATES };
  }
  const standardTaskInr = Number(
    stored.standardTaskInr ?? stored.taskRewardInr ?? DEFAULT_RATES.standardTaskInr
  );
  const twoFactorTaskInr = Number(
    stored.twoFactorTaskInr ?? DEFAULT_RATES.twoFactorTaskInr
  );
  return {
    standardTaskInr,
    standardTaskUsd: Number((standardTaskInr / 75).toFixed(2)),
    twoFactorTaskInr,
    twoFactorTaskUsd: Number((twoFactorTaskInr / 75).toFixed(2)),
    taskRewardInr: standardTaskInr,
    taskRewardUsd: Number((standardTaskInr / 75).toFixed(2)),
    minWithdrawalInr: Number(stored.minWithdrawalInr ?? DEFAULT_RATES.minWithdrawalInr),
    referralBonusInr: Number(stored.referralBonusInr ?? DEFAULT_RATES.referralBonusInr),
    dailyStreakBaseInr: Number(stored.dailyStreakBaseInr ?? DEFAULT_RATES.dailyStreakBaseInr),
  };
}

async function getForceChannels(kv) {
  const channels = await getKvJson(kv, "config:channels", null);
  if (channels !== null) return channels;
  return await getKvJson(kv, "config:force_channels", []);
}

async function saveForceChannels(kv, channels) {
  await putKvJson(kv, "config:channels", channels);
  return channels;
}

async function getSecondaryAdmins(kv) {
  return await getKvJson(kv, "config:admins", []);
}

async function getMaintenanceState(kv) {
  return await getKvJson(kv, "config:maintenance", {
    enabled: false,
    updatedAt: new Date().toISOString(),
    updatedBy: "System",
  });
}

async function getUsersIndex(kv) {
  return await getKvJson(kv, "config:users_index", []);
}

async function registerUserInIndex(kv, userId) {
  const idStr = String(userId);
  const index = await getUsersIndex(kv);
  if (!index.includes(idStr)) {
    index.push(idStr);
    await putKvJson(kv, "config:users_index", index);
  }
}

async function getAdminTasks(kv) {
  return await getKvJson(kv, "config:admin_tasks", []);
}

async function saveAdminTasks(kv, tasks) {
  return await putKvJson(kv, "config:admin_tasks", tasks);
}

// Social / Non-Gmail Custom Tasks Helpers
async function getCustomSocialTasks(kv) {
  return await getKvJson(kv, "config:custom_social_tasks", []);
}

async function saveCustomSocialTasks(kv, tasks) {
  return await putKvJson(kv, "config:custom_social_tasks", tasks);
}

async function getCustomSocialQueue(kv) {
  return await getKvJson(kv, "config:custom_social_queue", []);
}

async function saveCustomSocialQueue(kv, queue) {
  return await putKvJson(kv, "config:custom_social_queue", queue);
}

async function getTaskReviewQueue(kv) {
  return await getKvJson(kv, "config:task_review_queue", []);
}

async function saveTaskReviewQueue(kv, queue) {
  return await putKvJson(kv, "config:task_review_queue", queue);
}

async function getPayoutQueue(kv) {
  return await getKvJson(kv, "config:payout_queue", []);
}

async function savePayoutQueue(kv, queue) {
  return await putKvJson(kv, "config:payout_queue", queue);
}

function isSuperAdminId(env, userId) {
  if (!env.ADMIN_CHAT_ID) return false;
  const superIds = String(env.ADMIN_CHAT_ID)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return superIds.includes(String(userId));
}

async function isAuthorizedAdmin(kv, env, userId) {
  if (!userId) return false;
  if (isSuperAdminId(env, userId)) return true;
  const subAdmins = await getSecondaryAdmins(kv);
  return subAdmins.some((a) => String(a.id) === String(userId));
}

function createDefaultUser(userId, firstName = "User", username = "") {
  return {
    userId: String(userId),
    firstName,
    username,
    isBanned: false,
    state: "IDLE",
    adminContext: {},
    balanceInr: 0,
    lifetimeInr: 0,
    accounts: {
      approved: 0,
      pending: 0,
      rejected: 0,
      history: [],
    },
    currentTask: null,
    currentSocialTask: null,
    referrals: {
      referredBy: null,
      referralBonusPaid: false,
      invitedUsers: [],
      invitedCount: 0,
      totalCommissionInr: 0,
    },
    rewards: {
      streakDays: 0,
      lastCheckInDate: null,
      claimedMilestones: [],
    },
    withdrawals: [],
    settings: {
      notifications: true,
      currency: "INR",
      language: "English (EN)",
      sessionId: `SES-${String(userId).slice(-4).padStart(4, "0")}-${Date.now().toString(36).toUpperCase().slice(-5)}`,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function getUserData(kv, userId, firstName = "User", username = "") {
  const key = `user:${userId}`;
  const raw = await kv.get(key);
  if (!raw) {
    const fresh = createDefaultUser(userId, firstName, username);
    await kv.put(key, JSON.stringify(fresh));
    await registerUserInIndex(kv, userId);
    return fresh;
  }
  try {
    const parsed = JSON.parse(raw);
    const defaults = createDefaultUser(userId, firstName, username);
    return {
      ...defaults,
      ...parsed,
      adminContext: parsed.adminContext || {},
      accounts: {
        ...defaults.accounts,
        ...(parsed.accounts || {}),
        history: Array.isArray(parsed.accounts?.history) ? parsed.accounts.history : [],
      },
      referrals: { ...defaults.referrals, ...(parsed.referrals || {}) },
      rewards: { ...defaults.rewards, ...(parsed.rewards || {}) },
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      firstName: firstName || parsed.firstName,
      username: username || parsed.username,
    };
  } catch {
    const fresh = createDefaultUser(userId, firstName, username);
    await kv.put(key, JSON.stringify(fresh));
    await registerUserInIndex(kv, userId);
    return fresh;
  }
}

async function saveUserData(kv, user) {
  user.updatedAt = new Date().toISOString();
  await kv.put(`user:${user.userId}`, JSON.stringify(user));
  await registerUserInIndex(kv, user.userId);
  return user;
}

// ============================================================================
// 3. TASK & FORMATTING GENERATORS
// ============================================================================
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "#!@%&*";
  const pick = (str) => str[Math.floor(Math.random() * str.length)];
  return `${pick(upper)}${pick(lower)}${pick(digits)}${pick(symbols)}${pick(lower)}${pick(upper)}${pick(symbols)}${pick(digits)}${pick(digits)}`;
}

function resolveEmailPattern(pattern) {
  let cleaned = String(pattern || "").trim();
  if (!cleaned.includes("@")) {
    cleaned = `${cleaned}@gmail.com`;
  }
  if (cleaned.includes("#") || cleaned.includes("*")) {
    cleaned = cleaned.replace(/[#*]/g, () => String(randomInt(0, 9)));
  }
  return cleaned.toLowerCase();
}

function buildTaskFromAdminSpec(adminTask) {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const resolvedEmail = resolveEmailPattern(adminTask.emailPattern);
  const rewardInr = Number(adminTask.rewardInr || DEFAULT_RATES.standardTaskInr);

  return {
    taskId: `TSK-${randomInt(100000, 999999)}`,
    customTaskId: adminTask.customTaskId,
    isCustomAdminTask: true,
    taskType: adminTask.taskType === "2-Step Gmail" ? "2-Step Gmail" : "Normal Gmail",
    rewardInr,
    rewardUsd: Number((rewardInr / 75).toFixed(2)),
    firstName,
    lastName,
    emailPattern: adminTask.emailPattern,
    email: resolvedEmail,
    password: adminTask.password,
    birthYear: randomInt(1988, 2003),
    createdAt: new Date().toISOString(),
  };
}

function generateNewTask(taskType = "Normal Gmail", rates = DEFAULT_RATES) {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const digits = randomInt(1000, 9999);
  const emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${digits}`;
  const isTwoFactor = taskType === "2-Step Gmail";
  const rewardInr = isTwoFactor
    ? Number(rates.twoFactorTaskInr ?? DEFAULT_RATES.twoFactorTaskInr)
    : Number(rates.standardTaskInr ?? rates.taskRewardInr ?? DEFAULT_RATES.standardTaskInr);

  return {
    taskId: `TSK-${randomInt(100000, 999999)}`,
    customTaskId: null,
    isCustomAdminTask: false,
    taskType: isTwoFactor ? "2-Step Gmail" : "Normal Gmail",
    rewardInr,
    rewardUsd: Number((rewardInr / 75).toFixed(2)),
    firstName,
    lastName,
    emailPattern: `${emailPrefix}@gmail.com`,
    email: `${emailPrefix}@gmail.com`,
    password: generatePassword(),
    birthYear: randomInt(1988, 2003),
    createdAt: new Date().toISOString(),
  };
}

function formatMoney(amountInr, currency = "INR") {
  if (currency === "USD") {
    const usd = (amountInr / 75).toFixed(2);
    return `$${usd} (₹${amountInr.toFixed(2)})`;
  }
  return `₹${amountInr.toFixed(2)}`;
}

function getReferralTier(invitedCount, baseRateInr = DEFAULT_RATES.referralBonusInr) {
  if (invitedCount >= 25) {
    return { name: "💎 Diamond Partner", rateInr: baseRateInr + 5, nextAt: null };
  }
  if (invitedCount >= 10) {
    return { name: "🥇 Gold Partner", rateInr: baseRateInr + 2, nextAt: 25 };
  }
  return { name: "🥈 Silver Starter", rateInr: baseRateInr, nextAt: 10 };
}

function isValidUpi(upi) {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
}

function isValidGmailAddress(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(String(email || "").trim());
}

function escapeMd(text = "") {
  return String(text).replace(/([_*`\[])/g, "\\$1");
}

// ============================================================================
// 4. MANDATORY FORCE-JOIN VERIFICATION ENGINE
// ============================================================================
async function checkForceJoinMembership(ctx, kv, userId) {
  const channels = await getForceChannels(kv);
  if (!channels || channels.length === 0) {
    return { passed: true, missingChannels: [] };
  }

  const missingChannels = [];
  for (const ch of channels) {
    const channelId = typeof ch === "string" ? ch : ch.id;
    try {
      const member = await ctx.api.getChatMember(channelId, userId);
      if (!member || member.status === "left" || member.status === "kicked") {
        missingChannels.push(
          typeof ch === "string"
            ? { id: ch, title: ch, inviteLink: `https://t.me/${ch.replace(/^@/, "")}` }
            : ch
        );
      }
    } catch {
      missingChannels.push(
        typeof ch === "string"
          ? { id: ch, title: ch, inviteLink: `https://t.me/${ch.replace(/^@/, "")}` }
          : ch
      );
    }
  }

  return {
    passed: missingChannels.length === 0,
    missingChannels,
  };
}

function buildForceJoinScreen(missingChannels) {
  const kb = new InlineKeyboard();
  missingChannels.forEach((ch, idx) => {
    const label = ch.title ? `📢 Join ${ch.title}` : `📢 Join Channel #${idx + 1} (${ch.id})`;
    const url =
      ch.inviteLink ||
      (String(ch.id).startsWith("@")
        ? `https://t.me/${String(ch.id).slice(1)}`
        : "https://t.me/");
    kb.url(label, url).row();
  });
  kb.text("🔄 Check / Verified", "force_join_check");

  const channelListText = missingChannels
    .map((ch, i) => `${i + 1}. *${escapeMd(ch.title || ch.id)}* (${escapeMd(ch.id)})`)
    .join("\n");

  const text =
    `🔒 *Mandatory Channel Verification*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `To use this bot and earn UPI rewards, you must join our official channel(s) below:\n\n` +
    `${channelListText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Join all channels above, then tap_ *🔄 Check / Verified* _to unlock the dashboard:_`;

  return { text, replyMarkup: kb };
}

// ============================================================================
// 5. USER INLINE KEYBOARDS
// ============================================================================
function buildMainMenuKeyboard(isAdmin = false) {
  const kb = new InlineKeyboard()
    .text("📩 Register an Account", "menu_register")
    .text("🎯 Custom Tasks", "menu_custom_tasks")
    .row()
    .text("📑 My Accounts", "menu_accounts")
    .text("👛 Balance", "menu_balance")
    .row()
    .text("👥 Referrals", "menu_referrals")
    .text("🎁 Rewards", "menu_rewards")
    .row()
    .text("⚙️ Settings", "menu_settings")
    .text("❓ Help", "menu_help");

  if (isAdmin) {
    kb.row().text("🛡️ Admin Panel", "admin_home");
  }

  return kb;
}

function buildTaskTypeSelectorKeyboard(rates, adminTasks = []) {
  const kb = new InlineKeyboard();
  const availableAdminTasks = adminTasks.filter((t) => Number(t.remainingSlots || 0) > 0);

  availableAdminTasks.slice(0, 6).forEach((t, idx) => {
    const icon = t.taskType === "2-Step Gmail" ? "🔐" : "📧";
    kb.text(
      `${icon} Task #${idx + 1}: ${t.emailPattern} (₹${t.rewardInr} • ${t.remainingSlots} left)`,
      `claim_admin_task_${t.customTaskId}`
    ).row();
  });

  kb.text(`📧 Auto Standard Gmail (₹${rates.standardTaskInr})`, "register_type_standard")
    .row()
    .text(`🔐 Auto 2-Step (2FA) Gmail (₹${rates.twoFactorTaskInr})`, "register_type_2fa")
    .row()
    .text("🔙 Back to Main Menu", "menu_home");
  return kb;
}

function buildTaskKeyboard(task) {
  const is2FA = task?.taskType === "2-Step Gmail";
  return new InlineKeyboard()
    .text(is2FA ? "✅ Done (Submit Gmail + 2FA)" : "✅ Done (Submit Gmail)", "task_done")
    .text("🚫 Cancel", "task_cancel")
    .row()
    .text("🔄 Change Task", "task_change_type")
    .text("❓ How to create?", "task_guide")
    .row()
    .text("🔙 Back to Main Menu", "menu_home");
}

function buildAwaitingUserSubmitGmailKeyboard(task) {
  const kb = new InlineKeyboard();
  if (task && task.taskType !== "2-Step Gmail" && task.email && !String(task.email).includes("#")) {
    kb.text(`⚡ Quick Submit: ${task.email}`, "task_quick_submit_assigned").row();
  }
  kb.text("🔙 Back to Task Credentials", "task_resume")
    .text("🚫 Cancel Task", "task_cancel");
  return kb;
}

function buildTaskGuideKeyboard() {
  return new InlineKeyboard()
    .text("🔙 Back to Task", "task_resume")
    .row()
    .text("🏠 Main Menu", "menu_home");
}

function buildMyAccountsKeyboard() {
  return new InlineKeyboard()
    .text("🔄 Refresh Stats", "accounts_refresh")
    .text("📥 Export History", "accounts_export")
    .row()
    .text("🔙 Back", "menu_home");
}

function buildBalanceKeyboard() {
  return new InlineKeyboard()
    .text("💳 Withdraw via UPI", "balance_withdraw")
    .text("📜 Withdrawal History", "balance_history")
    .row()
    .text("🔙 Back", "menu_home");
}

function buildWithdrawalHistoryKeyboard() {
  return new InlineKeyboard()
    .text("💳 Withdraw via UPI", "balance_withdraw")
    .row()
    .text("🔙 Back to Balance", "menu_balance")
    .text("🏠 Main Menu", "menu_home");
}

function buildCancelUpiKeyboard() {
  return new InlineKeyboard()
    .text("🚫 Cancel Withdrawal", "balance_cancel_upi")
    .row()
    .text("🔙 Back to Balance", "menu_balance");
}

function buildReferralsKeyboard(botUsername, userId, rates) {
  const inviteLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  const shareText = encodeURIComponent(
    `🔥 Earn ₹${rates.standardTaskInr}–₹${rates.twoFactorTaskInr} per registered Gmail account with fast UPI payouts! Join using my invite link:`
  );
  const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareText}`;

  return new InlineKeyboard()
    .url("📢 Share Link", tgShareUrl)
    .text("📊 Referral Analytics", "referrals_analytics")
    .row()
    .text("🔙 Back", "menu_home");
}

function buildReferralAnalyticsKeyboard() {
  return new InlineKeyboard()
    .text("🔄 Refresh Analytics", "referrals_analytics")
    .row()
    .text("🔙 Back to Referrals", "menu_referrals")
    .text("🏠 Main Menu", "menu_home");
}

function buildRewardsKeyboard() {
  return new InlineKeyboard()
    .text("🎯 Claim Daily Check-in", "rewards_checkin")
    .text("🏆 Milestones", "rewards_milestones")
    .row()
    .text("🔙 Back", "menu_home");
}

function buildMilestonesKeyboard(user) {
  const kb = new InlineKeyboard();
  for (const m of MILESTONES) {
    const claimed = user.rewards.claimedMilestones.includes(m.id);
    const eligible = user.accounts.approved >= m.count;
    if (claimed) {
      kb.text(`✅ ${m.label} (Claimed)`, `milestone_claim_${m.id}`).row();
    } else if (eligible) {
      kb.text(`🎁 Claim ₹${m.bonusInr} (${m.label})`, `milestone_claim_${m.id}`).row();
    } else {
      kb.text(`🔒 ${m.label} (${user.accounts.approved}/${m.count})`, `milestone_claim_${m.id}`).row();
    }
  }
  kb.text("🔙 Back to Rewards", "menu_rewards").text("🏠 Main Menu", "menu_home");
  return kb;
}

function buildSettingsKeyboard(user) {
  const notifLabel = user.settings.notifications ? "🔔 Notifications: ON" : "🔕 Notifications: OFF";
  return new InlineKeyboard()
    .text(notifLabel, "settings_toggle_notif")
    .text(`💱 Currency: ${user.settings.currency}`, "settings_toggle_currency")
    .row()
    .text(`🌐 Language: ${user.settings.language}`, "settings_language")
    .text("🔑 Rotate Session ID", "settings_rotate_session")
    .row()
    .text("🔙 Back", "menu_home");
}

function buildLanguageSubmenuKeyboard(currentLang) {
  const langs = ["English (EN)", "हिन्दी (HI)", "বাংলা (BN)", "தமிழ் (TA)"];
  const kb = new InlineKeyboard();
  langs.forEach((lang, idx) => {
    const prefix = currentLang === lang ? "✅ " : "";
    kb.text(`${prefix}${lang}`, `set_lang_${idx}`);
    if (idx % 2 === 1) kb.row();
  });
  kb.row().text("🔙 Back to Settings", "menu_settings");
  return kb;
}

function buildHelpKeyboard(env) {
  const supportUrl = env.SUPPORT_URL || "https://t.me/TelegramSupport";
  const newsUrl = env.NEWS_URL || "https://t.me/TelegramTips";

  return new InlineKeyboard()
    .text("🕒 What is a hold?", "faq_hold")
    .row()
    .text("💬 How to avoid SMS confirmation?", "faq_sms")
    .row()
    .text("🔴 Why is my account unavailable?", "faq_unavailable")
    .row()
    .text("🛡️ How can I avoid blocking my Gmail?", "faq_avoid_block")
    .row()
    .text("🪪 How many accounts can I register?", "faq_limit")
    .row()
    .text("👥 How does the referral program work?", "faq_referral")
    .row()
    .url("💬 Support", supportUrl)
    .url("📢 Project News", newsUrl)
    .row()
    .text("🔙 Back", "menu_home");
}

function buildFaqBackKeyboard() {
  return new InlineKeyboard()
    .text("🔙 Back to Help", "menu_help")
    .text("🏠 Main Menu", "menu_home");
}

// ============================================================================
// 6. ENTERPRISE ADMIN PANEL KEYBOARDS (/admin)
// ============================================================================
function buildAdminDashboardKeyboard() {
  return new InlineKeyboard()
    .text("➕ Add Social Task", "admin_social_task_add")
    .text("📋 Manage Social Tasks", "admin_social_tasks_manage")
    .row()
    .text("📝 Review Task Proofs", "admin_social_queue")
    .text("➕ Create Gmail Task", "admin_task_add")
    .row()
    .text("📋 Manage Gmail Tasks", "admin_tasks_manage")
    .text("📝 Review Gmail Queue", "admin_tasks_queue")
    .row()
    .text("👥 View All Users", "admin_users_list")
    .text("🔍 Inspect User", "admin_inspect")
    .row()
    .text("📊 Real-Time Analytics", "admin_analytics")
    .text("💳 Manage Payouts", "admin_payouts")
    .row()
    .text("🎁 Set Reward Rates", "admin_rates")
    .text("📢 Force Channels", "admin_channels")
    .row()
    .text("🛡️ Manage Admins", "admin_admins")
    .text("📣 Broadcast Message", "admin_broadcast")
    .row()
    .text("⚙️ Maintenance Mode", "admin_maintenance")
    .text("⚠️ Wipe / Reset All Platform Data", "admin_system_reset")
    .row()
    .text("🔙 Close Admin Panel", "admin_close");
}

function buildAdminBackKeyboard() {
  return new InlineKeyboard().text("🔙 Back to Admin Panel", "admin_home");
}

function buildAdminCancelInputKeyboard(backCallback = "admin_home") {
  return new InlineKeyboard().text("🚫 Cancel Admin Input", backCallback);
}

function buildAdminCreateTaskTypeKeyboard() {
  return new InlineKeyboard()
    .text("📧 Standard Gmail (Without 2FA)", "admin_newtask_type_standard")
    .row()
    .text("🔐 2-Step Verification Gmail (2FA)", "admin_newtask_type_2fa")
    .row()
    .text("📋 View Active Admin Tasks", "admin_tasks_manage")
    .row()
    .text("🔙 Back to Admin Panel", "admin_home");
}

function buildAdminSkipRewardKeyboard(defaultRateInr) {
  return new InlineKeyboard()
    .text(`⚡ Use Default Rate (₹${defaultRateInr})`, "admin_newtask_skip_reward")
    .row()
    .text("🚫 Cancel Task Creation", "admin_home");
}

function buildAdminRatesKeyboard(rates) {
  return new InlineKeyboard()
    .text(`📧 Standard Gmail Rate (₹${rates.standardTaskInr})`, "admin_rate_task")
    .row()
    .text(`🔐 2-Step (2FA) Gmail Rate (₹${rates.twoFactorTaskInr})`, "admin_rate_2fa_task")
    .row()
    .text(`🎯 Min Withdrawal (₹${rates.minWithdrawalInr})`, "admin_rate_min_withdraw")
    .row()
    .text(`👥 Referral Bonus (₹${rates.referralBonusInr})`, "admin_rate_referral")
    .row()
    .text("🔄 Reset to Default Rates", "admin_rate_reset")
    .row()
    .text("🔙 Back to Admin Panel", "admin_home");
}

function buildAdminForceChannelsKeyboard(channels) {
  const kb = new InlineKeyboard().text("➕ Add Channel", "admin_channel_add");
  if (channels.length > 0) {
    kb.text("➖ Remove Channel", "admin_channel_remove_menu");
  }
  kb.row().text("🔙 Back to Admin Panel", "admin_home");
  return kb;
}

function buildAdminRemoveChannelListKeyboard(channels) {
  const kb = new InlineKeyboard();
  channels.forEach((ch, idx) => {
    const id = typeof ch === "string" ? ch : ch.id;
    const title = typeof ch === "string" ? ch : ch.title || ch.id;
    kb.text(`🗑️ Remove ${title} (${id})`, `admin_channel_del_${idx}`).row();
  });
  kb.text("🔙 Back to Force Channels", "admin_channels");
  return kb;
}

function buildAdminManageAdminsKeyboard(subAdmins) {
  const kb = new InlineKeyboard().text("➕ Add Admin", "admin_sub_add");
  if (subAdmins.length > 0) {
    kb.text("➖ Remove Admin", "admin_sub_remove_menu");
  }
  kb.row().text("🔙 Back to Admin Panel", "admin_home");
  return kb;
}

function buildAdminRemoveSubAdminKeyboard(subAdmins) {
  const kb = new InlineKeyboard();
  subAdmins.forEach((adm) => {
    kb.text(`🗑️ Revoke Admin #${adm.id}`, `admin_sub_del_${adm.id}`).row();
  });
  kb.text("🔙 Back to Manage Admins", "admin_admins");
  return kb;
}

function buildAdminInspectUserKeyboard(targetUser) {
  const banLabel = targetUser.isBanned ? "🟢 Unban User" : "🚫 Ban User";
  return new InlineKeyboard()
    .text("➕ Add Balance", `admin_user_addbal_${targetUser.userId}`)
    .text("➖ Deduct Balance", `admin_user_deductbal_${targetUser.userId}`)
    .row()
    .text("📑 User Task & Payout History", `admin_user_history_${targetUser.userId}`)
    .row()
    .text(banLabel, `admin_user_toggleban_${targetUser.userId}`)
    .text("🔄 Refresh Profile", `admin_user_view_${targetUser.userId}`)
    .row()
    .text("👥 All Users List", "admin_users_list")
    .text("🔙 Admin Panel", "admin_home");
}

function buildAdminMaintenanceKeyboard(maint) {
  const toggleLabel = maint.enabled
    ? "🟢 Disable Maintenance Mode"
    : "🔴 Enable Maintenance Mode";
  return new InlineKeyboard()
    .text(toggleLabel, "admin_maintenance_toggle")
    .row()
    .text("🔙 Back to Admin Panel", "admin_home");
}

function buildAdminSystemResetConfirmKeyboard() {
  return new InlineKeyboard()
    .text("🚨 YES, WIPE & RESET ALL DATA TO 0", "admin_system_reset_confirm")
    .row()
    .text("🔙 No, Cancel & Return to Admin Panel", "admin_home");
}

// ============================================================================
// 7. SCREEN TEXT RENDERERS
// ============================================================================
function renderHomeText(user) {
  return (
    `✨ *Welcome to Gmail Task Hub, ${escapeMd(user.firstName)}!*\n\n` +
    `💼 *Account Overview*\n` +
    `├ 👛 *Available Balance:* \`${formatMoney(user.balanceInr, user.settings.currency)}\`\n` +
    `├ ✅ *Verified Accounts:* \`${user.accounts.approved}\`\n` +
    `├ ⏳ *Pending Review:* \`${user.accounts.pending}\`\n` +
    `└ 🔥 *Daily Streak:* \`${user.rewards.streakDays} Days\`\n\n` +
    `👇 *Choose an option from the menu below:*`
  );
}

function renderTaskTypeSelectText(rates, adminTasks = []) {
  const availableAdminTasks = adminTasks.filter((t) => Number(t.remainingSlots || 0) > 0);
  const customTaskSection =
    availableAdminTasks.length > 0
      ? `🎯 *Active Admin-Assigned Tasks (${availableAdminTasks.length} Available):*\n` +
        availableAdminTasks
          .slice(0, 6)
          .map(
            (t, i) =>
              `${i + 1}. *${t.taskType}* — \`${t.emailPattern}\`\n` +
              `   ├ 🔑 *Password:* \`${t.password}\`\n` +
              `   └ 💰 *Reward:* *₹${Number(t.rewardInr).toFixed(2)}* • 🎯 *Slots Left:* \`${t.remainingSlots}/${t.totalSlots}\``
          )
          .join("\n\n") +
        `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`
      : "";

  return (
    `📩 *Register an Account — Available Tasks*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    customTaskSection +
    `📋 *Task Categories:*\n` +
    `• *📧 Standard Gmail (No 2FA):* *₹${rates.standardTaskInr.toFixed(2)}*\n` +
    `• *🔐 2-Step Verification Gmail (2FA):* *₹${rates.twoFactorTaskInr.toFixed(2)}*\n\n` +
    `⚠️ *Rule:* Logout from your phone immediately after creating, otherwise admin cannot login and task will be *REJECTED*.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Select an Admin Task or Task Category below to start:_`
  );
}

function renderRegisterTaskText(task) {
  const is2FA = task.taskType === "2-Step Gmail";
  const patternNote =
    task.emailPattern && task.emailPattern !== task.email
      ? `• *Admin Pattern:* \`${task.emailPattern}\`\n`
      : "";
  const twoFactorInstruction = is2FA
    ? `\n🔐 *2-STEP (2FA) REQUIREMENT:*\n` +
      `Enable 2-Step Verification on this Gmail account and generate *Backup Codes* or an *App Password*. When you tap *✅ Done*, you will submit the exact Gmail created along with your 2FA Backup Codes / App Password.\n`
    : "";

  return (
    `📩 *Register Gmail Account Task*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${task.taskId}\`${task.customTaskId ? ` (\`${task.customTaskId}\`)` : ""}\n` +
    `🏷️ *Task Type:* *${task.taskType}*\n` +
    `💰 *Payout (On Admin Approval):* *₹${Number(task.rewardInr).toFixed(2)}* (\`$${Number(task.rewardUsd).toFixed(2)}\`)\n\n` +
    `📋 *Use these exact Admin-specified credentials:*\n` +
    `• *First Name:* \`${task.firstName}\`\n` +
    `• *Last Name:* \`${task.lastName}\`\n` +
    patternNote +
    `• *Target Gmail:* \`${task.email}\`\n` +
    `• *Exact Password:* \`${task.password}\`\n` +
    `• *Year of Birth:* \`${task.birthYear}\`\n` +
    `${twoFactorInstruction}\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 _Tap any credential above to copy it, create the account, log out from your device, then press_ *✅ Done* _below._`
  );
}

function renderAwaitingUserSubmitGmailText(task) {
  const is2FA = task.taskType === "2-Step Gmail";
  if (is2FA) {
    return (
      `🔐 *Submit Created 2FA Gmail & Backup Codes / App Password*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Task ID:* \`${task.taskId}\`\n` +
      `🎯 *Assigned Email / Pattern:* \`${task.emailPattern || task.email}\`\n` +
      `🔑 *Assigned Password:* \`${task.password}\`\n` +
      `💰 *Reward:* *₹${Number(task.rewardInr).toFixed(2)}*\n\n` +
      `📝 *Please send the exact Gmail address you created AND your 2FA Backup Codes / App Password in a single message:*\n\n` +
      `*Accepted Format Example:*\n` +
      `\`${task.email} 49201842, 83910492\`\n` +
      `or\n` +
      `\`${task.email} abcd efgh ijkl mnop\`\n\n` +
      `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*`
    );
  }

  return (
    `📧 *Confirm & Submit Created Gmail Address*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *Task ID:* \`${task.taskId}\`\n` +
    `🎯 *Assigned Target Email:* \`${task.email}\`\n` +
    `🔑 *Assigned Password:* \`${task.password}\`\n` +
    `💰 *Reward:* *₹${Number(task.rewardInr).toFixed(2)}*\n\n` +
    `📝 *Please type and send the exact Gmail address you created in chat (or tap Quick Submit below):*\n` +
    `*Example:* \`${task.email}\`\n\n` +
    `⚠️ *Rule: Logout from your phone immediately after creating, otherwise admin cannot login and task will be REJECTED.*`
  );
}

function renderTaskGuideText(task) {
  return (
    `📘 *Step-by-Step Account Creation Guide*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*1️⃣ Open Incognito / Private Tab*\n` +
    `Open a fresh incognito window in your browser or add a new Google account in device settings.\n\n` +
    `*2️⃣ Enter Assigned Profile Data*\n` +
    `• Name: \`${task.firstName} ${task.lastName}\`\n` +
    `• Gmail: \`${task.email}\`\n` +
    `• Exact Password: \`${task.password}\`\n` +
    `• Birth Year: \`${task.birthYear}\`\n\n` +
    `*3️⃣ Task Type Instructions (${task.taskType})*\n` +
    (task.taskType === "2-Step Gmail"
      ? `Enable 2-Step Verification in Google Security settings, generate *Backup Codes* or an *App Password*, and copy them before signing out.\n\n`
      : `Skip phone/recovery email if prompted, accept Google Terms, and wait for the inbox to load. Do NOT enable 2FA on Standard tasks.\n\n`) +
    `*4️⃣ Sign Out & Submit for Review*\n` +
    `⚠️ *Rule:* Logout from your phone immediately after creating, otherwise admin cannot login and task will be *REJECTED*.`
  );
}

function renderMyAccountsText(user) {
  const total = user.accounts.approved + user.accounts.pending + user.accounts.rejected;
  const recentLines =
    user.accounts.history.length > 0
      ? user.accounts.history
          .slice(0, 6)
          .map((item, i) => {
            const status = item.status || "APPROVED";
            const badge =
              status === "APPROVED" ? "✅" : status === "REJECTED" ? "❌" : "⏳";
            const typeTag = item.taskType === "2-Step Gmail" ? "🔐 2FA" : "📧 Std";
            return `${i + 1}. ${badge} \`${item.email || item.taskTitle}\` (${typeTag}) — *₹${item.rewardInr}* [${status}]`;
          })
          .join("\n")
      : "_No registered accounts or tasks yet. Tap menu options to start earning!_";

  return (
    `📑 *My Accounts & Tasks History*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Verification Statistics:*\n` +
    `├ ✅ *Total Approved:* \`${user.accounts.approved}\`\n` +
    `├ ⏳ *Pending Verification:* \`${user.accounts.pending}\`\n` +
    `├ ❌ *Rejected:* \`${user.accounts.rejected}\`\n` +
    `└ 📦 *Total Submitted:* \`${total}\`\n\n` +
    `🗂️ *Recent Submissions:*\n` +
    `${recentLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🕒 _Last synced: ${new Date().toISOString().slice(11, 19)} UTC_`
  );
}

function renderBalanceText(user, rates) {
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

function renderWithdrawalHistoryText(user, rates) {
  const list =
    user.withdrawals.length > 0
      ? user.withdrawals
          .slice(0, 8)
          .map((w, idx) => {
            const statusIcon =
              w.status === "COMPLETED" ? "✅" : w.status === "REJECTED" ? "❌" : "⏳";
            const reasonLine = w.rejectReason ? `\n   └ 💬 _Reason: ${escapeMd(w.rejectReason)}_` : "";
            return `${idx + 1}. *₹${w.amountInr.toFixed(2)}* → \`${w.upiId}\`\n   └ 🆔 \`${w.txId}\` • ${statusIcon} _${w.status}_ (${w.date.slice(0, 10)})${reasonLine}`;
          })
          .join("\n\n")
      : `_No withdrawals found yet. Reach ₹${rates.minWithdrawalInr.toFixed(2)} to request your first UPI payout!_`;

  return (
    `📜 *UPI Withdrawal History*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${list}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function renderAwaitingUpiText(user) {
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

function renderReferralsText(user, botUsername, rates) {
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

function renderReferralAnalyticsText(user, rates) {
  const tier = getReferralTier(user.referrals.invitedCount, rates.referralBonusInr);
  const progressText = tier.nextAt
    ? `${user.referrals.invitedCount}/${tier.nextAt} invites to next tier`
    : `Maximum Diamond Tier unlocked!`;

  const recentReferrals =
    user.referrals.invitedUsers.length > 0
      ? user.referrals.invitedUsers
          .slice(0, 6)
          .map((u, i) => `${i + 1}. User \`#${u.id}\` — Joined ${u.date.slice(0, 10)} (*+₹${u.bonusInr}*)`)
          .join("\n")
      : "_No referrals recorded yet. Share your link to start building your network!_";

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

function renderRewardsText(user, rates) {
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = user.rewards.lastCheckInDate === today;

  return (
    `🎁 *Daily Streak & Milestone Rewards*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 *Current Daily Streak:* \`${user.rewards.streakDays} Days\`\n` +
    `📅 *Today's Check-In:* ${checkedInToday ? "✅ *Claimed*" : "🟢 *Available Now!*"}\n` +
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

function renderMilestonesText(user) {
  const rows = MILESTONES.map((m) => {
    const claimed = user.rewards.claimedMilestones.includes(m.id);
    const done = user.accounts.approved >= m.count;
    const badge = claimed ? "✅ Claimed" : done ? "🎁 Ready to Claim!" : `⏳ ${user.accounts.approved}/${m.count}`;
    return `• *${m.label}* → *+₹${m.bonusInr}* — [${badge}]`;
  }).join("\n");

  return (
    `🏆 *Account Registration Milestones*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Complete registration targets to unlock instant lump-sum INR bonuses directly to your wallet!\n\n` +
    `${rows}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Tap an unlocked milestone button below to claim your bonus:_`
  );
}

function renderSettingsText(user) {
  return (
    `⚙️ *Account & Bot Settings*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔔 *Task & Payout Notifications:* \`${user.settings.notifications ? "ENABLED (ON)" : "MUTED (OFF)"}\`\n` +
    `💱 *Default Currency Display:* \`${user.settings.currency === "INR" ? "INR (₹)" : "USD ($) + INR (₹)"}\`\n` +
    `🌐 *Interface Language:* \`${user.settings.language}\`\n` +
    `🔑 *Connected Session ID:* \`${user.settings.sessionId}\`\n` +
    `🆔 *Telegram User ID:* \`${user.userId}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Customize your preferences using the buttons below:_`
  );
}

function renderHelpText() {
  return (
    `❓ *Help Center & Frequently Asked Questions*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Select any topic below to view detailed troubleshooting guides, payout rules, and anti-ban best practices:`
  );
}

function getFaqAnswers(rates) {
  return {
    faq_hold:
      `🕒 *What is a verification review / hold?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `When you submit a task, it enters our *PENDING* verification queue so an administrator can verify the proof or credentials.\n\n` +
      `• *Gmail Task:* Pays upon admin approval.\n` +
      `• *Social / Custom Task:* Pays upon admin verification of your proof screenshot or link.`,

    faq_sms:
      `💬 *How to avoid SMS confirmation?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Use mobile data, clear browser cache, or switch IP addresses between tasks.`,

    faq_unavailable:
      `🔴 *Why was my account / task rejected?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Submissions are rejected if proofs are invalid, instructions were not followed, or credentials mismatched.`,

    faq_avoid_block:
      `🛡️ *How can I avoid blocks?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Follow task instructions carefully and do not spam invalid proofs.`,

    faq_limit:
      `🪪 *What are the task limits?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Complete as many available tasks as you like to increase your earnings.`,

    faq_referral:
      `👥 *How does the referral program work?*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Invite friends using your link and earn commissions when they join and complete tasks!`,
  };
}

// ============================================================================
// 8. ENTERPRISE ADMIN PANEL & SOCIAL TASKS RENDERERS
// ============================================================================
async function renderAdminDashboardText(kv, env, userId) {
  const rates = await getDynamicRates(kv);
  const maint = await getMaintenanceState(kv);
  const channels = await getForceChannels(kv);
  const payoutQueue = await getPayoutQueue(kv);
  const taskQueue = await getTaskReviewQueue(kv);
  const socialQueue = await getCustomSocialQueue(kv);
  const socialTasks = await getCustomSocialTasks(kv);
  const adminTasks = await getAdminTasks(kv);
  const usersIndex = await getUsersIndex(kv);

  const pendingPayouts = payoutQueue.filter((p) => p.status === "PROCESSING");
  const pendingGmail = taskQueue.filter((t) => t.status === "PENDING");
  const pendingSocial = socialQueue.filter((s) => s.status === "PENDING");
  const activeAdminTasks = adminTasks.filter((t) => Number(t.remainingSlots || 0) > 0);
  const activeSocialTasks = socialTasks.filter((t) => Number(t.remainingSlots || 0) > 0);
  const isSuper = isSuperAdminId(env, userId);

  return (
    `🛡️ *Enterprise Admin Control Panel*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Admin Role:* \`${isSuper ? "SUPER ADMIN" : "SECONDARY ADMIN"}\`\n` +
    `⚙️ *Maintenance Mode:* ${maint.enabled ? "🔴 *ENABLED (Users Blocked)*" : "🟢 *DISABLED (Live)*"}\n` +
    `👥 *Total Registered Users:* \`${usersIndex.length}\`\n` +
    `🎯 *Active Social Tasks:* \`${activeSocialTasks.length} Active\`\n` +
    `📝 *Pending Social Proofs:* \`${pendingSocial.length} Submission(s)\`\n` +
    `📧 *Active Gmail Tasks:* \`${activeAdminTasks.length} Task(s)\`\n` +
    `📝 *Pending Gmail Reviews:* \`${pendingGmail.length} Submission(s)\`\n` +
    `💳 *Pending UPI Payouts:* \`${pendingPayouts.length} Request(s)\`\n` +
    `📢 *Force-Join Channels:* \`${channels.length} Active\`\n\n` +
    `📊 *Live Dynamic Rates:*\n` +
    `├ 📧 *Standard Gmail:* \`₹${rates.standardTaskInr.toFixed(2)}\`\n` +
    `├ 🔐 *2-Step (2FA) Gmail:* \`₹${rates.twoFactorTaskInr.toFixed(2)}\`\n` +
    `├ 🎯 *Min Withdrawal:* \`₹${rates.minWithdrawalInr.toFixed(2)}\`\n` +
    `└ 👥 *Referral Bonus:* \`₹${rates.referralBonusInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 *Select a management module below:*`
  );
}

function renderAdminManageSocialTasksView(socialTasks) {
  const kb = new InlineKeyboard().text("➕ Add Social Task", "admin_social_task_add").row();

  if (!socialTasks || socialTasks.length === 0) {
    const text =
      `📋 *Manage Non-Gmail Custom Social Tasks*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_No custom social tasks created yet. Click "➕ Add Social Task" below to create tasks (e.g. Join Channel, YouTube Subscribe, Visit Website)!_\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;
    kb.text("🔙 Back to Admin Panel", "admin_home");
    return { text, replyMarkup: kb };
  }

  const lines = socialTasks
    .slice(0, 8)
    .map((t, i) => {
      const statusBadge = Number(t.remainingSlots) > 0 ? "🟢 ACTIVE" : "🔴 FULL";
      return (
        `*#${i + 1} • ${t.socialTaskId}* [${statusBadge}]\n` +
        `├ 📌 *Title:* ${escapeMd(t.title)}\n` +
        `├ 🔗 *Link:* ${t.link}\n` +
        `├ 💰 *Reward:* *₹${Number(t.rewardInr).toFixed(2)}*\n` +
        `└ 🎯 *Slots:* \`${t.remainingSlots} remaining / ${t.totalSlots} total\``
      );
    })
    .join("\n\n");

  socialTasks.slice(0, 6).forEach((t) => {
    kb.text(
      `🗑️ Delete ${t.socialTaskId} (${t.title.slice(0, 15)})`,
      `admin_social_task_del_${t.socialTaskId}`
    ).row();
  });

  kb.text("🔄 Refresh Tasks", "admin_social_tasks_manage")
    .text("🔙 Admin Panel", "admin_home");

  const text =
    `📋 *Manage Social Tasks (${socialTasks.length})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${lines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Add a new social task or delete an existing task below:_`;

  return { text, replyMarkup: kb };
}

function renderAdminSocialQueueView(socialQueue) {
  const pending = socialQueue.filter((s) => s.status === "PENDING");
  const kb = new InlineKeyboard();

  if (pending.length === 0) {
    const text =
      `📝 *Review Social Task Proofs*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *All caught up!* There are currently \`0\` pending social task proofs waiting for review.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;
    kb.text("🔄 Refresh Queue", "admin_social_queue")
      .row()
      .text("🔙 Back to Admin Panel", "admin_home");
    return { text, replyMarkup: kb };
  }

  const itemsText = pending
    .slice(0, 5)
    .map((s, idx) => {
      return (
        `*#${idx + 1} • ${s.submissionId}* (${escapeMd(s.taskTitle)})\n` +
        `├ 👤 *User:* ${escapeMd(s.firstName || "User")} ${s.username ? `(@${escapeMd(s.username)})` : ""} [\`${s.userId}\`]\n` +
        `├ 📝 *Proof Submitted:* \`${escapeMd(s.proofText)}\`\n` +
        `├ 💰 *Reward:* *₹${Number(s.rewardInr).toFixed(2)}*\n` +
        `└ 🕒 *Submitted:* \`${String(s.submittedAt || "").slice(0, 19).replace("T", " ")}\``
      );
    })
    .join("\n\n");

  pending.slice(0, 5).forEach((s) => {
    kb.text(`✅ Approve (${s.submissionId})`, `admin_social_approve_${s.submissionId}`)
      .text(`❌ Reject`, `admin_social_reject_${s.submissionId}`)
      .row();
  });

  kb.text("🔄 Refresh Queue", "admin_social_queue")
    .row()
    .text("🔙 Back to Admin Panel", "admin_home");

  const text =
    `📝 *Pending Social Task Proofs (${pending.length})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${itemsText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Review user proofs and Approve or Reject below:_`;

  return { text, replyMarkup: kb };
}

function renderAdminManageCustomTasksView(adminTasks) {
  const kb = new InlineKeyboard().text("➕ Create / Add New Task", "admin_task_add").row();

  if (!adminTasks || adminTasks.length === 0) {
    const text =
      `📋 *Manage Admin-Created Gmail Tasks*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_No custom Gmail tasks created yet. Click "➕ Create / Add New Task" below to publish specific Gmail names/patterns, passwords, rewards, and slot limits for users!_\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;
    kb.text("🔙 Back to Admin Panel", "admin_home");
    return { text, replyMarkup: kb };
  }

  const lines = adminTasks
    .slice(0, 8)
    .map((t, i) => {
      const statusBadge = Number(t.remainingSlots) > 0 ? "🟢 ACTIVE" : "🔴 FULL";
      return (
        `*#${i + 1} • ${t.customTaskId}* [${statusBadge}]\n` +
        `├ 🏷️ *Type:* *${t.taskType}*\n` +
        `├ 📧 *Target Email/Pattern:* \`${t.emailPattern}\`\n` +
        `├ 🔑 *Required Password:* \`${t.password}\`\n` +
        `├ 💰 *Reward:* *₹${Number(t.rewardInr).toFixed(2)}*\n` +
        `└ 🎯 *Slots:* \`${t.remainingSlots} remaining / ${t.totalSlots} total\``
      );
    })
    .join("\n\n");

  adminTasks.slice(0, 6).forEach((t) => {
    kb.text(
      `🗑️ Delete ${t.customTaskId} (${t.emailPattern})`,
      `admin_custom_task_del_${t.customTaskId}`
    ).row();
  });

  kb.text("🔄 Refresh Tasks", "admin_tasks_manage")
    .text("🔙 Admin Panel", "admin_home");

  const text =
    `📋 *Manage Custom Gmail Tasks (${adminTasks.length})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${lines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Add a new task or delete an existing task below:_`;

  return { text, replyMarkup: kb };
}

async function renderAdminUsersListPaginatedView(kv, page = 0) {
  const pageSize = 10;
  const userIds = await getUsersIndex(kv);
  const totalUsers = userIds.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const sliceIds = userIds.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const usersData = [];
  for (const uid of sliceIds) {
    const u = await getUserData(kv, uid);
    usersData.push(u);
  }

  const listLines =
    usersData.length > 0
      ? usersData
          .map((u, idx) => {
            const rank = safePage * pageSize + idx + 1;
            const handle = u.username ? `@${escapeMd(u.username)}` : "_no username_";
            const banTag = u.isBanned ? " 🚫[BANNED]" : "";
            return (
              `*${rank}. ${escapeMd(u.firstName)}* (${handle})${banTag}\n` +
              `   └ 🆔 \`${u.userId}\` • 👛 *₹${Number(u.balanceInr).toFixed(2)}* • ✅ \`${u.accounts?.approved || 0}\` tasks`
            );
          })
          .join("\n\n")
      : "_No registered users found in config:users_index._";

  const kb = new InlineKeyboard();
  usersData.forEach((u) => {
    kb.text(
      `👤 ${u.firstName} (#${u.userId}) • ₹${Number(u.balanceInr).toFixed(0)} • ✅${u.accounts?.approved || 0}`,
      `admin_user_view_${u.userId}`
    ).row();
  });

  if (totalPages > 1) {
    if (safePage > 0) {
      kb.text("⬅️ Prev Page", `admin_users_page_${safePage - 1}`);
    }
    kb.text(`📄 ${safePage + 1}/${totalPages}`, "admin_users_list");
    if (safePage < totalPages - 1) {
      kb.text("Next Page ➡️", `admin_users_page_${safePage + 1}`);
    }
    kb.row();
  }

  kb.text("🔍 Search by User ID", "admin_inspect")
    .text("🔙 Admin Panel", "admin_home");

  const text =
    `👥 *All Registered Users (${totalUsers} Total)*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📄 *Page ${safePage + 1} of ${totalPages}*\n\n` +
    `${listLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Tap any user button below to open their full Inspector & History:_`;

  return { text, replyMarkup: kb };
}

function renderAdminTaskQueueView(taskQueue) {
  const pending = taskQueue.filter((t) => t.status === "PENDING");
  const kb = new InlineKeyboard();

  if (pending.length === 0) {
    const text =
      `📝 *Manual Gmail Task Verification Queue*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *All caught up!* There are currently \`0\` pending Gmail tasks waiting for verification.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;
    kb.text("📑 View Submissions History", "admin_task_history")
      .text("🔄 Refresh Queue", "admin_tasks_queue")
      .row()
      .text("🔙 Back to Admin Panel", "admin_home");
    return { text, replyMarkup: kb };
  }

  const itemsText = pending
    .slice(0, 5)
    .map((t, idx) => {
      const codeLine = t.twoFactorData
        ? `├ 🔐 *2FA Codes / App Pass:* \`${escapeMd(t.twoFactorData)}\`\n`
        : "";
      return (
        `*#${idx + 1} • ${t.taskId} (${t.taskType})*\n` +
        `├ 👤 *User:* ${escapeMd(t.firstName || "User")} ${t.username ? `(@${escapeMd(t.username)})` : ""} [\`${t.userId}\`]\n` +
        `├ 📧 *Submitted Gmail:* \`${t.email}\`\n` +
        `├ 🔑 *Password:* \`${t.password}\`\n` +
        codeLine +
        `├ 💰 *Reward:* *₹${Number(t.rewardInr).toFixed(2)}*\n` +
        `└ 🕒 *Submitted:* \`${String(t.submittedAt || "").slice(0, 19).replace("T", " ")}\``
      );
    })
    .join("\n\n");

  pending.slice(0, 5).forEach((t) => {
    kb.text(`✅ Approve & Pay (${t.taskId})`, `admin_task_approve_${t.taskId}`)
      .text(`❌ Reject Task`, `admin_task_reject_${t.taskId}`)
      .row();
  });

  kb.text("📑 Submissions History", "admin_task_history")
    .text("🔄 Refresh Queue", "admin_tasks_queue")
    .row()
    .text("🔙 Back to Admin Panel", "admin_home");

  const text =
    `📝 *Pending Gmail Task Queue (${pending.length})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${itemsText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Verify login credentials & confirm user logged out, then Approve or Reject below:_`;

  return { text, replyMarkup: kb };
}

async function computePlatformAnalytics(kv) {
  const userIds = await getUsersIndex(kv);
  const payoutQueue = await getPayoutQueue(kv);
  const taskQueue = await getTaskReviewQueue(kv);

  let totalSubmitted = 0;
  let totalApproved = 0;
  let totalPending = 0;
  let totalRejected = 0;
  let totalWalletBalanceInr = 0;
  let bannedUsersCount = 0;

  for (const id of userIds) {
    const raw = await kv.get(`user:${id}`);
    if (!raw) continue;
    try {
      const u = JSON.parse(raw);
      const approved = Number(u.accounts?.approved || 0);
      const pending = Number(u.accounts?.pending || 0);
      const rejected = Number(u.accounts?.rejected || 0);
      totalApproved += approved;
      totalPending += pending;
      totalRejected += rejected;
      totalSubmitted += approved + pending + rejected;
      totalWalletBalanceInr += Number(u.balanceInr || 0);
      if (u.isBanned) bannedUsersCount += 1;
    } catch {}
  }

  let totalPaidOutInr = 0;
  let totalPendingInr = 0;
  let pendingPayoutCount = 0;
  let completedPayoutCount = 0;

  for (const item of payoutQueue) {
    if (item.status === "COMPLETED") {
      totalPaidOutInr += Number(item.amountInr || 0);
      completedPayoutCount += 1;
    } else if (item.status === "PROCESSING") {
      totalPendingInr += Number(item.amountInr || 0);
      pendingPayoutCount += 1;
    }
  }

  return {
    totalUsers: userIds.length,
    bannedUsersCount,
    totalSubmitted,
    totalApproved,
    totalPending,
    totalRejected,
    queueTotal: taskQueue.length,
    totalWalletBalanceInr,
    totalPaidOutInr,
    totalPendingInr,
    pendingCount: pendingPayoutCount,
    completedCount: completedPayoutCount,
  };
}

function renderAdminAnalyticsText(stats) {
  return (
    `📊 *Real-Time Platform Analytics*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 *User Metrics:*\n` +
    `├ 🪪 *Total Registered Users:* \`${stats.totalUsers}\`\n` +
    `└ 🚫 *Banned Accounts:* \`${stats.bannedUsersCount}\`\n\n` +
    `📑 *Task Verification Ledger:*\n` +
    `├ 📦 *Total Tasks Submitted:* \`${stats.totalSubmitted}\`\n` +
    `├ ✅ *Total Approved:* \`${stats.totalApproved}\`\n` +
    `├ ⏳ *Pending Verification:* \`${stats.totalPending}\`\n` +
    `└ ❌ *Total Rejected:* \`${stats.totalRejected}\`\n\n` +
    `💰 *Financial Ledger (INR):*\n` +
    `├ 👛 *Active Wallet Liability:* \`₹${stats.totalWalletBalanceInr.toFixed(2)}\`\n` +
    `├ 💸 *Total Money Paid Out:* \`₹${stats.totalPaidOutInr.toFixed(2)}\` (\`${stats.completedCount}\` tx)\n` +
    `└ ⏳ *Pending UPI Queue:* \`₹${stats.totalPendingInr.toFixed(2)}\` (\`${stats.pendingCount}\` tx)\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🕒 _Live KV Snapshot: ${new Date().toISOString().slice(11, 19)} UTC_`
  );
}

async function renderAdminTaskSubmissionsHistoryView(kv) {
  const stats = await computePlatformAnalytics(kv);
  const taskQueue = await getTaskReviewQueue(kv);

  const stdCount = taskQueue.filter((t) => t.taskType !== "2-Step Gmail").length;
  const twoFaCount = taskQueue.filter((t) => t.taskType === "2-Step Gmail").length;
  const totalTaskEarningsPaid = taskQueue
    .filter((t) => t.status === "APPROVED")
    .reduce((sum, t) => sum + Number(t.rewardInr || 0), 0);

  const recentLines =
    taskQueue.length > 0
      ? taskQueue
          .slice(0, 8)
          .map((t, idx) => {
            const badge =
              t.status === "APPROVED" ? "✅" : t.status === "REJECTED" ? "❌" : "⏳";
            const typeShort = t.taskType === "2-Step Gmail" ? "2FA" : "Std";
            return (
              `${idx + 1}. ${badge} \`${t.email}\` (${typeShort} • ₹${t.rewardInr})\n` +
              `   └ 👤 User \`#${t.userId}\` • *${t.status}* • ${(t.submittedAt || "").slice(0, 10)}`
            );
          })
          .join("\n")
      : "_No task submissions recorded yet._";

  const text =
    `📑 *Task Submissions History & Audit Log*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Platform-Wide Task Totals:*\n` +
    `├ 📦 *Total Submitted:* \`${stats.totalSubmitted}\` (\`Std: ${stdCount}\` | \`2FA: ${twoFaCount}\`)\n` +
    `├ ✅ *Total Approved:* \`${stats.totalApproved}\`\n` +
    `├ ⏳ *Currently Pending:* \`${stats.totalPending}\`\n` +
    `├ ❌ *Total Rejected:* \`${stats.totalRejected}\`\n` +
    `└ 💰 *Task Rewards Paid:* \`₹${totalTaskEarningsPaid.toFixed(2)}\`\n\n` +
    `🗂️ *Recent Global Submissions:*\n` +
    `${recentLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Filter by User ID to inspect all Gmail IDs & payouts for a specific user:_`;

  const kb = new InlineKeyboard()
    .text("🔍 Filter / Search User by ID", "admin_history_search_user")
    .text("👥 View All Users", "admin_users_list")
    .row()
    .text("📝 Pending Queue", "admin_tasks_queue")
    .text("🔙 Admin Panel", "admin_home");

  return { text, replyMarkup: kb };
}

function renderAdminUserTaskAndPayoutHistoryView(targetUser, taskQueue) {
  const userTasksFromQueue = taskQueue.filter(
    (t) => String(t.userId) === String(targetUser.userId)
  );
  const historyList =
    targetUser.accounts?.history && targetUser.accounts.history.length > 0
      ? targetUser.accounts.history
      : userTasksFromQueue;

  const totalTaskEarningsInr = historyList
    .filter((h) => (h.status || "APPROVED") === "APPROVED")
    .reduce((acc, h) => acc + Number(h.rewardInr || 0), 0);

  const gmailLines =
    historyList.length > 0
      ? historyList
          .slice(0, 10)
          .map((h, i) => {
            const st = h.status || "APPROVED";
            const icon = st === "APPROVED" ? "✅" : st === "REJECTED" ? "❌" : "⏳";
            const typeLabel = h.taskType === "2-Step Gmail" ? "🔐 2FA" : h.taskType === "Social Task" ? "🎯 Social" : "📧 Std";
            const reasonNote = h.rejectReason ? ` _(Reason: ${escapeMd(h.rejectReason)})_` : "";
            return (
              `${i + 1}. ${icon} \`${h.email || h.taskTitle}\` — *₹${Number(h.rewardInr || 0).toFixed(2)}* (${typeLabel})\n` +
              `   └ 📅 \`${String(h.date || h.submittedAt || "").slice(0, 10)}\` • Status: *${st}*${reasonNote}`
            );
          })
          .join("\n")
      : "_No submissions recorded for this user yet._";

  const withdrawals = targetUser.withdrawals || [];
  const totalPaidUpi = withdrawals
    .filter((w) => w.status === "COMPLETED")
    .reduce((s, w) => s + Number(w.amountInr || 0), 0);
  const totalPendingUpi = withdrawals
    .filter((w) => w.status === "PROCESSING")
    .reduce((s, w) => s + Number(w.amountInr || 0), 0);

  const payoutLines =
    withdrawals.length > 0
      ? withdrawals
          .slice(0, 5)
          .map((w, i) => {
            const icon =
              w.status === "COMPLETED" ? "✅" : w.status === "REJECTED" ? "❌" : "⏳";
            return `${i + 1}. ${icon} *₹${Number(w.amountInr).toFixed(2)}* → \`${w.upiId}\` [${w.status}] (${String(w.date || "").slice(0, 10)})`;
          })
          .join("\n")
      : "_No UPI withdrawal requests from this user._";

  const totalSubmitted =
    Number(targetUser.accounts?.approved || 0) +
    Number(targetUser.accounts?.pending || 0) +
    Number(targetUser.accounts?.rejected || 0);

  const text =
    `📑 *User Task & Payout History Report*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *User:* ${escapeMd(targetUser.firstName)} ${targetUser.username ? `(@${escapeMd(targetUser.username)})` : ""} [\`#${targetUser.userId}\`]\n` +
    `├ 📦 *Total Tasks Submitted:* \`${totalSubmitted}\`\n` +
    `├ ✅ *Approved:* \`${targetUser.accounts?.approved || 0}\` | ⏳ *Pending:* \`${targetUser.accounts?.pending || 0}\` | ❌ *Rejected:* \`${targetUser.accounts?.rejected || 0}\`\n` +
    `└ 💰 *Total Earnings:* \`₹${totalTaskEarningsInr.toFixed(2)}\`\n\n` +
    `📋 *Submissions (${historyList.length}):*\n` +
    `${gmailLines}\n\n` +
    `💳 *Payout History Summary (Paid: ₹${totalPaidUpi.toFixed(2)} | Pending: ₹${totalPendingUpi.toFixed(2)}):*\n` +
    `${payoutLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  const kb = new InlineKeyboard()
    .text("👤 Open User Inspector", `admin_user_view_${targetUser.userId}`)
    .text("👥 All Users List", "admin_users_list")
    .row()
    .text("🔙 Submissions History", "admin_task_history")
    .text("🛡️ Admin Panel", "admin_home");

  return { text, replyMarkup: kb };
}

function renderAdminPayoutsView(queue) {
  const pending = queue.filter((p) => p.status === "PROCESSING");
  const kb = new InlineKeyboard();

  if (pending.length === 0) {
    const text =
      `💳 *Manage UPI Payout Queue*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *All caught up!* There are currently \`0\` pending withdrawal requests in the queue.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`;
    kb.text("🔄 Refresh Queue", "admin_payouts")
      .row()
      .text("🔙 Back to Admin Panel", "admin_home");
    return { text, replyMarkup: kb };
  }

  const itemsText = pending
    .slice(0, 5)
    .map(
      (item, idx) =>
        `*#${idx + 1} • ${item.txId}*\n` +
        `├ 👤 *User:* ${escapeMd(item.firstName || "User")} ${item.username ? `(@${escapeMd(item.username)})` : ""} [\`${item.userId}\`]\n` +
        `├ 💰 *Amount:* *₹${Number(item.amountInr).toFixed(2)}*\n` +
        `├ 🏦 *UPI ID:* \`${item.upiId}\`\n` +
        `├ 🪪 *Holder:* \`${escapeMd(item.holderName)}\`\n` +
        `└ 🕒 *Time:* \`${item.date.slice(0, 19).replace("T", " ")}\``
    )
    .join("\n\n");

  pending.slice(0, 5).forEach((item) => {
    kb.text(`✅ Approve / Mark Paid`, `admin_payout_approve_${item.txId}`)
      .text(`❌ Reject & Refund`, `admin_payout_reject_${item.txId}`)
      .row();
  });

  kb.text("🔄 Refresh Queue", "admin_payouts")
    .row()
    .text("🔙 Back to Admin Panel", "admin_home");

  const text =
    `💳 *Manage Pending UPI Payouts (${pending.length})*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${itemsText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Select an action below to mark paid or refund to user wallet:_`;

  return { text, replyMarkup: kb };
}

function renderAdminRatesText(rates) {
  return (
    `🎁 *Set Dynamic Reward Rates*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Update platform payout rates for both task types and withdrawal thresholds in real time:\n\n` +
    `• 📧 *Standard Gmail Task (No 2FA):* \`₹${rates.standardTaskInr.toFixed(2)}\` (\`$${rates.standardTaskUsd.toFixed(2)}\`)\n` +
    `• 🔐 *2-Step Verification Gmail Task (With 2FA):* \`₹${rates.twoFactorTaskInr.toFixed(2)}\` (\`$${rates.twoFactorTaskUsd.toFixed(2)}\`)\n` +
    `• 🎯 *Min Withdrawal:* \`₹${rates.minWithdrawalInr.toFixed(2)}\`\n` +
    `• 👥 *Referral Base Bonus:* \`₹${rates.referralBonusInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Click any rate below to enter a new INR value in chat:_`
  );
}

function renderAdminChannelsText(channels) {
  const list =
    channels.length > 0
      ? channels
          .map((ch, idx) => {
            const id = typeof ch === "string" ? ch : ch.id;
            const title = typeof ch === "string" ? ch : ch.title || ch.id;
            return `${idx + 1}. *${escapeMd(title)}* — \`${id}\``;
          })
          .join("\n")
      : "_No mandatory channels configured. Users can currently access the bot without joining any channel._";

  return (
    `📢 *Manage Force-Join Channels*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Users must be a member of all channels listed below before they can access \`/start\` or any bot submenu.\n\n` +
    `📋 *Active Required Channels (${channels.length}):*\n` +
    `${list}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ _Ensure this bot is added as an Administrator in every channel so it can call \`getChatMember\`._`
  );
}

function renderAdminManageAdminsText(env, subAdmins) {
  const superId = env.ADMIN_CHAT_ID || "Not Configured";
  const subList =
    subAdmins.length > 0
      ? subAdmins
          .map(
            (a, i) =>
              `${i + 1}. \`${a.id}\` — Added ${String(a.addedAt || "").slice(0, 10)} (by \`${a.addedBy}\`)`
          )
          .join("\n")
      : "_No secondary admins added yet._";

  return (
    `🛡️ *Manage Platform Administrators*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👑 *Super Admin (env.ADMIN_CHAT_ID):*\n` +
    `• \`${superId}\` _(Protected — Cannot be removed)_\n\n` +
    `👥 *Secondary Admins (${subAdmins.length}):*\n` +
    `${subList}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Add or revoke secondary admin privileges below:_`
  );
}

function renderAdminInspectUserText(targetUser) {
  const lastUpi =
    targetUser.withdrawals && targetUser.withdrawals.length > 0
      ? `${targetUser.withdrawals[0].upiId} (${targetUser.withdrawals[0].holderName})`
      : "None submitted yet";

  return (
    `🔍 *User Profile Inspector*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 *User ID:* \`${targetUser.userId}\`\n` +
    `👤 *Name:* ${escapeMd(targetUser.firstName)} ${targetUser.username ? `(@${escapeMd(targetUser.username)})` : ""}\n` +
    `🚦 *Account Status:* ${targetUser.isBanned ? "🚫 *BANNED*" : "🟢 *ACTIVE*"}\n` +
    `🔄 *Current Session State:* \`${targetUser.state}\`\n\n` +
    `💰 *Wallet & Task Ledger:*\n` +
    `├ 👛 *Available Balance:* \`₹${Number(targetUser.balanceInr).toFixed(2)}\`\n` +
    `├ 📈 *Lifetime Earnings:* \`₹${Number(targetUser.lifetimeInr).toFixed(2)}\`\n` +
    `├ ✅ *Approved Tasks:* \`${targetUser.accounts?.approved || 0}\`\n` +
    `├ ⏳ *Pending Tasks:* \`${targetUser.accounts?.pending || 0}\`\n` +
    `├ ❌ *Rejected Tasks:* \`${targetUser.accounts?.rejected || 0}\`\n` +
    `├ 👥 *Referrals Invited:* \`${targetUser.referrals?.invitedCount || 0}\`\n` +
    `└ 🏦 *Last UPI Used:* \`${escapeMd(lastUpi)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Modify balance, inspect submission history, or toggle ban below:_`
  );
}

function renderAdminMaintenanceText(maint) {
  return (
    `⚙️ *System Maintenance Mode*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📡 *Current Status:* ${maint.enabled ? "🔴 *MAINTENANCE ACTIVE*" : "🟢 *NORMAL OPERATION*"}\n` +
    `🕒 *Last Toggled:* \`${String(maint.updatedAt || "").slice(0, 19).replace("T", " ")} UTC\`\n\n` +
    `ℹ️ *How Maintenance Mode Works:*\n` +
    `• When *ENABLED*, all non-admin users receive a clean maintenance notice when clicking buttons or sending messages.\n` +
    `• Super Admins and Secondary Admins bypass maintenance mode completely for live testing.\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function renderAdminSystemResetWarningText() {
  return (
    `⚠️ *FACTORY RESET / WIPE PLATFORM DATA*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚨 *CRITICAL WARNING — 2-STEP CONFIRMATION*\n\n` +
    `Are you sure you want to reset all platform data to *0*?\n\n` +
    `*This action will immediately:*\n` +
    `• Reset all user wallet balances & lifetime earnings to \`₹0.00\`\n` +
    `• Reset all user approved, pending, and rejected account counts to \`0\`\n` +
    `• Clear all user referral trees and withdrawal histories\n` +
    `• Clear all review queues and custom tasks\n\n` +
    `✅ _Super Admin configuration, secondary admins, force-join channels, and reward rates will be preserved._\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Confirm below only if you want a 100% fresh clean slate:_`
  );
}

// ============================================================================
// 9. SAFE MESSAGE EDITOR
// ============================================================================
async function editOrReply(ctx, text, replyMarkup) {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
        disable_web_page_preview: true,
      });
      return;
    } catch (err) {
      if (String(err?.description || err?.message || "").includes("message is not modified")) {
        return;
      }
    }
  }
  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
  });
}

// ============================================================================
// 10. SUBMISSION HELPERS
// ============================================================================
async function submitTaskForManualVerification(
  ctx,
  kv,
  env,
  user,
  task,
  submittedEmail,
  twoFactorData = null
) {
  const submittedAt = new Date().toISOString();
  const rewardInr = Number(task.rewardInr || DEFAULT_RATES.standardTaskInr);
  const taskType = task.taskType || "Normal Gmail";
  const finalEmail = String(submittedEmail || task.email).trim().toLowerCase();

  if (task.customTaskId) {
    const adminTasks = await getAdminTasks(kv);
    const targetAdminTask = adminTasks.find((t) => t.customTaskId === task.customTaskId);
    if (targetAdminTask && Number(targetAdminTask.remainingSlots) > 0) {
      targetAdminTask.remainingSlots = Math.max(0, Number(targetAdminTask.remainingSlots) - 1);
      targetAdminTask.completedSlots = Number(targetAdminTask.completedSlots || 0) + 1;
      await saveAdminTasks(kv, adminTasks);
    }
  }

  const queueEntry = {
    taskId: task.taskId,
    customTaskId: task.customTaskId || null,
    userId: String(user.userId),
    username: user.username || "",
    firstName: user.firstName || "User",
    email: finalEmail,
    password: task.password,
    birthYear: task.birthYear,
    taskType,
    twoFactorData: twoFactorData || null,
    rewardInr,
    status: "PENDING",
    submittedAt,
  };

  user.accounts.pending = Number(user.accounts.pending || 0) + 1;
  user.accounts.history.unshift({
    taskId: task.taskId,
    customTaskId: task.customTaskId || null,
    email: finalEmail,
    password: task.password,
    taskType,
    twoFactorData: twoFactorData || null,
    rewardInr,
    status: "PENDING",
    date: submittedAt,
  });
  user.currentTask = null;
  user.state = "IDLE";
  await saveUserData(kv, user);

  const reviewQueue = await getTaskReviewQueue(kv);
  reviewQueue.unshift(queueEntry);
  await saveTaskReviewQueue(kv, reviewQueue);

  if (env.ADMIN_CHAT_ID) {
    const twoFactorLine = twoFactorData
      ? `🔐 *2FA Backup / App Pass:* \`${escapeMd(twoFactorData)}\`\n`
      : "";
    const adminAlertText =
      `🔔 *NEW GMAIL TASK SUBMITTED FOR REVIEW*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Task ID:* \`${queueEntry.taskId}\`${queueEntry.customTaskId ? ` (\`${queueEntry.customTaskId}\`)` : ""}\n` +
      `🏷️ *Task Type:* *${queueEntry.taskType}*\n` +
      `👤 *User:* ${escapeMd(queueEntry.firstName)} ${queueEntry.username ? `(@${escapeMd(queueEntry.username)})` : ""}\n` +
      `🔢 *User ID:* \`${queueEntry.userId}\`\n` +
      `📧 *Submitted Gmail:* \`${queueEntry.email}\`\n` +
      `🔑 *Password:* \`${queueEntry.password}\`\n` +
      twoFactorLine +
      `💰 *Reward on Approval:* *₹${rewardInr.toFixed(2)}*\n` +
      `🕒 *Submitted At:* \`${submittedAt}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 _Log into the account to verify, then Approve or Reject:_`;

    const adminTaskKb = new InlineKeyboard()
      .text("✅ Approve & Pay", `admin_task_approve_${queueEntry.taskId}`)
      .text("❌ Reject Task", `admin_task_reject_${queueEntry.taskId}`);

    try {
      const primaryAdminChat = String(env.ADMIN_CHAT_ID).split(",")[0].trim();
      await ctx.api.sendMessage(primaryAdminChat, adminAlertText, {
        parse_mode: "Markdown",
        reply_markup: adminTaskKb,
      });
    } catch (err) {
      console.error("Failed to send admin task verification alert:", err);
    }
  }

  return queueEntry;
}

// ============================================================================
// 11. BOT FACTORY, MIDDLEWARE & HANDLER REGISTRATION
// ============================================================================
function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);
  const kv = env.BOT_KV;

  // GLOBAL ACCESS, BAN, MAINTENANCE & MANDATORY FORCE-JOIN MIDDLEWARE
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from) return next();

    const isAdmin = await isAuthorizedAdmin(kv, env, from.id);
    const callbackData = ctx.callbackQuery?.data || "";

    if (
      (ctx.message?.text && ctx.message.text.trim().startsWith("/admin")) ||
      callbackData.startsWith("admin_")
    ) {
      if (!isAdmin) {
        if (ctx.callbackQuery) {
          await ctx.answerCallbackQuery({
            text: "⛔ Unauthorized: Admin privileges required.",
            show_alert: true,
          });
        } else {
          await ctx.reply("⛔ *Access Denied:* You are not authorized to access the Admin Panel.", {
            parse_mode: "Markdown",
          });
        }
        return;
      }
      return next();
    }

    if (isAdmin) {
      return next();
    }

    const user = await getUserData(kv, from.id, from.first_name, from.username);
    if (user.isBanned) {
      const banMsg =
        `🚫 *Account Suspended*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Your account (\`#${from.id}\`) has been restricted by an administrator.`;
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: "🚫 Your account has been suspended by an administrator.",
          show_alert: true,
        });
      } else {
        await ctx.reply(banMsg, { parse_mode: "Markdown" });
      }
      return;
    }

    const maint = await getMaintenanceState(kv);
    if (maint.enabled) {
      const maintText =
        `🛠️ *Scheduled Maintenance in Progress*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `We are currently upgrading our verification servers and payout gateway.\n\n` +
        `⏳ _Your wallet balance and task history are 100% safe. Please check back shortly!_`;
      const maintKb = new InlineKeyboard().text("🔄 Check Status", "menu_home");
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: "🛠️ System is currently under maintenance. Please try again shortly!",
          show_alert: true,
        });
      }
      await editOrReply(ctx, maintText, maintKb);
      return;
    }

    if (callbackData === "force_join_check") {
      const check = await checkForceJoinMembership(ctx, kv, from.id);
      if (!check.passed) {
        await ctx.answerCallbackQuery({
          text: "❌ You haven't joined all required channels yet! Please join them first.",
          show_alert: true,
        });
        const screen = buildForceJoinScreen(check.missingChannels);
        await editOrReply(ctx, screen.text, screen.replyMarkup);
        return;
      }
      await ctx.answerCallbackQuery({
        text: "✅ Verification successful! Welcome to the dashboard.",
        show_alert: false,
      });
      await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard(false));
      return;
    }

    const forceCheck = await checkForceJoinMembership(ctx, kv, from.id);
    if (!forceCheck.passed) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: "🔒 Please join our required channel(s) first to continue.",
          show_alert: true,
        });
      }
      const screen = buildForceJoinScreen(forceCheck.missingChannels);
      await editOrReply(ctx, screen.text, screen.replyMarkup);
      return;
    }

    return next();
  });

  // ==========================================================================
  // ADMIN PANEL COMMAND (/admin) & CALLBACK HANDLERS
  // ==========================================================================
  bot.command("admin", async (ctx) => {
    const from = ctx.from;
    const adminUser = await getUserData(kv, from.id, from.first_name, from.username);
    adminUser.state = "IDLE";
    adminUser.adminContext = {};
    await saveUserData(kv, adminUser);

    const text = await renderAdminDashboardText(kv, env, from.id);
    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: buildAdminDashboardKeyboard(),
    });
  });

  bot.callbackQuery("admin_home", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    adminUser.adminContext = {};
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    const text = await renderAdminDashboardText(kv, env, ctx.from.id);
    await editOrReply(ctx, text, buildAdminDashboardKeyboard());
  });

  bot.callbackQuery("admin_close", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    adminUser.adminContext = {};
    await saveUserData(kv, adminUser);

    const isAdmin = await isAuthorizedAdmin(kv, env, ctx.from.id);
    await ctx.answerCallbackQuery({ text: "Admin panel closed." });
    await editOrReply(ctx, renderHomeText(adminUser), buildMainMenuKeyboard(isAdmin));
  });

  // ==========================================================================
  // NEW ADMIN FEATURE: ➕ ADD SOCIAL / NON-GMAIL CUSTOM TASK
  // ==========================================================================
  bot.callbackQuery("admin_social_task_add", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_SOCIAL_TITLE";
    adminUser.adminContext = { socialDraft: {} };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➕ *Create Non-Gmail Social Task — Step 1 of 5*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Send the Task Title in chat (e.g. "Join Telegram Channel" or "Subscribe YouTube Channel"):*`,
      buildAdminCancelInputKeyboard("admin_home")
    );
  });

  bot.callbackQuery("admin_social_tasks_manage", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    const socialTasks = await getCustomSocialTasks(kv);
    const view = renderAdminManageSocialTasksView(socialTasks);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_social_task_del_(.+)$/, async (ctx) => {
    const socialTaskId = ctx.match[1];
    let socialTasks = await getCustomSocialTasks(kv);
    socialTasks = socialTasks.filter((t) => t.socialTaskId !== socialTaskId);
    await saveCustomSocialTasks(kv, socialTasks);

    await ctx.answerCallbackQuery({
      text: `🗑️ Social Task ${socialTaskId} deleted!`,
      show_alert: true,
    });
    const view = renderAdminManageSocialTasksView(socialTasks);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery("admin_social_queue", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    const socialQueue = await getCustomSocialQueue(kv);
    const view = renderAdminSocialQueueView(socialQueue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_social_approve_(.+)$/, async (ctx) => {
    const submissionId = ctx.match[1];
    const socialQueue = await getCustomSocialQueue(kv);
    const idx = socialQueue.findIndex((s) => s.submissionId === submissionId);

    if (idx === -1 || socialQueue[idx].status !== "PENDING") {
      await ctx.answerCallbackQuery({ text: "⚠️ Submission not found or already reviewed.", show_alert: true });
      return;
    }

    const item = socialQueue[idx];
    item.status = "APPROVED";
    item.reviewedAt = new Date().toISOString();
    await saveCustomSocialQueue(kv, socialQueue);

    const targetUser = await getUserData(kv, item.userId, item.firstName, item.username);
    targetUser.balanceInr += Number(item.rewardInr);
    targetUser.lifetimeInr += Number(item.rewardInr);
    targetUser.accounts.approved = Number(targetUser.accounts.approved || 0) + 1;
    targetUser.accounts.history.unshift({
      taskTitle: item.taskTitle,
      rewardInr: item.rewardInr,
      taskType: "Social Task",
      status: "APPROVED",
      date: new Date().toISOString(),
    });
    await saveUserData(kv, targetUser);

    try {
      await ctx.api.sendMessage(
        item.userId,
        `🎉 *Social Task Approved & Paid!*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📌 *Task:* ${escapeMd(item.taskTitle)}\n` +
          `💵 *Reward Credited:* *+₹${Number(item.rewardInr).toFixed(2)}*\n` +
          `👛 *Updated Wallet Balance:* \`₹${targetUser.balanceInr.toFixed(2)}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`,
        { parse_mode: "Markdown" }
      );
    } catch {}

    await ctx.answerCallbackQuery({
      text: `✅ Approved proof ${submissionId}! +₹${item.rewardInr} credited.`,
      show_alert: true,
    });

    const view = renderAdminSocialQueueView(socialQueue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_social_reject_(.+)$/, async (ctx) => {
    const submissionId = ctx.match[1];
    const socialQueue = await getCustomSocialQueue(kv);
    const idx = socialQueue.findIndex((s) => s.submissionId === submissionId && s.status === "PENDING");

    if (idx === -1) {
      await ctx.answerCallbackQuery({ text: "⚠️ Submission not found.", show_alert: true });
      return;
    }

    const item = socialQueue[idx];
    item.status = "REJECTED";
    item.reviewedAt = new Date().toISOString();
    await saveCustomSocialQueue(kv, socialQueue);

    const targetUser = await getUserData(kv, item.userId, item.firstName, item.username);
    targetUser.accounts.rejected = Number(targetUser.accounts.rejected || 0) + 1;
    targetUser.accounts.history.unshift({
      taskTitle: item.taskTitle,
      rewardInr: item.rewardInr,
      taskType: "Social Task",
      status: "REJECTED",
      date: new Date().toISOString(),
    });
    await saveUserData(kv, targetUser);

    try {
      await ctx.api.sendMessage(
        item.userId,
        `❌ *Social Task Submission Rejected*\nTask: ${escapeMd(item.taskTitle)}\nProof was invalid or incomplete.`,
        { parse_mode: "Markdown" }
      );
    } catch {}

    await ctx.answerCallbackQuery({ text: `❌ Rejected submission ${submissionId}.`, show_alert: true });
    const view = renderAdminSocialQueueView(socialQueue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  // EXISTING ADMIN FEATURES
  bot.callbackQuery("admin_task_add", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    adminUser.adminContext = {};
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➕ *Create / Add New Custom Gmail Task*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Step 1 of 5:* Select the *Task Type* you want users to register:\n\n` +
        `• *📧 Standard Gmail*\n` +
        `• *🔐 2-Step Verification Gmail (2FA)*`,
      buildAdminCreateTaskTypeKeyboard()
    );
  });

  bot.callbackQuery("admin_newtask_type_standard", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_NEWTASK_EMAIL";
    adminUser.adminContext = { draftTask: { taskType: "Normal Gmail" } };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `📧 *Create Standard Gmail Task — Step 2 of 5*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Enter the Target Gmail Address or Username Pattern in chat:*`,
      buildAdminCancelInputKeyboard("admin_task_add")
    );
  });

  bot.callbackQuery("admin_newtask_type_2fa", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_NEWTASK_EMAIL";
    adminUser.adminContext = { draftTask: { taskType: "2-Step Gmail" } };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `🔐 *Create 2-Step Verification Task — Step 2 of 5*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Enter the Target Gmail Address or Username Pattern in chat:*`,
      buildAdminCancelInputKeyboard("admin_task_add")
    );
  });

  bot.callbackQuery("admin_newtask_skip_reward", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const draft = adminUser.adminContext?.draftTask || { taskType: "Normal Gmail" };
    const defaultReward = draft.taskType === "2-Step Gmail" ? rates.twoFactorTaskInr : rates.standardTaskInr;

    draft.rewardInr = defaultReward;
    adminUser.adminContext = { draftTask: draft };
    adminUser.state = "AWAITING_NEWTASK_SLOTS";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery({ text: `Default reward ₹${defaultReward} selected!` });
    await editOrReply(
      ctx,
      `🎯 *Create Custom Task — Step 5 of 5 (Target Quantity / Slots)*\n📝 *Enter the Target Quantity / Slots available (e.g. \`10\`):*`,
      buildAdminCancelInputKeyboard("admin_task_add")
    );
  });

  bot.callbackQuery("admin_tasks_manage", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    const adminTasks = await getAdminTasks(kv);
    const view = renderAdminManageCustomTasksView(adminTasks);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_custom_task_del_(.+)$/, async (ctx) => {
    const customTaskId = ctx.match[1];
    let adminTasks = await getAdminTasks(kv);
    adminTasks = adminTasks.filter((t) => t.customTaskId !== customTaskId);
    await saveAdminTasks(kv, adminTasks);

    await ctx.answerCallbackQuery({ text: `🗑️ Custom Task ${customTaskId} deleted!`, show_alert: true });
    const view = renderAdminManageCustomTasksView(adminTasks);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery("admin_users_list", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    const view = await renderAdminUsersListPaginatedView(kv, 0);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_users_page_(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]) || 0;
    await ctx.answerCallbackQuery();
    const view = await renderAdminUsersListPaginatedView(kv, page);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery("admin_system_reset", async (ctx) => {
    if (!isSuperAdminId(env, ctx.from.id)) {
      await ctx.answerCallbackQuery({ text: "⛔ Super Admin access required.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminSystemResetWarningText(), buildAdminSystemResetConfirmKeyboard());
  });

  bot.callbackQuery("admin_system_reset_confirm", async (ctx) => {
    if (!isSuperAdminId(env, ctx.from.id)) return;
    const userIds = await getUsersIndex(kv);
    for (const uid of userIds) {
      const u = await getUserData(kv, uid);
      u.balanceInr = 0;
      u.lifetimeInr = 0;
      u.state = "IDLE";
      u.adminContext = {};
      u.currentTask = null;
      u.accounts = { approved: 0, pending: 0, rejected: 0, history: [] };
      u.withdrawals = [];
      await saveUserData(kv, u);
    }
    await saveTaskReviewQueue(kv, []);
    await savePayoutQueue(kv, []);
    await saveAdminTasks(kv, []);
    await saveCustomSocialTasks(kv, []);
    await saveCustomSocialQueue(kv, []);

    await ctx.answerCallbackQuery({ text: "✅ Factory Reset Complete!", show_alert: true });
    const text = await renderAdminDashboardText(kv, env, ctx.from.id);
    await editOrReply(ctx, text, buildAdminDashboardKeyboard());
  });

  bot.callbackQuery("admin_tasks_queue", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    const taskQueue = await getTaskReviewQueue(kv);
    const view = renderAdminTaskQueueView(taskQueue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_task_approve_(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const taskQueue = await getTaskReviewQueue(kv);
    const idx = taskQueue.findIndex((t) => t.taskId === taskId);

    if (idx === -1 || taskQueue[idx].status !== "PENDING") {
      await ctx.answerCallbackQuery({ text: "⚠️ Task not found.", show_alert: true });
      return;
    }

    const taskItem = taskQueue[idx];
    taskItem.status = "APPROVED";
    await saveTaskReviewQueue(kv, taskQueue);

    const rewardInr = Number(taskItem.rewardInr || DEFAULT_RATES.standardTaskInr);
    const targetUser = await getUserData(kv, taskItem.userId, taskItem.firstName, taskItem.username);
    targetUser.balanceInr += rewardInr;
    targetUser.lifetimeInr += rewardInr;
    targetUser.accounts.pending = Math.max(0, Number(targetUser.accounts.pending || 1) - 1);
    targetUser.accounts.approved = Number(targetUser.accounts.approved || 0) + 1;
    const histEntry = targetUser.accounts.history.find((h) => h.taskId === taskId);
    if (histEntry) histEntry.status = "APPROVED";
    await saveUserData(kv, targetUser);

    try {
      await ctx.api.sendMessage(
        taskItem.userId,
        `🎉 *Gmail Task Approved & Paid!*\n` +
          `🆔 Task ID: \`${taskItem.taskId}\`\n` +
          `💵 Reward: *+₹${rewardInr.toFixed(2)}*\n` +
          `👛 Wallet Balance: \`₹${targetUser.balanceInr.toFixed(2)}\``,
        { parse_mode: "Markdown" }
      );
    } catch {}

    await ctx.answerCallbackQuery({ text: `✅ Task ${taskId} Approved!`, show_alert: true });
    const view = renderAdminTaskQueueView(taskQueue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_task_reject_(.+)$/, async (ctx) => {
    const taskId = ctx.match[1];
    const taskQueue = await getTaskReviewQueue(kv);
    const taskItem = taskQueue.find((t) => t.taskId === taskId && t.status === "PENDING");
    if (!taskItem) return;

    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_TASK_REJECT_REASON";
    adminUser.adminContext = { targetTaskId: taskId };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send rejection reason in chat:*`, buildAdminCancelInputKeyboard("admin_tasks_queue"));
  });

  bot.callbackQuery("admin_task_history", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    const view = await renderAdminTaskSubmissionsHistoryView(kv);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery("admin_history_search_user", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_HISTORY_USER_ID";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `🔍 *Send numerical User ID in chat:*`, buildAdminCancelInputKeyboard("admin_task_history"));
  });

  bot.callbackQuery(/^admin_user_history_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const targetUser = await getUserData(kv, targetId);
    const taskQueue = await getTaskReviewQueue(kv);
    const view = renderAdminUserTaskAndPayoutHistoryView(targetUser, taskQueue);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery("admin_analytics", async (ctx) => {
    await ctx.answerCallbackQuery();
    const stats = await computePlatformAnalytics(kv);
    const kb = new InlineKeyboard()
      .text("📑 Submissions History", "admin_task_history")
      .text("👥 All Users", "admin_users_list")
      .row()
      .text("🔄 Refresh Metrics", "admin_analytics")
      .text("🔙 Admin Panel", "admin_home");
    await editOrReply(ctx, renderAdminAnalyticsText(stats), kb);
  });

  bot.callbackQuery("admin_payouts", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    const queue = await getPayoutQueue(kv);
    const view = renderAdminPayoutsView(queue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_payout_approve_(.+)$/, async (ctx) => {
    const txId = ctx.match[1];
    const queue = await getPayoutQueue(kv);
    const itemIndex = queue.findIndex((p) => p.txId === txId);
    if (itemIndex === -1) return;

    const payout = queue[itemIndex];
    payout.status = "COMPLETED";
    await savePayoutQueue(kv, queue);

    const targetUser = await getUserData(kv, payout.userId);
    const userTx = targetUser.withdrawals.find((w) => w.txId === txId);
    if (userTx) userTx.status = "COMPLETED";
    await saveUserData(kv, targetUser);

    try {
      await ctx.api.sendMessage(payout.userId, `🎉 *UPI Payout Approved & Paid!*\n₹${Number(payout.amountInr).toFixed(2)} transferred to \`${payout.upiId}\``, { parse_mode: "Markdown" });
    } catch {}

    await ctx.answerCallbackQuery({ text: `✅ Payout ${txId} marked PAID!`, show_alert: true });
    const view = renderAdminPayoutsView(queue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_payout_reject_(.+)$/, async (ctx) => {
    const txId = ctx.match[1];
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_REJECT_REASON";
    adminUser.adminContext = { targetTxId: txId };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `❌ *Send payout rejection reason in chat:*`, buildAdminCancelInputKeyboard("admin_payouts"));
  });

  bot.callbackQuery("admin_rates", async (ctx) => {
    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminRatesText(rates), buildAdminRatesKeyboard(rates));
  });

  bot.callbackQuery("admin_rate_task", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_TASK";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send new Standard Gmail Task Rate (INR):*`, buildAdminCancelInputKeyboard("admin_rates"));
  });

  bot.callbackQuery("admin_rate_2fa_task", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_2FA_TASK";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send new 2FA Gmail Task Rate (INR):*`, buildAdminCancelInputKeyboard("admin_rates"));
  });

  bot.callbackQuery("admin_rate_min_withdraw", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_MIN_WITHDRAW";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send new Minimum Withdrawal Threshold (INR):*`, buildAdminCancelInputKeyboard("admin_rates"));
  });

  bot.callbackQuery("admin_rate_referral", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_REFERRAL";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send new Referral Bonus Rate (INR):*`, buildAdminCancelInputKeyboard("admin_rates"));
  });

  bot.callbackQuery("admin_rate_reset", async (ctx) => {
    await putKvJson(kv, "config:rates", DEFAULT_RATES);
    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery({ text: "✅ Rates reset to default!", show_alert: true });
    await editOrReply(ctx, renderAdminRatesText(rates), buildAdminRatesKeyboard(rates));
  });

  bot.callbackQuery("admin_channels", async (ctx) => {
    const channels = await getForceChannels(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminChannelsText(channels), buildAdminForceChannelsKeyboard(channels));
  });

  bot.callbackQuery("admin_channel_add", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_FORCE_CHANNEL";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `➕ *Forward message from channel or send @username:*`, buildAdminCancelInputKeyboard("admin_channels"));
  });

  bot.callbackQuery("admin_channel_remove_menu", async (ctx) => {
    const channels = await getForceChannels(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `➖ *Select channel to remove:*`, buildAdminRemoveChannelListKeyboard(channels));
  });

  bot.callbackQuery(/^admin_channel_del_(\d+)$/, async (ctx) => {
    const idx = Number(ctx.match[1]);
    const channels = await getForceChannels(kv);
    if (idx >= 0 && idx < channels.length) {
      channels.splice(idx, 1);
      await saveForceChannels(kv, channels);
    }
    await ctx.answerCallbackQuery({ text: "🗑️ Channel removed!", show_alert: true });
    await editOrReply(ctx, renderAdminChannelsText(channels), buildAdminForceChannelsKeyboard(channels));
  });

  bot.callbackQuery("admin_admins", async (ctx) => {
    const subAdmins = await getSecondaryAdmins(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminManageAdminsText(env, subAdmins), buildAdminManageAdminsKeyboard(subAdmins));
  });

  bot.callbackQuery("admin_sub_add", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_ADMIN_ID";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send numerical User ID for new admin:*`, buildAdminCancelInputKeyboard("admin_admins"));
  });

  bot.callbackQuery("admin_sub_remove_menu", async (ctx) => {
    const subAdmins = await getSecondaryAdmins(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `➖ *Select admin to revoke:*`, buildAdminRemoveSubAdminKeyboard(subAdmins));
  });

  bot.callbackQuery(/^admin_sub_del_(.+)$/, async (ctx) => {
    const targetId = String(ctx.match[1]).trim();
    if (isSuperAdminId(env, targetId)) return;
    let subAdmins = await getSecondaryAdmins(kv);
    subAdmins = subAdmins.filter((a) => String(a.id) !== targetId);
    await putKvJson(kv, "config:admins", subAdmins);
    await ctx.answerCallbackQuery({ text: "🗑️ Admin revoked.", show_alert: true });
    await editOrReply(ctx, renderAdminManageAdminsText(env, subAdmins), buildAdminManageAdminsKeyboard(subAdmins));
  });

  bot.callbackQuery("admin_broadcast", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_BROADCAST";
    await saveUserData(kv, adminUser);
    const userIds = await getUsersIndex(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📣 *Send or forward broadcast message (${userIds.length} users):*`, buildAdminCancelInputKeyboard("admin_home"));
  });

  bot.callbackQuery("admin_inspect", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_INSPECT_USER_ID";
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `🔍 *Send User ID to inspect:*`, buildAdminCancelInputKeyboard("admin_home"));
  });

  bot.callbackQuery(/^admin_user_view_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const targetUser = await getUserData(kv, targetId);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminInspectUserText(targetUser), buildAdminInspectUserKeyboard(targetUser));
  });

  bot.callbackQuery(/^admin_user_addbal_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_USER_ADD_BAL";
    adminUser.adminContext = { targetUserId: targetId };
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send INR amount to add:*`, buildAdminCancelInputKeyboard(`admin_user_view_${targetId}`));
  });

  bot.callbackQuery(/^admin_user_deductbal_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_USER_DEDUCT_BAL";
    adminUser.adminContext = { targetUserId: targetId };
    await saveUserData(kv, adminUser);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `📝 *Send INR amount to deduct:*`, buildAdminCancelInputKeyboard(`admin_user_view_${targetId}`));
  });

  bot.callbackQuery(/^admin_user_toggleban_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const targetUser = await getUserData(kv, targetId);
    targetUser.isBanned = !targetUser.isBanned;
    await saveUserData(kv, targetUser);
    await ctx.answerCallbackQuery({ text: targetUser.isBanned ? "🚫 Banned" : "🟢 Unbanned", show_alert: true });
    await editOrReply(ctx, renderAdminInspectUserText(targetUser), buildAdminInspectUserKeyboard(targetUser));
  });

  bot.callbackQuery("admin_maintenance", async (ctx) => {
    const maint = await getMaintenanceState(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminMaintenanceText(maint), buildAdminMaintenanceKeyboard(maint));
  });

  bot.callbackQuery("admin_maintenance_toggle", async (ctx) => {
    const maint = await getMaintenanceState(kv);
    maint.enabled = !maint.enabled;
    maint.updatedAt = new Date().toISOString();
    await putKvJson(kv, "config:maintenance", maint);
    await ctx.answerCallbackQuery({ text: maint.enabled ? "🔴 Maintenance ON" : "🟢 Maintenance OFF", show_alert: true });
    await editOrReply(ctx, renderAdminMaintenanceText(maint), buildAdminMaintenanceKeyboard(maint));
  });

  // ==========================================================================
  // NON-GMAIL CUSTOM TASKS (USER FLOW)
  // ==========================================================================
  bot.callbackQuery("menu_custom_tasks", async (ctx) => {
    const socialTasks = await getCustomSocialTasks(kv);
    const activeTasks = socialTasks.filter((t) => Number(t.remainingSlots || 0) > 0);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);

    const kb = new InlineKeyboard();
    if (activeTasks.length === 0) {
      kb.text("🏠 Main Menu", "menu_home");
      await ctx.answerCallbackQuery();
      await editOrReply(
        ctx,
        `🎯 *Non-Gmail Custom Tasks*\n━━━━━━━━━━━━━━━━━━━━━━\n_No active social tasks available right now. Check back soon for new earning tasks!_`,
        kb
      );
      return;
    }

    activeTasks.slice(0, 8).forEach((t) => {
      kb.text(`📌 ${t.title} (₹${t.rewardInr})`, `claim_social_task_${t.socialTaskId}`).row();
    });
    kb.text("🔙 Back to Main Menu", "menu_home");

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `🎯 *Available Custom Social Tasks*\n━━━━━━━━━━━━━━━━━━━━━━\nSelect any task below to complete and earn instant INR rewards:`,
      kb
    );
  });

  bot.callbackQuery(/^claim_social_task_(.+)$/, async (ctx) => {
    const socialTaskId = ctx.match[1];
    const socialTasks = await getCustomSocialTasks(kv);
    const found = socialTasks.find((t) => t.socialTaskId === socialTaskId && Number(t.remainingSlots || 0) > 0);

    if (!found) {
      await ctx.answerCallbackQuery({ text: "⚠️ Task is no longer available or slots are full.", show_alert: true });
      return;
    }

    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.currentSocialTask = found;
    user.state = "AWAITING_CUSTOM_TASK_PROOF";
    await saveUserData(kv, user);

    const kb = new InlineKeyboard()
      .url("🔗 Open Task Link", found.link)
      .row()
      .text("🚫 Cancel Task", "menu_custom_tasks");

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `📌 *Task: ${escapeMd(found.title)}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Instructions:* ${escapeMd(found.description || "Complete the required action at the link below.")}\n` +
        `💰 *Reward:* *₹${Number(found.rewardInr).toFixed(2)}*\n\n` +
        `👇 *Step 1:* Tap *Open Task Link* above.\n` +
        `👇 *Step 2:* Complete the task, then type and send your *proof* (e.g. your Telegram username, screenshot confirmation text, or joined handle) in chat below:`,
      kb
    );
  });

  // ==========================================================================
  // STANDARD USER FLOWS
  // ==========================================================================
  bot.command(["start", "home"], async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const existingRaw = await kv.get(`user:${from.id}`);
    const isNewUser = !existingRaw;
    const user = await getUserData(kv, from.id, from.first_name, from.username);
    const isAdmin = await isAuthorizedAdmin(kv, env, from.id);

    user.state = "IDLE";

    const payload = ctx.match ? String(ctx.match).trim() : "";
    if (isNewUser && payload.startsWith("ref_")) {
      const referrerId = payload.replace("ref_", "").trim();
      if (referrerId && referrerId !== String(from.id)) {
        const referrerRaw = await kv.get(`user:${referrerId}`);
        if (referrerRaw) {
          user.referrals.referredBy = referrerId;
          user.referrals.referralBonusPaid = false;
        }
      }
    }

    await saveUserData(kv, user);
    await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard(isAdmin));
  });

  bot.callbackQuery("menu_home", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const isAdmin = await isAuthorizedAdmin(kv, env, ctx.from.id);
    user.state = "IDLE";
    user.currentSocialTask = null;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard(isAdmin));
  });

  bot.callbackQuery("menu_register", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const adminTasks = await getAdminTasks(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();

    if (user.currentTask) {
      await editOrReply(ctx, renderRegisterTaskText(user.currentTask), buildTaskKeyboard(user.currentTask));
      return;
    }

    await editOrReply(ctx, renderTaskTypeSelectText(rates, adminTasks), buildTaskTypeSelectorKeyboard(rates, adminTasks));
  });

  bot.callbackQuery(/^claim_admin_task_(.+)$/, async (ctx) => {
    const customTaskId = ctx.match[1];
    const adminTasks = await getAdminTasks(kv);
    const rates = await getDynamicRates(kv);
    const found = adminTasks.find((t) => t.customTaskId === customTaskId && Number(t.remainingSlots || 0) > 0);

    if (!found) {
      await ctx.answerCallbackQuery({ text: "⚠️ Task has no remaining slots.", show_alert: true });
      await editOrReply(ctx, renderTaskTypeSelectText(rates, adminTasks), buildTaskTypeSelectorKeyboard(rates, adminTasks));
      return;
    }

    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    user.currentTask = buildTaskFromAdminSpec(found);
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery({ text: `🎯 Assigned Task!` });
    await editOrReply(ctx, renderRegisterTaskText(user.currentTask), buildTaskKeyboard(user.currentTask));
  });

  bot.callbackQuery("task_change_type", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const adminTasks = await getAdminTasks(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.currentTask = null;
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderTaskTypeSelectText(rates, adminTasks), buildTaskTypeSelectorKeyboard(rates, adminTasks));
  });

  bot.callbackQuery("register_type_standard", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const adminTasks = await getAdminTasks(kv);
    const matchingAdminTask = adminTasks.find((t) => t.taskType === "Normal Gmail" && Number(t.remainingSlots || 0) > 0);

    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    user.currentTask = matchingAdminTask ? buildTaskFromAdminSpec(matchingAdminTask) : generateNewTask("Normal Gmail", rates);
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: "📧 Standard Gmail Task assigned!" });
    await editOrReply(ctx, renderRegisterTaskText(user.currentTask), buildTaskKeyboard(user.currentTask));
  });

  bot.callbackQuery("register_type_2fa", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const adminTasks = await getAdminTasks(kv);
    const matchingAdminTask = adminTasks.find((t) => t.taskType === "2-Step Gmail" && Number(t.remainingSlots || 0) > 0);

    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    user.currentTask = matchingAdminTask ? buildTaskFromAdminSpec(matchingAdminTask) : generateNewTask("2-Step Gmail", rates);
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: "🔐 2-Step Verification Task assigned!" });
    await editOrReply(ctx, renderRegisterTaskText(user.currentTask), buildTaskKeyboard(user.currentTask));
  });

  bot.callbackQuery("task_resume", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    if (!user.currentTask) user.currentTask = generateNewTask("Normal Gmail", rates);
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderRegisterTaskText(user.currentTask), buildTaskKeyboard(user.currentTask));
  });

  bot.callbackQuery("task_done", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const activeTask = user.currentTask || generateNewTask("Normal Gmail", rates);

    user.currentTask = activeTask;
    user.state = "AWAITING_USER_SUBMIT_GMAIL";
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAwaitingUserSubmitGmailText(activeTask), buildAwaitingUserSubmitGmailKeyboard(activeTask));
  });

  bot.callbackQuery("task_quick_submit_assigned", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const activeTask = user.currentTask || generateNewTask("Normal Gmail", rates);

    if (activeTask.taskType === "2-Step Gmail") {
      await ctx.answerCallbackQuery({ text: "🔐 Please type the Gmail + 2FA codes in chat.", show_alert: true });
      return;
    }

    const queueEntry = await submitTaskForManualVerification(ctx, kv, env, user, activeTask, activeTask.email, null);
    await ctx.answerCallbackQuery({ text: "⏳ Task Submitted for Verification!", show_alert: true });

    const nextKb = new InlineKeyboard()
      .text("📩 Register Another", "menu_register")
      .text("📑 My Accounts", "menu_accounts")
      .row()
      .text("🔙 Main Menu", "menu_home");

    await editOrReply(ctx, `⏳ *Task Submitted for Review!*\nTask ID: \`${queueEntry.taskId}\`\nStatus: \`PENDING\``, nextKb);
  });

  bot.callbackQuery("task_cancel", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const isAdmin = await isAuthorizedAdmin(kv, env, ctx.from.id);
    user.currentTask = null;
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard(isAdmin));
  });

  bot.callbackQuery("task_guide", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    if (!user.currentTask) user.currentTask = generateNewTask("Normal Gmail", rates);
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderTaskGuideText(user.currentTask), buildTaskGuideKeyboard());
  });

  bot.callbackQuery("menu_accounts", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderMyAccountsText(user), buildMyAccountsKeyboard());
  });

  bot.callbackQuery("accounts_refresh", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery({ text: "🔄 Refreshed!" });
    await editOrReply(ctx, renderMyAccountsText(user), buildMyAccountsKeyboard());
  });

  bot.callbackQuery("accounts_export", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "📥 Export ready!", show_alert: true });
  });

  bot.callbackQuery("menu_balance", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderBalanceText(user, rates), buildBalanceKeyboard());
  });

  bot.callbackQuery("balance_withdraw", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    if (user.balanceInr < rates.minWithdrawalInr) {
      await ctx.answerCallbackQuery({ text: `⚠️ Minimum withdrawal is ₹${rates.minWithdrawalInr}`, show_alert: true });
      return;
    }
    user.state = "AWAITING_UPI";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAwaitingUpiText(user), buildCancelUpiKeyboard());
  });

  bot.callbackQuery("balance_cancel_upi", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderBalanceText(user, rates), buildBalanceKeyboard());
  });

  bot.callbackQuery("balance_history", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderWithdrawalHistoryText(user, rates), buildWithdrawalHistoryKeyboard());
  });

  bot.callbackQuery("menu_referrals", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const botUsername = env.BOT_USERNAME || ctx.me?.username || "GmailTaskRewardsBot";
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderReferralsText(user, botUsername, rates), buildReferralsKeyboard(botUsername, user.userId, rates));
  });

  bot.callbackQuery("referrals_analytics", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderReferralAnalyticsText(user, rates), buildReferralAnalyticsKeyboard());
  });

  bot.callbackQuery("menu_rewards", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderRewardsText(user, rates), buildRewardsKeyboard());
  });

  bot.callbackQuery("rewards_checkin", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const today = new Date().toISOString().slice(0, 10);
    if (user.rewards.lastCheckInDate === today) {
      await ctx.answerCallbackQuery({ text: "⏳ Already claimed today!", show_alert: true });
      return;
    }
    const bonusInr = rates.dailyStreakBaseInr + Math.min(user.rewards.streakDays, 5);
    user.rewards.streakDays += 1;
    user.rewards.lastCheckInDate = today;
    user.balanceInr += bonusInr;
    user.lifetimeInr += bonusInr;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: `🎯 +₹${bonusInr} added!`, show_alert: true });
    await editOrReply(ctx, renderRewardsText(user, rates), buildRewardsKeyboard());
  });

  bot.callbackQuery("rewards_milestones", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderMilestonesText(user), buildMilestonesKeyboard(user));
  });

  bot.callbackQuery(/^milestone_claim_(.+)$/, async (ctx) => {
    const milestoneId = ctx.match[1];
    const milestone = MILESTONES.find((m) => m.id === milestoneId);
    if (!milestone) return ctx.answerCallbackQuery();
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);

    if (user.rewards.claimedMilestones.includes(milestone.id) || user.accounts.approved < milestone.count) {
      await ctx.answerCallbackQuery({ text: "⚠️ Milestone not claimable.", show_alert: true });
      return;
    }
    user.rewards.claimedMilestones.push(milestone.id);
    user.balanceInr += milestone.bonusInr;
    user.lifetimeInr += milestone.bonusInr;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: `🏆 +₹${milestone.bonusInr} claimed!`, show_alert: true });
    await editOrReply(ctx, renderMilestonesText(user), buildMilestonesKeyboard(user));
  });

  bot.callbackQuery("menu_settings", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_toggle_notif", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.notifications = !user.settings.notifications;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_toggle_currency", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.currency = user.settings.currency === "INR" ? "USD" : "INR";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_language", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, `🌐 Select language:`, buildLanguageSubmenuKeyboard(user.settings.language));
  });

  bot.callbackQuery(/^set_lang_(\d+)$/, async (ctx) => {
    const langs = ["English (EN)", "हिन्दी (HI)", "বাংলা (BN)", "தமிழ் (TA)"];
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.language = langs[Number(ctx.match[1])] || "English (EN)";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_rotate_session", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.sessionId = `SES-${String(user.userId).slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: "🔑 Session rotated!", show_alert: true });
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("menu_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHelpText(), buildHelpKeyboard(env));
  });

  bot.callbackQuery(/^faq_(.+)$/, async (ctx) => {
    const rates = await getDynamicRates(kv);
    const answers = getFaqAnswers(rates);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, answers[ctx.callbackQuery.data] || "❓ Not found.", buildFaqBackKeyboard());
  });

  // ==========================================================================
  // UNIFIED MESSAGE HANDLER
  // ==========================================================================
  bot.on("message", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const user = await getUserData(kv, from.id, from.first_name, from.username);
    const isAdmin = await isAuthorizedAdmin(kv, env, from.id);
    const text = (ctx.message?.text || "").trim();

    // A. ADMIN STATEFUL WIZARDS
    if (isAdmin && user.state.startsWith("AWAITING_")) {
      const state = user.state;

      // Social Task Creation Wizard
      if (state === "AWAITING_SOCIAL_TITLE") {
        if (!text) return;
        user.adminContext = { socialDraft: { title: text } };
        user.state = "AWAITING_SOCIAL_DESC";
        await saveUserData(kv, user);
        await ctx.reply(`📝 *Enter Task Instructions / Description:*`, { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_home") });
        return;
      }
      if (state === "AWAITING_SOCIAL_DESC") {
        const draft = user.adminContext?.socialDraft || {};
        draft.description = text;
        user.adminContext = { socialDraft: draft };
        user.state = "AWAITING_SOCIAL_LINK";
        await saveUserData(kv, user);
        await ctx.reply(`🔗 *Enter Task Link (e.g. https://t.me/...):*`, { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_home") });
        return;
      }
      if (state === "AWAITING_SOCIAL_LINK") {
        const draft = user.adminContext?.socialDraft || {};
        draft.link = text;
        user.adminContext = { socialDraft: draft };
        user.state = "AWAITING_SOCIAL_REWARD";
        await saveUserData(kv, user);
        await ctx.reply(`💰 *Enter Reward Amount in INR (e.g. 5):*`, { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_home") });
        return;
      }
      if (state === "AWAITING_SOCIAL_REWARD") {
        const reward = parseFloat(text);
        if (isNaN(reward) || reward <= 0) return ctx.reply("❌ Invalid reward amount.");
        const draft = user.adminContext?.socialDraft || {};
        draft.rewardInr = reward;
        user.adminContext = { socialDraft: draft };
        user.state = "AWAITING_SOCIAL_SLOTS";
        await saveUserData(kv, user);
        await ctx.reply(`🎯 *Enter Total Available Slots (e.g. 100):*`, { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_home") });
        return;
      }
      if (state === "AWAITING_SOCIAL_SLOTS") {
        const slots = parseInt(text, 10);
        if (isNaN(slots) || slots <= 0) return ctx.reply("❌ Invalid slots.");
        const draft = user.adminContext?.socialDraft || {};

        const newTask = {
          socialTaskId: `STSK-${randomInt(1000, 9999)}`,
          title: draft.title || "Custom Task",
          description: draft.description || "",
          link: draft.link || "https://t.me/",
          rewardInr: Number(draft.rewardInr || 5),
          totalSlots: slots,
          remainingSlots: slots,
          createdAt: new Date().toISOString(),
        };

        const socialTasks = await getCustomSocialTasks(kv);
        socialTasks.unshift(newTask);
        await saveCustomSocialTasks(kv, socialTasks);

        user.state = "IDLE";
        user.adminContext = {};
        await saveUserData(kv, user);

        const view = renderAdminManageSocialTasksView(socialTasks);
        await ctx.reply(`✅ *Social Task Created Successfully!*\n\n` + view.text, { parse_mode: "Markdown", reply_markup: view.replyMarkup });
        return;
      }

      // Gmail Custom Task Wizard
      if (state === "AWAITING_NEWTASK_EMAIL") {
        if (!text) return;
        const pattern = text.includes("@") ? text.toLowerCase() : `${text.toLowerCase()}@gmail.com`;
        const draft = user.adminContext?.draftTask || { taskType: "Normal Gmail" };
        draft.emailPattern = pattern;
        user.adminContext = { draftTask: draft };
        user.state = "AWAITING_NEWTASK_PASSWORD";
        await saveUserData(kv, user);
        await ctx.reply(`🔑 *Enter Password for Gmail Task:*`, { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_task_add") });
        return;
      }
      if (state === "AWAITING_NEWTASK_PASSWORD") {
        const draft = user.adminContext?.draftTask || { taskType: "Normal Gmail" };
        draft.password = text;
        user.adminContext = { draftTask: draft };
        user.state = "AWAITING_NEWTASK_REWARD";
        await saveUserData(kv, user);
        const rates = await getDynamicRates(kv);
        const def = draft.taskType === "2-Step Gmail" ? rates.twoFactorTaskInr : rates.standardTaskInr;
        await ctx.reply(`💰 *Enter Reward in INR (Default ₹${def}):*`, { parse_mode: "Markdown", reply_markup: buildAdminSkipRewardKeyboard(def) });
        return;
      }
      if (state === "AWAITING_NEWTASK_REWARD") {
        const rates = await getDynamicRates(kv);
        const draft = user.adminContext?.draftTask || { taskType: "Normal Gmail" };
        const def = draft.taskType === "2-Step Gmail" ? rates.twoFactorTaskInr : rates.standardTaskInr;
        draft.rewardInr = text.toLowerCase() === "skip" ? def : parseFloat(text);
        user.adminContext = { draftTask: draft };
        user.state = "AWAITING_NEWTASK_SLOTS";
        await saveUserData(kv, user);
        await ctx.reply(`🎯 *Enter Slots / Quantity:*`, { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_task_add") });
        return;
      }
      if (state === "AWAITING_NEWTASK_SLOTS") {
        const slots = parseInt(text, 10);
        const draft = user.adminContext?.draftTask || {};
        const newAdminTask = {
          customTaskId: `CTSK-${randomInt(1000, 9999)}`,
          taskType: draft.taskType || "Normal Gmail",
          emailPattern: draft.emailPattern || "user@gmail.com",
          password: draft.password || "Pass123",
          rewardInr: Number(draft.rewardInr || 15),
          totalSlots: slots,
          remainingSlots: slots,
          createdAt: new Date().toISOString(),
        };
        const adminTasks = await getAdminTasks(kv);
        adminTasks.unshift(newAdminTask);
        await saveAdminTasks(kv, adminTasks);
        user.state = "IDLE";
        user.adminContext = {};
        await saveUserData(kv, user);
        const view = renderAdminManageCustomTasksView(adminTasks);
        await ctx.reply(`✅ *Gmail Task Published!*\n\n` + view.text, { parse_mode: "Markdown", reply_markup: view.replyMarkup });
        return;
      }

      // Broadcast
      if (state === "AWAITING_BROADCAST") {
        user.state = "IDLE";
        await saveUserData(kv, user);
        const userIds = await getUsersIndex(kv);
        let sent = 0;
        for (const uid of userIds) {
          try {
            await ctx.api.sendMessage(uid, text || "📢 Announcement", { parse_mode: "Markdown" });
            sent++;
          } catch {}
        }
        await ctx.reply(`📣 Broadcast sent to ${sent} users!`, { reply_markup: buildAdminBackKeyboard() });
        return;
      }

      // Force Channel
      if (state === "AWAITING_FORCE_CHANNEL") {
        const channels = await getForceChannels(kv);
        channels.push({ id: text, title: text, inviteLink: `https://t.me/${text.replace(/^@/, "")}` });
        await saveForceChannels(kv, channels);
        user.state = "IDLE";
        await saveUserData(kv, user);
        await ctx.reply(`✅ Channel added!`, { reply_markup: buildAdminForceChannelsKeyboard(channels) });
        return;
      }

      // Rates
      if (["AWAITING_RATE_TASK", "AWAITING_RATE_2FA_TASK", "AWAITING_RATE_MIN_WITHDRAW", "AWAITING_RATE_REFERRAL"].includes(state)) {
        const val = parseFloat(text);
        const rates = await getDynamicRates(kv);
        if (state === "AWAITING_RATE_TASK") rates.standardTaskInr = val;
        if (state === "AWAITING_RATE_2FA_TASK") rates.twoFactorTaskInr = val;
        if (state === "AWAITING_RATE_MIN_WITHDRAW") rates.minWithdrawalInr = val;
        if (state === "AWAITING_RATE_REFERRAL") rates.referralBonusInr = val;
        await putKvJson(kv, "config:rates", rates);
        user.state = "IDLE";
        await saveUserData(kv, user);
        await ctx.reply(`✅ Rate updated!`, { reply_markup: buildAdminRatesKeyboard(rates) });
        return;
      }

      // Add Admin
      if (state === "AWAITING_ADMIN_ID") {
        const subAdmins = await getSecondaryAdmins(kv);
        subAdmins.push({ id: text.replace(/\D/g, ""), addedAt: new Date().toISOString() });
        await putKvJson(kv, "config:admins", subAdmins);
        user.state = "IDLE";
        await saveUserData(kv, user);
        await ctx.reply(`✅ Admin added!`, { reply_markup: buildAdminManageAdminsKeyboard(subAdmins) });
        return;
      }

      // User Balance add/deduct
      if (state === "AWAITING_USER_ADD_BAL" || state === "AWAITING_USER_DEDUCT_BAL") {
        const amount = parseFloat(text);
        const targetId = user.adminContext?.targetUserId;
        const targetUser = await getUserData(kv, targetId);
        if (state === "AWAITING_USER_ADD_BAL") targetUser.balanceInr += amount;
        else targetUser.balanceInr = Math.max(0, targetUser.balanceInr - amount);
        await saveUserData(kv, targetUser);
        user.state = "IDLE";
        await saveUserData(kv, user);
        await ctx.reply(renderAdminInspectUserText(targetUser), { parse_mode: "Markdown", reply_markup: buildAdminInspectUserKeyboard(targetUser) });
        return;
      }
    }

    // B. USER SUBMITTING SOCIAL TASK PROOF
    if (user.state === "AWAITING_CUSTOM_TASK_PROOF" && user.currentSocialTask) {
      const task = user.currentSocialTask;
      user.currentSocialTask = null;
      user.state = "IDLE";
      await saveUserData(kv, user);

      // Decrement slots
      const socialTasks = await getCustomSocialTasks(kv);
      const target = socialTasks.find((t) => t.socialTaskId === task.socialTaskId);
      if (target && Number(target.remainingSlots) > 0) {
        target.remainingSlots = Math.max(0, Number(target.remainingSlots) - 1);
        await saveCustomSocialTasks(kv, socialTasks);
      }

      const submission = {
        submissionId: `SUB-${randomInt(100000, 999999)}`,
        socialTaskId: task.socialTaskId,
        taskTitle: task.title,
        userId: String(from.id),
        username: from.username || "",
        firstName: from.first_name || "User",
        proofText: text,
        rewardInr: task.rewardInr,
        status: "PENDING",
        submittedAt: new Date().toISOString(),
      };

      const socialQueue = await getCustomSocialQueue(kv);
      socialQueue.unshift(submission);
      await saveCustomSocialQueue(kv, socialQueue);

      await ctx.reply(
        `⏳ *Social Task Proof Submitted!*\n` +
          `📌 Task: ${escapeMd(task.title)}\n` +
          `Status: \`PENDING REVIEW\`\n` +
          `Admin will verify your proof and credit ₹${task.rewardInr} to your wallet soon.`,
        { parse_mode: "Markdown", reply_markup: buildMainMenuKeyboard(isAdmin) }
      );
      return;
    }

    // C. USER GMAIL SUBMISSION
    if (user.state === "AWAITING_USER_SUBMIT_GMAIL" || user.state === "AWAITING_2FA_CODES") {
      const rates = await getDynamicRates(kv);
      const activeTask = user.currentTask || generateNewTask("Normal Gmail", rates);
      const queueEntry = await submitTaskForManualVerification(ctx, kv, env, user, activeTask, text, null);

      await ctx.reply(
        `⏳ *Task Submitted for Verification!*\nTask ID: \`${queueEntry.taskId}\`\nStatus: \`PENDING\``,
        { parse_mode: "Markdown", reply_markup: buildMainMenuKeyboard(isAdmin) }
      );
      return;
    }

    // D. USER UPI WITHDRAWAL INPUT
    if (user.state === "AWAITING_UPI") {
      const rates = await getDynamicRates(kv);
      if (user.balanceInr < rates.minWithdrawalInr) {
        user.state = "IDLE";
        await saveUserData(kv, user);
        return ctx.reply("❌ Insufficient balance for withdrawal.");
      }

      const payoutAmount = user.balanceInr;
      const txId = `UPI-${Date.now().toString(36).toUpperCase()}`;
      user.balanceInr = 0;
      user.state = "IDLE";
      const withdrawalEntry = {
        txId,
        userId: String(from.id),
        firstName: from.first_name || "User",
        username: from.username || "",
        amountInr: payoutAmount,
        upiId: text,
        holderName: from.first_name || "User",
        status: "PROCESSING",
        date: new Date().toISOString(),
      };
      user.withdrawals.unshift(withdrawalEntry);
      await saveUserData(kv, user);

      const queue = await getPayoutQueue(kv);
      queue.unshift(withdrawalEntry);
      await savePayoutQueue(kv, queue);

      await ctx.reply(
        `✅ *UPI Withdrawal Submitted!*\nReference ID: \`$txId\`\nAmount: ₹${payoutAmount}\nStatus: \`PROCESSING\``,
        { parse_mode: "Markdown", reply_markup: buildMainMenuKeyboard(isAdmin) }
      );
      return;
    }

    await ctx.reply(renderHomeText(user), {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(isAdmin),
    });
  });

  bot.catch((err) => {
    console.error("grammY Error:", err.error);
  });

  return bot;
}

// =================================================0===========================
// 12. CLOUDFLARE WORKER EXPORT HANDLER
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          worker: "gmailworkop",
          service: "Telegram Task Bot + Custom Social Tasks + Gmail Marketplace",
        }),
        { status: 200, headers: { "content-type": "application/json;charset=UTF-8" } }
      );
    }

    if (!env.BOT_TOKEN) return new Response("Missing BOT_TOKEN", { status: 500 });
    if (!env.BOT_KV) return new Response("Missing BOT_KV", { status: 500 });

    const bot = createBot(env);
    const handleUpdate = webhookCallback(bot, "cloudflare-mod");
    return handleUpdate(request);
  },
};
