import React from "react";
export default function RobloxLinking() {
  return (
    <div data-testid="roblox-linking-page">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Owner</div>
      <h1 className="font-serif text-4xl mt-2">Roblox Linking</h1>
      <p className="text-[var(--text-2)] mt-2 max-w-2xl">
        Connect a Roblox account / Open Cloud API key for ranking operations. This page is restricted to the
        owner role and not generally available to the community.
      </p>
      <div className="surface mt-6 p-6 text-sm text-[var(--text-2)]">
        Provide a Roblox Open Cloud API key with `group:write` to enable real promotions.
        Configure via Settings → Roblox.
      </div>
    </div>
  );
}
