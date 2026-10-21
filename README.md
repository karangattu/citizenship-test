# US Citizenship Test Practice

An online practice test for the United States naturalization civics test — **2025 version**.

- **128 official questions** (USCIS M-1778, 09/25) — the full bank currently used for N-400 filings on or after Oct 20, 2025
- Each quiz asks **20 randomized questions**, reshuffled every attempt (Fisher–Yates)
- You need **12 out of 20 correct to pass** (60%), like the real test
- The quiz **stops early at 12 correct or 9 wrong**, mirroring the USCIS officer
- **Score + full answer review** at the end
- **65/20 mode**: 10 questions from the 20 starred (`*`) questions, need 6 to pass
- **Study mode**: browse/search all 128 with accepted answers

No build step — plain HTML/CSS/JS. Open `index.html` or serve the folder.

## Run locally

```bash
python3 -m http.server
# open http://localhost:8000
```

## Deploy (GitHub Pages)

This repo deploys automatically via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main` (and on manual dispatch).

One-time setup:

1. GitHub repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The workflow validates the bank (must be exactly 128 questions / 20 starred) and publishes the site root.
3. Your site will be at `https://<user>.github.io/<repo>/`.

## Question bank

Source: [USCIS 2025 Civics Test — 128 Questions and Answers (PDF)](https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf)

Answers that change with elections/appointments (President, Vice President, Speaker of the House, Chief Justice, senators/representatives/governors) are flagged in the app with a link to [USCIS test updates](https://www.uscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates). Dynamic answers in `questions.js` are current as of Oct 2026 (Trump / Vance / Speaker Mike Johnson / Chief Justice John G. Roberts, Jr.).
