import type { ReactNode } from "react";

/** Shared visual shell for `/studios/*`, `/amihuman/studios`, and other marketing Studio surfaces. */
const STUDIOS_PAGE_BG_URL = "/uploads/STUDIO%20BKGRND.jpg";

export function StudiosPublicMarketingShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f1ec",
        backgroundImage: `
          radial-gradient(ellipse 120% 80% at 50% 0%, rgba(250, 249, 246, 0.72), rgba(245, 242, 235, 0.55)),
          linear-gradient(165deg, rgba(250, 249, 246, 0.45) 0%, rgba(239, 233, 223, 0.38) 100%),
          url(${STUDIOS_PAGE_BG_URL})
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "#262626",
      }}
    >
      {children}
    </div>
  );
}
