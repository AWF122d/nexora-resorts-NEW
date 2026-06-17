import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("nx_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const ASSETS = {
  logo: "https://customer-assets.emergentagent.com/job_824c6878-9cb6-4966-b0ae-ef85dac73560/artifacts/gqsz8ag7_NexoraNoBG.png",
  hero: "https://customer-assets.emergentagent.com/job_824c6878-9cb6-4966-b0ae-ef85dac73560/artifacts/ocfqehb5_royalton_saint_lucia_display_image1600x1200-625772ab29180.jpg",
};
