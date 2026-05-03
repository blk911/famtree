"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: "100vh", padding: 16 }}>
      <p style={{ marginBottom: 12, fontSize: 13, color: "#57534e" }}>
        OpenAPI served from <code>/api/openapi</code> (JSON) and <code>/openapi.yaml</code> (YAML).
      </p>
      <SwaggerUI url="/api/openapi" docExpansion="list" />
    </div>
  );
}
