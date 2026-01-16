import React, { useState } from 'react';
import type { UserTrustedSite, InPageTrackingMethod } from '../../lib/types';
import { Card, CardHeader, CardContent, Button } from '../ui';

interface AddTrustedSiteDialogProps {
  onClose: () => void;
  onAdd: (site: UserTrustedSite) => Promise<void>;
  currentDomain?: string;
}

const TRACKING_METHODS: { value: InPageTrackingMethod; label: string }[] = [
  { value: 'canvas-fingerprint', label: 'Canvas Fingerprinting' },
  { value: 'device-api', label: 'Device API' },
  { value: 'storage-access', label: 'Storage Access' },
  { value: 'mouse-tracking', label: 'Mouse Tracking' },
  { value: 'form-monitoring', label: 'Form Monitoring' },
  { value: 'clipboard-access', label: 'Clipboard Access' },
];

export function AddTrustedSiteDialog({
  onClose,
  onAdd,
  currentDomain = '',
}: AddTrustedSiteDialogProps) {
  const [domain, setDomain] = useState(currentDomain);
  const [reason, setReason] = useState('');
  const [temporary, setTemporary] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<InPageTrackingMethod[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleMethodToggle = (method: InPageTrackingMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!domain.trim()) {
      setError('Domain is required');
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain.trim())) {
      setError('Invalid domain format (e.g., example.com)');
      return;
    }

    setSaving(true);
    try {
      const site: UserTrustedSite = {
        domain: domain.trim().toLowerCase(),
        addedAt: Date.now(),
        reason: reason.trim() || undefined,
        allowedMethods: selectedMethods.length > 0 ? selectedMethods : undefined,
        temporary,
      };

      await onAdd(site);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add site');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Trusted Site
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Domain Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-phantom-500 focus:border-phantom-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter domain without protocol (e.g., github.com)
              </p>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this site trusted?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-phantom-500 focus:border-phantom-500"
              />
            </div>

            {/* Allowed Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Methods (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Leave empty to allow all methods
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {TRACKING_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMethods.includes(method.value)}
                      onChange={() => handleMethodToggle(method.value)}
                      className="rounded border-gray-300 text-phantom-600 focus:ring-phantom-500 mr-2"
                    />
                    <span className="text-sm text-gray-700">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Temporary Checkbox */}
            <div>
              <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={temporary}
                  onChange={(e) => setTemporary(e.target.checked)}
                  className="rounded border-gray-300 text-phantom-600 focus:ring-phantom-500 mr-2"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Temporary (Session only)
                  </span>
                  <p className="text-xs text-gray-500">
                    Remove this site when browser restarts
                  </p>
                </div>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {String(error).replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Site'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
