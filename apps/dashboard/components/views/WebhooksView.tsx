"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Trash,
  ArrowsClockwise,
  Check,
  Globe,
  Broadcast,
} from "@phosphor-icons/react";
import { WebhookEndpoint, WebhookDeliveryLog } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { ViewOnlyBanner } from "@/components/ui/ViewOnlyBanner";
import { api } from "@/lib/api";

const AVAILABLE_EVENTS = [
  { id: "email.sent", label: "email.sent", desc: "Triggered immediately when message is queued and dispatched" },
  { id: "email.delivered", label: "email.delivered", desc: "Remote SMTP server acknowledged receipt with 250 OK" },
  { id: "email.bounced", label: "email.bounced", desc: "Remote mail server rejected delivery (hard/soft bounce)" },
  { id: "email.complaint", label: "email.complaint", desc: "Recipient reported message as spam via feedback loop" },
  { id: "email.opened", label: "email.opened", desc: "Tracking pixel loaded by recipient's email client" },
  { id: "email.clicked", label: "email.clicked", desc: "Recipient clicked a verified link inside message" },
  { id: "inbound.email.received", label: "inbound.email.received", desc: "Incoming email received and parsed by inbox engine" },
  { id: "domain.verified", label: "domain.verified", desc: "Domain successfully verified with active DKIM/SPF" },
];

export function WebhooksView() {
  const { toast } = useToast();
  const { isViewer } = useAuth();

  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [selectedPayloadLog, setSelectedPayloadLog] = useState<WebhookDeliveryLog | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "email.delivered",
    "email.bounced",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Testing & Deleting state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [endpointsData, deliveriesData] = await Promise.allSettled([
        api.webhooks.list(),
        api.webhooks.listDeliveries(),
      ]);

      if (endpointsData.status === "fulfilled") {
        setEndpoints(endpointsData.value || []);
      }
      if (deliveriesData.status === "fulfilled") {
        setDeliveries(deliveriesData.value || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load webhook configuration";
      toast({
        title: "Load Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      api.webhooks.list(),
      api.webhooks.listDeliveries(),
    ])
      .then(([endpointsData, deliveriesData]) => {
        if (!isMounted) return;
        if (endpointsData.status === "fulfilled") {
          setEndpoints(endpointsData.value || []);
        }
        if (deliveriesData.status === "fulfilled") {
          setDeliveries(deliveriesData.value || []);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load webhook configuration";
        toast({
          title: "Load Failed",
          description: msg,
          type: "error",
        });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast({
      title: "Webhooks Synchronized",
      description: "Loaded latest endpoints and delivery audit log from database.",
      type: "info",
    });
  };

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

  const toggleEventSubscription = async (endpointId: string, eventId: string) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to modify event subscriptions.",
        type: "warning",
      });
      return;
    }

    const currentEp = endpoints.find((e) => e.id === endpointId);
    if (!currentEp) return;

    const exists = currentEp.events.includes(eventId);
    const updatedEvents = exists
      ? currentEp.events.filter((e) => e !== eventId)
      : [...currentEp.events, eventId];

    if (updatedEvents.length === 0) {
      toast({
        title: "Subscription Required",
        description: "A webhook endpoint must be subscribed to at least one event.",
        type: "warning",
      });
      return;
    }

    // Optimistic local update
    setEndpoints((prev) =>
      prev.map((ep) => (ep.id === endpointId ? { ...ep, events: updatedEvents } : ep))
    );

    try {
      await api.webhooks.update(endpointId, { events: updatedEvents });
      toast({
        title: "Events Updated",
        description: `Endpoint is now listening for ${updatedEvents.length} events.`,
        type: "info",
      });
    } catch (err: unknown) {
      // Revert on failure
      setEndpoints((prev) =>
        prev.map((ep) => (ep.id === endpointId ? { ...ep, events: currentEp.events } : ep))
      );
      const msg = err instanceof Error ? err.message : "Failed to update events";
      toast({
        title: "Update Failed",
        description: msg,
        type: "error",
      });
    }
  };

  const handleSendTestWebhook = async (endpoint: WebhookEndpoint) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to trigger test webhooks.",
        type: "warning",
      });
      return;
    }

    setTestingId(endpoint.id);
    toast({
      title: "Dispatching Test Webhook",
      description: `Sending signed POST payload to ${endpoint.url}...`,
      type: "info",
    });

    try {
      const result = await api.webhooks.test(endpoint.id);
      if (result.success) {
        toast({
          title: `Webhook Acknowledged (${result.statusCode || 200} OK)`,
          description: `Target responded in ${result.latencyMs}ms.`,
          type: "success",
        });
      } else {
        toast({
          title: `Webhook Dispatch Failed (${result.statusCode || "Error"})`,
          description: result.lastError || result.statusText || "Target endpoint could not be reached.",
          type: "warning",
        });
      }

      // Refresh deliveries table to show real new log
      const updatedDeliveries = await api.webhooks.listDeliveries().catch(() => null);
      if (updatedDeliveries) {
        setDeliveries(updatedDeliveries);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test dispatch failed";
      toast({
        title: "Test Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteEndpoint = async (id: string, url: string) => {
    if (isViewer) {
      toast({
        title: "View-Only Access",
        description: "You do not have permission to delete webhook endpoints.",
        type: "warning",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete webhook "${url}"? Live events will no longer be delivered to this target.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.webhooks.delete(id);
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
      toast({
        title: "Webhook Deleted",
        description: `Removed endpoint ${url}`,
        type: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete endpoint";
      toast({
        title: "Delete Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddEndpoint = async (e: React.FormEvent) => {
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
    if (selectedEvents.length === 0) {
      toast({
        title: "Event Selection Required",
        description: "Please select at least one event type to subscribe.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.webhooks.create({
        url: newUrl.trim(),
        events: selectedEvents,
      });

      setEndpoints((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewUrl("");
      setSelectedEvents(["email.delivered", "email.bounced"]);
      toast({
        title: "Webhook Registered",
        description: `Successfully listening for ${created.events.length} event types.`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create webhook";
      toast({
        title: "Registration Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-kumo-strong leading-tight">
            Webhooks
          </h1>
          <p className="text-[13px] sm:text-[14px] text-kumo-subtle mt-0.5 sm:mt-1 font-normal leading-relaxed">
            Receive real-time HTTP POST payloads with HMAC-SHA256 signatures for email delivery, bounces, and complaints.
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="btn-cf-secondary h-8 px-3 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh webhooks and deliveries"
          >
            <ArrowsClockwise
              size={14}
              className={isRefreshing ? "animate-spin text-cf-blue" : ""}
            />
            <span>Refresh</span>
          </button>

          {!isViewer && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn-cf-primary h-8 px-3.5 flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
            >
              <Plus size={15} weight="bold" />
              <span>Add Endpoint</span>
            </button>
          )}
        </div>
      </div>

      {isViewer && (
        <ViewOnlyBanner message="You have view-only access. You cannot register endpoints, toggle events, send test webhooks, or delete endpoints." />
      )}

      {/* 2. Security & Signing Banner */}
      <div className="p-4 rounded-xl bg-kumo-base border border-kumo-hairline flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 rounded-lg bg-cf-blue/10 text-cf-blue shrink-0 mt-0.5">
          <ShieldCheck size={20} weight="fill" />
        </div>
        <div className="text-[13px] sm:text-[14px] leading-relaxed">
          <span className="text-[14px] sm:text-[15px] font-medium text-kumo-strong block mb-0.5">
            Cryptographic Payload Verification
          </span>
          <span className="text-kumo-subtle">
            All outbound webhook requests include a computed{" "}
            <code className="font-mono text-[12px] sm:text-[13px] font-medium text-cf-blue bg-cf-blue/10 px-1.5 py-0.5 rounded border border-cf-blue/20 break-all sm:break-normal inline-block align-middle">
              X-EmitMail-Signature: sha256=...
            </code>{" "}
            header signed with the endpoint&apos;s HMAC secret. Verify this signature in your backend to ensure requests originate directly from EmitMail.
          </span>
        </div>
      </div>

      {/* 3. Endpoints Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-kumo-strong uppercase tracking-wider font-mono">
            Configured Endpoints ({endpoints.length})
          </h2>
        </div>

        {isLoading ? (
          <TableSkeleton rows={2} cols={4} />
        ) : endpoints.length === 0 ? (
          <div className="p-10 md:p-14 text-center flex flex-col items-center justify-center max-w-md mx-auto bg-kumo-base border border-kumo-hairline rounded-xl">
            <div className="w-12 h-12 rounded-2xl bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue mb-3.5">
              <Broadcast size={24} weight="duotone" className="text-cf-blue" />
            </div>
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-kumo-strong mb-1.5">
              No webhook endpoints configured
            </h3>
            <p className="text-[13px] sm:text-[14px] text-kumo-subtle mb-5 leading-relaxed max-w-sm">
              Register a target URL to receive instantaneous notifications when emails are delivered, opened, or bounced.
            </p>
            {!isViewer && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn-cf-primary h-8 px-3.5 flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span>Add your first endpoint</span>
              </button>
            )}
          </div>
        ) : (
          endpoints.map((ep) => {
            const isDeletingThis = deletingId === ep.id;
            const isTestingThis = testingId === ep.id;

            return (
              <div
                key={ep.id}
                className="bg-kumo-base border border-kumo-hairline rounded-xl p-5 space-y-4 shadow-2xs"
              >
                {/* Top row: URL + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-kumo-hairline">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue shrink-0">
                      <PlugsConnected size={18} weight="bold" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[13px] sm:text-[14px] font-medium text-kumo-strong break-all">
                          {ep.url}
                        </span>
                        <StatusBadge variant={ep.isActive !== false ? "success" : "neutral"} className="text-[11px] sm:text-[12px]">
                          {ep.isActive !== false ? "Active" : "Disabled"}
                        </StatusBadge>
                        {ep.domain && (
                          <span className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] font-mono px-2 py-0.5 rounded bg-kumo-recessed text-kumo-subtle border border-kumo-hairline">
                            <Globe size={12} />
                            <span>{ep.domain.domainName}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[12px] text-kumo-subtle block mt-0.5 font-normal">
                        Added {new Date(ep.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isViewer && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSendTestWebhook(ep)}
                        disabled={isTestingThis || isDeletingThis}
                        className="h-8 px-3 rounded-lg bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-[13px] font-medium text-kumo-strong flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <PaperPlaneTilt
                          size={14}
                          className={isTestingThis ? "animate-spin text-cf-blue" : "text-cf-blue"}
                          weight="bold"
                        />
                        <span>{isTestingThis ? "Dispatching..." : "Send Test Webhook"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEndpoint(ep.id, ep.url)}
                        disabled={isDeletingThis || isTestingThis}
                        className="p-1.5 rounded-lg text-kumo-danger hover:bg-kumo-danger-tint border border-transparent hover:border-kumo-danger/30 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete webhook endpoint"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Middle row: HMAC Signing Secret */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-kumo-recessed border border-kumo-hairline text-[13px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck size={16} className="text-cf-blue shrink-0" />
                    <span className="text-kumo-subtle font-medium shrink-0 text-[13px]">HMAC Signing Secret:</span>
                    <span className="font-mono text-kumo-strong truncate text-[12px] sm:text-[13px]">
                      {showSecret[ep.id] ? ep.secret : `${ep.secret.substring(0, 10)}••••••••••••••••••••••••`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleShowSecret(ep.id)}
                      className="p-1 rounded text-kumo-muted hover:text-kumo-strong cursor-pointer"
                      title={showSecret[ep.id] ? "Hide secret" : "Reveal secret"}
                    >
                      {showSecret[ep.id] ? <EyeSlash size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] sm:text-[14px] font-medium text-kumo-strong block">
                      Subscribed Event Types ({ep.events.length})
                    </span>
                    <span className="text-[12px] text-kumo-subtle font-normal">
                      Click to toggle triggers
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVAILABLE_EVENTS.map((ev) => {
                      const isChecked = ep.events.includes(ev.id);
                      return (
                        <button
                          key={ev.id}
                          type="button"
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
                            onChange={() => {}}
                            className="mt-0.5 accent-cf-blue cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-mono font-medium block truncate text-[12px]">
                              {ev.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Recent Deliveries Log Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] sm:text-[16px] font-semibold text-kumo-strong">
            Recent Webhook Deliveries
          </h2>
          <span className="text-[12px] sm:text-[13px] text-kumo-subtle font-medium">
            {deliveries.length} {deliveries.length === 1 ? "record" : "records"} logged
          </span>
        </div>

        <div className="bg-kumo-base border border-kumo-hairline rounded-xl overflow-hidden shadow-2xs">
          {isLoading ? (
            <TableSkeleton rows={3} cols={6} />
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-[13px] sm:text-[14px] text-kumo-subtle leading-relaxed">
              No webhook deliveries recorded yet. Trigger a &quot;Send Test Webhook&quot; above or dispatch transactional emails to see live delivery logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-kumo-hairline bg-kumo-recessed/50 text-kumo-subtle text-[13px] font-medium">
                    <th className="py-3 px-4 font-medium">Event</th>
                    <th className="py-3 px-4 font-medium">HTTP Status</th>
                    <th className="py-3 px-4 font-medium hidden sm:table-cell">Target Endpoint</th>
                    <th className="py-3 px-4 font-medium hidden md:table-cell">Latency</th>
                    <th className="py-3 px-4 font-medium">Timestamp</th>
                    <th className="py-3 px-4 font-medium text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kumo-hairline">
                  {deliveries.map((log) => {
                    const isSuccess = log.success || (log.statusCode && log.statusCode >= 200 && log.statusCode < 300);
                    const targetUrl = log.url || log.subscription?.url || "Endpoint";
                    const formattedDate = log.createdAt
                      ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : log.timestamp || "Just now";

                    return (
                      <tr key={log.id} className="hover:bg-kumo-tint/60 transition-colors">
                        {/* Event Type */}
                        <td className="py-3 px-4 font-mono text-[12px] sm:text-[13px] font-medium text-kumo-strong">
                          {log.event}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          <StatusBadge variant={isSuccess ? "success" : "danger"} className="text-[11px] sm:text-[12px]">
                            {log.statusCode ? `${log.statusCode} ${log.statusText || (isSuccess ? "OK" : "Failed")}` : "Connection Failed"}
                          </StatusBadge>
                        </td>

                        {/* URL */}
                        <td className="py-3 px-4 text-kumo-subtle font-mono text-[12px] sm:text-[13px] truncate max-w-[220px] hidden sm:table-cell">
                          {targetUrl}
                        </td>

                        {/* Latency */}
                        <td className="py-3 px-4 font-mono text-kumo-subtle text-[12px] sm:text-[13px] hidden md:table-cell">
                          {typeof log.latencyMs === "number" ? `${log.latencyMs}ms` : "—"}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-4 text-kumo-subtle font-mono text-[12px] sm:text-[13px]">
                          {formattedDate}
                        </td>

                        {/* Payload View */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedPayloadLog(log)}
                            className="px-2.5 py-1 rounded bg-kumo-elevated hover:bg-kumo-interact border border-kumo-line text-[12px] font-medium text-kumo-strong transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Code size={13} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 5. Payload Inspector Modal */}
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
                <h3 className="text-[14px] sm:text-[15px] font-medium text-kumo-strong font-mono">
                  {selectedPayloadLog.event} Payload
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayloadLog(null)}
                className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 bg-kumo-recessed space-y-3">
              <div className="text-[12px] sm:text-[13px] space-y-1">
                <span className="text-kumo-subtle block">Target Endpoint:</span>
                <span className="font-mono text-kumo-strong block break-all text-[12px]">
                  {selectedPayloadLog.url || selectedPayloadLog.subscription?.url || "Endpoint"}
                </span>
              </div>
              <pre className="font-mono text-[12px] sm:text-[13px] text-kumo-strong bg-kumo-base p-4 rounded-xl border border-kumo-hairline overflow-x-auto max-h-80 leading-relaxed">
                {JSON.stringify(selectedPayloadLog.payload, null, 2)}
              </pre>
            </div>
            <div className="px-5 py-3 bg-kumo-recessed border-t border-kumo-hairline flex items-center justify-between">
              <span className="text-[12px] text-kumo-subtle">
                RFC JSON payload format
              </span>
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(
                    JSON.stringify(selectedPayloadLog.payload, null, 2),
                    "Payload JSON"
                  );
                }}
                className="btn-cf-primary h-8 px-3 text-[13px] font-medium flex items-center gap-1.5"
              >
                <Copy size={13} />
                <span>Copy JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add Endpoint Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleAddEndpoint}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-kumo-hairline">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cf-blue/10 border border-cf-blue/20 flex items-center justify-center text-cf-blue">
                    <PlugsConnected size={18} weight="bold" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-kumo-strong">
                    Add Webhook Endpoint
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="p-1 rounded-md text-kumo-muted hover:text-kumo-strong hover:bg-kumo-tint cursor-pointer disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-kumo-subtle mb-1.5">
                    Endpoint URL (HTTP or HTTPS)
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://api.yourdomain.com/webhooks/emitmail"
                    className="w-full bg-kumo-control border border-kumo-line rounded-lg px-3 py-2 text-[13px] sm:text-[14px] text-kumo-strong placeholder:text-kumo-muted focus:outline-none focus:border-cf-blue font-mono"
                  />
                  <span className="text-[12px] text-kumo-subtle mt-1 block">
                    Must be reachable from your EmitMail server.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[13px] font-medium text-kumo-subtle">
                      Select Events to Subscribe
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedEvents((prev) =>
                          prev.length === AVAILABLE_EVENTS.length
                            ? ["email.delivered"]
                            : AVAILABLE_EVENTS.map((e) => e.id)
                        )
                      }
                      className="text-[12px] text-cf-blue hover:underline cursor-pointer font-medium"
                    >
                      {selectedEvents.length === AVAILABLE_EVENTS.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {AVAILABLE_EVENTS.map((ev) => {
                      const isChecked = selectedEvents.includes(ev.id);
                      return (
                        <label
                          key={ev.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-kumo-recessed border border-kumo-hairline cursor-pointer text-xs hover:border-kumo-line transition-colors"
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
                            className="accent-cf-blue cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-mono text-kumo-strong font-medium block text-[12px] sm:text-[13px]">
                              {ev.label}
                            </span>
                            <span className="text-[11px] sm:text-[12px] text-kumo-subtle block truncate">
                              {ev.desc}
                            </span>
                          </div>
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
                  disabled={isSubmitting}
                  className="btn-cf-secondary h-8 px-3 text-[13px] font-medium cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim() || selectedEvents.length === 0}
                  className="btn-cf-primary h-8 px-3.5 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowsClockwise size={14} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} weight="bold" />
                      <span>Register Endpoint</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
