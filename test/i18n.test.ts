import { test } from "node:test";
import assert from "node:assert/strict";
import { LANGS, t } from "../src/i18n.ts";

const BTN_KEYS = ["btn_unlockPro", "btn_addToGroup", "btn_shareBot"] as const;

test("every locale has every btn_* key non-empty and no label exceeds 32 chars", () => {
  for (const key of BTN_KEYS) {
    for (const lang of LANGS) {
      const label = t(lang, key, { stars: 150 });
      assert.ok(label.length > 0, `${key}/${lang} is empty`);
      assert.ok(label.length <= 32, `${key}/${lang} is ${label.length} chars: "${label}"`);
    }
  }
});

test("btn_unlockPro interpolates the star count for every locale", () => {
  for (const lang of LANGS) {
    const label = t(lang, "btn_unlockPro", { stars: 150 });
    assert.ok(label.includes("150"), `${lang} missing star count: "${label}"`);
    assert.ok(!label.includes("{stars}"), `${lang} left a raw token: "${label}"`);
  }
});
