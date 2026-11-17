"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { loadGlobals } = require("./validate.js");

const dir = path.resolve(__dirname, "../audio");
const manifestPath = path.join(dir, "questions.json");
const model = "gpt-4o-mini-tts";
const voice = "marin";
const instructions = "Read the question exactly as written, with no introduction or answer. Speak like a calm, courteous interviewer, in clear American English at a comfortable conversational pace. Pause naturally between sentences. Read Roman numerals as numbers in names such as World War II.";

async function record(question, apiKey) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model, voice, instructions, input: question, response_format: "mp3" }),
      signal: AbortSignal.timeout(60_000)
    });
    if (response.ok && response.headers.get("content-type")?.startsWith("audio/")) {
      return Buffer.from(await response.arrayBuffer());
    }
    const { error } = await response.json().catch(() => ({}));
    if (attempt === 3 || error?.code === "insufficient_quota" || (response.status !== 429 && response.status < 500)) {
      throw new Error("Speech API returned HTTP " + response.status + (error?.code ? " (" + error.code + ")" : ""));
    }
    await delay(1000 * 2 ** attempt);
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Set OPENAI_API_KEY to generate question audio.");
  const { QUESTIONS } = loadGlobals("questions.js", ["QUESTIONS"]);
  const recorded = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const pending = QUESTIONS.filter(({ id, question }) => recorded[id] !== question || !fs.existsSync(path.join(dir, id + ".mp3")));
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < pending.length;) {
    const batch = pending.slice(i, i + (i === 0 ? 1 : 4));
    const results = await Promise.allSettled(batch.map(async ({ id, question }) => {
      const clip = await record(question, apiKey);
      if (!clip.length) throw new Error("The speech API returned an empty recording for Q" + id);
      fs.writeFileSync(path.join(dir, id + ".mp3"), clip);
      recorded[id] = question;
    }));
    fs.writeFileSync(manifestPath, JSON.stringify(recorded, null, 2) + "\n");
    const failure = results.find(result => result.status === "rejected");
    if (failure) throw failure.reason;
    i += batch.length;
    console.log("Recorded " + i + " of " + pending.length + " new or changed questions.");
  }
  if (!pending.length) console.log("All question recordings are up to date.");
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
