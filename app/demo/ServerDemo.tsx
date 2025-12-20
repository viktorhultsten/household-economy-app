"use server";

// This entire file runs ONLY on the server
// Nothing here can be seen by the browser

const SECRET_API_KEY = "super-secret-key-12345";
const DATABASE_PASSWORD = "my-db-password";

export async function serverOnlyFunction() {
  console.log("This console.log appears in the SERVER terminal, not browser");
  console.log("Secret API Key:", SECRET_API_KEY);

  // Imagine this is a database query
  const sensitiveData = {
    apiKey: SECRET_API_KEY,
    dbPassword: DATABASE_PASSWORD,
    internalIp: "192.168.1.100",
  };

  // You can safely use secrets here
  // They never reach the client

  return {
    message: "Data from server",
    timestamp: new Date().toISOString(),
    // Note: We DON'T return the sensitive data
  };
}
