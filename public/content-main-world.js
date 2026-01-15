/* eslint-disable */
// Canvas fingerprinting detector - injected into main world
(function() {
  console.log('[Phantom Trail] Canvas detector loaded');

  const canvasOperations = [];

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

  try {
    interceptCanvas();
  } catch (error) {
    console.error('[Phantom Trail] Failed to initialize canvas detector:', error);
  }
})();
