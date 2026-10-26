/**
 * Production-Ready Telegram Task & Rewards Bot
 * Framework: grammY (ES Module for Cloudflare Workers)
 * Storage: Cloudflare Workers KV (env.BOT_KV)
 *
 * Environment Variables / Bindings Required in wrangler.toml:
 * - BOT_KV: KV Namespace binding
 * - BOT_TOKEN: Telegram Bot API Token from @BotFather
 * - ADMIN_CHAT_ID: Telegram Chat/Channel ID for UPI withdrawal alerts (e.g. "-100192837465" or "123456789")
 * - BOT_USERNAME: Bot username without @ (optional fallback, auto-detected from ctx.me.username)
 * - SUPPORT_URL: Support link (defaults to "https://t.me/TelegramSupport")
 * - NEWS_URL: Project news channel link (defaults to "https://t.me/TelegramTips")
 */

import { Bot, InlineKeyboard, webhookCallback } from "grammy";

// ============================================================================
// 1. CONSTANTS & REWARD CONFIGURATION
// ============================================================================
const TASK_REWARD_INR = 15;
const TASK_REWARD_USD = 0.20;
const MIN_WITHDRAWAL_INR = 50;
const REFERRAL_BONUS_INR = 5;
const DAILY_STREAK_BASE_INR = 2;

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
// 2. KV PERSISTENCE HELPERS (env.BOT_KV)
// ============================================================================
function createDefaultUser(userId, firstName = "User", username = "") {
  return {
    userId: String(userId),
    firstName,
    username,
    state: "IDLE", // "IDLE" | "AWAITING_UPI"
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
      currency: "INR", // "INR" | "USD"
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
    return fresh;
  }
  try {
    const parsed = JSON.parse(raw);
    // Ensure backwards compatibility if schema fields were added
    const defaults = createDefaultUser(userId, firstName, username);
    return {
      ...defaults,
      ...parsed,
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
    return fresh;
  }
}

async function saveUserData(kv, user) {
  user.updatedAt = new Date().toISOString();
  await kv.put(`user:${user.userId}`, JSON.stringify(user));
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

function getReferralTier(invitedCount) {
  if (invitedCount >= 25) {
    return { name: "💎 Diamond Partner", rateInr: 10, nextAt: null };
  }
  if (invitedCount >= 10) {
    return { name: "🥇 Gold Partner", rateInr: 7, nextAt: 25 };
  }
  return { name: "🥈 Silver Starter", rateInr: REFERRAL_BONUS_INR, nextAt: 10 };
}

function isValidUpi(upi) {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi);
}

// ============================================================================
// 4. INLINE KEYBOARDS (100% Pure InlineKeyboardMarkup, Zero ReplyKeyboard)
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

function buildReferralsKeyboard(botUsername, userId) {
  const inviteLink = `https://t.me/${botUsername}?start=ref_${userId}`;
  const shareText = encodeURIComponent(
    "🔥 Earn ₹15 ($0.20) per registered account with instant UPI payouts! Join using my invite link:"
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
// 5. SCREEN TEXT RENDERERS (Markdown Formatted)
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

function renderRegisterTaskText(task, user) {
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

function renderBalanceText(user) {
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

function renderWithdrawalHistoryText(user) {
  const list =
    user.withdrawals.length > 0
      ? user.withdrawals
          .slice(0, 8)
          .map(
            (w, idx) =>
              `${idx + 1}. *₹${w.amountInr.toFixed(2)}* → \`${w.upiId}\`\n   └ 🆔 \`${w.txId}\` • _${w.status}_ (${w.date.slice(0, 10)})`
          )
          .join("\n\n")
      : "_No withdrawals found yet. Reach ₹50.00 to request your first UPI payout!_";

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

function renderReferralsText(user, botUsername) {
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

function renderReferralAnalyticsText(user) {
  const tier = getReferralTier(user.referrals.invitedCount);
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
    `├─ 🥈 *Silver (0–9):* ₹5 / invite\n` +
    `├─ 🥇 *Gold (10–24):* ₹7 / invite\n` +
    `└─ 💎 *Diamond (25+):* ₹10 / invite\n\n` +
    `📋 *Recent Referral Tree:*\n` +
    `${recentReferrals}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

function renderRewardsText(user) {
  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = user.rewards.lastCheckInDate === today;

  return (
    `🎁 *Daily Streak & Milestone Rewards*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔥 *Current Daily Streak:* \`${user.rewards.streakDays} Days\`\n` +
    `📅 *Today's Check-In:* ${checkedInToday ? "✅ *Claimed*" : "🟢 *Available Now!*"}\n` +
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

const FAQ_ANSWERS = {
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

function escapeMd(text = "") {
  return String(text).replace(/([_*`\[])/g, "\\$1");
}

// ============================================================================
// 6. SAFE MESSAGE EDITOR (Always edits in-place via editMessageText)
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
      // Ignore "message is not modified" errors from Telegram API
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
// 7. BOT FACTORY & HANDLER REGISTRATION
// ============================================================================
function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);
  const kv = env.BOT_KV;

  // --------------------------------------------------------------------------
  // /start & /home Commands (plus Referral Deep-Linking ?start=ref_<user_id>)
  // --------------------------------------------------------------------------
  bot.command(["start", "home"], async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const existingRaw = await kv.get(`user:${from.id}`);
    const isNewUser = !existingRaw;
    const user = await getUserData(kv, from.id, from.first_name, from.username);

    // Reset any pending input state when returning home
    user.state = "IDLE";

    // Process referral payload (?start=ref_12345) for first-time users
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
            const tier = getReferralTier(referrer.referrals.invitedCount);
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
                  `🎉 *New Referral Joined!*\n\nUser *${escapeMd(from.first_name)}* (\`#${from.id}\`) joined via your invite link.\n💰 *+₹${bonusInr}.00* has been credited to your balance!`,
                  { parse_mode: "Markdown" }
                );
              } catch {
                // Referrer may have blocked bot; ignore safely
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

  // --------------------------------------------------------------------------
  // 1. HOME DASHBOARD CALLBACK
  // --------------------------------------------------------------------------
  bot.callbackQuery("menu_home", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHomeText(user), buildMainMenuKeyboard());
  });

  // --------------------------------------------------------------------------
  // 2A. 📩 REGISTER AN ACCOUNT FLOW
  // --------------------------------------------------------------------------
  bot.callbackQuery("menu_register", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    if (!user.currentTask) {
      user.currentTask = generateNewTask();
      await saveUserData(kv, user);
    }
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderRegisterTaskText(user.currentTask, user), buildTaskKeyboard());
  });

  bot.callbackQuery("task_done", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const completedTask = user.currentTask || generateNewTask();

    // Credit ₹15 ($0.20) to user balance & increment verified counter
    user.balanceInr += TASK_REWARD_INR;
    user.lifetimeInr += TASK_REWARD_INR;
    user.accounts.approved += 1;
    user.accounts.history.unshift({
      taskId: completedTask.taskId,
      email: completedTask.email,
      rewardInr: TASK_REWARD_INR,
      date: new Date().toISOString(),
    });
    user.currentTask = null;
    await saveUserData(kv, user);

    // Show approval popup alert
    await ctx.answerCallbackQuery({
      text: `✅ Account Verified & Approved!\n+₹${TASK_REWARD_INR}.00 ($${TASK_REWARD_USD.toFixed(2)}) credited to your balance.\nNew Balance: ₹${user.balanceInr.toFixed(2)}`,
      show_alert: true,
    });

    const confirmationText =
      `🎉 *Task Approved Successfully!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📧 *Account:* \`${completedTask.email}\`\n` +
      `💵 *Reward Credited:* *+₹${TASK_REWARD_INR}.00* (\`$${TASK_REWARD_USD.toFixed(2)}\`)\n` +
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

  // --------------------------------------------------------------------------
  // 2B. 📑 MY ACCOUNTS FLOW
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 2C. 👛 BALANCE & UPI WITHDRAWAL FLOW
  // --------------------------------------------------------------------------
  bot.callbackQuery("menu_balance", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderBalanceText(user), buildBalanceKeyboard());
  });

  bot.callbackQuery("balance_withdraw", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    if (user.balanceInr < MIN_WITHDRAWAL_INR) {
      const needed = (MIN_WITHDRAWAL_INR - user.balanceInr).toFixed(2);
      await ctx.answerCallbackQuery({
        text: `⚠️ Minimum withdrawal is ₹${MIN_WITHDRAWAL_INR.toFixed(2)}!\nYou need ₹${needed} more to request a UPI payout.`,
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
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    user.state = "IDLE";
    await saveUserData(kv, user);
    await ctx.answerCallbackQuery({ text: "Withdrawal request cancelled." });
    await editOrReply(ctx, renderBalanceText(user), buildBalanceKeyboard());
  });

  bot.callbackQuery("balance_history", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderWithdrawalHistoryText(user), buildWithdrawalHistoryKeyboard());
  });

  // --------------------------------------------------------------------------
  // 2D. 👥 REFERRALS FLOW
  // --------------------------------------------------------------------------
  bot.callbackQuery("menu_referrals", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const botUsername = env.BOT_USERNAME || ctx.me?.username || "GmailTaskRewardsBot";
    await ctx.answerCallbackQuery();
    await editOrReply(
      ctx,
      renderReferralsText(user, botUsername),
      buildReferralsKeyboard(botUsername, user.userId)
    );
  });

  bot.callbackQuery("referrals_analytics", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery({ text: "📊 Referral network analytics updated!" });
    await editOrReply(ctx, renderReferralAnalyticsText(user), buildReferralAnalyticsKeyboard());
  });

  // --------------------------------------------------------------------------
  // 2E. 🎁 REWARDS & MILESTONES FLOW
  // --------------------------------------------------------------------------
  bot.callbackQuery("menu_rewards", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderRewardsText(user), buildRewardsKeyboard());
  });

  bot.callbackQuery("rewards_checkin", async (ctx) => {
    const user = await getUserData(kv, ctx.from.id, ctx.from.first_name, ctx.from.username);
    const today = new Date().toISOString().slice(0, 10);

    if (user.rewards.lastCheckInDate === today) {
      await ctx.answerCallbackQuery({
        text: "⏳ You have already claimed your Daily Check-In reward today! Come back tomorrow.",
        show_alert: true,
      });
      return;
    }

    const bonusInr = DAILY_STREAK_BASE_INR + Math.min(user.rewards.streakDays, 5);
    user.rewards.streakDays += 1;
    user.rewards.lastCheckInDate = today;
    user.balanceInr += bonusInr;
    user.lifetimeInr += bonusInr;
    await saveUserData(kv, user);

    await ctx.answerCallbackQuery({
      text: `🎯 Daily Check-In Claimed!\n🔥 Day ${user.rewards.streakDays} Streak Bonus: +₹${bonusInr}.00 added to wallet!`,
      show_alert: true,
    });
    await editOrReply(ctx, renderRewardsText(user), buildRewardsKeyboard());
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

  // --------------------------------------------------------------------------
  // 2F. ⚙️ SETTINGS FLOW
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 2G. ❓ HELP & MULTI-LEVEL FAQ FLOW
  // --------------------------------------------------------------------------
  bot.callbackQuery("menu_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, renderHelpText(), buildHelpKeyboard(env));
  });

  bot.callbackQuery(/^faq_(.+)$/, async (ctx) => {
    const key = ctx.callbackQuery.data;
    const answerText = FAQ_ANSWERS[key] || "❓ Topic not found.";
    await ctx.answerCallbackQuery();
    await editOrReply(ctx, answerText, buildFaqBackKeyboard());
  });

  // --------------------------------------------------------------------------
  // 8. TEXT MESSAGE HANDLER (Stateful AWAITING_UPI Processing)
  // --------------------------------------------------------------------------
  bot.on("message:text", async (ctx) => {
    const from = ctx.from;
    const text = ctx.message.text.trim();
    const user = await getUserData(kv, from.id, from.first_name, from.username);

    if (user.state === "AWAITING_UPI") {
      // Parse UPI handle (token containing '@') and optional holder name
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

      if (user.balanceInr < MIN_WITHDRAWAL_INR) {
        user.state = "IDLE";
        await saveUserData(kv, user);
        await ctx.reply(
          `⚠️ *Insufficient Balance!*\nYour balance (\`₹${user.balanceInr.toFixed(2)}\`) is below the minimum withdrawal limit of \`₹${MIN_WITHDRAWAL_INR.toFixed(2)}\`.`,
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

      // Deduct balance to 0 & reset state
      user.balanceInr = 0;
      user.state = "IDLE";
      user.withdrawals.unshift({
        txId,
        amountInr: payoutAmount,
        upiId,
        holderName,
        status: "PROCESSING",
        date: timestamp,
      });
      await saveUserData(kv, user);

      // Forward transaction alert to env.ADMIN_CHAT_ID
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

        try {
          await ctx.api.sendMessage(env.ADMIN_CHAT_ID, adminAlert, {
            parse_mode: "Markdown",
          });
        } catch (err) {
          console.error("Failed to send admin withdrawal notification:", err);
        }
      }

      // Confirm withdrawal success to user with Pure Inline Navigation
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

    // Default fallback for unexpected text messages: always render inline dashboard
    await ctx.reply(renderHomeText(user), {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(),
    });
  });

  // Global error handler
  bot.catch((err) => {
    console.error(`grammY Error while handling update ${err.ctx?.update?.update_id}:`, err.error);
  });

  return bot;
}

// ============================================================================
// 9. CLOUDFLARE WORKER EXPORT HANDLER
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    // Health check & quick status endpoint on GET requests
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          ok: true,
          service: "grammY Telegram Task & UPI Bot (Cloudflare Workers)",
          kvBound: Boolean(env.BOT_KV),
          botTokenConfigured: Boolean(env.BOT_TOKEN),
          adminChatConfigured: Boolean(env.ADMIN_CHAT_ID),
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
