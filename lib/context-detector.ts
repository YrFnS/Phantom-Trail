/**
 * Security Context Detector
 * 
 * Detects legitimate security contexts where fingerprinting
 * might be used for fraud prevention or authentication.
 */

import type { SecurityContext } from './types';

export interface PageInfo {
  hasPasswordField?: boolean;
  hasAuthKeywords?: boolean;
  title?: string;
}

export class SecurityContextDetector {
  /**
   * Detect security context for a given URL and page info
   */
  static detectContext(url: string, pageInfo?: PageInfo): SecurityContext {
    const isLoginPage = this.isLoginPage(url);
    const isBankingPage = this.isBankingDomain(url);
    const isPaymentPage = this.isPaymentPage(url);
    const hasPasswordField = pageInfo?.hasPasswordField || false;
    const hasAuthKeywords = pageInfo?.hasAuthKeywords || false;

    // Calculate confidence level
    let confidenceScore = 0;
    if (isLoginPage) confidenceScore += 2;
    if (isBankingPage) confidenceScore += 2;
    if (isPaymentPage) confidenceScore += 2;
    if (hasPasswordField) confidenceScore += 1;
    if (hasAuthKeywords) confidenceScore += 1;

    const confidence: 'low' | 'medium' | 'high' =
      confidenceScore >= 4 ? 'high' :
      confidenceScore >= 2 ? 'medium' : 'low';

    return {
      isLoginPage,
      isBankingPage,
      isPaymentPage,
      hasPasswordField,
      hasAuthKeywords,
      confidence,
    };
  }

  /**
   * Check if URL indicates a login page
   */
  static isLoginPage(url: string): boolean {
    const loginPatterns = [
      /\/login/i,
      /\/signin/i,
      /\/sign-in/i,
      /\/auth/i,
      /\/authenticate/i,
      /\/sso/i,
      /\/oauth/i,
      /\/account\/login/i,
      /\/user\/login/i,
      /\/session\/new/i,
    ];

    return loginPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if domain is a banking/financial institution
   */
  static isBankingDomain(domain: string): boolean {
    const bankingKeywords = [
      'bank',
      'credit',
      'financial',
      'fidelity',
      'schwab',
      'vanguard',
      'wellsfargo',
      'chase',
      'citibank',
      'usbank',
      'capitalone',
      'discover',
      'americanexpress',
      'amex',
    ];

    const lowerDomain = domain.toLowerCase();
    return bankingKeywords.some(keyword => lowerDomain.includes(keyword));
  }

  /**
   * Check if URL indicates a payment page
   */
  static isPaymentPage(url: string): boolean {
    const paymentPatterns = [
      /\/checkout/i,
      /\/payment/i,
      /\/pay/i,
      /\/billing/i,
      /\/cart/i,
      /\/order/i,
      /stripe\.com/i,
      /paypal\.com/i,
      /square\.com/i,
      /braintree/i,
    ];

    return paymentPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if page has authentication indicators
   */
  static hasAuthenticationIndicators(pageInfo?: PageInfo): boolean {
    if (!pageInfo) return false;
    return pageInfo.hasPasswordField || pageInfo.hasAuthKeywords || false;
  }
}
