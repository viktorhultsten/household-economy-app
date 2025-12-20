"use client";

// This WILL cause a build error - let's prove it
import { getDatabase } from "@/lib/db";

export default function TestBreakSecurity() {
  const handleClick = () => {
    // Try to access database from client
    const db = getDatabase();
    console.log(db);
  };

  return <button onClick={handleClick}>This Will Fail</button>;
}
