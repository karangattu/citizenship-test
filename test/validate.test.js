"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const vm = require("vm");
const fs = require("fs");

const validate = require("../scripts/validate.js");
const ROOT = path.resolve(__dirname, "..");

const bank = validate.loadGlobals("questions.js", ["QUESTIONS"]).QUESTIONS;
const local = validate.loadGlobals("state-data.js", ["STATES", "LOCAL_QUESTION"]);

test("question bank matches the official 2025 structure", function () {
  assert.deepEqual(validate.validateQuestions(bank), []);
  assert.equal(bank.length, 128);
  assert.equal(bank.filter(function (q) { return q.starred; }).length, 20);
});

test("every question has accepted answers and a known category", function () {
  bank.forEach(function (q) {
    assert.ok(Array.isArray(q.answers) && q.answers.length > 0, "Q" + q.id + " has answers");
    assert.ok(q.answers.every(function (a) { return typeof a === "string" && a.trim().length > 0; }), "Q" + q.id + " answers are strings");
    assert.ok(["American Government", "American History", "Symbols and Holidays"].indexOf(q.category) !== -1, "Q" + q.id + " category");
  });
});

test("state data covers 50 states, D.C., and five territories", function () {
  assert.deepEqual(validate.validateStates(local.STATES, local.LOCAL_QUESTION), []);
  assert.equal(local.STATES.length, 56);
  const capitals = {};
  local.STATES.forEach(function (s) { capitals[s.code] = s.capital; });
  assert.equal(capitals.CA, "Sacramento");
  assert.equal(capitals.MN, "Saint Paul");
  assert.equal(capitals.LA, "Baton Rouge");
  assert.equal(capitals.MO, "Jefferson City");
  assert.equal(capitals.PR, "San Juan");
  assert.equal(capitals.DC, null);
});

test("index.html, manifest, and service worker assets exist", function () {
  assert.deepEqual(validate.validateHtmlAssets(), []);
  assert.deepEqual(validate.validateManifest(), []);
  assert.deepEqual(validate.validateServiceWorker(), []);
  assert.deepEqual(validate.validateScriptSyntax(), []);
});

test("validator catches a broken bank instead of passing silently", function () {
  const broken = bank.slice(0, 127);
  assert.ok(validate.validateQuestions(broken).length > 0, "short bank is rejected");

  const duplicated = JSON.parse(JSON.stringify(bank));
  duplicated[1].id = duplicated[0].id;
  assert.ok(validate.validateQuestions(duplicated).length > 0, "duplicate ids are rejected");

  const noAnswers = JSON.parse(JSON.stringify(bank));
  noAnswers[0].answers = [];
  assert.ok(validate.validateQuestions(noAnswers).length > 0, "empty answers are rejected");
});

test("the app wires every button it declares", function () {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const ids = [];
  const pattern = /id="(btn-[a-z-]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) ids.push(match[1]);
  assert.ok(ids.length > 10, "found the buttons");
  ids.forEach(function (id) {
    assert.ok(app.indexOf('"' + id + '"') !== -1, "app.js references " + id);
  });
  ["study-search", "study-filter", "study-starred"].forEach(function (id) {
    assert.ok(app.indexOf('"' + id + '"') !== -1, "app.js references " + id);
  });
});

test("service worker registration is present and scoped to the page", function () {
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  assert.match(app, /serviceWorker\.register\("\.\/sw\.js"\)/);
});

test("speech synthesis is capability-detected", function () {
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  assert.match(app, /"speechSynthesis" in window/);
  assert.match(app, /btn-listen/);
});

test("state data script parses in a clean context", function () {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "state-data.js"), "utf8"), context);
  assert.ok(Array.isArray(context.STATES));
  assert.equal(context.LOCAL_QUESTION[62], "capital");
});
