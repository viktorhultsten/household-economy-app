"use client";

import { serverOnlyFunction } from "./ServerDemo";

// This file runs in the BROWSER
// Everything here is visible to users

export default function ClientDemo() {
  const handleClick = async () => {
    console.log("This console.log appears in the BROWSER console");

    // This looks like a normal function call, but it's actually an HTTP request
    const result = await serverOnlyFunction();

    console.log("Result from server:", result);
    // You'll see: { message: "Data from server", timestamp: "..." }
    // You will NOT see the SECRET_API_KEY or DATABASE_PASSWORD
  };

  return (
    <div>
      <button onClick={handleClick}>Call Server Function</button>
      <p>
        Open your browser's Developer Tools (F12) and click the button.
        You'll see the network request to the server.
      </p>
    </div>
  );
}
