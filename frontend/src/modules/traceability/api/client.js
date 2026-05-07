import axios from "axios";

const getToken = () => localStorage.getItem("trace_token");

// This hits /traceability-api which Vite proxies to localhost:4000/api/v1.
const traceClient = axios.create({
  baseURL: "/traceability-api",
  timeout: 10000,
});

traceClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

traceClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("trace_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default traceClient;
