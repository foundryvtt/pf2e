const yargs = require('yargs');
const fs = require('fs');

const argv = yargs
    .option('buildno', {
        type: 'number',
        description: 'specifies the build number to be updated (CI_PIPELINE_IID)'
    })
    .option('branch', {
        'type': 'string',
        description: 'specifies the branch (CI_COMMIT_BRANCH)'
    })
    .option('gitlabpath', {
        type: 'string',
        description: 'The path on gitlab where this branch is stored (CI_PROJECT_PATH)'
    })
    .demandOption(['branch', 'buildno'])
    .argv;

const systemRaw = fs.readFileSync('system.json');
let system = JSON.parse(systemRaw);

system.version = `${system.version}.${argv.buildno}`;
system.url = `https://gitlab.com/${argv.gitlabpath}`;
system.manifest = `https://gitlab.com/${argv.gitlabpath}/-/jobs/artifacts/${argv.branch}/raw/system.json?job=build`;
system.download = `https://gitlab.com/${argv.gitlabpath}/-/jobs/artifacts/${argv.branch}/raw/pf2e.zip?job=build`;

fs.writeFileSync('system.json', JSON.stringify(system, null, 2));

console.log(system.manifest);
