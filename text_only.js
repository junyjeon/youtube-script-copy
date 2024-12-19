// text_only.js
(function () {
  function sendMessage(message) {
    chrome.runtime.sendMessage(message);
  }

  function processSegments(segments) {
    const subtitles = Array.from(segments)
      .map(segment => {
        const textEl = segment.querySelector(".segment-text");
        if (!textEl) return null;
        const text = textEl.textContent.trim();
        return text || null;
      })
      .filter(Boolean);

    // 공백으로 자막 연결
    sendMessage({ type: 'subtitlesReady', subtitles: subtitles.join(" ") });
  }

  function waitForElement(conditionFn, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const observer = new MutationObserver(() => {
        if (conditionFn()) {
          observer.disconnect();
          resolve();
        } else if (Date.now() - start >= timeout) {
          observer.disconnect();
          reject(new Error("Timeout: Element not found"));
        }
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });

      // 초기 체크
      if (conditionFn()) {
        observer.disconnect();
        resolve();
      } else {
        setTimeout(() => {
          observer.disconnect();
          reject(new Error("Timeout: Element not found"));
        }, timeout);
      }
    });
  }

  function extractTranscript() {
    // 페이지 완전 로딩 대기
    if (document.readyState !== 'complete') {
      document.addEventListener('readystatechange', function onReady() {
        if (document.readyState === 'complete') {
          document.removeEventListener('readystatechange', onReady);
          startExtract();
        }
      });
    } else {
      startExtract();
    }

    function startExtract() {
      const PRIMARY_BUTTON = document.getElementById("primary-button");
      if (!PRIMARY_BUTTON) {
        sendMessage({ type: 'subtitlesReady', subtitles: "" });
        return;
      }

      const scriptButton = PRIMARY_BUTTON.querySelector(".yt-spec-button-shape-next");
      if (!scriptButton) {
        sendMessage({ type: 'subtitlesReady', subtitles: "" });
        return;
      }

      // 자막 패널 열기
      scriptButton.click();

      const panelCondition = () => {
        const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]');
        return panel && document.evaluate(
          '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
      };

      waitForElement(panelCondition, 10000)
        .then(() => {
          // 패널 뜬 뒤 세그먼트 등장 대기
          const segmentsCondition = () => document.querySelectorAll("ytd-transcript-segment-renderer").length > 0;
          return waitForElement(segmentsCondition, 10000);
        })
        .then(() => {
          const segments = document.querySelectorAll("ytd-transcript-segment-renderer");
          processSegments(segments);
        })
        .catch(() => {
          sendMessage({ type: 'subtitlesReady', subtitles: "" });
        });
    }
  }

  extractTranscript();
})();
