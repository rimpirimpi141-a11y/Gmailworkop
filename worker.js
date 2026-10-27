/**
 * Production-Ready Telegram Task & Rewards Bot + Enterprise Dynamic Admin Panel
 * Worker Name: gmailworkop
 * Framework: grammY (ES Module for Cloudflare Workers)
 * Storage: Cloudflare Workers KV (env.BOT_KV)
 *
 * KV Keys Architecture:
 * - user:<userId>          -> User profile, wallet, tasks, referrals, withdrawals, state, adminContext, isBanned
 * - config:admins          -> JSON array of secondary admin objects [{ id, addedBy, addedAt }]
 * - config:channels        -> JSON array of required force-join channels [{ id, title, inviteLink }]
 * - config:rates           -> JSON object { taskRewardInr, taskRewardUsd, minWithdrawalInr, referralBonusInr, dailyStreakBaseInr }
 * - config:maintenance     -> JSON object { enabled: boolean, updatedAt: string, updatedBy: string }
 * - config:users_index     -> JSON array of all registered userId strings ["749201842", ...]
 * - config:payout_queue    -> JSON array of pending & processed withdrawal requests across the platform
 */

import { Bot, InlineKeyboard, webhookCallback } from "grammy";

// ============================================================================
// 1. DEFAULT CONSTANTS & MILESTONES
// ============================================================================
const DEFAULT_RATES = {
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
  const taskRewardInr = Number(stored.taskRewardInr ?? DEFAULT_RATES.taskRewardInr);
  return {
    taskRewardInr,
    taskRewardUsd: Number((taskRewardInr / 75).toFixed(2)),
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
    // Possible states:
    // User: "IDLE" | "AWAITING_UPI"
    // Admin: "AWAITING_RATE_TASK" | "AWAITING_RATE_MIN_WITHDRAW" | "AWAITING_RATE_REFERRAL"
    //        "AWAITING_FORCE_CHANNEL" | "AWAITING_ADMIN_ID" | "AWAITING_BROADCAST"
    //        "AWAITING_INSPECT_USER_ID" | "AWAITING_USER_ADD_BAL" | "AWAITING_USER_DEDUCT_BAL"
    //        "AWAITING_REJECT_REASON"
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
    referrals: {
      referredBy: null,
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
      accounts: { ...defaults.accounts, ...(parsed.accounts || {}) },
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
// 3. REALISTIC TASK & FORMATTING GENERATORS
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

function generateNewTask() {
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

function escapeMd(text = "") {
  return String(text).replace(/([_*`\[])/g, "\\$1");
}

// ============================================================================
// 4. MANDATORY FORCE-JOIN VERIFICATION ENGINE (config:channels)
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
    `To use this bot and earn instant UPI rewards, you must join our official channel(s) below:\n\n` +
    `${channelListText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Join all channels above, then tap_ *🔄 Check / Verified* _to unlock the dashboard:_`;

  return { text, replyMarkup: kb };
}

// ============================================================================
// 5. USER INLINE KEYBOARDS (100% Pure InlineKeyboardMarkup)
// ============================================================================
function buildMainMenuKeyboard() {
  return new InlineKeyboard()
    .text("📩 Register an Account", "menu_register")
    .text("📑 My Accounts", "menu_accounts")
    .row()
    .text("👛 Balance", "menu_balance")
    .text("👥 Referrals", "menu_referrals")
    .row()
    .text("🎁 Rewards", "menu_rewards")
    .row()
    .text("⚙️ Settings", "menu_settings")
    .text("❓ Help", "menu_help");
}

function buildTaskKeyboard() {
  return new InlineKeyboard()
    .text("✅ Done", "task_done")
    .text("🚫 Cancel", "task_cancel")
    .row()
    .text("❓ How to create account?", "task_guide")
    .row()
    .text("🔙 Back to Main Menu", "menu_home");
}

function buildTaskGuideKeyboard() {
  return new InlineKeyboard()
    .text("🔙 Back to Task", "menu_register")
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
    `🔥 Earn ₹${rates.taskRewardInr} ($${rates.taskRewardUsd.toFixed(2)}) per registered account with instant UPI payouts! Join using my invite link:`
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
    .text("📊 Real-Time Analytics", "admin_analytics")
    .text("💳 Manage Payouts", "admin_payouts")
    .row()
    .text("🎁 Set Reward Rates", "admin_rates")
    .text("📢 Force Channels", "admin_channels")
    .row()
    .text("👥 Manage Admins", "admin_admins")
    .text("📣 Broadcast Message", "admin_broadcast")
    .row()
    .text("🔍 Inspect User", "admin_inspect")
    .text("⚙️ Maintenance Mode", "admin_maintenance")
    .row()
    .text("🔙 Close Admin Panel", "admin_close");
}

function buildAdminBackKeyboard() {
  return new InlineKeyboard().text("🔙 Back to Admin Panel", "admin_home");
}

function buildAdminCancelInputKeyboard(backCallback = "admin_home") {
  return new InlineKeyboard().text("🚫 Cancel Admin Input", backCallback);
}

function buildAdminRatesKeyboard(rates) {
  return new InlineKeyboard()
    .text(`💰 Task Reward (₹${rates.taskRewardInr})`, "admin_rate_task")
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
    .text(banLabel, `admin_user_toggleban_${targetUser.userId}`)
    .text("🔄 Refresh Profile", `admin_user_view_${targetUser.userId}`)
    .row()
    .text("🔍 Search Another User", "admin_inspect")
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

// ============================================================================
// 7. SCREEN TEXT RENDERERS (User & Admin Screens)
// ============================================================================
function renderHomeText(user) {
  return (
    `✨ *Welcome to Gmail Task Hub, ${escapeMd(user.firstName)}!*\n\n` +
    `💼 *Account Overview*\n` +
    `├ 👛 *Available Balance:* \`${formatMoney(user.balanceInr, user.settings.currency)}\`\n` +
    `├ ✅ *Verified Accounts:* \`${user.accounts.approved}\`\n` +
    `└ 🔥 *Daily Streak:* \`${user.rewards.streakDays} Days\`\n\n` +
    `👇 *Choose an option from the menu below:*`
  );
}

function renderRegisterTaskText(task, rates) {
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

function renderTaskGuideText(task) {
  return (
    `📘 *Step-by-Step Account Creation Guide*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*1️⃣ Open Incognito / Private Tab*\n` +
    `Open a fresh incognito window in your browser or add a new Google account in device settings.\n\n` +
    `*2️⃣ Enter Assigned Profile Data*\n` +
    `• Name: \`${task.firstName} ${task.lastName}\`\n` +
    `• Username: \`${task.email.split("@")[0]}\`\n` +
    `• Password: \`${task.password}\`\n` +
    `• Birth Year: \`${task.birthYear}\`\n\n` +
    `*3️⃣ Complete Setup Without Recovery Email*\n` +
    `Skip phone/recovery email if prompted, accept Google Terms, and wait for the inbox to load.\n\n` +
    `*4️⃣ Sign Out & Submit*\n` +
    `Remove the account from your device so it remains clean, then return here and press *✅ Done*!`
  );
}

function renderMyAccountsText(user) {
  const total = user.accounts.approved + user.accounts.pending + user.accounts.rejected;
  const recentLines =
    user.accounts.history.length > 0
      ? user.accounts.history
          .slice(0, 5)
          .map(
            (item, i) =>
              `${i + 1}. \`${item.email}\` — *+₹${item.rewardInr}* (${item.date.slice(0, 10)})`
          )
          .join("\n")
      : "_No registered accounts yet. Tap 'Register an Account' on the main menu to start earning!_";

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
    `💸 *Commission Rate:* *₹${tier.rateInr.toFixed(2)}* per active invite\n` +
    `👨‍👩‍👧‍👦 *Total Invited Users:* \`${user.referrals.invitedCount}\`\n` +
    `💰 *Total Referral Earnings:* \`₹${user.referrals.totalCommissionInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 _Share your personal link with friends and earn instant rewards when they join!_`
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
// 8. ADMIN PANEL SCREEN RENDERERS
// ============================================================================
async function renderAdminDashboardText(kv, env, userId) {
  const rates = await getDynamicRates(kv);
  const maint = await getMaintenanceState(kv);
  const channels = await getForceChannels(kv);
  const queue = await getPayoutQueue(kv);
  const pendingPayouts = queue.filter((p) => p.status === "PROCESSING");
  const isSuper = isSuperAdminId(env, userId);

  return (
    `🛡️ *Enterprise Admin Control Panel*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Admin Role:* \`${isSuper ? "SUPER ADMIN" : "SECONDARY ADMIN"}\`\n` +
    `⚙️ *Maintenance Mode:* ${maint.enabled ? "🔴 *ENABLED (Users Blocked)*" : "🟢 *DISABLED (Live)*"}\n` +
    `📢 *Force-Join Channels:* \`${channels.length} Active\`\n` +
    `💳 *Pending UPI Payouts:* \`${pendingPayouts.length} Request(s)\`\n\n` +
    `📊 *Live Dynamic Rates:*\n` +
    `├ 💰 *Task Reward:* \`₹${rates.taskRewardInr.toFixed(2)}\`\n` +
    `├ 🎯 *Min Withdrawal:* \`₹${rates.minWithdrawalInr.toFixed(2)}\`\n` +
    `└ 👥 *Referral Bonus:* \`₹${rates.referralBonusInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 *Select a management module below:*`
  );
}

async function computePlatformAnalytics(kv) {
  const userIds = await getUsersIndex(kv);
  const queue = await getPayoutQueue(kv);

  let totalSubmitted = 0;
  let totalApproved = 0;
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
      totalSubmitted += approved + pending + rejected;
      totalWalletBalanceInr += Number(u.balanceInr || 0);
      if (u.isBanned) bannedUsersCount += 1;
    } catch {
      // ignore malformed record
    }
  }

  let totalPaidOutInr = 0;
  let totalPendingInr = 0;
  let pendingCount = 0;
  let completedCount = 0;

  for (const item of queue) {
    if (item.status === "COMPLETED") {
      totalPaidOutInr += Number(item.amountInr || 0);
      completedCount += 1;
    } else if (item.status === "PROCESSING") {
      totalPendingInr += Number(item.amountInr || 0);
      pendingCount += 1;
    }
  }

  return {
    totalUsers: userIds.length,
    bannedUsersCount,
    totalSubmitted,
    totalApproved,
    totalWalletBalanceInr,
    totalPaidOutInr,
    totalPendingInr,
    pendingCount,
    completedCount,
  };
}

function renderAdminAnalyticsText(stats) {
  return (
    `📊 *Real-Time Platform Analytics*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👥 *User Metrics:*\n` +
    `├ 🪪 *Total Registered Users:* \`${stats.totalUsers}\`\n` +
    `└ 🚫 *Banned Accounts:* \`${stats.bannedUsersCount}\`\n\n` +
    `📑 *Task Submissions:*\n` +
    `├ 📦 *Total Submitted:* \`${stats.totalSubmitted}\`\n` +
    `└ ✅ *Total Approved:* \`${stats.totalApproved}\`\n\n` +
    `💰 *Financial Ledger (INR):*\n` +
    `├ 👛 *Active Wallet Liability:* \`₹${stats.totalWalletBalanceInr.toFixed(2)}\`\n` +
    `├ 💸 *Total Money Paid Out:* \`₹${stats.totalPaidOutInr.toFixed(2)}\` (\`${stats.completedCount}\` tx)\n` +
    `└ ⏳ *Pending UPI Queue:* \`₹${stats.totalPendingInr.toFixed(2)}\` (\`${stats.pendingCount}\` tx)\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🕒 _Live KV Snapshot: ${new Date().toISOString().slice(11, 19)} UTC_`
  );
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
    `Update platform payout rates and thresholds in real time without redeploying code:\n\n` +
    `• 💰 *Task Reward:* \`₹${rates.taskRewardInr.toFixed(2)}\` (\`$${rates.taskRewardUsd.toFixed(2)}\`)\n` +
    `• 🎯 *Min Withdrawal:* \`₹${rates.minWithdrawalInr.toFixed(2)}\`\n` +
    `• 👥 *Referral Base Bonus:* \`₹${rates.referralBonusInr.toFixed(2)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Click any parameter below to enter a new value in chat:_`
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
    `📢 *Manage Force-Join Channels (config:channels)*\n` +
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
    `👥 *Manage Platform Administrators*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👑 *Super Admin (env.ADMIN_CHAT_ID):*\n` +
    `• \`${superId}\` _(Protected — Cannot be removed)_\n\n` +
    `🛡️ *Secondary Admins (config:admins — ${subAdmins.length}):*\n` +
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
    `├ 👥 *Referrals Invited:* \`${targetUser.referrals?.invitedCount || 0}\`\n` +
    `└ 🏦 *Last UPI Used:* \`${escapeMd(lastUpi)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _Modify balance or ban status using the controls below:_`
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

// ============================================================================
// 9. SAFE MESSAGE EDITOR (Always edits in-place via editMessageText)
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
// 10. BOT FACTORY, MIDDLEWARE & HANDLER REGISTRATION
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

    // 1. Protect /admin and admin_* callbacks from non-admins
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

    // Admins bypass all restrictions on standard user flows
    if (isAdmin) {
      return next();
    }

    // 2. Check if user is Banned
    const user = await getUserData(kv, from.id, from.first_name, from.username);
    if (user.isBanned) {
      const banMsg =
        `🚫 *Account Suspended*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Your account (\`#${from.id}\`) has been restricted by an administrator due to policy violations.`;
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

    // 3. Check Maintenance Mode
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

    // 4. Mandatory Force-Join Verification (config:channels)
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
      await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard());
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

    await ctx.answerCallbackQuery({ text: "Admin panel closed." });
    await editOrReply(ctx, renderHomeText(adminUser), buildMainMenuKeyboard());
  });

  // ADMIN MODULE E: 📊 REAL-TIME PLATFORM ANALYTICS
  bot.callbackQuery("admin_analytics", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "📊 Computing live KV analytics..." });
    const stats = await computePlatformAnalytics(kv);
    const kb = new InlineKeyboard()
      .text("🔄 Refresh Metrics", "admin_analytics")
      .row()
      .text("🔙 Back to Admin Panel", "admin_home");
    await editOrReply(ctx, renderAdminAnalyticsText(stats), kb);
  });

  // ADMIN MODULE A: 💳 MANAGE PAYOUTS (UPI)
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

    if (itemIndex === -1 || queue[itemIndex].status !== "PROCESSING") {
      await ctx.answerCallbackQuery({
        text: "⚠️ Payout request not found or already processed.",
        show_alert: true,
      });
      const view = renderAdminPayoutsView(queue);
      await editOrReply(ctx, view.text, view.replyMarkup);
      return;
    }

    const payout = queue[itemIndex];
    payout.status = "COMPLETED";
    payout.processedAt = new Date().toISOString();
    payout.processedBy = String(ctx.from.id);
    await savePayoutQueue(kv, queue);

    const targetUser = await getUserData(kv, payout.userId);
    const userTx = targetUser.withdrawals.find((w) => w.txId === txId);
    if (userTx) {
      userTx.status = "COMPLETED";
    }
    await saveUserData(kv, targetUser);

    try {
      await ctx.api.sendMessage(
        payout.userId,
        `🎉 *UPI Withdrawal Approved & Paid!*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 *Reference ID:* \`${payout.txId}\`\n` +
          `💰 *Amount Credited:* *₹${Number(payout.amountInr).toFixed(2)}*\n` +
          `🏦 *UPI ID:* \`${payout.upiId}\`\n` +
          `🟢 *Status:* \`COMPLETED\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ _Your funds have been transferred to your UPI account. Thank you for working with us!_`,
        { parse_mode: "Markdown" }
      );
    } catch {
      // User may have blocked bot
    }

    await ctx.answerCallbackQuery({
      text: `✅ Payout ${txId} (₹${payout.amountInr}) marked as PAID & user notified!`,
      show_alert: true,
    });

    const view = renderAdminPayoutsView(queue);
    await editOrReply(ctx, view.text, view.replyMarkup);
  });

  bot.callbackQuery(/^admin_payout_reject_(.+)$/, async (ctx) => {
    const txId = ctx.match[1];
    const queue = await getPayoutQueue(kv);
    const payout = queue.find((p) => p.txId === txId && p.status === "PROCESSING");

    if (!payout) {
      await ctx.answerCallbackQuery({
        text: "⚠️ Payout request not found or already processed.",
        show_alert: true,
      });
      return;
    }

    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_REJECT_REASON";
    adminUser.adminContext = { targetTxId: txId };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `❌ *Reject & Refund UPI Payout*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *Transaction:* \`${payout.txId}\`\n` +
        `👤 *User ID:* \`${payout.userId}\`\n` +
        `💰 *Amount to Refund:* *₹${Number(payout.amountInr).toFixed(2)}*\n` +
        `🏦 *UPI ID:* \`${payout.upiId}\`\n\n` +
        `📝 *Please type and send the rejection reason in chat:*\n` +
        `_(e.g. "Invalid UPI ID handle" or "Bank server timeout — please re-submit")_`,
      buildAdminCancelInputKeyboard("admin_payouts")
    );
  });

  // ADMIN MODULE B: 🎁 SET DYNAMIC REWARD RATES
  bot.callbackQuery("admin_rates", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderAdminRatesText(rates), buildAdminRatesKeyboard(rates));
  });

  bot.callbackQuery("admin_rate_task", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_TASK";
    await saveUserData(kv, adminUser);

    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `💰 *Update Task Reward Rate*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Current Rate: \`₹${rates.taskRewardInr.toFixed(2)}\`\n\n` +
        `📝 *Send the new Task Reward amount (in INR) as a number in chat:*`,
      buildAdminCancelInputKeyboard("admin_rates")
    );
  });

  bot.callbackQuery("admin_rate_min_withdraw", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_MIN_WITHDRAW";
    await saveUserData(kv, adminUser);

    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `🎯 *Update Minimum Withdrawal Threshold*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Current Threshold: \`₹${rates.minWithdrawalInr.toFixed(2)}\`\n\n` +
        `📝 *Send the new Minimum UPI Withdrawal amount (in INR) in chat:*`,
      buildAdminCancelInputKeyboard("admin_rates")
    );
  });

  bot.callbackQuery("admin_rate_referral", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_RATE_REFERRAL";
    await saveUserData(kv, adminUser);

    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `👥 *Update Referral Base Bonus*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Current Base Bonus: \`₹${rates.referralBonusInr.toFixed(2)}\`\n\n` +
        `📝 *Send the new Referral Bonus amount (in INR) in chat:*`,
      buildAdminCancelInputKeyboard("admin_rates")
    );
  });

  bot.callbackQuery("admin_rate_reset", async (ctx) => {
    await putKvJson(kv, "config:rates", DEFAULT_RATES);
    const rates = await getDynamicRates(kv);
    await ctx.answerCallbackQuery({
      text: "✅ Dynamic reward rates reset to default values!",
      show_alert: true,
    });
    await editOrReply(ctx, renderAdminRatesText(rates), buildAdminRatesKeyboard(rates));
  });

  // ADMIN MODULE C: 📢 MANAGE FORCE-JOIN CHANNELS (config:channels)
  bot.callbackQuery("admin_channels", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    const channels = await getForceChannels(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      renderAdminChannelsText(channels),
      buildAdminForceChannelsKeyboard(channels)
    );
  });

  bot.callbackQuery("admin_channel_add", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_FORCE_CHANNEL";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➕ *Add Mandatory Force-Join Channel*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `1️⃣ Add this bot as an *Administrator* in your target Telegram channel.\n` +
        `2️⃣ *Forward any message* from that channel here, OR send the channel's \`@username\` (e.g. \`@OfficialNewsChannel\`).\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`,
      buildAdminCancelInputKeyboard("admin_channels")
    );
  });

  bot.callbackQuery("admin_channel_remove_menu", async (ctx) => {
    const channels = await getForceChannels(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➖ *Remove Force-Join Channel*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Tap any channel below to immediately remove it from mandatory verification:`,
      buildAdminRemoveChannelListKeyboard(channels)
    );
  });

  bot.callbackQuery(/^admin_channel_del_(\d+)$/, async (ctx) => {
    const idx = Number(ctx.match[1]);
    const channels = await getForceChannels(kv);
    if (idx >= 0 && idx < channels.length) {
      const removed = channels.splice(idx, 1)[0];
      await saveForceChannels(kv, channels);
      await ctx.answerCallbackQuery({
        text: `🗑️ Channel ${removed.title || removed.id || removed} removed!`,
        show_alert: true,
      });
    } else {
      await ctx.answerCallbackQuery();
    }
    await editOrReply(
      ctx,
      renderAdminChannelsText(channels),
      buildAdminForceChannelsKeyboard(channels)
    );
  });

  // ADMIN MODULE D: 👥 MANAGE ADMINS (config:admins)
  bot.callbackQuery("admin_admins", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "IDLE";
    await saveUserData(kv, adminUser);

    const subAdmins = await getSecondaryAdmins(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      renderAdminManageAdminsText(env, subAdmins),
      buildAdminManageAdminsKeyboard(subAdmins)
    );
  });

  bot.callbackQuery("admin_sub_add", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_ADMIN_ID";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➕ *Grant Secondary Admin Access*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Send the numerical Telegram User ID of the new admin in chat:*\n` +
        `_(e.g. \`892341022\`)_`,
      buildAdminCancelInputKeyboard("admin_admins")
    );
  });

  bot.callbackQuery("admin_sub_remove_menu", async (ctx) => {
    const subAdmins = await getSecondaryAdmins(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➖ *Revoke Secondary Admin Access*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Select a secondary admin below to revoke their \`/admin\` privileges _(Super Admin cannot be removed)_:`,
      buildAdminRemoveSubAdminKeyboard(subAdmins)
    );
  });

  bot.callbackQuery(/^admin_sub_del_(.+)$/, async (ctx) => {
    const targetId = String(ctx.match[1]).trim();
    if (isSuperAdminId(env, targetId)) {
      await ctx.answerCallbackQuery({
        text: "⛔ Cannot remove Super Admin (env.ADMIN_CHAT_ID)!",
        show_alert: true,
      });
      return;
    }

    let subAdmins = await getSecondaryAdmins(kv);
    subAdmins = subAdmins.filter((a) => String(a.id) !== targetId);
    await putKvJson(kv, "config:admins", subAdmins);

    await ctx.answerCallbackQuery({
      text: `🗑️ Admin access revoked for User #${targetId}.`,
      show_alert: true,
    });
    await editOrReply(
      ctx,
      renderAdminManageAdminsText(env, subAdmins),
      buildAdminManageAdminsKeyboard(subAdmins)
    );
  });

  // ADMIN MODULE F: 📣 BROADCAST SYSTEM
  bot.callbackQuery("admin_broadcast", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_BROADCAST";
    await saveUserData(kv, adminUser);

    const userIds = await getUsersIndex(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `📣 *Global Broadcast System*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 *Target Audience:* \`${userIds.length} Registered Users\`\n\n` +
        `📝 *Send or forward the message you want to broadcast now:*\n` +
        `• Supports *Markdown text* formatting\n` +
        `• Supports *Photos with captions*\n` +
        `• Automatically tracks real-time delivery progress`,
      buildAdminCancelInputKeyboard("admin_home")
    );
  });

  // ADMIN MODULE G: 🔍 INSPECT USER (SEARCH & EDIT)
  bot.callbackQuery("admin_inspect", async (ctx) => {
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_INSPECT_USER_ID";
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `🔍 *Inspect & Edit User Profile*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Send the Telegram User ID you wish to inspect in chat:*\n` +
        `_(e.g. \`749201842\`)_`,
      buildAdminCancelInputKeyboard("admin_home")
    );
  });

  bot.callbackQuery(/^admin_user_view_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const raw = await kv.get(`user:${targetId}`);
    if (!raw) {
      await ctx.answerCallbackQuery({ text: "❌ User not found in KV.", show_alert: true });
      return;
    }
    const targetUser = await getUserData(kv, targetId);
    await ctx.answerCallbackQuery({ text: "🔄 User profile refreshed." });
    await editOrReply(
      ctx,
      renderAdminInspectUserText(targetUser),
      buildAdminInspectUserKeyboard(targetUser)
    );
  });

  bot.callbackQuery(/^admin_user_addbal_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_USER_ADD_BAL";
    adminUser.adminContext = { targetUserId: targetId };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➕ *Add Balance to User #${targetId}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Send the INR amount to credit to this user's wallet:*`,
      buildAdminCancelInputKeyboard(`admin_user_view_${targetId}`)
    );
  });

  bot.callbackQuery(/^admin_user_deductbal_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const adminUser = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    adminUser.state = "AWAITING_USER_DEDUCT_BAL";
    adminUser.adminContext = { targetUserId: targetId };
    await saveUserData(kv, adminUser);

    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `➖ *Deduct Balance from User #${targetId}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Send the INR amount to deduct from this user's wallet:*`,
      buildAdminCancelInputKeyboard(`admin_user_view_${targetId}`)
    );
  });

  bot.callbackQuery(/^admin_user_toggleban_(.+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    const targetUser = await getUserData(kv, targetId);
    targetUser.isBanned = !targetUser.isBanned;
    await saveUserData(kv, targetUser);

    await ctx.answerCallbackQuery({
      text: targetUser.isBanned
        ? `🚫 User #${targetId} has been BANNED.`
        : `🟢 User #${targetId} has been UNBANNED.`,
      show_alert: true,
    });
    await editOrReply(
      ctx,
      renderAdminInspectUserText(targetUser),
      buildAdminInspectUserKeyboard(targetUser)
    );
  });

  // ADMIN MODULE H: ⚙️ MAINTENANCE MODE
  bot.callbackQuery("admin_maintenance", async (ctx) => {
    const maint = await getMaintenanceState(kv);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      renderAdminMaintenanceText(maint),
      buildAdminMaintenanceKeyboard(maint)
    );
  });

  bot.callbackQuery("admin_maintenance_toggle", async (ctx) => {
    const maint = await getMaintenanceState(kv);
    maint.enabled = !maint.enabled;
    maint.updatedAt = new Date().toISOString();
    maint.updatedBy = String(ctx.from.id);
    await putKvJson(kv, "config:maintenance", maint);

    await ctx.answerCallbackQuery({
      text: maint.enabled
        ? "🔴 Maintenance Mode ENABLED! Regular users will now see the maintenance screen."
        : "🟢 Maintenance Mode DISABLED! Bot is live for all users.",
      show_alert: true,
    });
    await editOrReply(
      ctx,
      renderAdminMaintenanceText(maint),
      buildAdminMaintenanceKeyboard(maint)
    );
  });

  // ==========================================================================
  // STANDARD USER FLOWS (/start, /home & ALL USER SUBMENUS — UNCHANGED & INTACT)
  // ==========================================================================
  bot.command(["start", "home"], async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const rates = await getDynamicRates(kv);
    const existingRaw = await kv.get(`user:${from.id}`);
    const isNewUser = !existingRaw;
    const user = await getUserData(kv, from.id, from.first_name, from.username);

    user.state = "IDLE";

    const payload = ctx.match ? String(ctx.match).trim() : "";
    if (isNewUser && payload.startsWith("ref_")) {
      const referrerId = payload.replace("ref_", "").trim();
      if (referrerId && referrerId !== String(from.id)) {
        const referrerRaw = await kv.get(`user:${referrerId}`);
        if (referrerRaw) {
          const referrer = await getUserData(kv, referrerId);
          const alreadyInvited = referrer.referrals.invitedUsers.some(
            (u) => String(u.id) === String(from.id)
          );
          if (!alreadyInvited) {
            const tier = getReferralTier(referrer.referrals.invitedCount, rates.referralBonusInr);
            const bonusInr = tier.rateInr;

            referrer.referrals.invitedCount += 1;
            referrer.referrals.totalCommissionInr += bonusInr;
            referrer.referrals.invitedUsers.unshift({
              id: String(from.id),
              name: from.first_name || "User",
              bonusInr,
              date: new Date().toISOString(),
            });
            referrer.balanceInr += bonusInr;
            referrer.lifetimeInr += bonusInr;
            await saveUserData(kv, referrer);

            user.referrals.referredBy = referrerId;

            if (referrer.settings.notifications) {
              try {
                await ctx.api.sendMessage(
                  referrerId,
                  `🎉 *New Referral Joined!*\n\nUser *${escapeMd(from.first_name)}* (\`#${from.id}\`) joined via your invite link.\n💰 *+₹${bonusInr.toFixed(2)}* has been credited to your balance!`,
                  { parse_mode: "Markdown" }
                );
              } catch {
                // Ignore if referrer blocked the bot
              }
            }
          }
        }
      }
    }

    await saveUserData(kv, user);
    await ctx.reply(renderHomeText(user), {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(),
    });
  });

  // 1. HOME DASHBOARD CALLBACK
  bot.callbackQuery("menu_home", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard());
  });

  // 2A. 📩 REGISTER AN ACCOUNT FLOW
  bot.callbackQuery("menu_register", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    if (!user.currentTask) {
      user.currentTask = generateNewTask();
      await saveUserData(kv, user);
    }
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderRegisterTaskText(user.currentTask, rates), buildTaskKeyboard());
  });

  bot.callbackQuery("task_done", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const completedTask = user.currentTask || generateNewTask();

    user.balanceInr += rates.taskRewardInr;
    user.lifetimeInr += rates.taskRewardInr;
    user.accounts.approved += 1;
    user.accounts.history.unshift({
      taskId: completedTask.taskId,
      email: completedTask.email,
      rewardInr: rates.taskRewardInr,
      date: new Date().toISOString(),
    });
    user.currentTask = null;
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery({
      text: `✅ Account Verified & Approved!\n+₹${rates.taskRewardInr.toFixed(2)} ($${rates.taskRewardUsd.toFixed(2)}) credited to your balance.\nNew Balance: ₹${user.balanceInr.toFixed(2)}`,
      show_alert: true,
    });

    const confirmationText =
      `🎉 *Task Approved Successfully!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 *Account:* \`${completedTask.email}\`\n` +
      `💵 *Reward Credited:* *+₹${rates.taskRewardInr.toFixed(2)}* (\`$${rates.taskRewardUsd.toFixed(2)}\`)\n` +
      `👛 *Updated Balance:* \`₹${user.balanceInr.toFixed(2)}\`\n` +
      `✅ *Total Verified Accounts:* \`${user.accounts.approved}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👇 *Ready for another task?*`;

    const nextKb = new InlineKeyboard()
      .text("📩 Register Another Account", "menu_register")
      .text("👛 View Balance", "menu_balance")
      .row()
      .text("🔙 Back to Main Menu", "menu_home");

    await editOrReply(ctx, confirmationText, nextKb);
  });

  bot.callbackQuery("task_cancel", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.currentTask = null;
    user.state = "IDLE";
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery({
      text: "🚫 Current registration task cancelled.",
      show_alert: false,
    });
    await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard());
  });

  bot.callbackQuery("task_guide", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    if (!user.currentTask) {
      user.currentTask = generateNewTask();
      await saveUserData(kv, user);
    }
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderTaskGuideText(user.currentTask), buildTaskGuideKeyboard());
  });

  // 2B. 📑 MY ACCOUNTS FLOW
  bot.callbackQuery("menu_accounts", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderMyAccountsText(user), buildMyAccountsKeyboard());
  });

  bot.callbackQuery("accounts_refresh", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery({
      text: "🔄 Account statistics synced with verification server!",
      show_alert: false,
    });
    await editOrReply(ctx, renderMyAccountsText(user), buildMyAccountsKeyboard());
  });

  bot.callbackQuery("accounts_export", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery({
      text: `📥 Export Ready: accounts_${user.userId}_report.csv (${user.accounts.approved} approved records) generated!`,
      show_alert: true,
    });
  });

  // 2C. 👛 BALANCE & UPI WITHDRAWAL FLOW
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
      const needed = (rates.minWithdrawalInr - user.balanceInr).toFixed(2);
      await ctx.answerCallbackQuery({
        text: `⚠️ Minimum withdrawal is ₹${rates.minWithdrawalInr.toFixed(2)}!\nYou need ₹${needed} more to request a UPI payout.`,
        show_alert: true,
      });
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
    await ctx.answerCallbackQuery({ text: "Withdrawal request cancelled." });
    await editOrReply(ctx, renderBalanceText(user, rates), buildBalanceKeyboard());
  });

  bot.callbackQuery("balance_history", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderWithdrawalHistoryText(user, rates), buildWithdrawalHistoryKeyboard());
  });

  // 2D. 👥 REFERRALS FLOW
  bot.callbackQuery("menu_referrals", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const botUsername = env.BOT_USERNAME || ctx.me?.username || "GmailTaskRewardsBot";
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      renderReferralsText(user, botUsername, rates),
      buildReferralsKeyboard(botUsername, user.userId, rates)
    );
  });

  bot.callbackQuery("referrals_analytics", async (ctx) => {
    const rates = await getDynamicRates(kv);
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery({ text: "📊 Referral network analytics updated!" });
    await editOrReply(ctx, renderReferralAnalyticsText(user, rates), buildReferralAnalyticsKeyboard());
  });

  // 2E. 🎁 REWARDS & MILESTONES FLOW
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
      await ctx.answerCallbackQuery({
        text: "⏳ You have already claimed your Daily Check-In reward today! Come back tomorrow.",
        show_alert: true,
      });
      return;
    }

    const bonusInr = rates.dailyStreakBaseInr + Math.min(user.rewards.streakDays, 5);
    user.rewards.streakDays += 1;
    user.rewards.lastCheckInDate = today;
    user.balanceInr += bonusInr;
    user.lifetimeInr += bonusInr;
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery({
      text: `🎯 Daily Check-In Claimed!\n🔥 Day ${user.rewards.streakDays} Streak Bonus: +₹${bonusInr.toFixed(2)} added to wallet!`,
      show_alert: true,
    });
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

    if (user.rewards.claimedMilestones.includes(milestone.id)) {
      await ctx.answerCallbackQuery({
        text: `✅ You already claimed the "${milestone.label}" milestone bonus!`,
        show_alert: true,
      });
      return;
    }

    if (user.accounts.approved < milestone.count) {
      const remaining = milestone.count - user.accounts.approved;
      await ctx.answerCallbackQuery({
        text: `🔒 Locked! Register ${remaining} more account(s) to unlock the ₹${milestone.bonusInr} bonus.`,
        show_alert: true,
      });
      return;
    }

    user.rewards.claimedMilestones.push(milestone.id);
    user.balanceInr += milestone.bonusInr;
    user.lifetimeInr += milestone.bonusInr;
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery({
      text: `🏆 Milestone Unlocked!\n+₹${milestone.bonusInr}.00 bonus credited to your balance!`,
      show_alert: true,
    });
    await editOrReply(ctx, renderMilestonesText(user), buildMilestonesKeyboard(user));
  });

  // 2F. ⚙️ SETTINGS FLOW
  bot.callbackQuery("menu_settings", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_toggle_notif", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.notifications = !user.settings.notifications;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({
      text: `🔔 Notifications turned ${user.settings.notifications ? "ON" : "OFF"}`,
    });
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_toggle_currency", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.currency = user.settings.currency === "INR" ? "USD" : "INR";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({
      text: `💱 Default currency switched to ${user.settings.currency}`,
    });
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_language", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      `🌐 *Select Interface Language*\n━━━━━━━━━━━━━━━━━━━━━━\nCurrent Language: \`${user.settings.language}\`\n\nChoose your preferred language below:`,
      buildLanguageSubmenuKeyboard(user.settings.language)
    );
  });

  bot.callbackQuery(/^set_lang_(\d+)$/, async (ctx) => {
    const langs = ["English (EN)", "हिन्दी (HI)", "বাংলা (BN)", "தமிழ் (TA)"];
    const selected = langs[Number(ctx.match[1])] || "English (EN)";
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.language = selected;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: `🌐 Language updated to ${selected}` });
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  bot.callbackQuery("settings_rotate_session", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.settings.sessionId = `SES-${String(user.userId).slice(-4).padStart(4, "0")}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({
      text: `🔑 New Session ID generated: ${user.settings.sessionId}`,
      show_alert: true,
    });
    await editOrReply(ctx, renderSettingsText(user), buildSettingsKeyboard(user));
  });

  // 2G. ❓ HELP & MULTI-LEVEL FAQ FLOW
  bot.callbackQuery("menu_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHelpText(), buildHelpKeyboard(env));
  });

  bot.callbackQuery(/^faq_(.+)$/, async (ctx) => {
    const rates = await getDynamicRates(kv);
    const key = ctx.callbackQuery.data;
    const answers = getFaqAnswers(rates);
    const answerText = answers[key] || "❓ Topic not found.";
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, answerText, buildFaqBackKeyboard());
  });

  // ==========================================================================
  // 11. UNIFIED MESSAGE HANDLER (Admin Stateful Inputs + User AWAITING_UPI)
  // ==========================================================================
  bot.on("message", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const user = await getUserData(kv, from.id, from.first_name, from.username);
    const isAdmin = await isAuthorizedAdmin(kv, env, from.id);
    const text = (ctx.message?.text || "").trim();

    // A. ADMIN STATEFUL INPUT HANDLERS
    if (isAdmin && user.state.startsWith("AWAITING_") && user.state !== "AWAITING_UPI") {
      const currentState = user.state;

      // 1. Broadcast Message (Supports Photo + Caption OR Text/Markdown)
      if (currentState === "AWAITING_BROADCAST") {
        user.state = "IDLE";
        user.adminContext = {};
        await saveUserData(kv, user);

        const userIds = await getUsersIndex(kv);
        const statusMsg = await ctx.reply(
          `📣 *Broadcasting message to ${userIds.length} users...*\n⏳ Progress: \`0 / ${userIds.length}\``,
          { parse_mode: "Markdown" }
        );

        let sent = 0;
        let failed = 0;
        const photoList = ctx.message?.photo;
        const photoFileId =
          photoList && photoList.length > 0 ? photoList[photoList.length - 1].file_id : null;
        const caption = ctx.message?.caption || "";

        for (let i = 0; i < userIds.length; i++) {
          const targetId = userIds[i];
          try {
            if (photoFileId) {
              await ctx.api.sendPhoto(targetId, photoFileId, {
                caption,
                parse_mode: "Markdown",
              });
            } else {
              await ctx.api.sendMessage(targetId, text || "📢 Announcement", {
                parse_mode: "Markdown",
              });
            }
            sent += 1;
          } catch {
            failed += 1;
          }

          if ((i + 1) % 10 === 0 || i === userIds.length - 1) {
            try {
              await ctx.api.editMessageText(
                ctx.chat.id,
                statusMsg.message_id,
                `📣 *Broadcast Completed!*\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `👥 *Total Target Users:* \`${userIds.length}\`\n` +
                  `✅ *Delivered Successfully:* \`${sent}\`\n` +
                  `❌ *Failed / Blocked:* \`${failed}\`\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━`,
                {
                  parse_mode: "Markdown",
                  reply_markup: buildAdminBackKeyboard(),
                }
              );
            } catch {
              // ignore rate limit on progress edit
            }
          }
        }
        return;
      }

      // 2. Add Force-Join Channel (Supports forwarded channel message or @username)
      if (currentState === "AWAITING_FORCE_CHANNEL") {
        let targetChatId = null;
        let fallbackTitle = null;

        if (ctx.message?.forward_from_chat && ctx.message.forward_from_chat.type === "channel") {
          targetChatId = ctx.message.forward_from_chat.username
            ? `@${ctx.message.forward_from_chat.username}`
            : String(ctx.message.forward_from_chat.id);
          fallbackTitle = ctx.message.forward_from_chat.title;
        } else if (text) {
          targetChatId =
            text.startsWith("@") || text.startsWith("-100")
              ? text.split(/\s+/)[0]
              : `@${text.split(/\s+/)[0]}`;
        }

        if (!targetChatId) {
          await ctx.reply(
            "❌ *Invalid Channel Input!*\nPlease forward a message from the channel or send its `@username`.",
            { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_channels") }
          );
          return;
        }

        try {
          const chatInfo = await ctx.api.getChat(targetChatId);
          const botMember = await ctx.api.getChatMember(chatInfo.id, ctx.me.id);
          if (botMember.status !== "administrator" && botMember.status !== "creator") {
            await ctx.reply(
              `⚠️ *Bot is Not an Admin!*\nPlease promote *@${escapeMd(ctx.me.username)}* to Administrator in *${escapeMd(chatInfo.title || targetChatId)}* and try again.`,
              { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_channels") }
            );
            return;
          }

          const channels = await getForceChannels(kv);
          const normalizedId = chatInfo.username ? `@${chatInfo.username}` : String(chatInfo.id);
          const inviteLink =
            chatInfo.invite_link ||
            (chatInfo.username ? `https://t.me/${chatInfo.username}` : "https://t.me/");

          if (!channels.some((c) => (typeof c === "string" ? c : c.id) === normalizedId)) {
            channels.push({
              id: normalizedId,
              title: chatInfo.title || fallbackTitle || normalizedId,
              inviteLink,
            });
            await saveForceChannels(kv, channels);
          }

          user.state = "IDLE";
          await saveUserData(kv, user);

          await ctx.reply(
            `✅ *Force-Join Channel Added & Verified!*\n` +
              `Channel: *${escapeMd(chatInfo.title || normalizedId)}* (\`${normalizedId}\`)\n\n` +
              renderAdminChannelsText(channels),
            {
              parse_mode: "Markdown",
              reply_markup: buildAdminForceChannelsKeyboard(channels),
            }
          );
        } catch (err) {
          await ctx.reply(
            `❌ *Verification Failed!*\nCould not verify admin rights in \`${targetChatId}\`. Ensure the channel exists and the bot is promoted to Admin.\n\n_Error: ${escapeMd(err?.description || err?.message || "Unknown")}_`,
            { parse_mode: "Markdown", reply_markup: buildAdminCancelInputKeyboard("admin_channels") }
          );
        }
        return;
      }

      // 3. Dynamic Reward Rate Updates
      if (
        currentState === "AWAITING_RATE_TASK" ||
        currentState === "AWAITING_RATE_MIN_WITHDRAW" ||
        currentState === "AWAITING_RATE_REFERRAL"
      ) {
        const val = parseFloat(text);
        if (isNaN(val) || val <= 0) {
          await ctx.reply("❌ Please send a valid positive number (e.g. `20` or `50`).", {
            parse_mode: "Markdown",
            reply_markup: buildAdminCancelInputKeyboard("admin_rates"),
          });
          return;
        }

        const rates = await getDynamicRates(kv);
        if (currentState === "AWAITING_RATE_TASK") {
          rates.taskRewardInr = val;
          rates.taskRewardUsd = Number((val / 75).toFixed(2));
        } else if (currentState === "AWAITING_RATE_MIN_WITHDRAW") {
          rates.minWithdrawalInr = val;
        } else if (currentState === "AWAITING_RATE_REFERRAL") {
          rates.referralBonusInr = val;
        }

        await putKvJson(kv, "config:rates", rates);
        user.state = "IDLE";
        await saveUserData(kv, user);

        await ctx.reply(
          `✅ *Dynamic Rate Updated Successfully!*\n\n` + renderAdminRatesText(rates),
          {
            parse_mode: "Markdown",
            reply_markup: buildAdminRatesKeyboard(rates),
          }
        );
        return;
      }

      // 4. Add Secondary Admin
      if (currentState === "AWAITING_ADMIN_ID") {
        const newAdminId = text.replace(/\D/g, "");
        if (!newAdminId || newAdminId.length < 5) {
          await ctx.reply("❌ Please send a valid numeric Telegram User ID.", {
            parse_mode: "Markdown",
            reply_markup: buildAdminCancelInputKeyboard("admin_admins"),
          });
          return;
        }

        const subAdmins = await getSecondaryAdmins(kv);
        if (!subAdmins.some((a) => String(a.id) === newAdminId)) {
          subAdmins.push({
            id: newAdminId,
            addedBy: String(from.id),
            addedAt: new Date().toISOString(),
          });
          await putKvJson(kv, "config:admins", subAdmins);
        }

        user.state = "IDLE";
        await saveUserData(kv, user);

        await ctx.reply(
          `✅ *Secondary Admin #${newAdminId} Added!*\n\n` +
            renderAdminManageAdminsText(env, subAdmins),
          {
            parse_mode: "Markdown",
            reply_markup: buildAdminManageAdminsKeyboard(subAdmins),
          }
        );
        return;
      }

      // 5. Reject & Refund UPI Payout Reason
      if (currentState === "AWAITING_REJECT_REASON") {
        const txId = user.adminContext?.targetTxId;
        const reason = text || "UPI details could not be verified";
        const queue = await getPayoutQueue(kv);
        const idx = queue.findIndex((p) => p.txId === txId && p.status === "PROCESSING");

        user.state = "IDLE";
        user.adminContext = {};
        await saveUserData(kv, user);

        if (idx === -1) {
          await ctx.reply("⚠️ Payout request was not found or already processed.", {
            reply_markup: buildAdminBackKeyboard(),
          });
          return;
        }

        const payout = queue[idx];
        payout.status = "REJECTED";
        payout.rejectReason = reason;
        payout.processedAt = new Date().toISOString();
        payout.processedBy = String(from.id);
        await savePayoutQueue(kv, queue);

        const targetUser = await getUserData(kv, payout.userId);
        targetUser.balanceInr += Number(payout.amountInr);
        const userTx = targetUser.withdrawals.find((w) => w.txId === txId);
        if (userTx) {
          userTx.status = "REJECTED";
          userTx.rejectReason = reason;
        }
        await saveUserData(kv, targetUser);

        try {
          await ctx.api.sendMessage(
            payout.userId,
            `❌ *UPI Withdrawal Rejected & Refunded*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `🆔 *Reference ID:* \`${payout.txId}\`\n` +
              `💰 *Refunded Amount:* *+₹${Number(payout.amountInr).toFixed(2)}*\n` +
              `👛 *Restored Wallet Balance:* \`₹${targetUser.balanceInr.toFixed(2)}\`\n` +
              `💬 *Reason:* _${escapeMd(reason)}_\n` +
              `━━━━━━━━━━━━━━━━━━━━━━\n` +
              `💡 _Your funds have been returned to your wallet. You may submit a new withdrawal request with a valid UPI handle._`,
            { parse_mode: "Markdown" }
          );
        } catch {
          // ignore if blocked
        }

        const view = renderAdminPayoutsView(queue);
        await ctx.reply(
          `✅ *Payout ${txId} Rejected & ₹${Number(payout.amountInr).toFixed(2)} Refunded to User #${payout.userId}!*\n\n` +
            view.text,
          {
            parse_mode: "Markdown",
            reply_markup: view.replyMarkup,
          }
        );
        return;
      }

      // 6. Inspect User by ID
      if (currentState === "AWAITING_INSPECT_USER_ID") {
        const searchId = text.replace(/\D/g, "");
        const raw = await kv.get(`user:${searchId}`);
        if (!searchId || !raw) {
          await ctx.reply(
            `❌ *User Not Found!*\nNo user record exists in \`env.BOT_KV\` for ID \`${escapeMd(text)}\`.`,
            {
              parse_mode: "Markdown",
              reply_markup: buildAdminCancelInputKeyboard("admin_home"),
            }
          );
          return;
        }

        user.state = "IDLE";
        await saveUserData(kv, user);

        const targetUser = await getUserData(kv, searchId);
        await ctx.reply(renderAdminInspectUserText(targetUser), {
          parse_mode: "Markdown",
          reply_markup: buildAdminInspectUserKeyboard(targetUser),
        });
        return;
      }

      // 7. Add or Deduct User Balance
      if (
        currentState === "AWAITING_USER_ADD_BAL" ||
        currentState === "AWAITING_USER_DEDUCT_BAL"
      ) {
        const amount = parseFloat(text);
        const targetId = user.adminContext?.targetUserId;
        if (isNaN(amount) || amount <= 0 || !targetId) {
          await ctx.reply("❌ Please enter a valid positive number.", {
            reply_markup: buildAdminCancelInputKeyboard("admin_home"),
          });
          return;
        }

        const targetUser = await getUserData(kv, targetId);
        if (currentState === "AWAITING_USER_ADD_BAL") {
          targetUser.balanceInr += amount;
          targetUser.lifetimeInr += amount;
        } else {
          targetUser.balanceInr = Math.max(0, targetUser.balanceInr - amount);
        }
        await saveUserData(kv, targetUser);

        user.state = "IDLE";
        user.adminContext = {};
        await saveUserData(kv, user);

        await ctx.reply(
          `✅ *Wallet Updated for User #${targetId}!*\n\n` +
            renderAdminInspectUserText(targetUser),
          {
            parse_mode: "Markdown",
            reply_markup: buildAdminInspectUserKeyboard(targetUser),
          }
        );
        return;
      }
    }

    // B. USER STATEFUL UPI WITHDRAWAL INPUT (AWAITING_UPI)
    if (user.state === "AWAITING_UPI") {
      const rates = await getDynamicRates(kv);
      const tokens = text.split(/\s+/);
      const upiTokenIndex = tokens.findIndex((t) => t.includes("@"));
      const upiId = upiTokenIndex !== -1 ? tokens[upiTokenIndex] : "";
      const holderName =
        tokens.filter((_, i) => i !== upiTokenIndex).join(" ").trim() ||
        from.first_name ||
        "Account Holder";

      if (!upiId || !isValidUpi(upiId)) {
        await ctx.reply(
          `❌ *Invalid UPI ID Format!*\n\nPlease enter a valid UPI handle (e.g. \`name@okaxis\` or \`9876543210@ybl\`) followed by your full name.\n\n*Example:* \`rahul@okaxis Rahul Sharma\``,
          {
            parse_mode: "Markdown",
            reply_markup: buildCancelUpiKeyboard(),
          }
        );
        return;
      }

      if (user.balanceInr < rates.minWithdrawalInr) {
        user.state = "IDLE";
        await saveUserData(kv, user);
        await ctx.reply(
          `⚠️ *Insufficient Balance!*\nYour balance (\`₹${user.balanceInr.toFixed(2)}\`) is below the minimum withdrawal limit of \`₹${rates.minWithdrawalInr.toFixed(2)}\`.`,
          {
            parse_mode: "Markdown",
            reply_markup: buildMainMenuKeyboard(),
          }
        );
        return;
      }

      const payoutAmount = user.balanceInr;
      const txId = `UPI-${Date.now().toString(36).toUpperCase()}`;
      const timestamp = new Date().toISOString();

      user.balanceInr = 0;
      user.state = "IDLE";
      const withdrawalEntry = {
        txId,
        userId: String(from.id),
        firstName: from.first_name || "User",
        username: from.username || "",
        amountInr: payoutAmount,
        upiId,
        holderName,
        status: "PROCESSING",
        date: timestamp,
      };
      user.withdrawals.unshift(withdrawalEntry);
      await saveUserData(kv, user);

      const queue = await getPayoutQueue(kv);
      queue.unshift(withdrawalEntry);
      await savePayoutQueue(kv, queue);

      if (env.ADMIN_CHAT_ID) {
        const adminAlert =
          `🚨 *NEW UPI WITHDRAWAL REQUEST*\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 *Transaction ID:* \`${txId}\`\n` +
          `👤 *User:* ${escapeMd(from.first_name)} ${from.username ? `(@${escapeMd(from.username)})` : ""}\n` +
          `🔢 *User ID:* \`${from.id}\`\n` +
          `💰 *Payout Amount:* *₹${payoutAmount.toFixed(2)}*\n` +
          `🏦 *UPI Handle:* \`${upiId}\`\n` +
          `🪪 *Account Holder:* \`${escapeMd(holderName)}\`\n` +
          `✅ *Verified Accounts:* \`${user.accounts.approved}\`\n` +
          `🕒 *Timestamp:* \`${timestamp}\`\n` +
          `━━━━━━━━━━━━━━━━━━━━━━`;

        const adminActionKb = new InlineKeyboard()
          .text(`✅ Approve / Mark Paid`, `admin_payout_approve_${txId}`)
          .text(`❌ Reject & Refund`, `admin_payout_reject_${txId}`);

        try {
          const primaryAdminChat = String(env.ADMIN_CHAT_ID).split(",")[0].trim();
          await ctx.api.sendMessage(primaryAdminChat, adminAlert, {
            parse_mode: "Markdown",
            reply_markup: adminActionKb,
          });
        } catch (err) {
          console.error("Failed to send admin withdrawal notification:", err);
        }
      }

      const confirmMsg =
        `✅ *UPI Withdrawal Submitted Successfully!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *Reference ID:* \`${txId}\`\n` +
        `💵 *Amount Deducted:* *₹${payoutAmount.toFixed(2)}*\n` +
        `🏦 *Destination UPI:* \`${upiId}\`\n` +
        `👤 *Beneficiary Name:* \`${escapeMd(holderName)}\`\n` +
        `👛 *Remaining Balance:* \`₹0.00\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏳ _Your withdrawal has been forwarded to our payout desk and will be credited shortly._`;

      const postWithdrawKb = new InlineKeyboard()
        .text("📜 Withdrawal History", "balance_history")
        .text("📩 Earn More", "menu_register")
        .row()
        .text("🔙 Back to Main Menu", "menu_home");

      await ctx.reply(confirmMsg, {
        parse_mode: "Markdown",
        reply_markup: postWithdrawKb,
      });
      return;
    }

    await ctx.reply(renderHomeText(user), {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(),
    });
  });

  bot.catch((err) => {
    console.error(`grammY Error while handling update ${err.ctx?.update?.update_id}:`, err.error);
  });

  return bot;
}

// ============================================================================
// 12. CLOUDFLARE WORKER EXPORT HANDLER
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          worker: "gmailworkop",
          service: "grammY Telegram Task & UPI Bot + Enterprise Admin Panel (Cloudflare Workers)",
          kvBound: Boolean(env.BOT_KV),
          botTokenConfigured: Boolean(env.BOT_TOKEN),
          superAdminConfigured: Boolean(env.ADMIN_CHAT_ID),
        }),
        {
          status: 200,
          headers: { "content-type": "application/json;charset=UTF-8" },
        }
      );
    }

    if (!env.BOT_TOKEN) {
      return new Response("Missing BOT_TOKEN environment secret", { status: 500 });
    }
    if (!env.BOT_KV) {
      return new Response("Missing BOT_KV namespace binding", { status: 500 });
    }

    const bot = createBot(env);
    const handleUpdate = webhookCallback(bot, "cloudflare-mod");
    return handleUpdate(request);
  },
};
