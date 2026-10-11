export { alt, contentType, default, size } from "./opengraph-image";

// Declared here rather than re-exported: Next.js parses `runtime` statically
// and cannot follow a re-export.
export const runtime = "nodejs";