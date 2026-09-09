"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import CustomModal from "@/components/layout/CustomModal";
import { apiFetch, readApiError } from "@/app/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_MUNCHSPACE_API_KEY || "";

type ContactDetail = {
  type: string;
  value: string;
  label: string | null;
};

type SupportTopic = {
  key: string;
  label: string;
  description: string | null;
};

/**
 * A vendor with money in question wants a person, so the channels come first
 * and the form is the fallback for anything that can wait. Order matches how
 * quickly each one actually gets answered.
 */
const CHANNELS: Array<{
  type: string;
  heading: string;
  icon: typeof Phone;
  href: (value: string) => string;
}> = [
  {
    type: "whatsapp",
    heading: "WhatsApp",
    icon: MessageCircle,
    href: (value) => `https://wa.me/${value.replace(/[^\d]/g, "")}`,
  },
  {
    type: "phone",
    heading: "Call us",
    icon: Phone,
    href: (value) => `tel:${value.replace(/\s+/g, "")}`,
  },
  {
    type: "email",
    heading: "Email",
    icon: Mail,
    href: (value) => `mailto:${value}`,
  },
];

export default function SupportModal({
  isOpen,
  onClose,
  /** Prefills the message, so a vendor opening this from a specific screen does not restate where they were. */
  presetSubject,
}: {
  isOpen: boolean;
  onClose: () => void;
  presetSubject?: string;
}) {
  const [contacts, setContacts] = useState<ContactDetail[]>([]);
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"channels" | "form" | "sent">("channels");
  const [ticketCode, setTicketCode] = useState("");

  const [topicKey, setTopicKey] = useState("");
  const [subject, setSubject] = useState(presetSubject ?? "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setView("channels");
    setSubject(presetSubject ?? "");
    setMessage("");
    setTopicKey("");

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [contactRes, topicRes] = await Promise.all([
          fetch(`${API_BASE}/contact-details`, {
            headers: { "x-api-key": API_KEY },
          }),
          fetch(`${API_BASE}/support/topics`, {
            headers: { "x-api-key": API_KEY },
          }),
        ]);

        const contactJson = await contactRes.json().catch(() => null);
        const topicJson = await topicRes.json().catch(() => null);

        if (cancelled) return;

        setContacts(contactJson?.data?.data ?? contactJson?.data ?? []);
        setTopics(topicJson?.data?.data ?? topicJson?.data ?? []);
      } catch {
        // The modal still works without them: the form falls back to a plain
        // list and the channels section simply does not render.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, presetSubject]);

  const channels = CHANNELS.flatMap((channel) =>
    contacts
      .filter((detail) => detail.type === channel.type)
      .map((detail) => ({ ...channel, detail })),
  );

  const submit = async () => {
    if (!topicKey) {
      toast.error("Pick what this is about");
      return;
    }

    if (subject.trim().length < 3) {
      toast.error("Add a short subject");
      return;
    }

    if (message.trim().length < 10) {
      toast.error("Tell us a little more so we can help");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/support/tickets/me", {
        method: "POST",
        body: JSON.stringify({
          topicKey,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not send your message"));
      }

      const json = await res.json();
      setTicketCode(json?.data?.code ?? json?.code ?? "");
      setView("sent");
    } catch (err: any) {
      toast.error(err.message || "Could not send your message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={view === "form" ? "Send us a message" : "Get help"}
      maxWidth="sm:max-w-[480px]"
    >
      {view === "sent" ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Message received
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ve emailed you a copy. We usually reply within a working day.
          </p>
          {ticketCode && (
            <p className="mt-4 text-sm text-gray-500">
              Your reference is{" "}
              <span className="rounded bg-gray-100 px-2 py-1 font-mono text-gray-900">
                {ticketCode}
              </span>
            </p>
          )}
          <Button
            onClick={onClose}
            className="mt-6 w-full bg-munchprimary text-white hover:bg-munchprimaryDark"
          >
            Done
          </Button>
        </div>
      ) : view === "form" ? (
        <div className="space-y-4">
          <button
            onClick={() => setView("channels")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div>
            <label className="text-sm font-medium text-gray-700">
              What is this about?
            </label>
            <Select value={topicKey} onValueChange={setTopicKey}>
              <SelectTrigger className="mt-1.5 h-12 w-full">
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic.key} value={topic.key}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <Input
              className="mt-1.5 h-12"
              placeholder="A one-line summary"
              maxLength={160}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Message</label>
            <Textarea
              className="mt-1.5 min-h-[120px]"
              placeholder="Tell us what happened, and include any order or payout reference."
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <p className="text-xs text-gray-500">
            We&apos;ll reply to the email address on your account.
          </p>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={onClose} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={isSubmitting}
              className="bg-munchprimary px-6 text-white hover:bg-munchprimaryDark"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Sending
                </>
              ) : (
                "Send message"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reach us the fastest way for you. For anything about money already
            paid or held, call or message — we can look at your account while we
            talk.
          </p>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : (
            channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={`${channel.type}-${channel.detail.value}`}
                  href={channel.href(channel.detail.value)}
                  target={channel.type === "whatsapp" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:border-munchprimary hover:bg-orange-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    <Icon className="h-5 w-5 text-munchprimary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900">
                      {channel.detail.label || channel.heading}
                    </span>
                    <span className="block truncate text-sm text-gray-500">
                      {channel.detail.value}
                    </span>
                  </span>
                </a>
              );
            })
          )}

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              Not urgent? Send us a message and we&apos;ll reply by email.
            </p>
            <Button
              variant="outline"
              onClick={() => setView("form")}
              className="mt-3 w-full h-11"
            >
              Send us a message
            </Button>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
