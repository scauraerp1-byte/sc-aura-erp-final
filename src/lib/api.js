import axios from "axios";

const BACKEND_URL = "https://erp.scaurakurtis.com";

export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aura_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (
      err?.response?.status === 401 &&
      !window.location.pathname.startsWith("/login")
    ) {
      localStorage.removeItem("aura_token");
      localStorage.removeItem("aura_user");
    }

    return Promise.reject(err);
  }
);

export default api;

export function formatApiError(detail) {
  if (detail == null) {
    return "Something went wrong. Please try again.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((e) =>
        e && typeof e.msg === "string"
          ? e.msg
          : JSON.stringify(e)
      )
      .filter(Boolean)
      .join(" ");
  }

  if (detail && typeof detail.msg === "string") {
    return detail.msg;
  }

  return String(detail);
}
