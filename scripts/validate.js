"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

const EXPECTED_STARRED = [2, 7, 12, 20, 30, 36, 38, 39, 44, 52, 61, 66, 74, 78, 86, 94, 113, 115, 121, 126];
const EXPECTED_DYNAMIC = [23, 29, 30, 38, 39, 57, 61, 62];
const CATEGORIES = ["American Government", "American History", "Symbols and Holidays"];
const EXPECTED_TERRITORIES = ["PR", "GU", "VI", "AS", "MP"];

function loadGlobals(file, names) {
  const full = path.join(ROOT, file);
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(full, "utf8"), context, { filename: file });
  const out = {};
  names.forEach(function (name) {
    if (!context[name]) throw new Error(file + " did not define " + name);
    out[name] = context[name];
  });
  return out;
}

function validateQuestions(questions) {
  const errors = [];
  if (!Array.isArray(questions)) return ["QUESTIONS is not an array"];
  if (questions.length !== 128) errors.push("expected 128 questions, got " + questions.length);

  const ids = new Set();
  const texts = new Set();
  const starredIds = [];
  const dynamicIds = [];

  questions.forEach(function (item, index) {
    const at = "question[" + index + "]";
    if (!item || typeof item !== "object") {
      errors.push(at + " is not an object");
      return;
    }
    if (!Number.isInteger(item.id)) {
      errors.push(at + " id is not an integer");
    } else {
      if (ids.has(item.id)) errors.push(at + " duplicate id " + item.id);
      ids.add(item.id);
      if (item.id !== index + 1) errors.push(at + " expected id " + (index + 1) + ", got " + item.id);
    }
    if (typeof item.question !== "string" || !item.question.trim()) {
      errors.push(at + " missing question text");
    } else {
      if (/[\u2022\n\r]/.test(item.question)) errors.push("Q" + item.id + " contains a bullet or line break");
      const key = item.question.toLowerCase().replace(/\s+/g, " ").trim();
      if (texts.has(key)) errors.push("Q" + item.id + " duplicates another question");
      texts.add(key);
    }
    if (!Array.isArray(item.answers) || item.answers.length === 0) {
      errors.push("Q" + item.id + " has no answers");
    } else {
      item.answers.forEach(function (answer, i) {
        if (typeof answer !== "string" || !answer.trim()) {
          errors.push("Q" + item.id + " answer[" + i + "] is empty");
        } else if (/[\u2022\n\r]/.test(answer)) {
          errors.push("Q" + item.id + " answer[" + i + "] contains a bullet or line break");
        } else if (answer.length > 400) {
          errors.push("Q" + item.id + " answer[" + i + "] is too long");
        }
      });
    }
    if (typeof item.starred !== "boolean") errors.push("Q" + item.id + " starred is not a boolean");
    if (item.starred) starredIds.push(item.id);
    if (item.dynamic) dynamicIds.push(item.id);
    if (CATEGORIES.indexOf(item.category) === -1) errors.push("Q" + item.id + " has unknown category: " + item.category);
    if (typeof item.subcategory !== "string" || !item.subcategory.trim()) errors.push("Q" + item.id + " is missing a subcategory");
  });

  if (starredIds.length !== 20) errors.push("expected 20 starred questions, got " + starredIds.length);
  if (starredIds.join(",") !== EXPECTED_STARRED.join(",")) errors.push("starred question ids changed: " + starredIds.join(","));
  if (dynamicIds.join(",") !== EXPECTED_DYNAMIC.join(",")) errors.push("dynamic question ids changed: " + dynamicIds.join(","));
  return errors;
}

function validateStates(states, localQuestion) {
  const errors = [];
  if (!Array.isArray(states)) return ["STATES is not an array"];
  if (states.length !== 56) errors.push("expected 56 states/territories, got " + states.length);

  const codes = new Set();
  const names = new Set();
  let dc = null;
  states.forEach(function (s, i) {
    const at = "state[" + i + "]";
    if (!s || typeof s !== "object") { errors.push(at + " is not an object"); return; }
    if (typeof s.code !== "string" || !/^[A-Z]{2}$/.test(s.code)) errors.push(at + " has an invalid code");
    else if (codes.has(s.code)) errors.push(at + " duplicates code " + s.code);
    else codes.add(s.code);
    if (typeof s.name !== "string" || !s.name.trim()) errors.push(at + " is missing a name");
    else if (names.has(s.name)) errors.push(at + " duplicates name " + s.name);
    else names.add(s.name);
    if (s.code === "DC") dc = s;
    if (s.code !== "DC" && (typeof s.capital !== "string" || !s.capital.trim())) {
      errors.push(s.code + " is missing a capital");
    }
  });

  if (!dc) errors.push("District of Columbia entry is missing");
  else if (dc.capital !== null) errors.push("D.C. should have a null capital");
  EXPECTED_TERRITORIES.forEach(function (code) {
    if (!codes.has(code)) errors.push("missing territory " + code);
  });
  if (codes.size !== 56) errors.push("state/territory codes are not unique");

  const expectedFields = { 23: "senator", 29: "representative", 61: "governor", 62: "capital" };
  Object.keys(expectedFields).forEach(function (id) {
    if (!localQuestion || localQuestion[id] !== expectedFields[id]) {
      errors.push("LOCAL_QUESTION[" + id + "] should be " + expectedFields[id]);
    }
  });
  return errors;
}

function validateHtmlAssets() {
  const errors = [];
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const refs = [];
  const pattern = /(?:src|href)="(\.\/[^"#?]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) refs.push(match[1]);
  refs.forEach(function (ref) {
    const rel = ref.replace(/^\.\//, "");
    if (!rel || rel.endsWith("/")) return;
    if (!fs.existsSync(path.join(ROOT, rel))) errors.push("index.html references missing file: " + ref);
  });
  if (refs.indexOf("./questions.js") === -1) errors.push("index.html does not load questions.js");
  if (refs.indexOf("./state-data.js") === -1) errors.push("index.html does not load state-data.js");
  return errors;
}

function validateManifest() {
  const errors = [];
  const file = path.join(ROOT, "manifest.webmanifest");
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return ["manifest.webmanifest is not valid JSON: " + e.message];
  }
  if (!manifest.name || !manifest.short_name) errors.push("manifest is missing name or short_name");
  if (!manifest.start_url || !manifest.scope) errors.push("manifest is missing start_url or scope");
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push("manifest has no icons");
  } else {
    manifest.icons.forEach(function (icon) {
      const rel = String(icon.src || "").replace(/^\.\//, "");
      if (!rel || !fs.existsSync(path.join(ROOT, rel))) errors.push("manifest icon is missing: " + icon.src);
      if (!icon.sizes || !icon.type) errors.push("manifest icon is missing sizes or type: " + icon.src);
    });
  }
  return errors;
}

function validateServiceWorker() {
  const errors = [];
  const file = path.join(ROOT, "sw.js");
  if (!fs.existsSync(file)) return ["sw.js is missing"];
  const source = fs.readFileSync(file, "utf8");
  const shell = source.match(/var SHELL = \[([\s\S]*?)\];/);
  if (!shell) return ["sw.js is missing the SHELL list"];
  const entries = [];
  const pattern = /"([^"]+)"/g;
  let match;
  while ((match = pattern.exec(shell[1])) !== null) entries.push(match[1]);
  entries.forEach(function (entry) {
    if (entry === "./") return;
    const rel = entry.replace(/^\.\//, "");
    if (!fs.existsSync(path.join(ROOT, rel))) errors.push("sw.js caches a missing file: " + entry);
  });
  return errors;
}

function validateScriptSyntax() {
  const errors = [];
  ["app.js", "sw.js", "questions.js", "state-data.js"].forEach(function (file) {
    try {
      // Parse only; never executes the code.
      new Function(fs.readFileSync(path.join(ROOT, file), "utf8"));
    } catch (e) {
      errors.push(file + " has a syntax error: " + e.message);
    }
  });
  return errors;
}

function validateAll() {
  const bank = loadGlobals("questions.js", ["QUESTIONS"]);
  const local = loadGlobals("state-data.js", ["STATES", "LOCAL_QUESTION"]);
  const errors = [].concat(
    validateQuestions(bank.QUESTIONS),
    validateStates(local.STATES, local.LOCAL_QUESTION),
    validateHtmlAssets(),
    validateManifest(),
    validateServiceWorker(),
    validateScriptSyntax()
  );
  if (errors.length) {
    throw new Error("Validation failed:\n- " + errors.join("\n- "));
  }
  return { questions: bank.QUESTIONS.length, states: local.STATES.length };
}

module.exports = {
  loadGlobals: loadGlobals,
  validateQuestions: validateQuestions,
  validateStates: validateStates,
  validateHtmlAssets: validateHtmlAssets,
  validateManifest: validateManifest,
  validateServiceWorker: validateServiceWorker,
  validateScriptSyntax: validateScriptSyntax,
  validateAll: validateAll
};

if (require.main === module) {
  try {
    const summary = validateAll();
    console.log("Validation passed: " + summary.questions + " questions, " + summary.states + " states/territories.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
