# YouTube Script Copy

Copy any YouTube video's full transcript with one click.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/lcidmmncffcblnglnmibkhjkloohkkeo)](https://chromewebstore.google.com/detail/youtube-script-copy/lcidmmncffcblnglnmibkhjkloohkkeo)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/lcidmmncffcblnglnmibkhjkloohkkeo)](https://chromewebstore.google.com/detail/youtube-script-copy/lcidmmncffcblnglnmibkhjkloohkkeo)

![Chrome Web Store Impressions](chrome-store-impressions.jpg)

## Install

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/youtube-script-copy/lcidmmncffcblnglnmibkhjkloohkkeo)** — one click.

Or load it from source:
```bash
git clone https://github.com/junyjeon/youtube-script-copy.git
```
`chrome://extensions` → Developer mode ON → **Load unpacked** → select the cloned folder.

## Usage

1. On any YouTube video, click the extension icon
2. Pick **Copy** (with timestamps) or **Copy Text Only** (plain paragraph)
3. Paste with Ctrl+V

## Features

- **Multilingual UI** — works in Korean, English, Chinese, Japanese, Spanish, French, and every other YouTube UI language
- **Virtual-scroll aware** — captures the full transcript of long videos without gaps
- **Auto-recovery** — toggles the panel to retry when YouTube's transcript API is slow or rate-limited
- **Privacy first** — no background scripts, no tracking, runs only when you click the icon
- **Open source** — every line lives in this repo

## Scope

- Supported: standard YouTube videos with captions (manual or auto-generated)
- Not supported: YouTube Shorts, live streams, videos with captions fully disabled by the creator

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access the current YouTube tab |
| `clipboardWrite` | Write the transcript to the clipboard |
| `scripting` | Inject the transcript-extraction script |

No data is sent to any external server.

## Contributing

Bug reports and feature requests go to [GitHub Issues](https://github.com/junyjeon/youtube-script-copy/issues). Pull requests welcome.

## License

MIT
