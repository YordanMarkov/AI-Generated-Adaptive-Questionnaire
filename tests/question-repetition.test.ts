import assert from "node:assert/strict";
import test from "node:test";

import {
  inferQuestionFocus,
  initialQuestions,
  questionsRepeatFocus,
  type Question,
} from "../lib/questionnaire.ts";

function question(title: string, description = "Choose what fits."): Question {
  return {
    id: title,
    eyebrow: "Test",
    title,
    description,
    type: "choice",
    options: ["A", "B"],
  };
}

test("location and workplace variants share one canonical focus", () => {
  const location = question("How important is your preferred work location?");
  const remote = question("Would you rather work remotely or on site?");
  const setting = question("Do you prefer an indoor or outdoor workplace?");

  assert.equal(inferQuestionFocus(location), "work_setting_and_location");
  assert.equal(inferQuestionFocus(remote), "work_setting_and_location");
  assert.equal(inferQuestionFocus(setting), "work_setting_and_location");
  assert.equal(questionsRepeatFocus(location, remote), true);
  assert.equal(questionsRepeatFocus(remote, setting), true);
});

test("an unrelated schedule question remains available", () => {
  const location = question("Would you rather work remotely or on site?");
  const schedule = question("Would you accept evening or weekend shifts?");

  assert.equal(inferQuestionFocus(schedule), "schedule");
  assert.equal(questionsRepeatFocus(location, schedule), false);
});

test("explicit generated focuses take priority over wording", () => {
  const first = {
    ...question("Which arrangement feels right?"),
    focus: "work_setting_and_location" as const,
  };
  const second = {
    ...question("Choose the best fit for your day."),
    focus: "work_setting_and_location" as const,
  };

  assert.equal(questionsRepeatFocus(first, second), true);
});

test("the broad workday starter does not consume location clarification", () => {
  const workdayStarter = initialQuestions.find(
    (item) => item.id === "environment",
  );
  const location = question("Would you rather work remotely or on site?");

  assert.ok(workdayStarter);
  assert.equal(inferQuestionFocus(workdayStarter), "preferred_workday");
  assert.equal(questionsRepeatFocus(workdayStarter, location), false);
});
