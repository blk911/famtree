import type { VmbServiceOption } from "./service-option-types";
import type { VmbService } from "./service-types";

function normalizeDefaultId(id: string): string {
  const match = id.match(/^[a-z0-9-]+-(default-.+)$/i);
  return match?.[1] ?? id;
}

export function resolveServiceNames(
  serviceIds: string[] | undefined,
  services: VmbService[],
): string[] {
  if (!serviceIds?.length) return [];
  return serviceIds
    .map((id) => {
      const baseId = normalizeDefaultId(id);
      return services.find((service) => service.id === id || service.id === baseId)?.name;
    })
    .filter((name): name is string => Boolean(name));
}

export function resolveOptionNames(
  optionIds: string[] | undefined,
  options: VmbServiceOption[],
): string[] {
  if (!optionIds?.length) return [];
  return optionIds
    .map((id) => {
      const baseId = normalizeDefaultId(id);
      return options.find((option) => option.id === id || option.id === baseId)?.name;
    })
    .filter((name): name is string => Boolean(name));
}

export function resolvePrimaryServiceAndUpgrade(input: {
  serviceIds?: string[];
  serviceOptionIds?: string[];
  services: VmbService[];
  options: VmbServiceOption[];
}): { serviceName?: string; upgradeName?: string } {
  const serviceNames = resolveServiceNames(input.serviceIds, input.services);
  const optionNames = resolveOptionNames(input.serviceOptionIds, input.options);
  return {
    serviceName: serviceNames[0],
    upgradeName: optionNames[0],
  };
}
