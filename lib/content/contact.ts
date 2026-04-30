export type ContactItem = {
  id: string;
  label: string;
  value: string;
  href?: string;
  note?: string;
};

export const LGENX_NET_CONTACT_ITEMS: ContactItem[] = [
  {
    id: "admin",
    label: "Admin",
    value: "Ray Donovan",
    note: "AmiHuman support contact",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: "Add WhatsApp number/link",
    href: "#",
    note: "Fastest way to reach us",
  },
  {
    id: "instagram",
    label: "Instagram",
    value: "Add Instagram handle/link",
    href: "#",
    note: "Follow updates and launch notes",
  },
  {
    id: "location",
    label: "Location",
    value: "Denver, CO, USA",
    note: "Private family network headquarters",
  },
];

