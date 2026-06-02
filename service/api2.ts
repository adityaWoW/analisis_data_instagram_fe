import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL2;

if (!baseURL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

const API2 = axios.create({
  baseURL,
});

export default API2;
