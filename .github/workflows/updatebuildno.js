const fs = require("fs");

const systemRaw = fs.readFileSync("system.json");
let system = JSON.parse(systemRaw);

system.url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
system.manifest = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/releases/latest/download/system.json`;
system.download = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/releases/v${system.version}/pf2e.zip`;

fs.writeFileSync("system.json", JSON.stringify(system, null, 2));

console.log(`::set-output name=version::${system.version}`);
