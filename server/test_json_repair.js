import assert from "node:assert/strict";

function sanitizeControlCharsInStrings(str) {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);

    if (inString) {
      if (isEscaped) {
        result += ch;
        isEscaped = false;
        continue;
      }
      if (ch === "\\") {
        result += ch;
        isEscaped = true;
        continue;
      }
      if (ch === '"') {
        result += ch;
        inString = false;
        continue;
      }
      // Unescaped control characters in JSON strings are invalid
      if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else if (code < 32) {
        result += "\\u" + code.toString(16).padStart(4, "0");
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }

  return result;
}

function repairTruncatedJson(str) {
  let inString = false;
  let isEscaped = false;
  const stack = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (ch === "\\") {
        isEscaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        continue;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch === "{" ? "}" : "]");
      } else if (ch === "}" || ch === "]") {
        if (stack.length && stack[stack.length - 1] === ch) {
          stack.pop();
        }
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += '"';
  }

  // Remove any trailing dangling comma or dangling key after last valid value
  repaired = repaired.replace(/,\s*$/g, "");
  // Remove dangling key: e.g. "key": or "key" without colon at the end of an object
  repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*$/g, "");
  repaired = repaired.replace(/,\s*"[^"]*"\s*$/g, "");

  // Close remaining unclosed brackets in reverse order
  while (stack.length > 0) {
    const closer = stack.pop();
    // remove trailing commas right before closing
    repaired = repaired.replace(/,\s*$/g, "");
    repaired += closer;
  }

  return repaired;
}

export function extractAndParseJson(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Empty response from AI model.");
  }

  let cleaned = rawText.trim();

  // 1. Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Extract from markdown code fence
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
    cleaned = fenceMatch[1].trim();
  }

  // 3. Outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  let candidate =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : firstBrace >= 0
      ? cleaned.slice(firstBrace)
      : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {}

  // 4. Strip comments and trailing commas
  let step = candidate
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^\\:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(step);
  } catch {}

  // 5. Sanitize literal control characters inside strings
  let sanitized = sanitizeControlCharsInStrings(step).replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(sanitized);
  } catch {}

  // 6. Repair truncated JSON
  const closed = repairTruncatedJson(sanitized);
  try {
    return JSON.parse(closed);
  } catch {}

  // 7. Last-ditch: repair directly on candidate
  const closedDirect = repairTruncatedJson(sanitizeControlCharsInStrings(candidate).replace(/,\s*([}\]])/g, "$1"));
  try {
    return JSON.parse(closedDirect);
  } catch {}

  throw new Error("The selected model returned invalid JSON. Try again or select a model with stronger JSON support.");
}

// ─── Tests ───────────────────────────────────────────────────────────────────
console.log("Testing extractAndParseJson...");

// Case 1: Clean JSON
assert.deepEqual(extractAndParseJson('{"a": 1}'), { a: 1 });

// Case 2: Markdown fence with surrounding text
const markdownFence = `Here is the architectural blueprint:
\`\`\`json
{
  "projectName": "TestApp",
  "summary": "Nice"
}
\`\`\`
Hope this helps!`;
assert.equal(extractAndParseJson(markdownFence).projectName, "TestApp");

// Case 3: Trailing commas
const trailingCommas = `{
  "items": ["one", "two",],
  "nested": { "foo": "bar", },
}`;
assert.equal(extractAndParseJson(trailingCommas).items.length, 2);

// Case 4: Literal newlines inside strings (bad control characters)
const literalNewlines = `{"content": "line 1\nline 2\nline 3"}`;
// In a raw string from LLM with literal byte 10:
const rawWithByte10 = '{"content": "line 1\nline 2\nline 3"}';
assert.equal(extractAndParseJson(rawWithByte10).content.includes("line 1"), true);

// Case 5: Truncated JSON mid-string
const truncated = `{"projectName": "TruncatedApp", "scaffold": [{"path": "server.js", "content": "import express`;
const parsedTruncated = extractAndParseJson(truncated);
assert.equal(parsedTruncated.projectName, "TruncatedApp");

// Case 6: Comments inside JSON
const withComments = `{
  // collection definition
  "projectName": "AppWithComments",
  /* multi-line comment */
  "summary": "Works"
}`;
assert.equal(extractAndParseJson(withComments).projectName, "AppWithComments");

console.log("All JSON repair test cases passed successfully!");
