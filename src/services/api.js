const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error("Cannot reach backend. Start the backend at http://localhost:5000.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const getDashboard = () => request("/dashboard");
export const getRuns = async () => {
  const data = await request("/runs");
  return data.runs || [];
};
export const getRun = (id) => request(`/runs/${encodeURIComponent(id)}`);
export const startRun = (scenario = "healable") =>
  request("/runs", { method: "POST", body: JSON.stringify({ scenario }) });