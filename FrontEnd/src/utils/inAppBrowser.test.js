import { getInAppBrowserName, isInAppBrowser, chromeIntentUrl } from "./inAppBrowser";

/** Swap in a user agent for one assertion. */
function withUserAgent(value, fn) {
  const original = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
  try {
    return fn();
  } finally {
    if (original) Object.defineProperty(window.navigator, "userAgent", original);
  }
}

// Real user agents captured from the apps' embedded webviews.
const IN_APP = {
  "LinkedIn iOS":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 [LinkedInApp]/9.29.2743",
  "LinkedIn Android":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.90 Mobile Safari/537.36 [LinkedInApp]",
  "Facebook iOS":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 [FBAN/FBIOS;FBAV/453.0.0.44.109]",
  "Instagram Android":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 Instagram 322.0.0.34.111",
  "Android WebView":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.90 Mobile Safari/537.36",
};

const REAL_BROWSERS = {
  "macOS Safari":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "iOS Safari":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "iOS Chrome":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1",
  "Android Chrome":
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36",
  "Windows Chrome":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

describe("getInAppBrowserName", () => {
  Object.entries(IN_APP).forEach(([label, agent]) => {
    it(`detects ${label} as an in-app browser`, () => {
      withUserAgent(agent, () => expect(isInAppBrowser()).toBe(true));
    });
  });

  Object.entries(REAL_BROWSERS).forEach(([label, agent]) => {
    it(`leaves ${label} alone`, () => {
      withUserAgent(agent, () => expect(isInAppBrowser()).toBe(false));
    });
  });

  it("names LinkedIn so the copy can say so", () => {
    withUserAgent(IN_APP["LinkedIn iOS"], () =>
      expect(getInAppBrowserName()).toBe("LinkedIn"));
  });

  it("does not mistake the installed iOS PWA for a webview", () => {
    // Standalone iOS PWAs drop the Safari/ token too, but Google sign-in works there.
    const original = Object.getOwnPropertyDescriptor(window.navigator, "standalone");
    Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
    try {
      withUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        () => expect(isInAppBrowser()).toBe(false)
      );
    } finally {
      if (original) Object.defineProperty(window.navigator, "standalone", original);
      else delete window.navigator.standalone;
    }
  });
});

describe("chromeIntentUrl", () => {
  it("rewrites the current https URL into a Chrome intent", () => {
    expect(chromeIntentUrl("/Login")).toBe(
      `intent://${window.location.host}/Login#Intent;scheme=https;package=com.android.chrome;end`
    );
  });
});
