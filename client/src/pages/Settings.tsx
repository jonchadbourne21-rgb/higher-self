import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Phone, Mail, Heart, Save, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";

export default function Settings() {
  const { user } = useAuth();
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const updateSettings = trpc.settings.update.useMutation();
  const utils = trpc.useUtils();

  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    preferredName: "",
    phone: "",
    contactEmail: "",
    therapistName: "",
    therapistPhone: "",
    therapistEmail: "",
    therapistNotes: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        preferredName: settings.preferredName ?? "",
        phone: settings.phone ?? "",
        contactEmail: settings.contactEmail ?? "",
        therapistName: settings.therapistName ?? "",
        therapistPhone: settings.therapistPhone ?? "",
        therapistEmail: settings.therapistEmail ?? "",
        therapistNotes: settings.therapistNotes ?? "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(form);
    utils.settings.get.invalidate();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder: string,
    type = "text",
    multiline = false
  ) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none min-h-[90px]"
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          type={type}
          className="w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-32">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
          <Link href="/home">
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground/70" />
            </button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Account Settings</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-5 py-6 space-y-8 max-w-lg mx-auto">
            {/* Profile avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-4xl">
                {settings?.avatarEmoji || "🌟"}
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{user?.name}</p>
                <p className="text-sm text-foreground/50">{user?.email}</p>
              </div>
            </div>

            {/* Personal Info */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="font-semibold text-foreground">Personal Info</h2>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                {field("preferredName", "Preferred Name", "How should your Mirror call you?")}
              </div>
            </motion.section>

            {/* Contact / Notifications */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="font-semibold text-foreground">Contact & Notifications</h2>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <p className="text-xs text-foreground/50">Used for SMS reminders and email check-ins (optional).</p>
                {field("phone", "Phone Number", "+1 (555) 000-0000", "tel")}
                {field("contactEmail", "Notification Email", "you@email.com", "email")}
              </div>
            </motion.section>

            {/* Therapist Info */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="font-semibold text-foreground">My Therapist</h2>
              </div>
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <p className="text-xs text-foreground/50">
                  Keep your therapist's info here so it's always one tap away. Your Higher Self journey works best alongside professional support.
                </p>
                {field("therapistName", "Therapist Name", "Dr. Jane Smith")}
                {field("therapistPhone", "Therapist Phone", "+1 (555) 000-0000", "tel")}
                {field("therapistEmail", "Therapist Email", "therapist@practice.com", "email")}
                {field("therapistNotes", "Notes", "Session every Tuesday at 3pm, insurance: Aetna...", "text", true)}
              </div>
            </motion.section>

            {/* Save button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base flex items-center justify-center gap-2 transition-all"
              style={{
                background: saved
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              }}
            >
              {updateSettings.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
