// youtube.js
(function () {
  const COPY_CONFIG = { PART_SIZE: 15000 };
  let subtitlesState = [];

  function sendMessage(message) {
    chrome.runtime.sendMessage(message);
  }

  function processSegments(segments, withTimestamp, onComplete) {
    const subtitles = Array.from(segments).map(segment => {
      const textEl = segment.querySelector(".segment-text");
      if (!textEl) return null;
      const text = textEl.textContent.trim();
      if (!text) return null;

      if (withTimestamp) {
        const timeEl = segment.querySelector(".segment-timestamp");
        if (!timeEl) return null;
        const time = timeEl.textContent.trim();
        return `${time} ${text}`;
      } else {
        return text;
      }
    }).filter(Boolean);

    sendMessage({ type: 'subtitlesReady', subtitles: subtitles.join("\n") });
    onComplete && onComplete(subtitles);
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

      // 문서 변화를 전체 DOM에서 감시
      observer.observe(document.documentElement, { childList: true, subtree: true });

      // 초기에도 한 번 체크
      if (conditionFn()) {
        observer.disconnect();
        resolve();
      } else {
        // 타임아웃: 지정 시간 후에 무조건 reject
        setTimeout(() => {
          observer.disconnect();
          reject(new Error("Timeout: Element not found"));
        }, timeout);
      }
    });
  }

  function extractTranscript({ withTimestamp = false, onComplete }) {
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

      // 패널 존재 조건
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
          // 패널 뜬 뒤 세그먼트 존재 조건
          const segmentsCondition = () => document.querySelectorAll("ytd-transcript-segment-renderer").length > 0;

          return waitForElement(segmentsCondition, 10000);
        })
        .then(() => {
          const segments = document.querySelectorAll("ytd-transcript-segment-renderer");
          processSegments(segments, withTimestamp, onComplete);
        })
        .catch(() => {
          // 패널 또는 세그먼트 못 찾으면 빈 문자열
          sendMessage({ type: 'subtitlesReady', subtitles: "" });
        });
    }
  }

  function handleCopyRequest(partIndex) {
    if (!subtitlesState.length) return;
    const fullText = subtitlesState.join("\n");
    const start = partIndex * COPY_CONFIG.PART_SIZE;
    const end = (partIndex + 1) * COPY_CONFIG.PART_SIZE;
    const partText = fullText.substring(start, end);
    navigator.clipboard.writeText(partText).catch(err => console.error("Copy failed:", err));
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "copyPartText") {
      handleCopyRequest(message.partIndex);
    }
  });

  extractTranscript({
    withTimestamp: true,
    onComplete: (subtitles) => {
      subtitlesState = subtitles;
    }
  });
})();
