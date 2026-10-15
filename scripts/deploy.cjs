const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const Factory = await hre.ethers.getContractFactory("CharityPlatform");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`CharityPlatform deployed to: ${address}`);

  const outDir = path.join(__dirname, "..", "frontend", "src");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "contract-address.json"), JSON.stringify({ address }, null, 2));
  fs.writeFileSync(path.join(outDir, "contract-abi.json"), JSON.stringify(Factory.interface.formatJson(), null, 2));
  console.log("Updated frontend/src/contract-address.json and contract-abi.json");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
