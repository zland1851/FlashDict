# Chrome Web Store Submission Checklist

## Pre-Submission Requirements

### 1. Developer Account
- [ ] Create a Chrome Web Store developer account at https://chrome.google.com/webstore/devconsole
- [ ] Pay one-time $5 registration fee
- [ ] Verify your email address

### 2. Extension Package
- [x] Run `npm run build` to create production build
- [x] Create ZIP file: `store/flashdict-v1.0.2.zip` (12MB)
- [x] Ensure ZIP is under 20MB limit

---

## Required Store Assets

### Icons (Already Available)
- [x] **128x128 PNG** - `src/img/icon128.png` (Store icon)
- [x] **48x48 PNG** - `src/img/icon48.png` (Management page)
- [x] **16x16 PNG** - `src/img/icon16.png` (Favicon)

### Screenshots (1-5 required, 640x400 or 1280x800)

Your existing screenshots in `doc/img/` are 640x400 which is acceptable.

**Recommended screenshots to include:**

| Priority | File | Description | Status |
|----------|------|-------------|--------|
| 1 | `example_001_640x400.png` | Word lookup popup showing definition | Ready |
| 2 | `example_002_640x400.png` | Word lookup with multiple definitions | Ready |
| 3 | `option_general_640x400_en.png` | Options page (English) | **Needs update** - shows old name |
| 4 | `anki_001_640x400.png` | Anki integration demo | Ready |
| 5 | `phrase_001_640x400.png` | Phrase lookup example | Ready |

**Note:** The options page screenshot shows "Online Dictionary Helper" instead of "FlashDict". You should take a new screenshot after the name change is reflected in the UI.

### Promotional Images (Optional but Recommended)

| Asset | Size | Status |
|-------|------|--------|
| Small promo tile | 440x280 PNG | **Not created** |
| Large promo tile | 920x680 PNG | **Not created** |
| Marquee promo tile | 1400x560 PNG | **Not created** |

---

## Store Listing Information

### Text Content
- [x] **Extension name:** FlashDict
- [x] **Short description:** See `STORE_LISTING.md` (109 characters)
- [x] **Detailed description:** See `STORE_LISTING.md`
- [ ] **Category:** Select "Productivity" or "Education"
- [ ] **Language:** English

### URLs
- [ ] **Website URL:** https://github.com/zland1851/FlashDict
- [ ] **Support URL:** https://github.com/zland1851/FlashDict/issues

---

## Privacy & Compliance

### Privacy Tab
- [x] **Privacy Policy:** See `PRIVACY_POLICY.md` - Host this file publicly (e.g., GitHub Pages, or as a GitHub raw link)
- [x] **Permission justifications:** See `PERMISSION_JUSTIFICATIONS.md`
- [ ] **Single purpose description:** "Help users look up word definitions and create vocabulary flashcards"

### Data Usage Declarations
Answer "No" to all of these (FlashDict doesn't collect user data):
- [ ] Personally identifiable information
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information
- [ ] Personal communications
- [ ] Location
- [ ] Web history
- [ ] User activity
- [ ] Website content

**Note:** Check "Yes" only for:
- [ ] "User credentials" if you want to disclose that AnkiWeb credentials are stored locally (optional, since it's local-only)

### Certifications
- [ ] Certify the extension follows Chrome Web Store policies
- [ ] Certify no deceptive practices

---

## Distribution Settings

- [ ] **Visibility:** Public (or Unlisted for testing first)
- [ ] **Distribution regions:** All regions (or select specific ones)
- [ ] **Pricing:** Free

---

## Submission Steps

1. **Go to** https://chrome.google.com/webstore/devconsole

2. **Click** "New Item"

3. **Upload** the ZIP file (`flashdict-v1.0.2.zip`)

4. **Fill in Store Listing:**
   - Copy content from `STORE_LISTING.md`
   - Upload icon (128x128)
   - Upload screenshots (at least 1)

5. **Fill in Privacy tab:**
   - Enter privacy policy URL
   - Answer data usage questions
   - Provide permission justifications (copy from `PERMISSION_JUSTIFICATIONS.md`)
   - Enter single purpose description

6. **Configure Distribution:**
   - Set visibility
   - Select regions

7. **Submit for Review**
   - Review typically takes 1-3 business days
   - May take longer for first submission

---

## Post-Submission

- [ ] Monitor email for review status updates
- [ ] Address any rejection feedback promptly
- [ ] Once approved, verify the listing is live

---

## Files Created for Submission

| File | Purpose |
|------|---------|
| `store/STORE_LISTING.md` | Store listing text content |
| `store/PRIVACY_POLICY.md` | Privacy policy (host publicly) |
| `store/PERMISSION_JUSTIFICATIONS.md` | Explains each permission |
| `store/SUBMISSION_CHECKLIST.md` | This checklist |

---

## Action Items Before Submission

1. **Update screenshots** - Take new screenshots with "FlashDict" branding
2. **Host privacy policy** - Upload `PRIVACY_POLICY.md` to a public URL (GitHub Pages or raw GitHub link)
3. **Create promotional images** (optional) - 440x280 for better store visibility
4. **Build and package** - Run `npm run build` and create ZIP
5. **Test the ZIP** - Load unpacked in Chrome to verify it works
