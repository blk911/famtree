declare module "swagger-jsdoc";
declare module "swagger-ui-react" {
  import type { ComponentType } from "react";
  const SwaggerUI: ComponentType<{ url?: string; docExpansion?: string }>;
  export default SwaggerUI;
}
