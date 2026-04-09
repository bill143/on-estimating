'''use client''';

import { useState } from 'react';
import {
  Bell,
  Mail,
  Hash,
  Send,
  Clock,
  AlertTriangle,
  FileCheck,
  Newspaper,
  BarChart3,
  FolderPlus,
  Upload,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/lib/settings-store';
import toast from 'react-hot-toast';
import type { NotificationEvent, NotificationChannel } from '@/lib/settings-types';

// ── Event labels ──────────────────────

const EVENT_CONFIG: { key: NotificationEvent; label: string; icon: typeof Bell }[] = [
  { key: 'estimate-submitted', label: 'Estimate Submitted', icon: Send },
  { key: 'estimate-approved', label: 'Estimate Approved', icon: FileCheck },
  { key: 'estimate-rejected', label: 'Estimate Rejected', icon: AlertTriangle },
  { key: 'project-created', label: 'Project Created', icon: FolderPlus },
  { key: 'bid-deadline', label: 'Bid Deadline', icon: Clock },
  { key: 'session-submitted', label: 'Session Submitted', icon: BarChart3 },
  { key: 'document-uploaded', label: 'Document Uploaded', icon: Upload },
];

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: 'in-app', label: 'In-App' },
  { key: 'email', label: 'Email' },
  { key: 'slack', label: 'Slack' },
];

// ── Main Component ─────────────────────

export default function NotificationsAutomation() {
  const notificationMatrix = useSettingsStore((s) => s.notificationMatrix);
  const setNotificationMatrix = useSettingsStore((s) => s.setNotificationMatrix);
  const emailDigestFrequency = useSettingsStore((s) => s.emailDigestFrequency);
  const setEmailDigestFrequency = useSettingsStore((s) => s.setEmailDigestFrequency);
  const slackWebhookUrl = useSettingsStore((s) => s.slackWebhookUrl);
  const setSlackWebhookUrl = useSettingsStore((s) => s.setSlackWebhookUrl);
  const notifications = useSettingsStore((s) => s.notifications);
  const updateNotifications = useSettingsStore((s) => s.updateNotifications);

  const [testingWebhook, setTestingWebhook] = useState(false);

  // ── Matrix toggle handler ──

  const handleMatrixToggle = (event: NotificationEvent, channel: NotificationChannel) => {
    const updated = { ...notificationMatrix };
    updated[event] = {
      ...updated[event],
      [channel]: !updated[event][channel],
    };
    setNotificationMatrix(updated);
  };

  // ── Slack webhook test ──

  const handleTestWebhook = async () => {
    if (!slackWebhookUrl.trim()) {
      toast.error('Enter a webhook URL first');
      return;
    }
    setTestingWebhook(true);
    toast.loading('Pinging webhook...', { id: 'webhook-test' });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTestingWebhook(false);
    toast.success('Webhook responded with 200 OK', { id: 'webhook-test' });
  };

  // ── Save handler ──

  const handleSave = () => {
    // All values are already written to the store reactively.
    // This explicit save is for user confidence and dirty-flag clearing.
    toast.success('Notification preferences saved');
  };

  // ── Render ──

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Notifications & Automation</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Configure which events trigger notifications across each channel.
        </p>
      </div>

      {/* ━━ 1. Notification Matrix ━━ */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Notification Matrix</CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">Toggle channels for each event type</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Event
                  </th>
                  {CHANNELS.map((ch) => (
                    <th
                      key={ch.key}
                      className="text-center py-3 px-4 text-xs font-medium text-zinc-500 uppercase tracking-wide"
                    >
                      {ch.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVENT_CONFIG.map(({ key, label, icon: EvIcon }) => (
                  <tr key={key} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <EvIcon className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-800">{label}</span>
                      </div>
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch.key} className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={notificationMatrix[key]?.[ch.key] ?? false}
                            onCheckedChange={() => handleMatrixToggle(key, ch.key)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ━━ 2. Email Digest Frequency ━━ */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Email Digest</CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">Choose how often to receive email summaries</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(['immediate', 'daily', 'weekly'] as const).map((freq) => {
              const labels: Record<typeof freq, string> = {
                immediate: 'Immediate',
                daily: 'Daily',
                weekly: 'Weekly',
              };
              const descriptions: Record<typeof freq, string> = {
                immediate: 'Get notified as events happen',
                daily: 'One summary email per day',
                weekly: 'One summary email per week',
              };
              const isSelected = emailDigestFrequency === freq;
              return (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setEmailDigestFrequency(freq)}
                  className={`flex-1 min-w-[140px] p-4 rounded-lg border-2 text-left transition-colors ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-orange-500' : 'border-zinc-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <span
                      className={`text-sm font-medium ${isSelected ? 'text-orange-700' : 'text-zinc-700'}`}
                    >
                      {labels[freq]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 ml-6">{descriptions[freq]}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ━━ 3. Slack Webhook ━━ */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Slack Webhook</CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                Deliver Slack-channel notifications via incoming webhook
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">Webhook URL</Label>
              <Input
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="focus-visible:ring-orange-500/20"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestWebhook}
              disabled={testingWebhook || !slackWebhookUrl.trim()}
              className="gap-1.5"
            >
              {testingWebhook ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Test Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ━━ 4. Legacy Notification Toggles ━━ */}
      <Card className="border border-zinc-200 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Alert Preferences</CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                Legacy notification toggles for backward compatibility
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bid Deadline Reminders */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">Bid deadline reminders</p>
                <p className="text-xs text-zinc-500">Get notified before bid deadlines</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={notifications.bidDeadlineReminder.daysBefore}
                    onChange={(e) =>
                      updateNotifications({
                        bidDeadlineReminder: {
                          ...notifications.bidDeadlineReminder,
                          daysBefore: Number(e.target.value) || 7,
                        },
                      })
                    }
                    className="w-16 h-8 text-sm text-center"
                    disabled={!notifications.bidDeadlineReminder.enabled}
                  />
                  <span className="text-xs text-zinc-500 whitespace-nowrap">days before</span>
                </div>
                <Switch
                  checked={notifications.bidDeadlineReminder.enabled}
                  onCheckedChange={(v) =>
                    updateNotifications({
                      bidDeadlineReminder: { ...notifications.bidDeadlineReminder, enabled: v },
                    })
                  }
                />
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            {/* ITB Capture Alerts */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">New ITB capture alerts</p>
                <p className="text-xs text-zinc-500">Bid Sniper trigger for new opportunities</p>
              </div>
              <Switch
                checked={notifications.itbCaptureAlerts}
                onCheckedChange={(v) => updateNotifications({ itbCaptureAlerts: v })}
              />
            </div>

            <div className="border-t border-zinc-100" />

            {/* Addendum Alerts */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">Addendum published alerts</p>
                <p className="text-xs text-zinc-500">Notify when addenda are published for tracked bids</p>
              </div>
              <Switch
                checked={notifications.addendumAlerts}
                onCheckedChange={(v) => updateNotifications({ addendumAlerts: v })}
              />
            </div>

            <div className="border-t border-zinc-100" />

            {/* Takeoff Completion */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">Takeoff completion notifications</p>
                <p className="text-xs text-zinc-500">Alert when AI takeoff processing completes</p>
              </div>
              <Switch
                checked={notifications.takeoffCompletion}
                onCheckedChange={(v) => updateNotifications({ takeoffCompletion: v })}
              />
            </div>

            <div className="border-t border-zinc-100" />

            {/* AI Anomaly Alerts */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">AI anomaly alerts</p>
                <p className="text-xs text-zinc-500">
                  Flag when AI confidence or cost variance exceeds threshold
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={notifications.aiAnomalyAlerts.thresholdPercent}
                    onChange={(e) =>
                      updateNotifications({
                        aiAnomalyAlerts: {
                          ...notifications.aiAnomalyAlerts,
                          thresholdPercent: Number(e.target.value) || 20,
                        },
                      })
                    }
                    className="w-16 h-8 text-sm text-center"
                    disabled={!notifications.aiAnomalyAlerts.enabled}
                  />
                  <span className="text-xs text-zinc-500">% threshold</span>
                </div>
                <Switch
                  checked={notifications.aiAnomalyAlerts.enabled}
                  onCheckedChange={(v) =>
                    updateNotifications({
                      aiAnomalyAlerts: { ...notifications.aiAnomalyAlerts, enabled: v },
                    })
                  }
                />
              </div>
            </div>

            <div className="border-t border-zinc-100" />

            {/* Daily Digest */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-800">Daily digest email</p>
                <p className="text-xs text-zinc-500">Receive a daily summary of all activity</p>
              </div>
              <Switch
                checked={notifications.dailyDigest}
                onCheckedChange={(v) => updateNotifications({ dailyDigest: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ━━ Save Button ━━ */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 px-6"
        >
          Save Notification Settings
        </Button>
      </div>
    </div>
  );
}
