import {
  PrivacyPredictor,
  type PrivacyPrediction,
  type PageContext,
} from '../../lib/privacy-predictor';

let currentTooltip: HTMLElement | null = null;
let hoverTimeout: number | null = null;
const HOVER_DELAY = 500;

export async function handleLinkHover(link: HTMLAnchorElement): Promise<void> {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
  }

  hoverTimeout = window.setTimeout(async () => {
    try {
      const settings = await chrome.storage.local.get('phantom_trail_settings');
      const enablePrivacyPredictions =
        settings.phantom_trail_settings?.enablePrivacyPredictions ?? false;

      if (!enablePrivacyPredictions) return;

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
        showHeuristicTooltip(link, analysis.prediction, analysis.displayText);
      }
    } catch (error) {
      console.warn('[Phantom Trail] Link heuristic failed:', error);
    }
  }, HOVER_DELAY);
}

export function handleLinkLeave(): void {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
  hideTooltip();
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

function showHeuristicTooltip(
  link: HTMLAnchorElement,
  prediction: PrivacyPrediction,
  displayText: string
): void {
  hideTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'phantom-trail-tooltip';
  tooltip.setAttribute('role', 'note');

  const icon = prediction.isHistorical ? '◷' : '~';
  const title = prediction.isHistorical
    ? 'Recorded heuristic history'
    : 'Experimental link estimate';

  tooltip.innerHTML = `
    <div class="phantom-trail-tooltip-content">
      <div class="phantom-trail-tooltip-header">
        <span class="phantom-trail-tooltip-icon">${icon}</span>
        <span class="phantom-trail-tooltip-title">${title}</span>
      </div>
      <div class="phantom-trail-tooltip-body">
        <div class="phantom-trail-tooltip-score">
          Heuristic signal score: <span class="phantom-trail-score-${prediction.predictedGrade.toLowerCase()}">${prediction.predictedScore}/100</span>
        </div>
        <div class="phantom-trail-tooltip-text">${displayText}</div>
        <div class="phantom-trail-tooltip-text">Not a destination audit, safety verdict, or privacy guarantee.</div>
      </div>
    </div>
  `;

  const rect = link.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
  tooltip.style.zIndex = '10000';

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;
}

function hideTooltip(): void {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}
