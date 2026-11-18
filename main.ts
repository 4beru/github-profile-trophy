import { createServer } from "node:http";
import handler from "./src/handler.ts";

const port = Number(process.env.PORT) || 8080;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }
    const result = await handler(new Request(url, { method: req.method, headers }));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error("HTTP handler failed:", error);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
}).listen(port, () => console.log(`GitHub Trophy running on http://localhost:${port}`));
