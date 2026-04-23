"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Shield,
  Sparkles,
  Building,
  Building2,
  Users,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  Save,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";

const ENV_FIELDS = [
  {
    key: "SUPABASE_URL",
    label: "Supabase URL",
    placeholder: "https://your-project.supabase.co",
    href: "https://supabase.com/dashboard/projects",
  },
  {
    key: "SUPABASE_ANON_KEY",
    label: "Supabase Anon Key",
    placeholder: "sb_publishable_xxx",
    href: "https://supabase.com/docs/guides/api/api-keys",
  },
  {
    key: "GITHUB_ACCESS_TOKEN",
    label: "GitHub Access Token",
    placeholder: "ghp_xxxxxxxxxxxxx",
    href: "https://github.com/settings/tokens",
  },
  {
    key: "ALTCHA_HMAC_SECRET",
    label: "ALTCHA HMAC Secret",
    placeholder: "ALTCHA secret",
    href: "https://altcha.org/docs/v2/server-integration/",
  },
  {
    key: "ALTCHA_HMAC_KEY_SECRET",
    label: "ALTCHA HMAC Key Secret",
    placeholder: "ALTCHA key secret",
    href: "https://altcha.org/docs/v2/sentinel/configuration/api-keys/",
  },
  {
    key: "INDIEPITCHER_API_KEY",
    label: "IndiePitcher API Key",
    placeholder: "sc_xxxxxxxxxxxxx",
    href: "https://docs.indiepitcher.com/api-reference/introduction",
  },
] as const;

type EnvVarKey = (typeof ENV_FIELDS)[number]["key"];
type EnvVarValues = Record<EnvVarKey, string>;

type StoredEnvVault = {
  version: 1;
  provider: string;
  salt: string;
  iv: string;
  cipherText: string;
  updatedAt: string;
};

const EMPTY_ENV_VALUES: EnvVarValues = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  GITHUB_ACCESS_TOKEN: "",
  ALTCHA_HMAC_SECRET: "",
  ALTCHA_HMAC_KEY_SECRET: "",
  INDIEPITCHER_API_KEY: "",
};

const ENV_VAULT_STORAGE_PREFIX = "taskflow_device_env_v1";

function getEnvVaultStorageKey(userId: string) {
  return `${ENV_VAULT_STORAGE_PREFIX}:${userId}`;
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveVaultKey(secret: string, salt: ArrayBuffer) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptEnvVault(secret: string, values: EnvVarValues, provider: string) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(secret, toArrayBuffer(salt));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    encoder.encode(JSON.stringify(values)),
  );

  return {
    version: 1,
    provider,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    cipherText: bytesToBase64(new Uint8Array(cipherBuffer)),
    updatedAt: new Date().toISOString(),
  } satisfies StoredEnvVault;
}

async function decryptEnvVault(secret: string, vault: StoredEnvVault) {
  const decoder = new TextDecoder();
  const key = await deriveVaultKey(secret, toArrayBuffer(base64ToBytes(vault.salt)));
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(vault.iv)) },
    key,
    toArrayBuffer(base64ToBytes(vault.cipherText)),
  );

  return {
    ...EMPTY_ENV_VALUES,
    ...(JSON.parse(decoder.decode(decryptedBuffer)) as Partial<EnvVarValues>),
  } satisfies EnvVarValues;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, setCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form state
  const [phone, setPhone] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [quietHoursStart, setQuietHoursStart] = useState("20:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");
  const [quietHoursWeekends, setQuietHoursWeekends] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [dob, setDob] = useState("");
  const [companySize, setCompanySize] = useState("Medium (11-50)");

  // AI Settings
  const [maxWorkload, setMaxWorkload] = useState(5);
  const [burnoutSensitivity, setBurnoutSensitivity] = useState(2); // 1=Low, 2=Med, 3=High
  const [autoAssign, setAutoAssign] = useState(true);
  const [skillMatchPriority, setSkillMatchPriority] = useState(true);
  const [aiDeadlines, setAiDeadlines] = useState(false);
  const [envValues, setEnvValues] = useState<EnvVarValues>(EMPTY_ENV_VALUES);
  const [revealedEnvKeys, setRevealedEnvKeys] = useState<Record<EnvVarKey, boolean>>({
    SUPABASE_URL: false,
    SUPABASE_ANON_KEY: false,
    GITHUB_ACCESS_TOKEN: false,
    ALTCHA_HMAC_SECRET: false,
    ALTCHA_HMAC_KEY_SECRET: false,
    INDIEPITCHER_API_KEY: false,
  });
  const [storedEnvVault, setStoredEnvVault] = useState<StoredEnvVault | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultSecret, setVaultSecret] = useState("");
  const [envVaultMessage, setEnvVaultMessage] = useState<string | null>(null);
  const [envVaultMessageType, setEnvVaultMessageType] = useState<"success" | "error">("success");
  const [isSavingEnvVault, setIsSavingEnvVault] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockSecretInput, setUnlockSecretInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlockingVault, setIsUnlockingVault] = useState(false);
  const [providerReauthConfirmed, setProviderReauthConfirmed] = useState(false);

  // Initialize form with currentUser data
  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || "");
      setOfficeAddress(currentUser.officeAddress || "");
      setQuietHoursStart(currentUser.quietHoursStart || "20:00");
      setQuietHoursEnd(currentUser.quietHoursEnd || "08:00");
      setQuietHoursWeekends(currentUser.quietHoursWeekends ?? true);
      setTwoFactorEnabled(currentUser.twoFactorEnabled ?? false);
      if (currentUser.maxWorkload) setMaxWorkload(currentUser.maxWorkload);
      if (currentUser.burnoutSensitivity)
        setBurnoutSensitivity(currentUser.burnoutSensitivity);
      setAutoAssign(currentUser.autoAssign ?? true);
      setSkillMatchPriority(currentUser.skillMatchPriority ?? true);
      setAiDeadlines(currentUser.aiDeadlines ?? false);
      setDob(currentUser.dob || "");
      if (currentUser.companySize) setCompanySize(currentUser.companySize);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || typeof window === "undefined") return;

    const storedVaultRaw = localStorage.getItem(getEnvVaultStorageKey(currentUser.id));
    const nextVault = storedVaultRaw ? (JSON.parse(storedVaultRaw) as StoredEnvVault) : null;

    setStoredEnvVault(nextVault);
    setEnvValues(EMPTY_ENV_VALUES);
    setVaultUnlocked(false);
    setVaultSecret("");
    setUnlockSecretInput("");
    setUnlockError(null);
    setProviderReauthConfirmed(false);
    setRevealedEnvKeys({
      SUPABASE_URL: false,
      SUPABASE_ANON_KEY: false,
      GITHUB_ACCESS_TOKEN: false,
      ALTCHA_HMAC_SECRET: false,
      ALTCHA_HMAC_KEY_SECRET: false,
      INDIEPITCHER_API_KEY: false,
    });
  }, [currentUser]);

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          officeAddress,
          quietHoursStart,
          quietHoursEnd,
          quietHoursWeekends,
          twoFactorEnabled,
          maxWorkload,
          burnoutSensitivity,
          autoAssign,
          skillMatchPriority,
          aiDeadlines,
          dob,
          companySize,
        }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        localStorage.setItem(
          "taskflow_current_user",
          JSON.stringify(updatedUser),
        );
        setSaveMessage("Settings saved successfully!");
      } else {
        setSaveMessage("Failed to save settings.");
      }
    } catch {
      setSaveMessage("Error saving settings.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Building },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai", label: "AI Settings", icon: Sparkles },
    { id: "vault", label: "Env Vault", icon: LockKeyhole },
    { id: "security", label: "Security", icon: Shield },
  ];

  const authProvider = currentUser?.authProvider || "email";
  const usesPasswordUnlock = !authProvider || authProvider === "email";

  const setEnvField = (key: EnvVarKey, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleEnvReveal = (key: EnvVarKey) => {
    setRevealedEnvKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showEnvVaultStatus = (message: string, type: "success" | "error") => {
    setEnvVaultMessage(message);
    setEnvVaultMessageType(type);
    setTimeout(() => setEnvVaultMessage(null), 3000);
  };

  const handleUnlockEnvVault = async () => {
    if (!currentUser) return;

    if (!unlockSecretInput.trim()) {
      setUnlockError(
        usesPasswordUnlock
          ? "Enter your login password to unlock this local vault."
          : "Enter a local vault password for this device.",
      );
      return;
    }

    if (!usesPasswordUnlock && !providerReauthConfirmed) {
      setUnlockError(`Confirm ${authProvider} re-auth before unlocking this local vault.`);
      return;
    }

    setIsUnlockingVault(true);
    setUnlockError(null);

    try {
      if (storedEnvVault) {
        const decryptedValues = await decryptEnvVault(unlockSecretInput, storedEnvVault);
        setEnvValues(decryptedValues);
      } else {
        setEnvValues(EMPTY_ENV_VALUES);
      }

      setVaultSecret(unlockSecretInput);
      setVaultUnlocked(true);
      setIsUnlockModalOpen(false);
      setUnlockSecretInput("");
      setProviderReauthConfirmed(false);
      showEnvVaultStatus(
        storedEnvVault ? "Local environment vault unlocked." : "Local environment vault ready to configure.",
        "success",
      );
    } catch {
      setUnlockError(
        storedEnvVault
          ? "Unable to unlock this device vault. Check your password/passphrase."
          : "Unable to initialize the local environment vault.",
      );
    } finally {
      setIsUnlockingVault(false);
    }
  };

  const handleSaveEnvVault = async () => {
    if (!currentUser || !vaultUnlocked || !vaultSecret) return;

    setIsSavingEnvVault(true);

    try {
      const encryptedVault = await encryptEnvVault(vaultSecret, envValues, authProvider);
      localStorage.setItem(getEnvVaultStorageKey(currentUser.id), JSON.stringify(encryptedVault));
      setStoredEnvVault(encryptedVault);
      showEnvVaultStatus("Environment variables saved to encrypted local storage.", "success");
    } catch {
      showEnvVaultStatus("Failed to save the encrypted local environment vault.", "error");
    } finally {
      setIsSavingEnvVault(false);
    }
  };

  const handleClearEnvVault = () => {
    if (!currentUser) return;

    localStorage.removeItem(getEnvVaultStorageKey(currentUser.id));
    setStoredEnvVault(null);
    setEnvValues(EMPTY_ENV_VALUES);
    setVaultUnlocked(false);
    setVaultSecret("");
    setUnlockSecretInput("");
    setProviderReauthConfirmed(false);
    setRevealedEnvKeys({
      SUPABASE_URL: false,
      SUPABASE_ANON_KEY: false,
      GITHUB_ACCESS_TOKEN: false,
      ALTCHA_HMAC_SECRET: false,
      ALTCHA_HMAC_KEY_SECRET: false,
      INDIEPITCHER_API_KEY: false,
    });
    showEnvVaultStatus("Local environment vault removed from this device.", "success");
  };

  return (
    <div className="p-4 md:p-8 mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Workspace Settings
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                  activeTab === tab.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {/* General Settings */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Workspace Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  General Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Workspace Name
                      </label>
                      <input
                        type="text"
                        defaultValue="My Software Team"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Theme Preference
                      </label>
                      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg transition-colors">
                        {[
                          { value: "Light", icon: Sun },
                          { value: "Dark", icon: Moon },
                          { value: "System", icon: Monitor },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setTheme(opt.value as any)}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm rounded-md transition-all ${
                              theme === opt.value
                                ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white font-medium"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            }`}
                          >
                            <opt.icon size={14} />
                            {opt.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    {currentUser?.role === "Admin" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Company Size{" "}
                          <span className="text-xs text-gray-500 font-normal ml-1">
                            (Affects workflow limits)
                          </span>
                        </label>
                        <CustomSelect
                          value={companySize}
                          onChange={setCompanySize}
                          searchable={false}
                          options={[
                            {
                              value: "Small (1-10)",
                              label: "Small (1-10)",
                              icon: (
                                <Users size={14} className="text-blue-500" />
                              ),
                            },
                            {
                              value: "Medium (11-50)",
                              label: "Medium (11-50)",
                              icon: (
                                <Building2
                                  size={14}
                                  className="text-indigo-500"
                                />
                              ),
                            },
                            {
                              value: "Large (50+)",
                              label: "Large (50+)",
                              icon: (
                                <Building
                                  size={14}
                                  className="text-purple-500"
                                />
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      defaultValue={currentUser?.email || ""}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone || ""}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Office Address
                    </label>
                    <textarea
                      rows={3}
                      value={officeAddress || ""}
                      onChange={(e) => setOfficeAddress(e.target.value)}
                      placeholder="Head Office..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Notification Preferences
              </h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  {["Task assignments", "Project updates"].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Receive alerts via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked={true}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Quiet Hours (Do Not Disturb)
                  </h3>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={quietHoursStart || "20:00"}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={quietHoursEnd || "08:00"}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700"
                      />
                    </div>
                    <div className="flex-1 pt-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={quietHoursWeekends ?? true}
                            onChange={(e) =>
                              setQuietHoursWeekends(e.target.checked)
                            }
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Enable on Weekends
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === "ai" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                AI Configuration
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Daily Workload (Tasks)
                  </label>
                  <input
                    type="number"
                    value={maxWorkload}
                    onChange={(e) => setMaxWorkload(parseInt(e.target.value))}
                    className="max-w-xs w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    AI will avoid assigning more than this number of tasks to
                    you per day.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Burnout Sensitivity
                  </label>
                  <div className="flex gap-4">
                    {[1, 2, 3].map((val) => (
                      <button
                        key={val}
                        onClick={() => setBurnoutSensitivity(val)}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          burnoutSensitivity === val
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                            : "border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600"
                        }`}
                      >
                        <span className="font-bold">
                          {val === 1 ? "Low" : val === 2 ? "Medium" : "High"}
                        </span>
                        <span className="text-[10px] opacity-70 text-center">
                          {val === 1
                            ? "Relaxed AI warnings"
                            : val === 2
                              ? "Standard balance"
                              : "Aggressive protection"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "vault" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Local Environment Vault
              </h2>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Device-Only Credential Storage
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                      Store personal API credentials for this device only. Values are masked by default, encrypted
                      before saving to local storage, and require a local unlock flow before viewing or editing.
                    </p>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      storedEnvVault
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {storedEnvVault ? "Stored on this device" : "Not configured"}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>
                      Access mode:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {usesPasswordUnlock ? "Login password unlock" : `${authProvider} re-auth + local vault password`}
                      </span>
                    </p>
                    <p>
                      Last saved:{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {storedEnvVault ? new Date(storedEnvVault.updatedAt).toLocaleString() : "Never"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!vaultUnlocked ? (
                      <button
                        onClick={() => {
                          setUnlockError(null);
                          setUnlockSecretInput("");
                          setProviderReauthConfirmed(false);
                          setIsUnlockModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <LockKeyhole size={16} />
                        {storedEnvVault ? "Unlock Vault" : "Set Up Vault"}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveEnvVault}
                          disabled={isSavingEnvVault}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={16} />
                          {isSavingEnvVault ? "Saving..." : "Save Local Vault"}
                        </button>
                        <button
                          onClick={() => {
                            setVaultUnlocked(false);
                            setVaultSecret("");
                            setRevealedEnvKeys({
                              SUPABASE_URL: false,
                              SUPABASE_ANON_KEY: false,
                              GITHUB_ACCESS_TOKEN: false,
                              ALTCHA_HMAC_SECRET: false,
                              ALTCHA_HMAC_KEY_SECRET: false,
                              INDIEPITCHER_API_KEY: false,
                            });
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <LockKeyhole size={16} />
                          Lock
                        </button>
                      </>
                    )}

                    {storedEnvVault && (
                      <button
                        onClick={handleClearEnvVault}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-200 text-red-700 rounded-md hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={16} />
                        Clear Device Vault
                      </button>
                    )}
                  </div>
                </div>

                {envVaultMessage && (
                  <div
                    className={`rounded-md px-3 py-2 text-sm ${
                      envVaultMessageType === "success"
                        ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {envVaultMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ENV_FIELDS.map((field) => {
                    const isRevealed = revealedEnvKeys[field.key];
                    const isDisabled = !vaultUnlocked;
                    const maskedPlaceholder = storedEnvVault
                      ? "Stored securely on this device"
                      : "Unlock to add a value";

                    return (
                      <div key={field.key}>
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <label className="block text-xs text-gray-500 dark:text-gray-400">
                            {field.label}
                          </label>
                          <a
                            href={field.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-gray-400 transition hover:text-blue-600 dark:hover:text-blue-400"
                            aria-label={`Open ${field.label} provider page`}
                            title={`Open ${field.label} provider page`}
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        <div className="relative">
                          <input
                            type={isRevealed ? "text" : "password"}
                            value={envValues[field.key]}
                            onChange={(e) => setEnvField(field.key, e.target.value)}
                            disabled={isDisabled}
                            placeholder={isDisabled ? maskedPlaceholder : field.placeholder}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 pr-11 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                          />
                          <button
                            type="button"
                            onClick={() => toggleEnvReveal(field.key)}
                            disabled={isDisabled}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={isRevealed ? `Hide ${field.label}` : `Show ${field.label}`}
                          >
                            {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Security & Login
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add an extra layer of security to your account.
                    </p>
                  </div>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`px-3 py-1.5 border rounded text-sm transition-colors ${
                      twoFactorEnabled
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {twoFactorEnabled ? "Enabled ✓" : "Enable"}
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Logged in as
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-4">
                    {currentUser?.name || "Unknown User"} ({currentUser?.email})
                  </p>
                </div>

                {/* Password Change */}
                {(!currentUser?.authProvider ||
                  currentUser.authProvider === "email") && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Change Password
                    </h3>
                    {/* Hidden username field to trap aggressive browser autofill */}
                    <input
                      type="text"
                      name="email"
                      autoComplete="username"
                      style={{ display: "none" }}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 text-sm bg-gray-800 dark:bg-gray-600 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors">
                      Update Password
                    </button>
                  </div>
                )}

                {/* Danger Zone */}
                <div className="pt-4 border-t border-red-200 dark:border-red-900/50">
                  <h3 className="text-sm font-medium text-red-600 mb-3">
                    Danger Zone
                  </h3>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          Delete Account
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Permanently delete your account and all data. This
                          action cannot be undone.
                        </p>
                      </div>
                      <button className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 gap-4 items-center">
            {saveMessage && (
              <span
                className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
              >
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isUnlockModalOpen}
        onClose={() => {
          setIsUnlockModalOpen(false);
          setUnlockError(null);
          setUnlockSecretInput("");
          setProviderReauthConfirmed(false);
        }}
        title="Unlock Local Environment Vault"
        maxWidth="max-w-md"
      >
        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              {usesPasswordUnlock
                ? "Frontend-only implementation: your login password is used locally on this device to unlock and encrypt the stored environment variables."
                : `Frontend-only implementation: confirm ${authProvider} re-auth below, then use a local vault password on this device to unlock and encrypt the stored environment variables.`}
            </p>
          </div>

          {!usesPasswordUnlock && (
            <div className="space-y-2">
              <button
                onClick={() => setProviderReauthConfirmed(true)}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  providerReauthConfirmed
                    ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50"
                    : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                }`}
              >
                {providerReauthConfirmed ? <CheckCircle2 size={16} /> : <KeyRound size={16} />}
                {providerReauthConfirmed
                  ? `${authProvider} re-auth confirmed for this frontend preview`
                  : `Continue with ${authProvider}`}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This is a frontend-only placeholder for the future provider re-auth flow.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {usesPasswordUnlock ? "Login Password" : "Local Vault Password"}
            </label>
            <input
              type="password"
              value={unlockSecretInput}
              onChange={(e) => setUnlockSecretInput(e.target.value)}
              placeholder={usesPasswordUnlock ? "Enter your password" : "Create or enter a vault password"}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {unlockError && (
            <div className="rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 text-sm">
              {unlockError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsUnlockModalOpen(false)}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleUnlockEnvVault}
              disabled={isUnlockingVault}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnlockingVault ? "Unlocking..." : storedEnvVault ? "Unlock Vault" : "Create Vault"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
