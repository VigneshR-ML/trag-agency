const { chromium } = require("/home/leodas/node_modules/playwright");

const OUT = "/home/leodas/Trag-Agency/qa/captures/";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  async function revealAll() {
    for (let pass = 0; pass < 5; pass++) {
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 140));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(900);
      const unseen = await page.evaluate(() => document.querySelectorAll("[data-reveal]:not(.seen)").length);
      console.log("reveal pass", pass, "unseen:", unseen);
      if (unseen === 0) break;
    }
    await page.waitForTimeout(1200);
  }

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll(".all-work-card").length >= 5, { timeout: 20000 });
  await revealAll();

  await page.screenshot({ path: OUT + "landing-full.png", fullPage: true });

  for (const [sel, name] of [[".sx-work", "landing-stage-showcase"], [".showcase-list", "landing-showcase"], [".sx-all-work", "landing-all-work"]]) {
    const el = await page.$(sel);
    if (el) await el.screenshot({ path: OUT + name + ".png" });
  }

  const landingState = await page.evaluate(() => ({
    showcase: [...document.querySelectorAll(".showcase-title")].map((n) => n.textContent.trim()),
    cards: [...document.querySelectorAll(".all-work-card")].map((n) => n.textContent.slice(0, 30)),
    badges: document.querySelectorAll(".all-work-badge").length,
    unseen: document.querySelectorAll("[data-reveal]:not(.seen)").length,
    totalReveal: document.querySelectorAll("[data-reveal]").length,
  }));
  console.log("LANDING:", JSON.stringify(landingState));

  await page.goto("http://localhost:3000/studio", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + "studio-login.png" });

  await page.fill("#studio-password", "smoke-test-pass");
  await page.click("form.login-card button[type=submit]");
  await page.waitForSelector(".manager-card", { timeout: 15000 });
  await revealAll();
  await page.screenshot({ path: OUT + "studio-manager.png" });

  const card = await page.$(".manager-card");
  if (card) await card.screenshot({ path: OUT + "studio-card.png" });

  console.log("PAGE ERRORS:", errors.length, errors.slice(0, 5));
  await browser.close();
})().catch((e) => { console.error("FAILED:", e); process.exit(1); });
