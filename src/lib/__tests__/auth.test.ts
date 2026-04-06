// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const { mockCookieStore } = vi.hoisted(() => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  return { mockCookieStore };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "../auth";

const TEST_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(TEST_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieStore.get.mockReturnValue(undefined);
});

// --- createSession ---

test("createSession sets a cookie named auth-token", async () => {
  await createSession("user-1", "a@example.com");

  const [name] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
});

test("createSession sets httpOnly, sameSite lax, path /", async () => {
  await createSession("user-1", "a@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession stores a JWT containing userId and email", async () => {
  await createSession("user-1", "a@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { payload } = await jwtVerify(token, TEST_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("a@example.com");
});

// --- getSession ---

test("getSession returns null when no cookie is present", async () => {
  expect(await getSession()).toBeNull();
});

test("getSession returns the session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-1", email: "a@example.com" });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("a@example.com");
});

test("getSession returns null for a malformed token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not-a-jwt" });
  expect(await getSession()).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-1", email: "a@example.com" },
    "-1s"
  );
  mockCookieStore.get.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns null when request has no auth cookie", async () => {
  const request = new NextRequest("http://localhost/");
  expect(await verifySession(request)).toBeNull();
});

test("verifySession returns the session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-2", email: "b@example.com" });
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);
  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("b@example.com");
});

test("verifySession returns null for a malformed token", async () => {
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: "auth-token=garbage" },
  });
  expect(await verifySession(request)).toBeNull();
});

test("verifySession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-2", email: "b@example.com" },
    "-1s"
  );
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });
  expect(await verifySession(request)).toBeNull();
});
