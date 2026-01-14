// Load environment variables BEFORE anything else
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer repo-root .env even if the server is started from /backend
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Also allow default dotenv behavior as a fallback
dotenv.config();
