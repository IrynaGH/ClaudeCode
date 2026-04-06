import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel ---

test("getToolLabel: str_replace_editor create shows Creating <filename>", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "create", path: "/src/App.jsx" })
  ).toBe("Creating App.jsx");
});

test("getToolLabel: str_replace_editor str_replace shows Editing <filename>", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/components/Card.tsx" })
  ).toBe("Editing Card.tsx");
});

test("getToolLabel: str_replace_editor insert shows Editing <filename>", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "insert", path: "/src/index.ts" })
  ).toBe("Editing index.ts");
});

test("getToolLabel: str_replace_editor view shows Reading <filename>", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "view", path: "/src/utils.ts" })
  ).toBe("Reading utils.ts");
});

test("getToolLabel: str_replace_editor undo_edit shows Undoing edit to <filename>", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "undo_edit", path: "/src/App.jsx" })
  ).toBe("Undoing edit to App.jsx");
});

test("getToolLabel: file_manager rename shows Renaming <filename>", () => {
  expect(
    getToolLabel("file_manager", { command: "rename", path: "/src/old.tsx" })
  ).toBe("Renaming old.tsx");
});

test("getToolLabel: file_manager delete shows Deleting <filename>", () => {
  expect(
    getToolLabel("file_manager", { command: "delete", path: "/src/unused.tsx" })
  ).toBe("Deleting unused.tsx");
});

test("getToolLabel: uses only the filename, not the full path", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "create", path: "/deeply/nested/path/Button.tsx" })
  ).toBe("Creating Button.tsx");
});

test("getToolLabel: falls back to generic label when path is missing", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("getToolLabel: falls back to 'Editing file' when args are empty", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Editing file");
});

test("getToolLabel: falls back to 'Managing file' for file_manager with no args", () => {
  expect(getToolLabel("file_manager", {})).toBe("Managing file");
});

test("getToolLabel: returns raw tool name for unknown tools", () => {
  expect(getToolLabel("unknown_tool", { path: "/foo.ts" })).toBe("unknown_tool");
});

// --- ToolInvocationBadge rendering ---

test("ToolInvocationBadge renders correct label for create command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/Button.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});

test("ToolInvocationBadge renders correct label for str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/src/App.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("ToolInvocationBadge renders correct label for file_manager delete", () => {
  render(
    <ToolInvocationBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/src/old.tsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Deleting old.tsx")).toBeDefined();
});

test("ToolInvocationBadge shows spinner when state is call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.tsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocationBadge shows spinner when state is partial-call", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{}}
      state="partial-call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocationBadge shows green dot when state is result", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/src/App.tsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocationBadge handles partial-call with no args gracefully", () => {
  render(
    <ToolInvocationBadge
      toolName="str_replace_editor"
      args={{}}
      state="partial-call"
    />
  );
  expect(screen.getByText("Editing file")).toBeDefined();
});
