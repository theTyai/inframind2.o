import "dotenv/config";
import { generateArchitecture } from "./openrouter.js";

async function test() {
  try {
    console.log("Testing generateArchitecture...");
    const result = await generateArchitecture("A lightweight task manager for remote engineering teams with real-time updates and Slack notifications.");
    console.log("Success! Project Name:", result.projectName);
    console.log("Scaffold files count:", result.scaffold?.length);
  } catch (err) {
    console.error("Test failed with error:", err.message);
    if (err.stack) console.error(err.stack);
  }
}

test();
