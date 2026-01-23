import {
  PrivacyPredictor,
  type PrivacyPrediction,
  type PageContext,
} from '../../lib/privacy-predictor';

// Privacy prediction state
let currentTooltip: HTMLElement | null = null;
let hoverTimeout: number | null = null;
const HOVER_DELAY = 500; // 500ms delay before showing prediction

export async function handleLinkHover(link: HTMLAnchorElement): Promise<void> {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
  }

  hoverTimeout = window.setTimeout(async () => {
    try {
      // Check if privacy predictions are enabled
      const settings = await chrome.storage.local.get('phantom_trail_settings');
      const enablePrivacyPredictions =
        settings.phantom_trail_settings?.enablePrivacyPredictions ?? true;

      if (!enablePrivacyPredictions) {
        return;
      }

      const href = link.href;
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
        return;
      }

      const context: PageContext = {
        referrer: window.location.href,
        currentDomain: window.location.hostname,
        linkText: link.textContent?.trim() || '',
        linkPosition: getLinkPosition(link),
        isExternal: new URL(href).hostname !== window.location.hostname,
      };

      const analysis = await PrivacyPredictor.analyzeLinkHover(href, context);

      if (analysis.shouldWarn) {
        showPrivacyTooltip(link, analysis.prediction, analysis.displayText);
      }
    } catch (error) {
      console.warn('[Phantom Trail] Privacy prediction failed:', error);
    }
  }, HOVER_DELAY);
}

export function handleLinkLeave(): void {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
  hidePrivacyTooltip();
}

function getLinkPosition(
  link: HTMLAnchorElement
): 'header' | 'content' | 'footer' | 'sidebar' {
  const rect = link.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  if (rect.top < viewportHeight * 0.2) return 'header';
  if (rect.top > viewportHeight * 0.8) return 'footer';
  if (rect.left < 200 || rect.right > window.innerWidth - 200) return 'sidebar';
  return 'content';
}

function showPrivacyTooltip(
  link: HTMLAnchorElement,
  prediction: PrivacyPrediction,
  displayText: string
): void {
  hidePrivacyTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'phantom-trail-tooltip';
  
  // Different icon and title for historical vs predicted data
  const icon = prediction.isHistorical ? '✓' : '🛡️';
  const title = prediction.isHistorical ? 'Historical Data' : 'Privacy Prediction';
  
  tooltip.innerHTML = `
    <div class="phantom-trail-tooltip-content">
      <div class="phantom-trail-tooltip-header">
        <span class="phantom-trail-tooltip-icon">${icon}</span>
        <span class="phantom-trail-tooltip-title">${title}</span>
      </div>
      <div class="phantom-trail-tooltip-body">
        <div class="phantom-trail-tooltip-score">
          Privacy Score: <span class="phantom-trail-score-${prediction.predictedGrade.toLowerCase()}">${prediction.predictedScore}/100</span>
        </div>
        <div class="phantom-trail-tooltip-text">${displayText}</div>
      </div>
    </div>
  `;

  // Position tooltip
  const rect = link.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
  tooltip.style.zIndex = '10000';

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

function hidePrivacyTooltip(): void {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}
