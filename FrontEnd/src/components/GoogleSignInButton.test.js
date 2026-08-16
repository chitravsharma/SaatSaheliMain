import React from "react";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider } from "../LanguageContext";
import GoogleSignInButton from "./GoogleSignInButton";

/**
 * <GoogleLogin> stands in for Google Identity Services here. `renders` decides
 * whether GIS "draws" a button into the slot, which is exactly the condition the real
 * component observes.
 */
let mockGisRenders = true;
let mockGisDelayMs = 0;

jest.mock("@react-oauth/google", () => ({
  GoogleLogin: () => {
    const React2 = require("react");
    const ref = React2.useRef(null);
    React2.useEffect(() => {
      if (!mockGisRenders) return undefined;
      const draw = () => {
        if (!ref.current) return;
        const btn = globalThis.document.createElement("div");
        btn.setAttribute("role", "button");
        btn.textContent = "Sign in with Google";
        ref.current.appendChild(btn);
      };
      if (mockGisDelayMs === 0) { draw(); return undefined; }
      const t = setTimeout(draw, mockGisDelayMs);
      return () => clearTimeout(t);
    }, []);
    return React2.createElement("div", { ref, "data-testid": "gis-container" });
  },
}));

const DIVIDER = <div data-testid="divider">or</div>;

function renderButton() {
  return render(
    <LanguageProvider>
      <GoogleSignInButton text="signin_with" onSuccess={() => {}} onError={() => {}} divider={DIVIDER} />
    </LanguageProvider>
  );
}

function setUserAgent(value) {
  Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });
}

const LINKEDIN_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 [LinkedInApp]/9.29.2743";
const FACEBOOK_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 [FBAN/FBIOS;FBAV/453.0.0.44.109]";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGisRenders = true;
    mockGisDelayMs = 0;
    setUserAgent(MAC_SAFARI);
  });

  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it("keeps the Google button and divider when GIS renders", () => {
    renderButton();
    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByRole("button", { name: /Sign in with Google/i })).toBeInTheDocument();
    expect(screen.getByTestId("divider")).toBeInTheDocument();
    expect(screen.queryByText(/isn't available/i)).not.toBeInTheDocument();
  });

  it("shows the fallback, and drops the divider, when GIS never renders", () => {
    mockGisRenders = false;
    setUserAgent(LINKEDIN_IOS);
    renderButton();
    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByText(/Google sign-in isn't available inside LinkedIn's browser/i))
      .toBeInTheDocument();
    expect(screen.queryByTestId("divider")).not.toBeInTheDocument();
  });

  it("leaves a working button alone in Facebook's webview", () => {
    // Observed in the wild: Facebook's in-app browser renders the button fine, so a
    // user-agent blocklist would wrongly hide a sign-in that works.
    mockGisRenders = true;
    setUserAgent(FACEBOOK_IOS);
    renderButton();
    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByRole("button", { name: /Sign in with Google/i })).toBeInTheDocument();
    expect(screen.queryByText(/isn't available/i)).not.toBeInTheDocument();
  });

  it("does not strand a slow button behind the fallback", () => {
    mockGisRenders = true;
    mockGisDelayMs = 8000; // slower than the 5s probe timeout
    setUserAgent(LINKEDIN_IOS);
    renderButton();

    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByText(/isn't available/i)).toBeInTheDocument();

    // GIS finally draws — the observer flips back and the real button wins.
    act(() => { jest.advanceTimersByTime(4000); });
    expect(screen.getByRole("button", { name: /Sign in with Google/i })).toBeInTheDocument();
    expect(screen.queryByText(/isn't available/i)).not.toBeInTheDocument();
  });

  it("stays generic when the browser is not a recognised app", () => {
    mockGisRenders = false;
    setUserAgent(MAC_SAFARI);
    renderButton();
    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByText(/Google sign-in isn't available in this browser/i)).toBeInTheDocument();
    expect(screen.queryByText(/Open in Chrome/i)).not.toBeInTheDocument();
  });
});
