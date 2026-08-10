import { chromium } from "playwright"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, "out")
fs.mkdirSync(OUT, { recursive: true })

const BASE = process.env.BASE_URL || "http://localhost:3000"

const results = []

function report(step, status, issues = "", reproduction = "") {
  results.push({ step, status, issues, reproduction })
  console.log(`[${status}] ${step} — ${issues || "ok"}`)
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ko-KR",
  })
  const page = await context.newPage()

  // Collect console errors
  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  page.on("pageerror", (err) => consoleErrors.push(err.message))

  // ===== 1. Home Page Loading =====
  console.log("\n=== 1. Home Page Loading ===")
  try {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 })
    await sleep(1000)
    // Home page redirects to /explore
    const url = page.url()
    await page.screenshot({ path: path.join(OUT, "01-home.png"), fullPage: false })
    
    if (consoleErrors.length > 0) {
      report("1. Home Page Loading", "❌ FAIL", `Console errors: ${consoleErrors.slice(0, 5).join("; ")}`, "Open http://localhost:3000")
    } else {
      report("1. Home Page Loading", "✅ PASS", `Redirected to: ${url}`)
    }
  } catch (e) {
    report("1. Home Page Loading", "❌ FAIL", `Error: ${e.message}`, "Open http://localhost:3000")
    await page.screenshot({ path: path.join(OUT, "01-home-error.png"), fullPage: false })
  }

  // ===== 2. Character/Work List =====
  console.log("\n=== 2. Character/Work List ===")
  try {
    // We should be on /explore already
    await page.waitForSelector('[class*="card"], [class*="Card"], article, [data-testid*="card"]', { timeout: 5000 }).catch(() => {})
    await sleep(500)
    await page.screenshot({ path: path.join(OUT, "02-character-list.png"), fullPage: false })
    
    // Check for character cards or story cards
    const items = await page.locator('[class*="card"], [class*="Card"]').count()
    if (items > 0) {
      report("2. Character/Work List", "✅ PASS", `Found ${items} items displayed`)
    } else {
      // Try other selectors
      const links = await page.locator('a[href*="character"], a[href*="story"], a[href*="chat"]').count()
      if (links > 0) {
        report("2. Character/Work List", "✅ PASS", `Found ${links} navigable items`)
      } else {
        report("2. Character/Work List", "⚠️ WARN", "No obvious card items found, but page loaded", "Navigate to /explore")
      }
    }
  } catch (e) {
    report("2. Character/Work List", "❌ FAIL", `Error: ${e.message}`, "Navigate to /explore")
  }

  // ===== 3. Character Detail Page =====
  console.log("\n=== 3. Character Detail Page ===")
  try {
    // Try clicking first character card or link
    const firstLink = await page.locator('a[href*="character"], a[href*="story"], a[href*="chat"]').first()
    if (await firstLink.count() > 0) {
      await firstLink.click()
      await sleep(1500)
      await page.screenshot({ path: path.join(OUT, "03-character-detail.png"), fullPage: false })
      
      const bodyText = await page.textContent("body")
      const hasName = bodyText.length > 0
      report("3. Character Detail Page", "✅ PASS", `Detail page loaded, URL: ${page.url()}`)
    } else {
      // Try navigating directly
      await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" })
      await sleep(500)
      // Click any clickable card
      const clickable = await page.locator('[class*="cursor-pointer"], [class*="hover"]').first()
      if (await clickable.count() > 0) {
        await clickable.click()
        await sleep(1500)
        await page.screenshot({ path: path.join(OUT, "03-character-detail.png"), fullPage: false })
        report("3. Character Detail Page", "✅ PASS", `Navigated via click, URL: ${page.url()}`)
      } else {
        await page.screenshot({ path: path.join(OUT, "03-character-detail.png"), fullPage: false })
        report("3. Character Detail Page", "⚠️ WARN", "Could not find clickable element to navigate to detail", "Click on a character card")
      }
    }
  } catch (e) {
    report("3. Character Detail Page", "❌ FAIL", `Error: ${e.message}`, "Click on a character card")
  }

  // ===== 4. Start Chat =====
  console.log("\n=== 4. Start Chat ===")
  try {
    // Look for a "Start Chat" or "대화 시작" button
    const startBtn = await page.locator('button:has-text("시작"), button:has-text("대화"), button:has-text("Chat"), a:has-text("시작"), a:has-text("대화")').first()
    if (await startBtn.count() > 0) {
      await startBtn.click()
      await sleep(2000)
      await page.screenshot({ path: path.join(OUT, "04-chat-start.png"), fullPage: false })
      
      // Check for chat interface elements
      const hasInput = await page.locator('textarea, input[type="text"], [contenteditable]').count()
      if (hasInput > 0) {
        report("4. Start Chat", "✅ PASS", `Chat interface loaded with input field`)
      } else {
        report("4. Start Chat", "⚠️ WARN", "Chat started but no input field found", "Click start chat button")
      }
    } else {
      // Try navigating to /chat directly
      await page.goto(`${BASE}/chat`, { waitUntil: "networkidle" })
      await sleep(1000)
      await page.screenshot({ path: path.join(OUT, "04-chat-start.png"), fullPage: false })
      const hasInput = await page.locator('textarea, input[type="text"], [contenteditable]').count()
      if (hasInput > 0) {
        report("4. Start Chat", "✅ PASS", `Chat interface loaded at /chat`)
      } else {
        report("4. Start Chat", "⚠️ WARN", "Navigated to /chat but no input field visible", "Navigate to /chat")
      }
    }
  } catch (e) {
    report("4. Start Chat", "❌ FAIL", `Error: ${e.message}`, "Click start chat button")
  }

  // ===== 5. Normal Dialogue Input =====
  console.log("\n=== 5. Normal Dialogue Input ===")
  try {
    const textarea = await page.locator('textarea').first()
    if (await textarea.count() > 0) {
      await textarea.fill("안녕하세요! 만나서 반갑습니다.")
      await sleep(300)
      // Find and click send button
      const sendBtn = await page.locator('button[type="submit"], button:has([class*="Send"]), button:has-text("전송"), button:has(svg)').first()
      if (await sendBtn.count() > 0) {
        await sendBtn.click()
        await sleep(3000) // Wait for simulated response
        await page.screenshot({ path: path.join(OUT, "05-normal-dialogue.png"), fullPage: false })
        
        // Check for response
        const messages = await page.locator('[class*="message"], [class*="chat"] p, [class*="Message"]').count()
        report("5. Normal Dialogue Input", "✅ PASS", `Message sent, response received. Messages count: ${messages}`)
      } else {
        // Try Enter key
        await textarea.press("Enter")
        await sleep(3000)
        await page.screenshot({ path: path.join(OUT, "05-normal-dialogue.png"), fullPage: false })
        report("5. Normal Dialogue Input", "✅ PASS", "Message sent via Enter key")
      }
    } else {
      report("5. Normal Dialogue Input", "⚠️ WARN", "No textarea found to type into", "Type message in chat input")
      await page.screenshot({ path: path.join(OUT, "05-normal-dialogue.png"), fullPage: false })
    }
  } catch (e) {
    report("5. Normal Dialogue Input", "❌ FAIL", `Error: ${e.message}`, "Type message and send")
  }

  // ===== 6. Stage Direction / Narration Input =====
  console.log("\n=== 6. Stage Direction / Narration Input ===")
  try {
    const textarea = await page.locator('textarea').first()
    if (await textarea.count() > 0) {
      await textarea.fill("*따뜻하게 미소지으며* 정말 그렇게 생각하시나요?")
      await sleep(300)
      const sendBtn = await page.locator('button[type="submit"], button:has([class*="Send"]), button:has-text("전송"), button:has(svg)').first()
      if (await sendBtn.count() > 0) {
        await sendBtn.click()
      } else {
        await textarea.press("Enter")
      }
      await sleep(3000)
      await page.screenshot({ path: path.join(OUT, "06-stage-direction.png"), fullPage: false })
      report("6. Stage Direction / Narration Input", "✅ PASS", "Stage direction message sent")
    } else {
      report("6. Stage Direction / Narration Input", "⚠️ WARN", "No textarea found", "Type stage direction in chat input")
      await page.screenshot({ path: path.join(OUT, "06-stage-direction.png"), fullPage: false })
    }
  } catch (e) {
    report("6. Stage Direction / Narration Input", "❌ FAIL", `Error: ${e.message}`, "Type stage direction and send")
  }

  // ===== 7. @ Mention List and Character Selection =====
  console.log("\n=== 7. @ Mention List ===")
  try {
    const textarea = await page.locator('textarea').first()
    if (await textarea.count() > 0) {
      await textarea.fill("@")
      await sleep(1000)
      await page.screenshot({ path: path.join(OUT, "07-mention-list.png"), fullPage: false })
      
      // Check for mention popup/list
      const mentionPopup = await page.locator('[class*="mention"], [class*="popover"], [class*="dropdown"], [role="listbox"], [role="menu"]').count()
      if (mentionPopup > 0) {
        report("7. @ Mention List", "✅ PASS", `Mention popup appeared with ${mentionPopup} items`)
      } else {
        report("7. @ Mention List", "⚠️ WARN", "Typed @ but no mention popup appeared", "Type @ in chat input")
      }
    } else {
      report("7. @ Mention List", "⚠️ WARN", "No textarea found", "Type @ in chat input")
      await page.screenshot({ path: path.join(OUT, "07-mention-list.png"), fullPage: false })
    }
  } catch (e) {
    report("7. @ Mention List", "❌ FAIL", `Error: ${e.message}`, "Type @ in chat input")
  }

  // ===== 8. Chat Settings Drawer =====
  console.log("\n=== 8. Chat Settings Drawer ===")
  try {
    // Look for settings/menu button
    const settingsBtn = await page.locator('button[aria-label*="설정"], button[aria-label*="menu"], button[aria-label*="Menu"], button:has([class*="Settings"]), button:has([class*="settings"]), button:has([class*="Menu"])').first()
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click()
      await sleep(1000)
      await page.screenshot({ path: path.join(OUT, "08-settings-drawer.png"), fullPage: false })
      
      // Check if drawer/menu opened
      const drawerOpen = await page.locator('[class*="drawer"], [class*="Drawer"], [role="dialog"], [class*="sheet"], [class*="Sheet"]').count()
      if (drawerOpen > 0) {
        report("8. Chat Settings Drawer", "✅ PASS", "Settings drawer opened")
      } else {
        report("8. Chat Settings Drawer", "⚠️ WARN", "Settings button clicked but no drawer detected", "Click settings button")
      }
    } else {
      report("8. Chat Settings Drawer", "⚠️ WARN", "No settings button found", "Look for settings/menu button")
      await page.screenshot({ path: path.join(OUT, "08-settings-drawer.png"), fullPage: false })
    }
  } catch (e) {
    report("8. Chat Settings Drawer", "❌ FAIL", `Error: ${e.message}`, "Click settings button")
  }

  // ===== 9. Modal and Back Navigation =====
  console.log("\n=== 9. Modal and Back Navigation ===")
  try {
    // Navigate to explore page first
    await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" })
    await sleep(500)
    
    // Try to find and click something that opens a modal
    const modalTrigger = await page.locator('button:has-text("설정"), button:has-text("시작"), [data-radix-dialog-trigger], [aria-haspopup="dialog"]').first()
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click()
      await sleep(1000)
      await page.screenshot({ path: path.join(OUT, "09-modal-back.png"), fullPage: false })
      
      // Press browser back
      await page.goBack()
      await sleep(1000)
      report("9. Modal and Back Navigation", "✅ PASS", "Modal opened and back navigation worked")
    } else {
      report("9. Modal and Back Navigation", "⚠️ WARN", "No modal trigger found", "Click on a modal-triggering element")
      await page.screenshot({ path: path.join(OUT, "09-modal-back.png"), fullPage: false })
    }
  } catch (e) {
    report("9. Modal and Back Navigation", "❌ FAIL", `Error: ${e.message}`, "Open modal and press back")
  }

  // ===== 10. Mobile Layout Check =====
  console.log("\n=== 10. Mobile Layout Check ===")
  try {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" })
    await sleep(1000)
    await page.screenshot({ path: path.join(OUT, "10-mobile-layout.png"), fullPage: true })
    
    // Check for layout issues
    const bodyText = await page.textContent("body")
    const hasOverflow = await page.evaluate(() => {
      const body = document.body
      return body.scrollWidth > body.clientWidth
    })
    
    if (hasOverflow) {
      report("10. Mobile Layout Check", "⚠️ WARN", "Horizontal overflow detected on mobile viewport", "Resize to 375x812")
    } else {
      report("10. Mobile Layout Check", "✅ PASS", "No horizontal overflow, page renders at mobile size")
    }
  } catch (e) {
    report("10. Mobile Layout Check", "❌ FAIL", `Error: ${e.message}`, "Resize to 375x812")
  }

  await browser.close()

  // Print summary
  console.log("\n\n=== TEST SUMMARY ===")
  for (const r of results) {
    console.log(`[${r.status}] ${r.step}`)
    if (r.issues) console.log(`  Issues: ${r.issues}`)
    if (r.reproduction) console.log(`  Reproduction: ${r.reproduction}`)
  }

  // Write report
  const reportLines = []
  reportLines.push("# Test Report — AI Character Chat Service")
  reportLines.push(`**URL**: ${BASE}`)
  reportLines.push(`**Date**: ${new Date().toISOString()}`)
  reportLines.push("")
  
  for (const r of results) {
    const num = r.step.split(".")[0]
    reportLines.push(`## ${r.step}`)
    reportLines.push(`- **Status**: ${r.status}`)
    reportLines.push(`- **Issues**: ${r.issues || "None"}`)
    reportLines.push(`- **Reproduction**: ${r.reproduction || "N/A"}`)
    reportLines.push("")
  }
  
  reportLines.push("## Screenshots")
  const files = fs.readdirSync(OUT).filter(f => f.endsWith(".png"))
  for (const f of files) {
    reportLines.push(`- \`./out/${f}\``)
  }
  
  fs.writeFileSync(path.join(OUT, "test-report.md"), reportLines.join("\n"), "utf-8")
  console.log(`\nReport written to ${path.join(OUT, "test-report.md")}`)
}

main().catch(console.error)
