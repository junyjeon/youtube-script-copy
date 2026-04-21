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

  // 각 strategy는 타임스탬프 셀렉터만 정의하고, 본문은 "컨테이너에서 타임스탬프·a11y 레이블을 제거한 나머지"로 뽑는다.
  // YouTube가 텍스트 span의 클래스 이름을 바꿔도(예: yt-core-attributed-string → ytAttributedStringHost) 영향을 안 받는다.
  const strategies = [
    {
      container: 'transcript-segment-view-model',
      ts: '.ytwTranscriptSegmentViewModelTimestamp',
      exclude: [
        '.ytwTranscriptSegmentViewModelTimestamp',
        '.ytwTranscriptSegmentViewModelTimestampA11yLabel',
      ],
    },
    {
      container: 'ytd-transcript-segment-renderer',
      ts: '.segment-timestamp',
      exclude: ['.segment-timestamp'],
    },
  ];

  try {
    // Shorts는 DOM 구조가 달라 현재 지원 불가
    if (location.pathname.startsWith('/shorts/')) {
      return { error: 'Shorts not supported', segments: null };
    }

    // 1. 이미 열린 자막 패널에서 세그먼트 찾기
    let hasNodes = collectVisible();

    // 2. 패널이 닫혀있으면 열고 대기. 한 번 실패하면 토글로 재시도.
    // 400 get_transcript 에러 시 "패널은 열리지만 세그먼트 0개" 상태가 되는데,
    // 패널을 닫았다 다시 열면 YouTube가 API를 재호출해 회복되는 경우가 있다.
    if (!hasNodes) {
      let opened = false;
      for (let attempt = 0; attempt < 2 && !hasNodes; attempt++) {
        if (attempt > 0) {
          // 토글 off: 첫 시도로 열었던 패널을 같은 버튼으로 닫기
          document.querySelector(
            'ytd-video-description-transcript-section-renderer button',
          )?.click();
          await sleep(600);
        }
        opened = await openPanel();
        if (!opened) {
          return { error: 'Transcript not available', segments: null };
        }
        hasNodes = await waitForDOM(5000);
      }
    }

    if (!hasNodes) {
      return {
        error: 'Transcript failed to load — YouTube may be rate-limiting. Reload the page and retry.',
        segments: null,
      };
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

  function extractSegmentText(container, excludeSelectors) {
    // 타임스탬프와 a11y 레이블 등을 제거한 나머지 텍스트를 뽑는다.
    // 클래스 이름이 바뀌어도(kebab-case ↔ camelCase) 영향받지 않음.
    const clone = container.cloneNode(true);
    for (const sel of excludeSelectors) {
      clone.querySelectorAll(sel).forEach(n => n.remove());
    }
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function collectVisible() {
    let found = false;
    for (const s of strategies) {
      for (const el of document.querySelectorAll(s.container)) {
        found = true;
        const text = extractSegmentText(el, s.exclude);
        if (!text) continue;
        const start = parseTs(el.querySelector(s.ts)?.textContent);
        const key = `${start}|${text}`;
        if (!seen.has(key)) seen.set(key, { start, text });
      }
    }
    return found;
  }

  // 조건이 만족될 때까지 짧게 폴링. 고정 sleep 대신 써서 평균 지연을 줄인다.
  async function waitFor(fn, { timeout = 1500, interval = 30 } = {}) {
    const deadline = Date.now() + timeout;
    let v = fn();
    while (!v && Date.now() < deadline) {
      await sleep(interval);
      v = fn();
    }
    return v;
  }

  // 다국어 UI 대응: aria-label 텍스트에 의존하지 않고 구조적 셀렉터를 먼저 쓴다.
  // 최후의 폴백에서만 로케일별 키워드 사전을 사용한다.
  async function openPanel() {
    // Step 1. 설명란 펼치기 (이미 펼쳐져 있으면 #expand가 없어 no-op)
    document.querySelector('ytd-watch-metadata #expand')?.click();

    // Step 2. 설명란의 transcript 섹션 버튼이 나타날 때까지 폴링 (로케일 무관)
    // 느린 네트워크에서 description section 렌더링이 지연되는 경우를 견디도록 3초.
    const descBtn = await waitFor(
      () => document.querySelector('ytd-video-description-transcript-section-renderer button'),
      { timeout: 3000 },
    );
    if (descBtn) {
      descBtn.click();
      return true;
    }

    // Step 3. aria-label 다국어 매칭 (최후 폴백)
    const KEYWORDS = [
      'Transcript',     // en
      'Show transcript', // en
      '스크립트',        // ko
      '대본',            // ko (older label)
      '字幕',            // zh
      'Transcripción',  // es
      'Transcription',  // fr
      'Transcrição',    // pt
      'Расшифровка',    // ru
      'Trascrizione',   // it
      'Transkript',     // de/tr
      '文字起こし',       // ja
    ];
    for (const kw of KEYWORDS) {
      const btn = document.querySelector(`button[aria-label*="${kw}" i]`);
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
    // 가상 스크롤이 필요 없는 케이스(현재 대부분의 YouTube 트랜스크립트 패널이 여기 해당)
    // 에서는 이미 모든 세그먼트가 DOM에 있으므로 스크롤 과정을 건너뛴다.
    if (!scroller) return;
    if (scroller.scrollHeight <= scroller.clientHeight + 2) return;

    const step = Math.max(80, Math.floor(scroller.clientHeight * 0.8));
    let staleRounds = 0;

    // 긴 영상에서 YouTube의 lazy load가 늦을 수 있어 8회까지 참음.
    // 오버플로 없는 일반 케이스는 위에서 이미 리턴하므로 이 루프를 돌지 않는다.
    for (let i = 0; i < 500 && staleRounds < 8; i++) {
      const before = seen.size;
      collectVisible();

      const maxTop = scroller.scrollHeight - scroller.clientHeight;
      const next = Math.min(maxTop, scroller.scrollTop + step);
      if (next <= scroller.scrollTop) break;

      scroller.scrollTop = next;
      await sleep(80);
      collectVisible();

      staleRounds = seen.size === before ? staleRounds + 1 : 0;
    }

    // 맨 위로 복귀
    scroller.scrollTop = 0;
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
