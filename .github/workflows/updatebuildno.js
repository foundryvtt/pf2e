const fs = require("fs");

const systemRaw = fs.readFileSync("system.json");
let system = JSON.parse(systemRaw);

system.url = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;
system.manifest = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/releases/download/latest/system.json`;
system.download = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/releases/download/v${system.version}/pf2e.zip`;

fs.writeFileSync("system.json", JSON.stringify(system, null, 2));

console.log(`Setting output version = ${system.version}`);
console.log(`::set-output name=version::${system.version}`);
