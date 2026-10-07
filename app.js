"use strict";

const toast = document.querySelector("#toast");
let toastTimeout;
const reminders = new Map();
let locationWatchId = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

document.querySelector("#current-date").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

document.querySelectorAll("[data-scroll-to]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

const locationStatus = document.querySelector("#location-status");
const locationCoordinates = document.querySelector("#location-coordinates");
const locationMessage = document.querySelector("#location-message");
const startLocationButton = document.querySelector("#start-location");
const stopLocationButton = document.querySelector("#stop-location");
const locationLiveBadge = document.querySelector("#location-live-badge");
const mapUserPin = document.querySelector("#map-user-pin");
const mapPlaceholderLabel = document.querySelector("#map-placeholder-label");
const openMapLink = document.querySelector("#open-map");
const mapPrivacyNote = document.querySelector("#map-privacy-note");
const friendPreview = document.querySelector("#friend-preview");
const friendPreviewButton = document.querySelector("#toggle-friend-preview");

function showLocationMessage(message, isError = false) {
  locationMessage.textContent = message;
  locationMessage.classList.toggle("error", isError);
  locationMessage.hidden = false;
}

function stopLocationTracking() {
  if (locationWatchId !== null && "geolocation" in navigator) {
    navigator.geolocation.clearWatch(locationWatchId);
  }
  locationWatchId = null;
  startLocationButton.disabled = false;
  stopLocationButton.disabled = true;
  locationStatus.textContent = "Not tracking";
  locationLiveBadge.classList.remove("is-live");
  locationLiveBadge.innerHTML = "<span></span> PRIVATE";
  if (mapUserPin.classList.contains("visible")) {
    locationCoordinates.textContent += " Tracking stopped.";
  }
}

function handleLocationError(error) {
  stopLocationTracking();
  const messages = {
    1: "Location permission was denied. Allow location access in your browser settings if you want to try again.",
    2: "Your location is currently unavailable. Check your device location settings and try again.",
    3: "Getting your location timed out. Try again when you have a stronger signal.",
  };
  showLocationMessage(messages[error.code] || "Could not get your location. Check browser permissions and try again.", true);
}

function updateLocation(position) {
  const { latitude, longitude, accuracy } = position.coords;
  const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  locationCoordinates.textContent = `Current coordinates: ${coordinates} · accuracy ±${Math.round(accuracy)} m · updated ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(position.timestamp)}`;
  openMapLink.href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=16/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
  openMapLink.hidden = false;
  mapPrivacyNote.hidden = false;
  mapUserPin.classList.add("visible");
  mapPlaceholderLabel.hidden = true;
  locationStatus.textContent = "Live on this device";
  locationLiveBadge.classList.add("is-live");
  locationLiveBadge.innerHTML = "<span></span> TRACKING";
  locationMessage.hidden = true;
  startLocationButton.disabled = true;
  stopLocationButton.disabled = false;
}

startLocationButton.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    showLocationMessage("This browser does not support location access.", true);
    return;
  }
  if (!window.isSecureContext) {
    showLocationMessage("Browser location requires a secure context (HTTPS) or localhost. Open this page from a secure website to use it.", true);
    return;
  }
  if (locationWatchId !== null) return;
  locationStatus.textContent = "Requesting permission…";
  showLocationMessage("Your browser may ask for permission. Location is used only while tracking is on.");
  locationWatchId = navigator.geolocation.watchPosition(
    updateLocation,
    handleLocationError,
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
  );
  startLocationButton.disabled = true;
});

stopLocationButton.addEventListener("click", () => {
  stopLocationTracking();
  showLocationMessage("Location tracking stopped. Your location is no longer being updated.");
});

friendPreviewButton.addEventListener("click", () => {
  const isExpanded = friendPreviewButton.getAttribute("aria-expanded") === "true";
  friendPreview.hidden = isExpanded;
  friendPreviewButton.setAttribute("aria-expanded", String(!isExpanded));
  friendPreviewButton.innerHTML = isExpanded
    ? 'Preview friend sharing <span aria-hidden="true">→</span>'
    : 'Hide sample preview <span aria-hidden="true">↑</span>';
});

const assistantForm = document.querySelector("#assistant-form");
const questionInput = document.querySelector("#question-input");
const assistantResponse = document.querySelector("#assistant-response");

function answerQuestion(question) {
  const normalized = question.toLowerCase();
  if (/\b(hello|hi|hey|good morning)\b/.test(normalized)) {
    return "Hi there! What would you like to work on today?";
  }
  if (/\b(phishing|scam|malicious|suspicious email|email safety)\b/.test(normalized)) {
    return "Paste the message into Check an email below. I’ll look for common warning signs, but avoid clicking links or sharing sensitive information until you’ve verified the sender.";
  }
  if (/\b(remind|reminder|notification|notify)\b/.test(normalized)) {
    return "You can set a browser reminder in the Timely nudge card. Choose a message and time, then allow notifications if your browser asks.";
  }
  if (/\b(location|track|friend|sharing)\b/.test(normalized)) {
    return "Use Location sharing to start or stop tracking your own location. Friend sharing is only a sample preview here; real sharing needs your friend’s explicit permission and a secure sharing service.";
  }
  if (/\b(thank|thanks)\b/.test(normalized)) {
    return "You’re welcome! I’m here whenever you need a hand.";
  }
  return "I’m a small frontend demo, so I can’t connect to a live AI service yet. I can help you explore this page: ask about reminders, location sharing, or email safety, or use the email checker to review a message for common warning signs.";
}

assistantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  assistantResponse.innerHTML = `<strong>You asked:</strong> ${escapeHtml(question)}<p>${escapeHtml(answerQuestion(question))}</p>`;
  assistantResponse.hidden = false;
  questionInput.value = "";
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

const emailForm = document.querySelector("#email-form");
const emailInput = document.querySelector("#email-input");
const emailResult = document.querySelector("#email-result");

function inspectEmail(text) {
  const findings = [];
  const lowerText = text.toLowerCase();
  const urls = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi) || [];

  if (/\b(urgent|immediately|within 24 hours|act now|final warning|account will be (?:suspended|closed))\b/i.test(text)) {
    findings.push("Uses urgency or threatens an account consequence.");
  }
  if (/\b(password|sign in|log in|verify your account|confirm your (?:identity|details)|bank details|credit card|social security)\b/i.test(text)) {
    findings.push("Asks for login, identity, or financial information.");
  }
  if (/\b(gift card|wire transfer|cryptocurrency|crypto wallet|send (?:money|payment)|payment required)\b/i.test(text)) {
    findings.push("Requests an unusual payment or transfer.");
  }
  if (/\b(dear (?:customer|user|member)|valued customer|dear account holder)\b/i.test(text)) {
    findings.push("Uses a generic greeting instead of addressing you by name.");
  }
  if (/\b(attachment|attached file|open the file|enable macros)\b/i.test(text)) {
    findings.push("Mentions an attachment or opening a file; verify it before opening.");
  }
  if (urls.some((url) => /https?:\/\/\d{1,3}(?:\.\d{1,3}){3}|bit\.ly|tinyurl\.com|t\.co|goo\.gl/i.test(url))) {
    findings.push("Contains an IP-address or shortened link that hides its destination.");
  } else if (urls.length > 0) {
    findings.push("Contains a link. Check its full destination before opening it.");
  }
  if (/\b(no-reply|noreply)@/.test(lowerText) && /\b(reply|respond|contact us)\b/.test(lowerText)) {
    findings.push("Sender and reply instructions may not match.");
  }

  return findings;
}

emailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = emailInput.value.trim();
  if (!text) return;
  const findings = inspectEmail(text);
  emailResult.className = findings.length ? "email-result" : "email-result safe";
  if (findings.length) {
    emailResult.innerHTML = `<h4>Use caution — ${findings.length} potential warning ${findings.length === 1 ? "sign" : "signs"}</h4><ul>${findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul><p>Do not click links or open attachments unless you can verify the sender through a trusted channel.</p>`;
  } else {
    emailResult.innerHTML = "<h4>No common warning signs spotted</h4><p>This quick check cannot confirm that an email is safe. Verify the sender and links independently, especially before sharing information.</p>";
  }
  emailResult.hidden = false;
});

const reminderForm = document.querySelector("#reminder-form");
const reminderInput = document.querySelector("#reminder-input");
const reminderTime = document.querySelector("#reminder-time");
const reminderResult = document.querySelector("#reminder-result");

function setMinimumReminderTime() {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  reminderTime.min = now.toISOString().slice(0, 16);
}

setMinimumReminderTime();

reminderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = reminderInput.value.trim();
  const date = new Date(reminderTime.value);
  const delay = date.getTime() - Date.now();
  if (!message || !Number.isFinite(date.getTime()) || delay <= 0) {
    showToast("Choose a reminder time in the future.");
    return;
  }

  if (!("Notification" in window)) {
    showToast("This browser does not support desktop notifications. Keep this page open for an on-page reminder.");
  } else if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      showToast("Notifications are blocked. You can still use an on-page reminder while this page stays open.");
    }
  }

  const timeoutId = window.setTimeout(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Sentinel AI reminder", { body: message });
    } else {
      showToast(`Reminder: ${message}`);
    }
    reminders.delete(timeoutId);
    reminderResult.textContent = `Reminder delivered: ${message}`;
    reminderResult.hidden = false;
  }, delay);

  reminders.set(timeoutId, message);
  reminderResult.textContent = `Reminder set for ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)}. Keep this page open to receive it.`;
  reminderResult.hidden = false;
  reminderForm.reset();
  setMinimumReminderTime();
  showToast("Your reminder is set.");
});

const authGate = document.querySelector("#auth-gate");
const appShell = document.querySelector("#app-shell");
const authForm = document.querySelector("#auth-form");
const authName = document.querySelector("#auth-name");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authConfirmPassword = document.querySelector("#auth-confirm-password");
const authMessage = document.querySelector("#auth-message");
const authSubmit = document.querySelector("#auth-submit");
const loginModeButton = document.querySelector("#show-login");
const signupModeButton = document.querySelector("#show-signup");
const authModeSwitch = document.querySelector(".auth-mode-switch");
const fullNameField = document.querySelector("#full-name-field");
const confirmPasswordField = document.querySelector("#confirm-password-field");
const authPasswordField = authPassword.closest(".auth-field");
const authEmailField = authEmail.closest(".auth-field");
const authPasswordLabel = document.querySelector("#auth-password-label");
const authTitle = document.querySelector("#auth-title");
const authSubtitle = document.querySelector("#auth-subtitle");
const authKicker = document.querySelector("#auth-kicker");
const forgotPasswordButton = document.querySelector("#forgot-password");
const backToLoginButton = document.querySelector("#back-to-login");
const resendConfirmationButton = document.querySelector("#resend-confirmation");
const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const profileAvatar = document.querySelector("#profile-avatar");
const greetingName = document.querySelector("#greeting-name");
const accountMenuToggle = document.querySelector("#account-menu-toggle");
const accountMenu = document.querySelector("#account-menu");
const signOutButton = document.querySelector("#sign-out");
const openDeleteAccountButton = document.querySelector("#open-delete-account");
const deleteAccountDialog = document.querySelector("#delete-account-dialog");
const closeDeleteDialogButton = document.querySelector("#close-delete-dialog");
const cancelDeleteAccountButton = document.querySelector("#cancel-delete-account");
const deleteConfirmInput = document.querySelector("#delete-confirm-input");
const confirmDeleteAccountButton = document.querySelector("#confirm-delete-account");
const deleteDialogError = document.querySelector("#delete-dialog-error");

let authMode = "login";
let supabaseClient;
let recoveryActive = false;
let pendingConfirmationEmail = "";

function setAuthMessage(message, kind = "info") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${kind}`;
  authMessage.hidden = false;
}

function authRedirectUrl() {
  const redirectUrl = new URL(window.location.href);
  redirectUrl.search = "";
  redirectUrl.hash = "";
  return redirectUrl.toString();
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  const isRecovery = mode === "recovery";
  const isReset = mode === "reset";
  const isPasswordFlow = isSignup || isRecovery;
  const needsPassword = mode === "login" || isPasswordFlow;
  const needsEmail = mode !== "recovery";
  fullNameField.hidden = !isSignup;
  confirmPasswordField.hidden = !isPasswordFlow;
  authEmailField.hidden = !needsEmail;
  authPasswordField.hidden = !needsPassword;
  authModeSwitch.hidden = isReset || isRecovery;
  forgotPasswordButton.hidden = mode !== "login";
  backToLoginButton.hidden = !isReset;
  resendConfirmationButton.hidden = true;
  authName.required = isSignup;
  authEmail.required = needsEmail;
  authPassword.required = needsPassword;
  authConfirmPassword.required = isPasswordFlow;
  authPasswordLabel.textContent = isRecovery ? "New password" : "Password";
  authPassword.autocomplete = isSignup || isRecovery ? "new-password" : "current-password";
  authPassword.placeholder = isRecovery ? "Choose a new password" : "At least 8 characters";

  const modeDetails = {
    login: ["Sign in to Sentinel", "Your workspace is right where you left it.", "WELCOME BACK", 'Log in <span aria-hidden="true">→</span>'],
    signup: ["Create your account", "Set up your personal workspace in a few steps.", "YOUR OWN PRIVATE WORKSPACE", 'Create account <span aria-hidden="true">→</span>'],
    reset: ["Reset your password", "We’ll email you a secure link to choose a new password.", "ACCOUNT RECOVERY", 'Send reset link <span aria-hidden="true">→</span>'],
    recovery: ["Choose a new password", "Enter and confirm a new password for your account.", "PASSWORD RESET", 'Update password <span aria-hidden="true">→</span>'],
  }[mode];
  [authTitle.textContent, authSubtitle.textContent, authKicker.textContent, authSubmit.innerHTML] = modeDetails;
  loginModeButton.classList.toggle("active", !isSignup);
  signupModeButton.classList.toggle("active", isSignup);
  loginModeButton.setAttribute("aria-pressed", String(mode === "login"));
  signupModeButton.setAttribute("aria-pressed", String(isSignup));
  authMessage.hidden = true;
  authForm.reset();
}

function updateSignedInView(user) {
  if (recoveryActive) {
    authGate.hidden = false;
    appShell.hidden = true;
    return;
  }
  if (!user) {
    if (locationWatchId !== null) stopLocationTracking();
    for (const timeoutId of reminders.keys()) window.clearTimeout(timeoutId);
    reminders.clear();
    appShell.hidden = true;
    authGate.hidden = false;
    return;
  }

  const email = user.email || "";
  const displayName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name.trim()
    : "";
  const name = displayName || email.split("@")[0] || "there";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();
  profileName.textContent = name;
  profileEmail.textContent = email;
  profileAvatar.textContent = initials || "?";
  greetingName.textContent = name.split(/\s+/)[0];
  authGate.hidden = true;
  appShell.hidden = false;
}

loginModeButton.addEventListener("click", () => setAuthMode("login"));
signupModeButton.addEventListener("click", () => setAuthMode("signup"));
forgotPasswordButton.addEventListener("click", () => {
  const email = authEmail.value.trim();
  setAuthMode("reset");
  authEmail.value = email;
  authEmail.focus();
});
backToLoginButton.addEventListener("click", () => setAuthMode("login"));

resendConfirmationButton.addEventListener("click", async () => {
  if (!supabaseClient || !pendingConfirmationEmail) {
    setAuthMessage("Enter your email address and try signing up again to request a confirmation email.", "error");
    return;
  }
  resendConfirmationButton.disabled = true;
  try {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email: pendingConfirmationEmail,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) throw error;
    setAuthMessage("If an unconfirmed account exists for that email, a confirmation link has been sent.", "success");
  } catch (error) {
    setAuthMessage(error instanceof Error ? error.message : "Could not resend the confirmation email. Please try again.", "error");
  } finally {
    resendConfirmationButton.disabled = false;
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    setAuthMessage("Authentication is not configured. Add your Supabase project URL and publishable key in supabase-config.js.", "error");
    return;
  }

  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;
  const name = authName.value.trim();
  if (authMode !== "recovery" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMessage("Enter a valid email address.", "error");
    authEmail.focus();
    return;
  }
  if ((authMode === "login" || authMode === "signup" || authMode === "recovery") && password.length < 8) {
    setAuthMessage("Your password must be at least 8 characters.", "error");
    authPassword.focus();
    return;
  }
  if (authMode === "signup" && !name) {
    setAuthMessage("Enter your name to create your account.", "error");
    authName.focus();
    return;
  }
  if ((authMode === "signup" || authMode === "recovery") && password !== authConfirmPassword.value) {
    setAuthMessage("The passwords do not match.", "error");
    authConfirmPassword.focus();
    return;
  }

  authSubmit.disabled = true;
  const submittingText = {
    signup: "Creating account…",
    login: "Logging in…",
    reset: "Sending reset link…",
    recovery: "Updating password…",
  }[authMode];
  authSubmit.textContent = submittingText;
  authMessage.hidden = true;

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      if (data.session) {
        setAuthMessage("Your account is ready.", "success");
      } else {
        pendingConfirmationEmail = email;
        setAuthMode("login");
        authEmail.value = email;
        setAuthMessage("Account created. Check your email for a confirmation link, then log in.", "success");
        resendConfirmationButton.hidden = false;
      }
    } else if (authMode === "login") {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthMessage("Signed in successfully.", "success");
    } else if (authMode === "reset") {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
      if (error) throw error;
      setAuthMessage("If an account exists for that email, a password reset link has been sent.", "success");
    } else {
      const { data, error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      recoveryActive = false;
      setAuthMode("login");
      if (data.user) updateSignedInView(data.user);
      showToast("Your password has been updated.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
    setAuthMessage(message, "error");
    if (authMode === "login" && /email not confirmed/i.test(message)) {
      pendingConfirmationEmail = email;
      resendConfirmationButton.hidden = false;
    }
  } finally {
    authSubmit.disabled = false;
    if (authMode !== "login" || !recoveryActive) {
      authSubmit.innerHTML = {
        signup: 'Create account <span aria-hidden="true">→</span>',
        login: 'Log in <span aria-hidden="true">→</span>',
        reset: 'Send reset link <span aria-hidden="true">→</span>',
        recovery: 'Update password <span aria-hidden="true">→</span>',
      }[authMode];
    }
  }
});

signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  accountMenu.hidden = true;
  accountMenuToggle.setAttribute("aria-expanded", "false");
  signOutButton.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    showToast(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out. Please try again.");
  } finally {
    signOutButton.disabled = false;
  }
});

function closeDeleteDialog() {
  deleteAccountDialog.hidden = true;
  deleteConfirmInput.value = "";
  confirmDeleteAccountButton.disabled = true;
  deleteDialogError.hidden = true;
  openDeleteAccountButton.focus();
}

accountMenuToggle.addEventListener("click", () => {
  const willOpen = accountMenu.hidden;
  accountMenu.hidden = !willOpen;
  accountMenuToggle.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (event) => {
  if (!accountMenu.hidden && !event.target.closest("#account-menu, #account-menu-toggle")) {
    accountMenu.hidden = true;
    accountMenuToggle.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !deleteAccountDialog.hidden) {
    closeDeleteDialog();
  } else if (event.key === "Escape" && !accountMenu.hidden) {
    accountMenu.hidden = true;
    accountMenuToggle.setAttribute("aria-expanded", "false");
    accountMenuToggle.focus();
  }
});

openDeleteAccountButton.addEventListener("click", () => {
  accountMenu.hidden = true;
  accountMenuToggle.setAttribute("aria-expanded", "false");
  deleteConfirmInput.value = "";
  deleteDialogError.hidden = true;
  confirmDeleteAccountButton.disabled = true;
  deleteAccountDialog.hidden = false;
  deleteConfirmInput.focus();
});

closeDeleteDialogButton.addEventListener("click", closeDeleteDialog);
cancelDeleteAccountButton.addEventListener("click", closeDeleteDialog);
deleteAccountDialog.addEventListener("click", (event) => {
  if (event.target === deleteAccountDialog) closeDeleteDialog();
});
deleteConfirmInput.addEventListener("input", () => {
  confirmDeleteAccountButton.disabled = deleteConfirmInput.value.trim() !== "DELETE";
});

confirmDeleteAccountButton.addEventListener("click", async () => {
  if (!supabaseClient || deleteConfirmInput.value.trim() !== "DELETE") return;
  confirmDeleteAccountButton.disabled = true;
  confirmDeleteAccountButton.textContent = "Deleting…";
  deleteDialogError.hidden = true;

  try {
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) throw new Error("Your session has expired. Log in again before deleting your account.");

    const { data, error } = await supabaseClient.functions.invoke("delete-account");
    if (error) {
      let detail = error.message;
      if (error.context && typeof error.context.json === "function") {
        const responseBody = await error.context.json().catch(() => null);
        if (typeof responseBody?.error === "string") detail = responseBody.error;
      }
      throw new Error(detail || "The account deletion service could not be reached.");
    }
    if (data?.success !== true) {
      throw new Error("The account deletion service did not confirm deletion.");
    }

    await supabaseClient.auth.signOut({ scope: "local" });
    recoveryActive = false;
    updateSignedInView(null);
    setAuthMessage("Your account has been deleted.", "success");
    showToast("Your account was deleted.");
  } catch (error) {
    deleteDialogError.textContent = error instanceof Error
      ? `Could not delete your account: ${error.message}`
      : "Could not delete your account. Please try again.";
    deleteDialogError.hidden = false;
    confirmDeleteAccountButton.disabled = deleteConfirmInput.value.trim() !== "DELETE";
  } finally {
    confirmDeleteAccountButton.textContent = "Delete account";
  }
});

async function initializeAuthentication() {
  const config = window.SUPABASE_CONFIG;
  const configured = config
    && typeof config.url === "string"
    && typeof config.anonKey === "string"
    && config.url.trim()
    && config.anonKey.trim()
    && !/your[-_ ](?:supabase|project|anon|publishable)|replace[-_ ]me|placeholder/i.test(`${config.url} ${config.anonKey}`);

  if (!configured) {
    setAuthMessage("To enable sign-up and login, add your Supabase project URL and publishable (anon) key in supabase-config.js. No passwords are stored by this page.", "info");
    return;
  }

  try {
    const projectUrl = new URL(config.url);
    if (projectUrl.protocol !== "https:" && projectUrl.hostname !== "localhost") {
      throw new Error("Your Supabase project URL must use HTTPS.");
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabaseClient = createClient(projectUrl.origin, config.anonKey.trim(), {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryActive = true;
        setAuthMode("recovery");
        setAuthMessage("Reset link verified. Choose a new password for your account.", "info");
        return;
      }
      if (recoveryActive) return;
      updateSignedInView(session?.user || null);
    });
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    updateSignedInView(data.session?.user || null);
  } catch (error) {
    setAuthMessage(error instanceof Error
      ? `Could not initialize Supabase Auth: ${error.message}`
      : "Could not initialize Supabase Auth. Check your configuration and connection.", "error");
  }
}

initializeAuthentication();
