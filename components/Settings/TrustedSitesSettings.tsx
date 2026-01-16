import { useState, useEffect } from 'react';
import { UserWhitelistManager } from '../../lib/user-whitelist-manager';
import { TRUSTED_SITES } from '../../lib/trusted-sites';
import { SecurityContextDetector } from '../../lib/context-detector';
import type { UserTrustedSite, SecurityContext } from '../../lib/types';
import { Card, CardHeader, CardContent, Button } from '../ui';
import { AddTrustedSiteDialog } from './AddTrustedSiteDialog';

export function TrustedSitesSettings() {
  const [userSites, setUserSites] = useState<UserTrustedSite[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentContext, setCurrentContext] = useState<SecurityContext | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSites();
    detectCurrentContext();
  }, []);

  const loadUserSites = async () => {
    try {
      const sites = await UserWhitelistManager.getUserWhitelist();
      setUserSites(sites);
    } catch (error) {
      console.error('Failed to load user sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectCurrentContext = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        // Only set domain for http/https URLs (not chrome-extension://)
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          setCurrentDomain(url.hostname);
          const context = SecurityContextDetector.detectContext(tab.url);
          setCurrentContext(context);
        }
      }
    } catch (error) {
      console.error('Failed to detect context:', error);
    }
  };

  const handleRemoveSite = async (domain: string) => {
    try {
      await UserWhitelistManager.removeTrustedSite(domain);
      await loadUserSites();
    } catch (error) {
      console.error('Failed to remove site:', error);
    }
  };

  const handleAddSite = async (site: UserTrustedSite) => {
    try {
      await UserWhitelistManager.addTrustedSite(site);
      await loadUserSites();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Failed to add site:', error);
      throw error;
    }
  };

  const handleExport = async () => {
    try {
      const json = await UserWhitelistManager.exportWhitelist();
      // eslint-disable-next-line no-undef
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'phantom-trail-whitelist.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          await UserWhitelistManager.importWhitelist(text);
          await loadUserSites();
        }
      };
      input.click();
    } catch (error) {
      console.error('Failed to import:', error);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return colors[confidence as keyof typeof colors] || colors.low;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading trusted sites...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Trusted Sites */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">
            Default Trusted Sites ({TRUSTED_SITES.length})
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Pre-configured sites that use fingerprinting for security
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {TRUSTED_SITES.map((site) => (
              <div
                key={site.domain}
                className="flex items-start justify-between p-2 bg-gray-50 rounded text-xs"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{site.domain}</div>
                  <div className="text-gray-600">{site.description}</div>
                </div>
                <span className="text-gray-400 ml-2">✓</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Trusted Sites */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Your Trusted Sites ({userSites.length})
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Sites you&apos;ve added to the whitelist
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="text-xs"
            >
              + Add Site
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userSites.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No custom trusted sites yet
            </div>
          ) : (
            <div className="space-y-2">
              {userSites.map((site) => (
                <div
                  key={site.domain}
                  className="flex items-start justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {site.domain}
                      {site.temporary && (
                        <span className="ml-2 text-orange-600">(Session only)</span>
                      )}
                    </div>
                    {site.reason && (
                      <div className="text-gray-600">{site.reason}</div>
                    )}
                    <div className="text-gray-400 mt-1">
                      Added {new Date(site.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveSite(site.domain)}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Page Context */}
      {currentContext && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">
              Current Page Context
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Domain:</span>
                <span className="font-medium text-gray-900">{currentDomain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confidence:</span>
                <span
                  className={`px-2 py-0.5 rounded ${getConfidenceBadge(currentContext.confidence)}`}
                >
                  {currentContext.confidence.toUpperCase()}
                </span>
              </div>
              {currentContext.isLoginPage && (
                <div className="text-green-600">✓ Login page detected</div>
              )}
              {currentContext.isBankingPage && (
                <div className="text-green-600">✓ Banking site detected</div>
              )}
              {currentContext.isPaymentPage && (
                <div className="text-green-600">✓ Payment page detected</div>
              )}
              {currentContext.hasPasswordField && (
                <div className="text-green-600">✓ Password field present</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export/Import */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExport}
          disabled={userSites.length === 0}
          className="flex-1 text-xs"
        >
          Export Whitelist
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleImport}
          className="flex-1 text-xs"
        >
          Import Whitelist
        </Button>
      </div>

      {/* Add Site Dialog */}
      {showAddDialog && (
        <AddTrustedSiteDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAddSite}
          currentDomain={currentDomain}
        />
      )}
    </div>
  );
}
