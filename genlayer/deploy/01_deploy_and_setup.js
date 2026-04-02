import fs from "fs";
import path from "path";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const DEFAULT_CONTRACT_PATH = path.resolve(process.cwd(), "contracts/callit_market_manager.py");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const eqIndex = line.indexOf("=");
    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key]) continue;
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function extractContractAddress(receipt) {
  return (
    receipt?.data?.contract_address ??
    receipt?.txDataDecoded?.contractAddress ??
    null
  );
}

function assertReceiptSuccess(receipt, label) {
  const executionResult = receipt?.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (executionResult && executionResult !== "SUCCESS") {
    throw new Error(`${label} failed. Receipt: ${JSON.stringify(receipt)}`);
  }
}

function writeDeploymentRecord(network, payload) {
  const outputDir = path.resolve(process.cwd(), "deployments");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `callit_market_manager.${network}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return outputPath;
}

export default async function main(client) {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(ROOT_DIR, ".env"));
  loadEnvFile(path.resolve(ROOT_DIR, "base/.env"));

  const contractPath = path.resolve(
    process.cwd(),
    process.env.CALLIT_GENLAYER_CONTRACT_PATH || DEFAULT_CONTRACT_PATH,
  );
  const deploymentLabel = (process.env.CALLIT_GENLAYER_DEPLOYMENT_LABEL || "default").trim().toLowerCase();

  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found: ${contractPath}`);
  }

  const contractCode = fs.readFileSync(contractPath, "utf8");

  await client.initializeConsensusSmartContract();

  const deployHash = await client.deployContract({
    code: contractCode,
    args: [],
    leaderOnly: false,
  });

  const deployReceipt = await client.waitForTransactionReceipt({
    hash: deployHash,
    retries: 50,
    interval: 5000,
    status: "ACCEPTED",
  });
  assertReceiptSuccess(deployReceipt, "Deployment");

  const contractAddress = extractContractAddress(deployReceipt);
  if (!contractAddress) {
    throw new Error(`Deployment succeeded but no contract address was found in receipt: ${JSON.stringify(deployReceipt)}`);
  }

  const deploymentRecord = {
    contractAddress,
    deployHash,
    deploymentLabel,
    contractPath,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = writeDeploymentRecord(deploymentLabel, deploymentRecord);

  console.log("\nGenLayer market manager deployed.", {
    "Contract Address": contractAddress,
    "Deployment Label": deploymentLabel,
    "Deployment Tx": deployHash,
    "Deployment Record": outputPath,
  });
}
