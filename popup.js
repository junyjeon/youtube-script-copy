// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyButton');
  const textOnlyBtn = document.getElementById('copyTextOnlyButton');

  copyBtn.dataset.originalText = copyBtn.textContent.trim();
  textOnlyBtn.dataset.originalText = textOnlyBtn.textContent.trim();

  copyBtn.addEventListener('click', () => handleClick(true, copyBtn));
  textOnlyBtn.addEventListener('click', () => handleClick(false, textOnlyBtn));

  async function handleClick(withTimestamp, button) {
    copyBtn.disabled = true;
    textOnlyBtn.disabled = true;
    showLoading(button);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractSubtitles,
        world: 'MAIN',
      });

      const result = results[0]?.result;

      if (result?.error) {
        throw new Error(result.error);
      }

      const segments = result?.segments;
      if (!segments || !segments.length) {
        throw new Error('No subtitles found');
      }

      const text = withTimestamp
        ? segments.map(s => `${formatTime(s.start)} ${s.text}`).join('\n')
        : segments.map(s => s.text).join(' ');

      await navigator.clipboard.writeText(text);
      showSuccess(button);
    } catch (err) {
      showError(button, err.message);
    } finally {
      copyBtn.disabled = false;
      textOnlyBtn.disabled = false;
    }
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function showLoading(button) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = null;
    button.classList.remove('success', 'error');
    button.textContent = '⌛ Loading...';
  }

  function showSuccess(button) {
    showFeedback(button, '✔ Copied!', 'success');
  }

  function showError(button, detail) {
    showFeedback(
      button,
      detail ? `❌ ${detail}` : '❌ Copy Failed',
      'error',
      3000,
    );
  }

  let feedbackTimer = null;

  function showFeedback(button, message, className, duration = 1500) {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    button.classList.remove('success', 'error');
    button.classList.add(className);
    button.textContent = message;
    feedbackTimer = setTimeout(() => {
      feedbackTimer = null;
      button.textContent = button.dataset.originalText;
      button.classList.remove(className);
    }, duration);
  }
});

// MAIN world에서 실행 — YouTube 페이지 컨텍스트
async function extractSubtitles() {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const seen = new Map(); // 중복 제거용: "start|text" → { start, text }

  const strategies = [
    {
      container: 'transcript-segment-view-model',
      ts: '.ytwTranscriptSegmentViewModelTimestamp',
      txt: 'span.yt-core-attributed-string',
    },
    {
      container: 'ytd-transcript-segment-renderer',
      ts: '.segment-timestamp',
      txt: '.segment-text',
    },
  ];

  try {
    // 1. 이미 열린 자막 패널에서 세그먼트 찾기
    let hasNodes = collectVisible();

    // 2. 패널이 닫혀있으면 열고 대기
    if (!hasNodes) {
      if (!openPanel()) {
        return { error: 'Transcript not available', segments: null };
      }
      hasNodes = await waitForDOM(10000);
    }

    if (!hasNodes) {
      return { error: 'Transcript segments not loaded', segments: null };
    }

    // 3. 가상 스크롤 대응: 스크롤하면서 보이는 세그먼트를 누적 수집
    await scrollAndCollect();

    const segments = [...seen.values()].sort((a, b) => a.start - b.start);
    if (!segments.length) {
      return { error: 'Failed to load full transcript', segments: null };
    }

    return { error: null, segments };
  } catch (err) {
    return { error: err.message, segments: null };
  }

  // --- 헬퍼 ---

  function parseTs(str) {
    if (!str) return 0;
    const cleaned = str.trim().replace(/[^\d:]/g, '');
    if (!cleaned) return 0;
    const parts = cleaned.split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  function collectVisible() {
    let found = false;
    for (const s of strategies) {
      for (const el of document.querySelectorAll(s.container)) {
        found = true;
        const text = (el.querySelector(s.txt)?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!text) continue;
        const start = parseTs(el.querySelector(s.ts)?.textContent);
        const key = `${start}|${text}`;
        if (!seen.has(key)) seen.set(key, { start, text });
      }
    }
    return found;
  }

  function openPanel() {
    // 좁은 범위 → 넓은 범위 순서로 시도
    const selectors = [
      'ytd-video-description-transcript-section-renderer button',
      'button[aria-label*="Transcript" i]',
      '#primary-button .yt-spec-button-shape-next',
    ];

    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  function findScroller() {
    const first =
      document.querySelector('transcript-segment-view-model') ||
      document.querySelector('ytd-transcript-segment-renderer');
    if (!first) return null;

    let el = first.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  async function scrollAndCollect() {
    const scroller = findScroller();
    if (!scroller) return;

    const step = Math.max(80, Math.floor(scroller.clientHeight * 0.8));
    let staleRounds = 0;

    for (let i = 0; i < 500 && staleRounds < 15; i++) {
      const before = seen.size;
      collectVisible();

      const maxTop = scroller.scrollHeight - scroller.clientHeight;
      const next = Math.min(maxTop, scroller.scrollTop + step);
      if (next <= scroller.scrollTop) break;

      scroller.scrollTop = next;
      await sleep(120);
      collectVisible();

      staleRounds = seen.size === before ? staleRounds + 1 : 0;
    }

    // 맨 위로 복귀
    scroller.scrollTop = 0;
    await sleep(80);
    collectVisible();
  }

  function waitForDOM(timeout) {
    return new Promise(resolve => {
      if (collectVisible()) return resolve(true);

      const observer = new MutationObserver(() => {
        if (collectVisible()) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(true);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      const timer = setTimeout(() => {
        observer.disconnect();
        resolve(collectVisible());
      }, timeout);
    });
  }
}
