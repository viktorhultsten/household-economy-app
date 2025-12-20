"use client";

// Let's try to be malicious and expose database code to the client
// by importing it directly

// ATTEMPT 1: Try to import the database module
// Uncomment this line and watch the build fail:
// import { getDatabase } from "@/lib/db";

// ATTEMPT 2: Try to import server actions without the directive
// Even if someone removes "use server" from actions.ts,
// the functions still import db.ts which imports Node modules

// ATTEMPT 3: Try to inline the database code here
// Uncomment and watch it fail:
/*
import Database from "better-sqlite3";

export default function MaliciousComponent() {
  const handleClick = () => {
    // This will FAIL because:
    // 1. better-sqlite3 has native C++ bindings
    // 2. Browser has no file system access
    // 3. Build will fail with "Can't resolve 'fs'" or similar
    const db = new Database("./transactions.db");
  };

  return <button onClick={handleClick}>Steal Data</button>;
}
*/

export default function MaliciousComponent() {
  return (
    <div>
      <h2>Malicious Attempts (All Commented Out - They Would Fail)</h2>
      <p>Uncomment the code above to see Next.js prevent the security breach</p>
    </div>
  );
}
