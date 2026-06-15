import type { VmbServiceOption } from "./service-option-types";

/**
 * Future hook — suggest next service options from client history.
 * Not wired to UI yet.
 */
export function recommendServiceOptions(input: {
  lastServiceName?: string;
  lastOptionNames?: string[];
  availableOptions: VmbServiceOption[];
}): VmbServiceOption[] {
  const lastOptions = new Set((input.lastOptionNames ?? []).map((name) => name.toLowerCase()));
  const lastService = input.lastServiceName?.toLowerCase() ?? "";

  if (lastService.includes("gel-x") && lastOptions.has("chrome")) {
    return input.availableOptions.filter((option) => option.name.toLowerCase() === "pearls");
  }

  if (lastService.includes("gel-x")) {
    return input.availableOptions.filter((option) =>
      ["chrome", "cat eye"].includes(option.name.toLowerCase()),
    );
  }

  return input.availableOptions.slice(0, 3);
}
