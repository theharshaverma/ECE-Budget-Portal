export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";
const TOKEN_KEY = "ece-budget-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read invoice file"));
    reader.readAsDataURL(file);
  });
}

export async function login(username, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function getCurrentUser() {
  const data = await request("/api/me");
  return data.user;
}

export async function getRecords(path) {
  return request(path);
}

export async function createRecord(path, payload) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRecord(path, id, payload) {
  return request(`${path}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteRecord(path, id) {
  return request(`${path}/${id}`, {
    method: "DELETE",
  });
}

export async function uploadInvoice(file) {
  if (!file) {
    return null;
  }

  return request("/api/uploads", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      dataUrl: await readFileAsDataUrl(file),
    }),
  });
}
