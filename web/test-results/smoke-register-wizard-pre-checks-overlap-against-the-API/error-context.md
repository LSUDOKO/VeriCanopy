# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> register wizard pre-checks overlap against the API
- Location: e2e/smoke.spec.ts:16:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Example: overlaps Demo A/ })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link [ref=e5] [cursor=pointer]:
          - /url: /
          - img "VeriCanopy mark" [ref=e6]
          - text: VeriCanopy
        - navigation "Main" [ref=e11]:
          - link "Registry" [ref=e12] [cursor=pointer]:
            - /url: /explore
          - link "Market" [ref=e13] [cursor=pointer]:
            - /url: /market
          - link "Register" [ref=e14] [cursor=pointer]:
            - /url: /register
          - link "Portfolio" [ref=e15] [cursor=pointer]:
            - /url: /portfolio
          - link "Challenges" [ref=e16] [cursor=pointer]:
            - /url: /challenges
          - link "Verify" [ref=e17] [cursor=pointer]:
            - /url: /verify
          - link "Security" [ref=e18] [cursor=pointer]:
            - /url: /security
          - link "How it works" [ref=e19] [cursor=pointer]:
            - /url: /how-it-works
        - generic [ref=e20]:
          - generic [ref=e21]: Base Sepolia testnet
          - button "Connect Wallet" [ref=e23] [cursor=pointer]
    - main [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e28]:
          - heading "Register a project" [level=1] [ref=e29]
          - paragraph [ref=e30]: Paste or upload the boundary. We lock its H3 cells on-chain so the same land can never be registered twice, then the oracle starts scoring it every monitoring period.
        - generic [ref=e31]:
          - list "Steps" [ref=e32]:
            - listitem [ref=e33]: 1. Polygon
            - listitem [ref=e34]: 2. Overlap pre-check
            - listitem [ref=e35]: 3. Metadata
            - listitem [ref=e36]: 4. Transactions
            - listitem [ref=e37]: 5. Done
          - generic [ref=e38]:
            - generic [ref=e39]:
              - generic [ref=e40]:
                - text: Paste GeoJSON (Polygon / MultiPolygon / Feature), EPSG:4326
                - textbox "Paste GeoJSON (Polygon / MultiPolygon / Feature), EPSG:4326" [ref=e41]:
                  - /placeholder: "{\"type\":\"Polygon\",\"coordinates\":[[[lon,lat],…]]}"
              - generic [ref=e42]:
                - 'button "Example: overlaps the Tapajós block" [ref=e43]'
                - 'button "Example: fresh land (Rondônia)" [ref=e44]'
                - generic [ref=e45] [cursor=pointer]: Upload .geojson
              - button "Compute H3 cells & pre-check overlap →" [ref=e46]
            - region "Project map" [ref=e48]:
              - region "Map" [ref=e49]
              - generic:
                - generic [ref=e50]:
                  - button "Zoom in" [ref=e51] [cursor=pointer]
                  - button "Zoom out" [ref=e53] [cursor=pointer]
                - group [ref=e55]:
                  - generic "Toggle attribution" [ref=e56] [cursor=pointer]
                  - generic [ref=e57]: © OpenStreetMap contributors
  - alert [ref=e58]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | // Smoke: every page renders without a client error, even with no API/chain reachable.
  4  | const PAGES = ["/", "/explore", "/register", "/portfolio", "/challenges", "/verify", "/security", "/how-it-works", "/market"];
  5  | 
  6  | for (const path of PAGES) {
  7  |   test(`renders ${path}`, async ({ page }) => {
  8  |     const errors: string[] = [];
  9  |     page.on("pageerror", (e) => errors.push(e.message));
  10 |     await page.goto(path);
  11 |     await expect(page.getByRole("link", { name: "VeriCanopy" }).first()).toBeVisible();
  12 |     expect(errors, `client errors on ${path}`).toEqual([]);
  13 |   });
  14 | }
  15 | 
  16 | test("register wizard pre-checks overlap against the API", async ({ page }) => {
  17 |   await page.goto("/register");
> 18 |   await page.getByRole("button", { name: /Example: overlaps Demo A/ }).click();
     |                                                                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
  19 |   await page.getByRole("button", { name: /Compute H3 cells/ }).click();
  20 |   // either the API answers (conflict/ok panel) or it is down (error box); both must be visible, never a blank page
  21 |   await expect(page.locator("text=/Overlap detected|No overlap|Something went wrong|fetch|Failed/").first()).toBeVisible({ timeout: 20_000 });
  22 | });
  23 | 
  24 | test("security page states the post-quantum scope honestly", async ({ page }) => {
  25 |   await page.goto("/security");
  26 |   await expect(page.getByText("zk proofs (Halo2 + KZG)")).toBeVisible();
  27 |   await expect(page.getByText(/❌ No \(pairing-based\)/)).toBeVisible();
  28 | });
  29 | 
```