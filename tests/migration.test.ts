import { test } from "node:test";
import assert from "node:assert/strict";
import { requestGithubData } from "../src/Services/request.ts";
import { EServiceKindError, ServiceError } from "../src/Types/index.ts";
import { Retry } from "../src/Helpers/Retry.ts";
import { UserInfo } from "../src/user_info.ts";
import { Card } from "../src/card.ts";
import { COLORS } from "../src/theme.ts";

test("GraphQL returns a valid user from the native fetch client", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.method, "POST");
    assert.equal(JSON.parse(init?.body as string).variables.username, "4beru");
    return new Response(JSON.stringify({ data: { user: { login: "4beru" } } }), { status: 200 });
  };
  try {
    const user = await requestGithubData<{ login: string }>("query", { username: "4beru" }, "test-token");
    assert.equal(user.login, "4beru");
  } finally {
    globalThis.fetch = original;
  }
});

test("GraphQL errors in a partial response fail closed", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: { user: { login: "4beru" } },
    errors: [{ message: "Field access failed", type: "FORBIDDEN" }],
  }), { status: 200 });
  try {
    await assert.rejects(
      requestGithubData("query", {}, "test-token"),
      (error: unknown) => error instanceof ServiceError &&
        error.cause === EServiceKindError.UPSTREAM && error.code === 502,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("retry succeeds on the second attempt", async () => {
  let attempts = 0;
  const retry = new Retry(2, 0);
  const value = await retry.fetch(async () => {
    if (++attempts === 1) throw new Error("transient");
    return 7;
  });
  assert.equal(value, 7);
  assert.equal(attempts, 2);
});

test("rendered SVG preserves the existing trophy design", () => {
  const info = UserInfo.fromCombined({
    createdAt: "2020-01-01T00:00:00Z",
    contributionsCollection: {
      restrictedContributionsCount: 0, totalCommitContributions: 120,
      totalPullRequestReviewContributions: 4,
    },
    organizations: { totalCount: 0 },
    followers: { totalCount: 5 },
    openIssues: { totalCount: 1 },
    closedIssues: { totalCount: 2 },
    pullRequests: { totalCount: 6 },
    repositories: { totalCount: 2, nodes: [
      { stargazerCount: 3, languages: { nodes: [{ name: "TypeScript" }] }, createdAt: "2020-01-02T00:00:00Z" },
      { stargazerCount: 5, languages: { nodes: [] }, createdAt: "2021-01-01T00:00:00Z" },
    ] },
  });
  assert.equal(info.totalStargazers, 8);
  const svg = new Card([], [], 8, 3, 110, 0, 0, false, false).render(info, COLORS.default);
  assert.match(svg, /<svg/);
  assert.match(svg, /Stars/);
});
