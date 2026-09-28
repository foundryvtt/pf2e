# Contributing

## Welcome All

If you would like to help contribute to this project then we welcome all support. Feel free to submit issues to the issue tracker or submit pull requests for code and/or content changes. If you are or would like to be a developer, feel free to hit us up on Discord (https://discord.gg/pf2e) and we can help get you up and running. Use of AI is not allowed when contributing to this project.

## Development

### Prerequisites

- Node.js 24.14 or newer. See https://docs.npmjs.com/downloading-and-installing-node-js-and-npm for installation instructions.
- pnpm. The version is pinned in `package.json` and pnpm switches to the pinned version automatically, so you do not need to install a specific version; the latest will do. See https://pnpm.io/installation for installation instructions.

### Building

This project uses vite to bundle the ES module and compile the SASS files needed for a build and can create a local distribution for your own Foundry server. If you want to give it a go yourself follow these steps:

- Clone the repository into a local folder (e.g. `git clone https://github.com/foundryvtt/pf2e.git`) and navigate to the created folder.

- Install dependencies with `npm ci`. The repo's lockfile is `package-lock.json`, so dependencies are installed with npm; pnpm is currently only used to run scripts.

- Link builds to your local FoundryVTT data folder. This can be done manually or by running `npm run link` and following the instructions.

#### Systems

- Run `pnpm run build --system=pf2e` or `pnpm run build --system=sf2e` to perform a one-off build.

- Run `pnpm run hot --system=pf2e` or `pnpm run hot --system=sf2e` to have any coding changes you make trigger an automatic rebuild.

#### Anachronism Modules

- Run `pnpm run build:anachronism` to perform a one-off build.

### Updating Compendia

- To update compendium datafiles, run `pnpm run extractPacks ${compendium db filename} --system=pf2e` or `pnpm run extractPacks ${compendium db filename} --system=sf2e` after editing the item directly in the built world's compendium, rather than editing the json files directly.

## How to Help

As a project, we are currently using the `v14-dev` branch for development and release. If you want to contribute code and/or content changes you can start by making making a fork of this project. You can then push changes to your new branch and open a pull request for your branch to our development branch. After being reviewed it may be pulled into our development branch by one of this project's maintainers.

There are plenty of existing issues if you are looking for something to work on.

### Compendium Content

As new OGL and/or ORC content is released by Paizo, we would like to incorporate it as soon as we are permitted (usually on a street release date). If you would like to contribute such content, please keep in mind the following guidelines:

- Name the entities (be they physical items, abilities, or other discrete game features) exactly as they are in the source material, with one exception: square brackets (`[` and `]`) should replaced with another set of characters, like parentheses, or simply omitted.
- Any embedded links to other entities should be of the form `@Compendium[pf2e.pack-name.Entity Name]`. For ease of maintenance, the linked entities should be referenced by _name_ rather than by ID.
- Do not submit new graphics (especially copyrighted graphics) without first receiving clearance from the copyright holders, if applicable, as well as this repository's maintainers.

### Pull Requests

Pull requests ("PRs") can be made by anyone. PR titles should be in imperative mood and state clearly and concisely what is being changed. PR descriptions are often needed to expand on any details. For new contributors, Continuous integration ("CI") actions must be manually triggered by the system maintainers. For existing collaborators and contributors, CI actions will automatically trigger.

Unsolicited new features are generally not accepted. If you would like to contribute one, we suggest you first find or open an issue detailing the feature gap. From there, we can discuss solutions you have in mind before implementation. Possibly saving you some headache and wasted effort.

A PR may not contain any AI-written changes. PRs noticed as having any AI-written changes will be summarily closed without merging.

#### Style

We have integrated [Prettier](https://prettier.io/) into this project to enforce a consistent coding—even if it's not one everybody likes. CI will block merges of any PR that fails the test suite, which includes style linting. To manually fix style issues, you can call `pnpm run lint:fix`.

### Issues

Before opening a new issue ensure there isn't a duplicate issue, making sure to check closed issues as well.

#### Bugs

When opening a issue for a bug ensure it can be reproduced with no modules active. If the bug only happens when a module is active, report it to the module's author instead. Additionally provide clear instructions on how the bug can be reproduced if relevant as well as what you expected to happen during those steps verses what actually happened.
