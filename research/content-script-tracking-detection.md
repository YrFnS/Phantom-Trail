# Chrome Extension Content Script Best Practices for In-Page Tracking Detection

## Overview

This document outlines advanced techniques for detecting various forms of in-page tracking using Chrome extension content scripts. While Phantom Trail currently detects network-based tracking through web requests, implementing content script detection will provide comprehensive coverage of client-side tracking techniques.

## 1. Canvas Fingerprinting Detection

Canvas fingerprinting creates unique browser signatures by rendering text/graphics and extracting pixel data.

### Detection Methods

#### Method 1: Canvas API Monitoring

```javascript
// Intercept canvas context creation and drawing operations
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

let canvasOperations = [];

HTMLCanvasElement.prototype.getContext = function (contextType, ...args) {
  const context = originalGetContext.call(this, contextType, ...args);

  if (contextType === '2d' || contextType === 'webgl') {
    // Track canvas creation
    canvasOperations.push({
      type: 'context_created',
      contextType,
      timestamp: Date.now(),
      canvas: this,
    });
  }

  return context;
};

HTMLCanvasElement.prototype.toDataURL = function (...args) {
  // Detect data extraction attempts
  canvasOperations.push({
    type: 'data_extraction',
    method: 'toDataURL',
    timestamp: Date.now(),
    canvas: this,
  });

  return originalToDataURL.apply(this, args);
};

CanvasRenderingContext2D.prototype.getImageData = function (...args) {
  canvasOperations.push({
    type: 'data_extraction',
    method: 'getImageData',
    timestamp: Date.now(),
  });

  return originalGetImageData.apply(this, args);
};
```

#### Method 2: Canvas Fingerprinting Pattern Detection

```javascript
function detectCanvasFingerprinting() {
  const suspiciousPatterns = {
    textRendering: false,
    dataExtraction: false,
    hiddenCanvas: false,
    rapidOperations: false,
  };

  // Monitor for text rendering + data extraction pattern
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'CANVAS') {
          const canvas = node;
          if (
            canvas.style.display === 'none' ||
            canvas.style.visibility === 'hidden' ||
            canvas.width === 0 ||
            canvas.height === 0
          ) {
            suspiciousPatterns.hiddenCanvas = true;
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Analyze canvas operations for fingerprinting patterns
  setInterval(() => {
    if (canvasOperations.length > 0) {
      const recentOps = canvasOperations.filter(
        op => Date.now() - op.timestamp < 5000
      );

      if (
        recentOps.some(op => op.type === 'data_extraction') &&
        recentOps.length > 3
      ) {
        reportCanvasFingerprinting('high', recentOps);
      }
    }
  }, 1000);
}
```

### Official Documentation

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Content Scripts - Chrome Extensions](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

## 2. LocalStorage/Cookie Monitoring Patterns

### Detection Methods

#### Method 1: Storage API Interception

```javascript
// Monitor localStorage operations
const originalSetItem = Storage.prototype.setItem;
const originalGetItem = Storage.prototype.getItem;
const originalRemoveItem = Storage.prototype.removeItem;

let storageOperations = [];

Storage.prototype.setItem = function (key, value) {
  storageOperations.push({
    type: 'localStorage_set',
    key,
    value: value.substring(0, 100), // Truncate for privacy
    timestamp: Date.now(),
    origin: window.location.origin,
  });

  return originalSetItem.call(this, key, value);
};

Storage.prototype.getItem = function (key) {
  storageOperations.push({
    type: 'localStorage_get',
    key,
    timestamp: Date.now(),
    origin: window.location.origin,
  });

  return originalGetItem.call(this, key);
};

// Monitor cookie operations
const originalCookieDescriptor = Object.getOwnPropertyDescriptor(
  Document.prototype,
  'cookie'
);
const originalCookieGetter = originalCookieDescriptor.get;
const originalCookieSetter = originalCookieDescriptor.set;

Object.defineProperty(document, 'cookie', {
  get: function () {
    storageOperations.push({
      type: 'cookie_read',
      timestamp: Date.now(),
      origin: window.location.origin,
    });
    return originalCookieGetter.call(this);
  },
  set: function (value) {
    storageOperations.push({
      type: 'cookie_set',
      value: value.substring(0, 100),
      timestamp: Date.now(),
      origin: window.location.origin,
    });
    return originalCookieSetter.call(this, value);
  },
});
```

#### Method 2: Cross-Domain Storage Detection

```javascript
function detectCrossDomainTracking() {
  // Monitor iframe creation for cross-domain storage
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'IFRAME') {
          const iframe = node;
          const src = iframe.src;

          if (src && new URL(src).origin !== window.location.origin) {
            reportCrossDomainStorage('medium', {
              iframeSrc: src,
              parentOrigin: window.location.origin,
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
```

### Official Documentation

- [Web Storage API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Document.cookie - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie)

## 3. Mouse/Scroll Tracking Detection

### Detection Methods

#### Method 1: Event Listener Monitoring

```javascript
const originalAddEventListener = EventTarget.prototype.addEventListener;
let trackingListeners = [];

EventTarget.prototype.addEventListener = function (type, listener, options) {
  // Monitor for tracking-related event listeners
  const trackingEvents = [
    'mousemove',
    'mousedown',
    'mouseup',
    'click',
    'scroll',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
    'keydown',
    'keyup',
    'focus',
    'blur',
  ];

  if (trackingEvents.includes(type)) {
    trackingListeners.push({
      eventType: type,
      target: this.tagName || this.constructor.name,
      timestamp: Date.now(),
      listenerCode: listener.toString().substring(0, 200),
    });

    // Detect suspicious patterns
    if (type === 'mousemove' && this === document) {
      reportMouseTracking('high', 'Global mousemove listener detected');
    }
  }

  return originalAddEventListener.call(this, type, listener, options);
};
```

#### Method 2: Behavioral Analysis

```javascript
function detectBehavioralTracking() {
  let mouseEvents = 0;
  let scrollEvents = 0;
  let keyEvents = 0;

  const eventCounter = eventType => () => {
    switch (eventType) {
      case 'mouse':
        mouseEvents++;
        break;
      case 'scroll':
        scrollEvents++;
        break;
      case 'key':
        keyEvents++;
        break;
    }
  };

  // Add passive listeners to count events
  document.addEventListener('mousemove', eventCounter('mouse'), {
    passive: true,
  });
  document.addEventListener('scroll', eventCounter('scroll'), {
    passive: true,
  });
  document.addEventListener('keydown', eventCounter('key'), { passive: true });

  // Analyze patterns every 10 seconds
  setInterval(() => {
    const totalEvents = mouseEvents + scrollEvents + keyEvents;

    if (totalEvents > 100) {
      // High event frequency
      const listeners = trackingListeners.filter(
        l => Date.now() - l.timestamp < 10000
      );

      if (listeners.length > 5) {
        reportBehavioralTracking('high', {
          eventCounts: { mouseEvents, scrollEvents, keyEvents },
          listenerCount: listeners.length,
        });
      }
    }

    // Reset counters
    mouseEvents = scrollEvents = keyEvents = 0;
  }, 10000);
}
```

### Official Documentation

- [EventTarget.addEventListener() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [Mouse events - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)

## 4. Form Field Monitoring Approaches

### Detection Methods

#### Method 1: Input Event Monitoring

```javascript
function detectFormTracking() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  let formTrackingEvents = [];

  // Monitor form-related event listeners
  const formEvents = ['input', 'change', 'focus', 'blur', 'keyup', 'keydown'];

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (
      formEvents.includes(type) &&
      (this.tagName === 'INPUT' ||
        this.tagName === 'TEXTAREA' ||
        this.tagName === 'SELECT')
    ) {
      formTrackingEvents.push({
        eventType: type,
        inputType: this.type || 'unknown',
        inputName: this.name || 'unnamed',
        timestamp: Date.now(),
        isPasswordField: this.type === 'password',
      });

      // Alert on password field monitoring
      if (this.type === 'password') {
        reportFormTracking('critical', 'Password field monitoring detected');
      }
    }

    return originalAddEventListener.call(this, type, listener, options);
  };
}
```

#### Method 2: Form Submission Interception

```javascript
function monitorFormSubmissions() {
  const originalSubmit = HTMLFormElement.prototype.submit;

  HTMLFormElement.prototype.submit = function () {
    const formData = new FormData(this);
    const fields = [];

    for (let [key, value] of formData.entries()) {
      fields.push({
        name: key,
        hasValue: !!value,
        valueLength: value.toString().length,
      });
    }

    reportFormSubmission('medium', {
      action: this.action,
      method: this.method,
      fieldCount: fields.length,
      fields: fields,
    });

    return originalSubmit.call(this);
  };

  // Monitor form submission via event listeners
  document.addEventListener(
    'submit',
    event => {
      const form = event.target;
      if (form.tagName === 'FORM') {
        // Additional form submission tracking
      }
    },
    true
  );
}
```

### Official Documentation

- [HTMLFormElement - MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement)
- [FormData - MDN](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

## 5. Clipboard and Device API Monitoring

### Detection Methods

#### Method 1: Clipboard API Monitoring

```javascript
function detectClipboardAccess() {
  const originalReadText = navigator.clipboard.readText;
  const originalWriteText = navigator.clipboard.writeText;
  const originalRead = navigator.clipboard.read;
  const originalWrite = navigator.clipboard.write;

  navigator.clipboard.readText = async function () {
    reportClipboardAccess('high', 'Clipboard read attempt detected');
    return originalReadText.call(this);
  };

  navigator.clipboard.writeText = async function (text) {
    reportClipboardAccess('medium', 'Clipboard write attempt detected');
    return originalWriteText.call(this, text);
  };

  navigator.clipboard.read = async function () {
    reportClipboardAccess('high', 'Clipboard read (advanced) attempt detected');
    return originalRead.call(this);
  };

  navigator.clipboard.write = async function (data) {
    reportClipboardAccess(
      'medium',
      'Clipboard write (advanced) attempt detected'
    );
    return originalWrite.call(this, data);
  };
}
```

#### Method 2: Device API Monitoring

```javascript
function detectDeviceAPIAccess() {
  // Monitor geolocation access
  const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
  const originalWatchPosition = navigator.geolocation.watchPosition;

  navigator.geolocation.getCurrentPosition = function (
    success,
    error,
    options
  ) {
    reportDeviceAPI('high', 'Geolocation access requested');
    return originalGetCurrentPosition.call(this, success, error, options);
  };

  navigator.geolocation.watchPosition = function (success, error, options) {
    reportDeviceAPI('critical', 'Continuous geolocation tracking requested');
    return originalWatchPosition.call(this, success, error, options);
  };

  // Monitor camera/microphone access
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia;

  navigator.mediaDevices.getUserMedia = async function (constraints) {
    const accessType = [];
    if (constraints.video) accessType.push('camera');
    if (constraints.audio) accessType.push('microphone');

    reportDeviceAPI(
      'critical',
      `Media access requested: ${accessType.join(', ')}`
    );
    return originalGetUserMedia.call(this, constraints);
  };

  // Monitor device orientation/motion
  const originalAddEventListener = window.addEventListener;

  window.addEventListener = function (type, listener, options) {
    if (type === 'deviceorientation' || type === 'devicemotion') {
      reportDeviceAPI('medium', `Device ${type} access requested`);
    }

    return originalAddEventListener.call(this, type, listener, options);
  };
}
```

#### Method 3: Battery API and Hardware Fingerprinting

```javascript
function detectHardwareFingerprinting() {
  // Monitor battery API access (deprecated but still used)
  if ('getBattery' in navigator) {
    const originalGetBattery = navigator.getBattery;
    navigator.getBattery = async function () {
      reportDeviceAPI('medium', 'Battery API access for fingerprinting');
      return originalGetBattery.call(this);
    };
  }

  // Monitor WebGL context for hardware fingerprinting
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (contextType, ...args) {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      reportDeviceAPI(
        'medium',
        'WebGL context created (potential hardware fingerprinting)'
      );
    }

    return originalGetContext.call(this, contextType, ...args);
  };

  // Monitor screen properties access
  const screenProperties = ['width', 'height', 'colorDepth', 'pixelDepth'];
  screenProperties.forEach(prop => {
    let accessed = false;
    Object.defineProperty(screen, prop, {
      get: function () {
        if (!accessed) {
          accessed = true;
          reportDeviceAPI('low', `Screen ${prop} accessed for fingerprinting`);
        }
        return Screen.prototype[prop];
      },
    });
  });
}
```

### Official Documentation

- [Clipboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MediaDevices.getUserMedia() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## Implementation Strategy for Phantom Trail

### 1. Content Script Architecture

```javascript
// content-script-detector.ts
class InPageTrackingDetector {
  private detectionModules: DetectionModule[] = [];

  constructor() {
    this.initializeDetection();
  }

  private initializeDetection() {
    this.detectionModules = [
      new CanvasFingerprintingDetector(),
      new StorageTrackingDetector(),
      new BehavioralTrackingDetector(),
      new FormTrackingDetector(),
      new DeviceAPIDetector()
    ];

    this.detectionModules.forEach(module => module.start());
  }

  private reportTrackingEvent(event: InPageTrackingEvent) {
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'in_page_tracking_detected',
      event
    });
  }
}
```

### 2. Integration with Existing System

```javascript
// Update background.ts to handle in-page events
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'in_page_tracking_detected') {
    const event: TrackingEvent = {
      id: `in-page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      url: sender.tab?.url || 'unknown',
      domain: new URL(sender.tab?.url || '').hostname,
      trackerType: mapInPageEventToTrackerType(message.event),
      riskLevel: message.event.riskLevel,
      description: message.event.description
    };

    StorageManager.addEvent(event);
    triggerAIAnalysisIfNeeded(event);
  }
});
```

### 3. Performance Considerations

- Use passive event listeners where possible
- Implement throttling for high-frequency events
- Use `requestIdleCallback` for non-critical analysis
- Minimize memory usage by cleaning up old event data

### 4. Privacy Considerations

- Never log actual form values or clipboard content
- Truncate or hash sensitive data
- Respect user privacy settings
- Provide opt-out mechanisms

## Testing and Validation

### Test Sites for Validation

1. **Canvas Fingerprinting**: [BrowserLeaks Canvas Test](https://browserleaks.com/canvas)
2. **Device Fingerprinting**: [AmIUnique](https://amiunique.org/)
3. **Behavioral Tracking**: Major e-commerce sites
4. **Form Tracking**: Social media login pages

### Performance Benchmarks

- Memory usage should not exceed 50MB
- CPU overhead should be <5% during normal browsing
- Detection latency should be <100ms

## Official Chrome Extension Documentation Links

- [Content Scripts Overview](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)

## Conclusion

Implementing comprehensive in-page tracking detection requires careful balance between detection accuracy, performance, and privacy. The techniques outlined above provide a foundation for detecting the most common forms of client-side tracking while maintaining good user experience.

The modular approach allows for incremental implementation and testing, starting with the highest-impact detection methods (canvas fingerprinting, device API access) and expanding to more comprehensive behavioral analysis.
