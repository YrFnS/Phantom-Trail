/* eslint-disable */
// Canvas fingerprinting detector - injected into main world
(function () {
  console.log('[Phantom Trail] Canvas detector loaded');

  const canvasOperations = [];
  const mouseEventCount = { count: 0, startTime: Date.now() };
  let monitoredFields = new Set();
  let formMonitoringTimeout = null;
  const deviceAPICalls = [];

  function reportDetection(data) {
    window.dispatchEvent(
      new CustomEvent('phantom-trail-detection', {
        detail: data,
      })
    );
  }

  function interceptCanvas() {
    const CanvasProto = HTMLCanvasElement.prototype;
    const originalGetContext = CanvasProto.getContext;

    CanvasProto.getContext = function (...args) {
      canvasOperations.push(`getContext(${args[0]})`);
      const context = originalGetContext.apply(this, args);

      if (context && args[0] === '2d') {
        const canvasElement = this;

        const originalToDataURL = canvasElement.toDataURL.bind(canvasElement);
        canvasElement.toDataURL = function (...dataArgs) {
          canvasOperations.push('toDataURL');
          checkCanvasFingerprinting();
          return originalToDataURL(...dataArgs);
        };

        const originalGetImageData = context.getImageData.bind(context);
        context.getImageData = function (...imageArgs) {
          canvasOperations.push('getImageData');
          checkCanvasFingerprinting();
          return originalGetImageData(...imageArgs);
        };

        const originalFillText = context.fillText.bind(context);
        context.fillText = function (...textArgs) {
          canvasOperations.push('fillText');
          return originalFillText(...textArgs);
        };

        const originalMeasureText = context.measureText.bind(context);
        context.measureText = function (...measureArgs) {
          canvasOperations.push('measureText');
          return originalMeasureText(...measureArgs);
        };
      }

      return context;
    };
  }

  function checkCanvasFingerprinting() {
    if (canvasOperations.length >= 3) {
      reportDetection({
        type: 'canvas-fingerprint',
        operations: [...canvasOperations],
        timestamp: Date.now(),
      });
      canvasOperations.length = 0;
    }
  }

  function interceptStorage() {
    // Storage access detection with sliding window
    const storageAccessWindow = {
      events: [],
      windowSize: 60000, // 1 minute window
      lastReport: 0,
      reportCooldown: 30000, // Report at most every 30 seconds

      add(operation, key) {
        const now = Date.now();
        // Remove events outside window
        this.events = this.events.filter(
          e => now - e.timestamp < this.windowSize
        );
        // Add new event
        this.events.push({ operation, key, timestamp: now });
      },

      getUniqueCount() {
        const unique = new Set(this.events.map(e => `${e.operation}:${e.key}`));
        return unique.size;
      },

      shouldReport() {
        const now = Date.now();
        const uniqueOps = this.getUniqueCount();
        const timeSinceLastReport = now - this.lastReport;

        // Report if: 10+ unique operations AND cooldown passed
        return uniqueOps >= 10 && timeSinceLastReport >= this.reportCooldown;
      },

      markReported() {
        this.lastReport = Date.now();
      },
    };

    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = window[storageType];
      const originalSetItem = storage.setItem;
      const originalGetItem = storage.getItem;
      const originalRemoveItem = storage.removeItem;

      storage.setItem = function (key, value) {
        storageAccessWindow.add(`${storageType}.setItem`, key);
        checkStorageAccess();
        return originalSetItem.call(this, key, value);
      };

      storage.getItem = function (key) {
        storageAccessWindow.add(`${storageType}.getItem`, key);
        checkStorageAccess();
        return originalGetItem.call(this, key);
      };

      storage.removeItem = function (key) {
        storageAccessWindow.add(`${storageType}.removeItem`, key);
        checkStorageAccess();
        return originalRemoveItem.call(this, key);
      };
    });

    function checkStorageAccess() {
      if (storageAccessWindow.shouldReport()) {
        const uniqueOps = storageAccessWindow.getUniqueCount();
        const frequency = uniqueOps / (storageAccessWindow.windowSize / 60000);

        reportDetection({
          type: 'storage-access',
          operations: storageAccessWindow.events.slice(-20), // Last 20 only
          uniqueOperations: uniqueOps,
          frequency: Math.round(frequency),
          timestamp: Date.now(),
        });

        storageAccessWindow.markReported();
      }
    }
  }

  function monitorMouseTracking() {
    let throttleTimeout = null;

    document.addEventListener(
      'mousemove',
      () => {
        mouseEventCount.count++;

        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            const duration = Date.now() - mouseEventCount.startTime;
            const eventsPerSecond = (mouseEventCount.count / duration) * 1000;

            if (eventsPerSecond >= 50) {
              reportDetection({
                type: 'mouse-tracking',
                eventCount: mouseEventCount.count,
                duration,
                eventsPerSecond: Math.round(eventsPerSecond),
                timestamp: Date.now(),
              });
            }

            mouseEventCount.count = 0;
            mouseEventCount.startTime = Date.now();
            throttleTimeout = null;
          }, 2000);
        }
      },
      { passive: true }
    );
  }

  function monitorFormFields() {
    document.addEventListener(
      'input',
      event => {
        const target = event.target;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          monitoredFields.add(target);

          if (formMonitoringTimeout) {
            clearTimeout(formMonitoringTimeout);
          }

          formMonitoringTimeout = setTimeout(() => {
            if (monitoredFields.size > 0) {
              const fieldsToReport = monitoredFields;
              monitoredFields = new Set();

              const fields = Array.from(fieldsToReport).map(field => ({
                type: field.type || 'text',
                name: field.name || field.id || 'unnamed',
                monitored: true,
              }));

              reportDetection({
                type: 'form-monitoring',
                fields,
                timestamp: Date.now(),
              });
            }
            formMonitoringTimeout = null;
          }, 1000);
        }
      },
      { passive: true }
    );
  }

  function monitorDeviceAPIs() {
    const navigatorAPIs = [
      { obj: navigator, prop: 'getBattery', name: 'navigator.getBattery' },
      {
        obj: navigator.geolocation,
        prop: 'getCurrentPosition',
        name: 'navigator.geolocation.getCurrentPosition',
      },
      {
        obj: navigator.geolocation,
        prop: 'watchPosition',
        name: 'navigator.geolocation.watchPosition',
      },
    ];

    navigatorAPIs.forEach(({ obj, prop, name }) => {
      if (obj && prop in obj) {
        const original = obj[prop];
        if (typeof original === 'function') {
          obj[prop] = function (...args) {
            deviceAPICalls.push(name);
            checkDeviceAPIs();
            return original.apply(this, args);
          };
        }
      }
    });

    if (navigator.clipboard) {
      const originalReadText = navigator.clipboard.readText;
      const originalRead = navigator.clipboard.read;

      if (originalReadText) {
        navigator.clipboard.readText = function () {
          deviceAPICalls.push('navigator.clipboard.readText');
          checkDeviceAPIs();
          return originalReadText.apply(this);
        };
      }

      if (originalRead) {
        navigator.clipboard.read = function () {
          deviceAPICalls.push('navigator.clipboard.read');
          checkDeviceAPIs();
          return originalRead.apply(this);
        };
      }
    }

    const screenProps = [
      'width',
      'height',
      'colorDepth',
      'pixelDepth',
      'availWidth',
      'availHeight',
    ];
    const screenValues = {};

    screenProps.forEach(prop => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(screen, prop);
        if (descriptor && descriptor.get) {
          screenValues[prop] = descriptor.get.call(screen);

          Object.defineProperty(screen, prop, {
            get() {
              deviceAPICalls.push(`screen.${prop}`);
              checkDeviceAPIs();
              return screenValues[prop];
            },
            configurable: true,
          });
        }
      } catch (e) {
        console.warn(`Failed to monitor screen.${prop}:`, e);
      }
    });

    const navigatorProps = [
      'hardwareConcurrency',
      'deviceMemory',
      'platform',
      'userAgent',
    ];
    const navigatorValues = {};

    navigatorProps.forEach(prop => {
      try {
        if (prop in navigator) {
          navigatorValues[prop] = navigator[prop];

          Object.defineProperty(navigator, prop, {
            get() {
              deviceAPICalls.push(`navigator.${prop}`);
              checkDeviceAPIs();
              return navigatorValues[prop];
            },
            configurable: true,
          });
        }
      } catch (e) {
        console.warn(`Failed to monitor navigator.${prop}:`, e);
      }
    });
  }

  function checkDeviceAPIs() {
    if (deviceAPICalls.length >= 3) {
      reportDetection({
        type: 'device-api',
        apiCalls: [...deviceAPICalls],
        timestamp: Date.now(),
      });
      deviceAPICalls.length = 0;
    }
  }

  // WebRTC IP leak detection (CRITICAL)
  function monitorWebRTC() {
    const originalRTCPeerConnection =
      window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (!originalRTCPeerConnection) return;

    window.RTCPeerConnection = function (...args) {
      const pc = new originalRTCPeerConnection(...args);

      reportDetection({
        type: 'webrtc-leak',
        description: 'WebRTC connection detected - may expose real IP address',
        timestamp: Date.now(),
      });

      return pc;
    };
  }

  // Font fingerprinting detection
  function monitorFontFingerprint() {
    const fontChecks = [];
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth'
    );
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetHeight'
    );

    if (originalOffsetWidth && originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get() {
          const value = originalOffsetWidth.get.call(this);
          if (this.style && this.style.fontFamily) {
            fontChecks.push(this.style.fontFamily);
            if (fontChecks.length >= 20) {
              reportDetection({
                type: 'font-fingerprint',
                fonts: [...new Set(fontChecks)].slice(0, 10),
                count: fontChecks.length,
                timestamp: Date.now(),
              });
              fontChecks.length = 0;
            }
          }
          return value;
        },
      });
    }
  }

  // Audio fingerprinting detection
  function monitorAudioFingerprint() {
    const originalAudioContext =
      window.AudioContext || window.webkitAudioContext;
    if (!originalAudioContext) return;

    const audioOps = [];
    window.AudioContext = function (...args) {
      const ctx = new originalAudioContext(...args);

      const originalCreateOscillator = ctx.createOscillator.bind(ctx);
      ctx.createOscillator = function () {
        audioOps.push('createOscillator');
        if (audioOps.length >= 2) {
          reportDetection({
            type: 'audio-fingerprint',
            operations: [...audioOps],
            timestamp: Date.now(),
          });
          audioOps.length = 0;
        }
        return originalCreateOscillator();
      };

      return ctx;
    };
  }

  // WebGL fingerprinting detection
  function monitorWebGLFingerprint() {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const ctx = originalGetContext.call(this, type, ...args);

      if (ctx && (type === 'webgl' || type === 'webgl2')) {
        const originalGetParameter = ctx.getParameter.bind(ctx);
        const glCalls = [];

        ctx.getParameter = function (param) {
          glCalls.push(param);
          if (glCalls.length >= 5) {
            reportDetection({
              type: 'webgl-fingerprint',
              parameters: glCalls.slice(0, 10),
              timestamp: Date.now(),
            });
            glCalls.length = 0;
          }
          return originalGetParameter(param);
        };
      }

      return ctx;
    };
  }

  // Battery API monitoring
  function monitorBatteryAPI() {
    if (navigator.getBattery) {
      const originalGetBattery = navigator.getBattery.bind(navigator);
      navigator.getBattery = function () {
        reportDetection({
          type: 'battery-api',
          timestamp: Date.now(),
        });
        return originalGetBattery();
      };
    }
  }

  // Sensor APIs monitoring
  function monitorSensorAPIs() {
    const sensorEvents = [
      'devicemotion',
      'deviceorientation',
      'deviceorientationabsolute',
    ];
    sensorEvents.forEach(eventType => {
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = function (type, listener, options) {
        if (sensorEvents.includes(type)) {
          reportDetection({
            type: 'sensor-api',
            sensor: type,
            timestamp: Date.now(),
          });
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });
  }

  try {
    interceptCanvas();
    interceptStorage();
    monitorMouseTracking();
    monitorFormFields();
    monitorDeviceAPIs();
    monitorWebRTC();
    monitorFontFingerprint();
    monitorAudioFingerprint();
    monitorWebGLFingerprint();
    monitorBatteryAPI();
    monitorSensorAPIs();
  } catch (error) {
    console.error('[Phantom Trail] Failed to initialize detectors:', error);
  }
})();
