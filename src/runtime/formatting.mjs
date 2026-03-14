export function printUsage() {
  console.log(`Usage:
  node cli/ai-startup-cli/index.mjs new "<idea>"
  node cli/ai-startup-cli/index.mjs run <workflow-id>
  node cli/ai-startup-cli/index.mjs inspect <workflow-instance-id>
  node cli/ai-startup-cli/index.mjs inspect-latest <workflow-id>`);
}

export function printHeader(title) {
  console.log("");
  console.log("=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}
