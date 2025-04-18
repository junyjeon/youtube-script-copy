# Youtube-Script-Copy

유튜브 동영상의 자막을 빠르게 복사하여 클립보드에 저장하는 크롬 확장 프로그램입니다.

## 프로젝트 개요

유튜브에서 영상 내용을 텍스트로 추출하여 다양한 AI 도구나 텍스트 편집기에서 활용할 수 있게 해주는 도구입니다. 자막이 있는 유튜브 비디오의 텍스트를 원클릭으로 복사하여 클립보드에 저장합니다. ChatGPT, Claude 등 AI 서비스에 붙여넣어 요약, 분석, 번역 등의 작업을 수행할 수 있습니다.

## 주요 기능

- **원클릭 자막 복사**: 유튜브 동영상 자막을 한 번의 클릭으로 추출
- **다양한 형식 지원**: 
  - 타임스탬프 포함 복사: `00:05 안녕하세요 00:07 반갑습니다` 형식
  - 텍스트만 복사: `안녕하세요 반갑습니다` 형식
- **AI 서비스 호환**: ChatGPT, gemini, Claude 등 AI 서비스에 바로 붙여넣기 가능
- **자동 패널 제어**: 자막 패널을 자동으로 열고 닫아 사용자 경험 개선

## 기술 구현

- 자막 추출을 위한 DOM 조작 및 MutationObserver 활용
- Promise 기반 비동기 처리로 안정적인 자막 추출
- 크롬 확장 프로그램 API 활용 (content script, background script)
- 클립보드 API를 활용한 텍스트 복사 기능

## 사용 기술

- JavaScript (ES6+)
- Chrome Extension API
- HTML/CSS
- DOM 조작 및 이벤트 처리

## 설치 방법

### 방법 1: 크롬 웹 스토어에서 설치 (권장)

1. [Chrome 웹 스토어에서 YouTube Script Copy 설치](https://chromewebstore.google.com/detail/youtube-script-copy/lcidmmncffcblnglnmibkhjkloohkkeo)
2. "Chrome에 추가" 버튼 클릭
3. 설치 확인 창에서 "확장 프로그램 추가" 버튼 클릭
4. 설치 완료 후 브라우저 우측 상단에 확장 프로그램 아이콘 확인

### 방법 2: 직접 다운로드 및 설치

1. [릴리즈 페이지](https://github.com/your-username/youtube-script-copy/releases)에서 최신 버전의 zip 파일 다운로드
2. 다운로드한 zip 파일 압축 해제
3. Chrome 브라우저에서 `chrome://extensions/` 접속
4. 개발자 모드 활성화 (우측 상단 토글)
5. "압축해제된 확장 프로그램 로드" 클릭
6. 압축 해제한 폴더 선택하여 설치 완료

### 방법 3: 소스코드에서 설치

1. 이 저장소 클론 또는 다운로드
   ```
   git clone https://github.com/your-username/youtube-script-copy.git
   ```

2. Chrome 브라우저에서 `chrome://extensions/` 접속
3. 개발자 모드 활성화 (우측 상단 토글)
4. "압축해제된 확장 프로그램 로드" 클릭
5. 다운로드한 폴더 선택하여 설치 완료

## 사용 방법

1. 유튜브 동영상 시청 페이지에서 확장 프로그램 아이콘 클릭
2. 제공되는 옵션 중 선택:
   - "자막 복사": 타임스탬프와 함께 자막 복사
   - "텍스트만 복사": 타임스탬프 없이 텍스트만 복사
3. 복사된 내용을 원하는 곳에 붙여넣기 (Ctrl+V)

## 권한 요청 및 보안

이 확장 프로그램은 다음 권한을 필요로 합니다:
- `activeTab`: 현재 탭의 유튜브 자막에 접근 (다른 탭은 접근하지 않음)
- `clipboardWrite`: 클립보드에 복사된 자막 저장
- `clipboardRead`: 클립보드 읽기 (필요시)
- `scripting`: 유튜브 페이지의 스크립트 실행

본 확장 프로그램은 사용자 데이터를 수집하거나 외부로 전송하지 않습니다.

## 개발 배경 및 활용 사례

YouTube 동영상의 유용한 정보를 빠르게 추출하고 AI 도구에 활용하기 위해 개발했습니다. 다음과 같은 활용이 가능합니다:

- 영상 내용 요약 생성 (ChatGPT 등 활용)
- 교육 콘텐츠의 중요 내용 메모
- 외국어 동영상 내용 번역
- 회의, 강의 영상의 텍스트 기록 저장

## 웹 스토어 설명

### 영어
> "Just extract subtitles from YouTube and copy them to the clipboard. Copy YouTube subtitles in just one clicks—no background processes, no slowdowns. Grab the transcript instantly to your clipboard, no hassles involved. Use it however you like:
> - Paste into GPT for quick analysis
> - Add it to your notes for study or reference
> - Save the text to organize your content
> Fast. Simple. Completely effortless. Please let me know if you have any bugs. I'll fix them right away."

### 한국어
> "유튜브에서 자막을 추출하여 클립보드에 복사하기만 하면 됩니다. 단 한 번의 클릭으로 YouTube 자막을 복사하세요—백그라운드 프로세스 없이, 속도 저하 없이. 즉시 클립보드로 트랜스크립트를 가져오세요. 다음과 같이 활용하세요:
> - GPT에 붙여넣어 빠른 분석
> - 학습이나 참고를 위해 메모에 추가
> - 콘텐츠 정리를 위해 텍스트 저장
> 빠르고. 간단하고. 완전히 수고 없이. 버그가 있으면 알려주세요. 바로 수정해 드리겠습니다."

## 향후 계획

- 다국어 지원 확대
- 자막 텍스트 필터링 및 정제 기능
- 타임스탬프 형식 커스터마이징
- 자동 요약 기능 추가

## 기여 방법

이슈 등록이나 풀 리퀘스트를 통해 프로젝트 개선에 기여할 수 있습니다.

## 라이센스

MIT License
