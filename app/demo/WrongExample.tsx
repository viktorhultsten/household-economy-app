"use client";

// ❌ This will cause a build error!
// You CANNOT import Node.js modules in client components

// Try uncommenting this - it will fail:
// import Database from "better-sqlite3";

// Try uncommenting this - it will also fail:
// import { getDatabase } from "@/lib/db";

export default function WrongExample() {
  // If you tried to use the database here, Next.js would show an error like:
  // "Module not found: Can't resolve 'fs'" or similar
  // Because Node.js APIs don't exist in the browser

  return <div>This component shows what NOT to do</div>;
}
