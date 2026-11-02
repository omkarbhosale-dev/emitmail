"use client";

import React, { useState } from "react";
import {
  Plus,
  PlugsConnected,
  Copy,
  Eye,
  EyeSlash,
  PaperPlaneTilt,
  X,
  Code,
  ShieldCheck,
} from "@phosphor-icons/react";
import { WebhookEndpoint, WebhookDeliveryLog } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";

const INITIAL_ENDPOINTS: WebhookEndpoint[] = [
  {
    id: "wh-1",
    url: "https://api.omkarbhosale.dev/webhooks/emitmail",
    secret: "whsec_8849b20e17c093a8421ff0a19cb239e4",
    status: "active",
    events: ["email.delivered", "email.bounced", "email.complained"],
    createdAt: "Oct 21, 2026",
  },
];

const INITIAL_DELIVERIES: WebhookDeliveryLog[] = [
  {
    id: "log-1",
    event: "email.delivered",
    url: "https://api.omkarbhosale.dev/webhooks/emitmail",
    statusCode: 200,
    statusText: "OK",
    timestamp: "2 mins ago",
    latencyMs: 38,
    payload: {
      type: "email.delivered",
      message_id: "msg_8f1b9204c3e8",
      recipient: "dev@omkarbhosale.dev",
      domain: "omkarbhosale.dev",
      smtp_response: "250 2.0.0 OK: message queued",
      timestamp: new Date().toISOString(),
    },
  },
  {
    id: "log-2",
    event: "email.bounced",
    url: "https://api.omkarbhosale.dev/webhooks/emitmail",
    statusCode: 200,
    statusText: "OK",
    timestamp: "14 mins ago",
    latencyMs: 44,
    payload: {
      type: "email.bounced",
      message_id: "msg_33a0df44b192",
      recipient: "invalid-user@acme-corp.net",
      domain: "emitmail.dev",
      bounce_classification: "Hard Bounce",
      smtp_response: "550 5.1.1 User unknown",
      timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    },
  },
];

const AVAILABLE_EVENTS = [
  { id: "email.sent", label: "email.sent", desc: "Triggered immediately when message is queued and handed to worker" },
  { id: "email.delivered", label: "email.delivered", desc: "Remote SMTP server acknowledged receipt with 250 OK" },
  { id: "email.bounced", label: "email.bounced", desc: "Remote mail server rejected delivery (hard/soft bounce)" },
  { id: "email.complained", label: "email.complained", desc: "Recipient reported the message as spam via feedback loop" },
  { id: "email.opened", label: "email.opened", desc: "Tracking pixel loaded by the recipient's mail client" },
  { id: "email.clicked", label: "email.clicked", desc: "Recipient clicked a verified link inside the message" },
];

export function WebhooksView() {
  const { toast } = useToast();
  const { isViewer } = useAuth();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(INITIAL_ENDPOINTS);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>(INITIAL_DELIVERIES);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<WebhookDeliveryLog | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "email.delivered",
    "email.bounced",
  ]);

  const toggleShowSecret = (id: string) => {
    setShowSecret((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: label,
      type: "success",
    });
  };

  const toggleEventSubscription = (endpointId: string, eventId: string) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to modify event subscriptions.",
        type: "warning",
      });
      return;
    }
    setEndpoints((prev) =>
      prev.map((ep) => {
        if (ep.id !== endpointId) return ep;
        const exists = ep.events.includes(eventId);
        const updated = exists
          ? ep.events.filter((e) => e !== eventId)
          : [...ep.events, eventId];
        return { ...ep, events: updated };
      })
    );
    toast({
      title: "Event Subscriptions Updated",
      description: `Updated active webhook triggers for endpoint.`,
      type: "info",
    });
  };

  const handleSendTestWebhook = (endpoint: WebhookEndpoint) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to trigger test webhooks.",
        type: "warning",
      });
      return;
    }
    toast({
      title: "Dispatching Test Webhook Payload",
      description: `Sending POST request to ${endpoint.url}...`,
      type: "info",
    });

    setIsLoading(true);
    setTimeout(() => {
      const newLog: WebhookDeliveryLog = {
        id: `log-${Date.now()}`,
        event: "email.delivered",
        url: endpoint.url,
        statusCode: 200,
        statusText: "OK",
        timestamp: "Just now",
        latencyMs: Math.floor(Math.random() * 30) + 25,
        payload: {
          type: "email.delivered",
          test: true,
          message_id: `msg_${Math.random().toString(36).substring(2, 10)}`,
          recipient: "test-receiver@emitmail.dev",
          domain: "omkarbhosale.dev",
          smtp_response: "250 2.0.0 OK: Test delivery successful",
          timestamp: new Date().toISOString(),
        },
      };

      setDeliveries((prev) => [newLog, ...prev]);
      setIsLoading(false);
      toast({
        title: "Webhook Acknowledged (200 OK)",
        description: `Delivered test event to ${endpoint.url} in ${newLog.latencyMs}ms.`,
        type: "success",
      });
    }, 700);
  };

  const handleAddEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to add webhook endpoints.",
        type: "warning",
      });
      return;
    }
    if (!newUrl.trim()) return;

    const newEp: WebhookEndpoint = {
      id: `wh-${Date.now()}`,
      url: newUrl.trim(),
      secret: `whsec_${Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`,
      status: "active",
      events: selectedEvents.length > 0 ? selectedEvents : ["email.delivered"],
      createdAt: "Just now",
    };

    setEndpoints((prev) => [...prev, newEp]);
    setIsAddModalOpen(false);
    setNewUrl("");
    toast({
      title: "Webhook Endpoint Registered",
      description: `Listening for ${newEp.events.length} events.`,
      type: "success",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-kumo-strong">
            Webhooks
          </h1>
          <p className="text-xs text-kumo-subtle mt-1">
            Receive real-time HTTP POST payloads for email delivery, bounces, opens, and clicks.
          </p>
        </div>
        {/* Cloudflare Action Blue Button */}
        {!isViewer && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-cf-primary"
          >
            <Plus size={15} weight="bold" />
            <span>Add Endpoint</span>
          </button>
        )}
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot register endpoints, toggle events, or send test webhooks." />
      )}

      {/* 2. Endpoints List */}
      <div className="space-y-4">
        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs"
          >
            {/* Top row: URL + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-kumo-hairline">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
                  <PlugsConnected size={18} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-kumo-strong break-all">
                      {ep.url}
                    </span>
                    <StatusBadge variant="success">Active</StatusBadge>
                  </div>
                  <span className="text-[11px] text-kumo-subtle block mt-0.5">
                    Added {ep.createdAt}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {!isViewer && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendTestWebhook(ep)}
                    className="px-3 py-1.5 rounded-lg bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-xs font-semibold text-kumo-strong flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PaperPlaneTilt size={14} className="text-cf-blue" weight="bold" />
                    <span>Send Test Webhook</span>
                  </button>
                </div>
              )}
            </div>

            {/* Middle row: HMAC Signing Secret */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-kumo-recessed border border-kumo-hairline text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-cf-blue shrink-0" />
                <span className="text-kumo-subtle font-medium">HMAC Signing Secret:</span>
                <span className="font-mono text-kumo-strong">
                  {showSecret[ep.id] ? ep.secret : `${ep.secret.substring(0, 10)}••••••••••••••••••••••••`}
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => toggleShowSecret(ep.id)}
                  className="p-1 rounded text-kumo-muted hover:text-kumo-strong cursor-pointer"
                  title={showSecret[ep.id] ? "Hide secret" : "Reveal secret"}
                >
                  {showSecret[ep.id] ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => copyToClipboard(ep.secret, "Signing Secret")}
                  className="p-1 rounded text-kumo-muted hover:text-kumo-strong cursor-pointer"
                  title="Copy signing secret"
                >
                  <Copy size={15} />
                </button>
              </div>
            </div>

            {/* Event Subscriptions Matrix */}
            <div>
              <span className="text-xs font-semibold text-kumo-strong block mb-2.5">
                Subscribed Event Types
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_EVENTS.map((ev) => {
                  const isChecked = ep.events.includes(ev.id);
                  return (
                    <button
                      key={ev.id}
                      onClick={isViewer ? undefined : () => toggleEventSubscription(ep.id, ev.id)}
                      disabled={isViewer}
                      className={`p-2.5 rounded-lg border text-left transition-all text-xs flex items-start gap-2 ${
                        isViewer ? "cursor-default opacity-85" : "cursor-pointer"
                      } ${
                        isChecked
                          ? "bg-cf-blue/10 border-cf-blue/30 text-kumo-strong"
                          : "bg-kumo-control border-kumo-hairline text-kumo-subtle hover:text-kumo-strong"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by button
                        className="mt-0.5 accent-cf-blue"
                      />
                      <div className="min-w-0">
                        <span className="font-mono font-medium block truncate text-[11px]">
                          {ev.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Recent Deliveries Log Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-kumo-strong">
          Recent Webhook Deliveries
        </h2>

        <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
          {isLoading ? (
            <TableSkeleton rows={3} cols={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle font-medium">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">HTTP Status</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Target Endpoint</th>
                    <th className="py-3 px-4 hidden md:table-cell">Latency</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kumo-hairline">
                  {deliveries.map((log) => (
                    <tr key={log.id} className="hover:bg-kumo-tint/60 transition-colors">
                      {/* Event Type */}
                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-kumo-strong">
                        {log.event}
                      </td>

                      {/* Cloudflare Accurate Status Badge */}
                      <td className="py-3 px-4">
                        <StatusBadge variant={log.statusCode === 200 ? "success" : "danger"}>
                          {log.statusCode} {log.statusText}
                        </StatusBadge>
                      </td>

                      {/* URL */}
                      <td className="py-3 px-4 text-kumo-subtle font-mono text-[11px] truncate max-w-[200px] hidden sm:table-cell">
                        {log.url}
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 font-mono text-kumo-subtle hidden md:table-cell">
                        {log.latencyMs}ms
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-kumo-subtle">
                        {log.timestamp}
                      </td>

                      {/* Payload View */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayloadLog(log)}
                          className="px-2 py-1 rounded bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-[11px] font-medium text-kumo-strong transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Code size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 4. Payload Inspector Modal */}
      {selectedPayloadLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedPayloadLog(null)}
          />
          <div className="relative w-full max-w-lg bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-cf-blue" />
                <h3 className="text-sm font-semibold text-kumo-strong font-mono">
                  {selectedPayloadLog.event} Payload
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayloadLog(null)}
                className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 bg-kumo-recessed">
              <pre className="font-mono text-xs text-kumo-strong bg-kumo-base p-4 rounded-xl border border-kumo-hairline overflow-x-auto max-h-80">
                {JSON.stringify(selectedPayloadLog.payload, null, 2)}
              </pre>
            </div>
            <div className="px-5 py-3 bg-kumo-recessed border-t border-kumo-hairline flex justify-end">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(
                    JSON.stringify(selectedPayloadLog.payload, null, 2),
                    "Payload JSON"
                  );
                }}
                className="btn-cf-primary"
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Endpoint Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleAddEndpoint}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                    <PlugsConnected size={18} weight="bold" />
                  </div>
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    Add Webhook Endpoint
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Endpoint URL (Must be HTTPS)
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://api.example.com/webhooks/emitmail"
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-xs text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-kumo-subtle mb-1.5">
                    Select Events to Subscribe
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {AVAILABLE_EVENTS.map((ev) => {
                      const isChecked = selectedEvents.includes(ev.id);
                      return (
                        <label
                          key={ev.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-kumo-recessed border border-kumo-hairline cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedEvents((prev) =>
                                isChecked
                                  ? prev.filter((id) => id !== ev.id)
                                  : [...prev, ev.id]
                              );
                            }}
                            className="accent-cf-blue"
                          />
                          <span className="font-mono text-kumo-strong">{ev.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-cf-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cf-primary"
                >
                  Create Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
