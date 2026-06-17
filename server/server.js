import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const PORT = Number(process.env.API_PORT || 4000);
const SECRET = process.env.AUTH_SECRET || "dev-secret-change-before-production";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dbPath = join(__dirname, "db.json");
const uploadsDir = join(__dirname, "uploads");

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const collectionByPath = {
  "/api/income": "income",
  "/api/expenses": "expenses",
  "/api/inventory": "inventory",
};

function readDb() {
  return JSON.parse(readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const encoded = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verify(token) {
  if (!token || !token.includes(".")) return null;

  const [encoded, signature] = token.split(".");
  const expected = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return verify(token);
}

function requireUser(req, res) {
  const user = getUser(req);

  if (!user) {
    sendError(res, 401, "Authentication required");
    return null;
  }

  return user;
}

function requireAdmin(req, res) {
  const user = requireUser(req, res);

  if (!user) return null;

  if (user.role !== "admin") {
    sendError(res, 403, "Admin access required");
    return null;
  }

  return user;
}

function nextId(records) {
  return records.reduce((max, record) => Math.max(max, Number(record.id)), 0) + 1;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

function sanitizeFileName(fileName) {
  const safeName = String(fileName || "invoice").replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeName || "invoice";
}

function saveUploadedFile({ fileName, dataUrl }) {
  if (!fileName || !dataUrl || !dataUrl.includes(",")) {
    throw new Error("fileName and dataUrl are required");
  }

  const safeName = sanitizeFileName(fileName);
  const extension = extname(safeName);
  const storedName = `${Date.now()}-${safeName}`;
  const destination = join(uploadsDir, storedName);
  const base64 = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");

  if (![".pdf", ".png", ".jpg", ".jpeg"].includes(extension.toLowerCase())) {
    throw new Error("Only PDF, PNG and JPG invoices are allowed");
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error("Invoice file must be 10MB or smaller");
  }

  writeFileSync(destination, buffer);

  return {
    fileName: safeName,
    storedName,
    url: `/uploads/${storedName}`,
  };
}

function serveUpload(req, res, pathname) {
  const storedName = sanitizeFileName(pathname.replace("/uploads/", ""));
  const filePath = join(uploadsDir, storedName);

  if (!existsSync(filePath)) {
    sendError(res, 404, "File not found");
    return;
  }

  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (pathname.startsWith("/uploads/") && req.method === "GET") {
    serveUpload(req, res, pathname);
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await parseBody(req);
    const db = readDb();
    const user = db.users.find(
      (candidate) =>
        candidate.username === body.username && candidate.password === body.password,
    );

    if (!user) {
      sendError(res, 401, "Invalid username or password");
      return;
    }

    const safeUser = publicUser(user);
    sendJson(res, 200, {
      user: safeUser,
      token: sign(safeUser),
    });
    return;
  }

  if (pathname === "/api/me" && req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    sendJson(res, 200, { user });
    return;
  }

  if (pathname === "/api/uploads" && req.method === "POST") {
    const user = requireAdmin(req, res);
    if (!user) return;

    try {
      const upload = saveUploadedFile(await parseBody(req));
      sendJson(res, 201, upload);
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  const collection = collectionByPath[pathname];

  if (!collection) {
    sendError(res, 404, "Route not found");
    return;
  }

  if (req.method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;

    const db = readDb();
    sendJson(res, 200, db[collection]);
    return;
  }

  if (req.method === "POST") {
    const user = requireAdmin(req, res);
    if (!user) return;

    const db = readDb();
    const body = await parseBody(req);
    const record = {
      id: nextId(db[collection]),
      ...body,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    };

    db[collection] = [record, ...db[collection]];
    writeDb(db);
    sendJson(res, 201, record);
    return;
  }

  sendError(res, 405, "Method not allowed");
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendError(res, 500, error.message || "Internal server error");
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`API server running at http://127.0.0.1:${PORT}`);
  console.log("Demo users: admin/admin123 and viewer/viewer123");
});
