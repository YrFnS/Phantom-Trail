/* eslint-disable */
// Canvas fingerprinting detector - injected into main world
(function() {
  console.log('[Phantom Trail] Canvas detector loaded');

  const canvasOperations = [];
  const storageOperations = [];
  const mouseEventCount = { count: 0, startTime: Date.now() };
  const monitoredFields = new Set();
  let formMonitoringTimeout = null;

  function reportDetection(data) {
    window.dispatchEvent(new CustomEvent('phantom-trail-detection', {
      detail: data
    }));
  }

  function interceptCanvas() {
    const CanvasProto = HTMLCanvasElement.prototype;
    const originalGetContext = CanvasProto.getContext;

    CanvasProto.getContext = function(...args) {
      canvasOperations.push(`getContext(${args[0]})`);
      const context = originalGetContext.apply(this, args);

      if (context && args[0] === '2d') {
        const canvasElement = this;

        const originalToDataURL = canvasElement.toDataURL.bind(canvasElement);
        canvasElement.toDataURL = function(...dataArgs) {
          canvasOperations.push('toDataURL');
          checkCanvasFingerprinting();
          return originalToDataURL(...dataArgs);
        };

        const originalGetImageData = context.getImageData.bind(context);
        context.getImageData = function(...imageArgs) {
          canvasOperations.push('getImageData');
          checkCanvasFingerprinting();
          return originalGetImageData(...imageArgs);
        };

        const originalFillText = context.fillText.bind(context);
        context.fillText = function(...textArgs) {
          canvasOperations.push('fillText');
          return originalFillText(...textArgs);
        };

        const originalMeasureText = context.measureText.bind(context);
        context.measureText = function(...measureArgs) {
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
        timestamp: Date.now()
      });
      canvasOperations.length = 0;
    }
  }

  function interceptStorage() {
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = window[storageType];
      const originalSetItem = storage.setItem;
      const originalGetItem = storage.getItem;
      const originalRemoveItem = storage.removeItem;

      storage.setItem = function(key, value) {
        storageOperations.push({
          type: `${storageType}.setItem`,
          key,
          timestamp: Date.now()
        });
        checkStorageAccess();
        return originalSetItem.call(this, key, value);
      };

      storage.getItem = function(key) {
        storageOperations.push({
          type: `${storageType}.getItem`,
          key,
          timestamp: Date.now()
        });
        checkStorageAccess();
        return originalGetItem.call(this, key);
      };

      storage.removeItem = function(key) {
        storageOperations.push({
          type: `${storageType}.removeItem`,
          key,
          timestamp: Date.now()
        });
        checkStorageAccess();
        return originalRemoveItem.call(this, key);
      };
    });
  }

  function checkStorageAccess() {
    const recentOps = storageOperations.filter(
      op => Date.now() - op.timestamp < 60000
    );

    if (recentOps.length >= 10) {
      reportDetection({
        type: 'storage-access',
        operations: recentOps,
        timestamp: Date.now()
      });
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
                timestamp: Date.now()
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
      (event) => {
        const target = event.target;
        
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          monitoredFields.add(target);

          if (formMonitoringTimeout) {
            clearTimeout(formMonitoringTimeout);
          }

          formMonitoringTimeout = setTimeout(() => {
            if (monitoredFields.size > 0) {
              const fields = Array.from(monitoredFields).map(field => ({
                type: field.type || 'text',
                name: field.name || field.id || 'unnamed',
                monitored: true
              }));

              reportDetection({
                type: 'form-monitoring',
                fields,
                timestamp: Date.now()
              });

              monitoredFields.clear();
            }
            formMonitoringTimeout = null;
          }, 1000);
        }
      },
      { passive: true }
    );
  }

  try {
    interceptCanvas();
    interceptStorage();
    monitorMouseTracking();
    monitorFormFields();
  } catch (error) {
    console.error('[Phantom Trail] Failed to initialize canvas detector:', error);
  }
})();
