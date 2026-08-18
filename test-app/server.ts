// Minimal dependency-free HTTP server used by integration tests.
// It intentionally avoids any frontend framework so the crawler's
// framework-independence can be demonstrated/tested honestly.

import http from "node:http";
import PAGES from "./pages";

const PORT = Number(process.env.PORT) || 4173;

const server = http.createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0] ?? "/";
  const page = PAGES[path as keyof typeof PAGES];

  // "/404" is a deliberate fixture route: requesting it always yields a
  // real HTTP 404, same as any unmatched path, so integration tests can
  // exercise 404 handling predictably.
  if (path === "/404" || !page) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end(PAGES["/404"]());
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(page());
});

server.listen(PORT, () => {
  console.log(`Test app listening on http://localhost:${PORT}`);
});

export { server, PORT };