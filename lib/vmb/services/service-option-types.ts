export type VmbServiceOption = {
  id: string;
  salonId?: string;
  serviceId: string;
  name: string;
  groupName?: string;
  valueLabel?: string;
  description?: string;
  active: boolean;
  displayOrder: number;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VmbServiceWithOptions = {
  service: import("./service-types").VmbService;
  options: VmbServiceOption[];
};
