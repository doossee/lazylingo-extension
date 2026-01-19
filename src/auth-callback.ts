// Content script that detects OAuth callback and extracts token
console.log("LazyLingo Auth Listener Active");

// Listen for auth callback page
if (window.location.pathname === "/auth/callback") {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get("access_token");
  const refreshToken = urlParams.get("refresh_token");

  if (accessToken) {
    // Send token to extension
    chrome.runtime.sendMessage(
      {
        type: "STORE_TOKEN",
        token: accessToken,
        refreshToken: refreshToken,
      },
      () => {
        // Show success message
        document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; text-align: center; padding: 2rem;">
          <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 1rem; padding: 2rem; max-width: 400px;">
            <svg style="width: 64px; height: 64px; margin: 0 auto 1rem; color: #8b5cf6;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #8b5cf6;">Authentication Successful!</h1>
            <p style="color: #94a3b8; margin-bottom: 1.5rem;">You can now close this tab and use the extension</p>
            <button onclick="window.close()" style="background: #8b5cf6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">Close Tab</button>
          </div>
        </div>
      `;
      }
    );
  }
}
