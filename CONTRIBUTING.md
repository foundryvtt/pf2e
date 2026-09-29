# Contributing

## Welcome All

If you would like to contribute to the project then I welcome all support. If you are (or would like to be) a developer, then hit us up on Discord (https://discord.gg/pf2e) and we can help get you up and running. Pull requests are welcome, and there are plenty of issues logged if you want to sink your teeth into something.

## Development

### Prerequisites

- pnpm. Install using the instructions for your operating system on https://pnpm.io/installation.

### Building

The project uses vite to bundle the ES module and compile the SASS files needed for a build and can create a local distribution for your own Foundry server. If you want to give it a go yourself follow these steps:

- Clone the repo into a local folder in your dev environment `git clone https://github.com/foundryvtt/pf2e.git`

- From within the clone's folder, install dependencies with `pnpm install`. After that, pnpm installs dependency changes automatically whenever you run one of the scripts below, so you only need to do this once.

- You'll now need to create a symbolic link between the build folder ("dist") and your Foundry data folder. This can be done manually or by running `pnpm run link` and following the instructions (`pnpm link` without `run` is a built-in pnpm command).

- Run `pnpm build --system=pf2e` to perform a one-off build.

- Run `pnpm hot` while Foundry is running to start a development server, then open http://localhost:30001 instead of Foundry's usual address.

- To update compendium datafiles, run `pnpm extractPacks ${compendium db filename} --system=pf2e` after editing the item directly in the built world's compendium, rather than editing the json files directly.

## How to Help

As a project, we are using a modified gitlab flow, with a development branch (`master`) for development and a release branch (`release`) that mirrors the development branch at a certain point in its revision history. If you want to make improvements to the project, you can ask to be added to the project or make a fork of the project in GitHub. Then push your branch to GitHub and open a pull request for your branch to our development branch. After being reviewed it can be pulled into the project by one of the project maintainers.

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

We have integrated [Prettier](https://prettier.io/) into this project to enforce a consistent coding—even if it's not one everybody likes. Github CI will block merges of any PR that fails the test suite, which includes style linting, or the type check. To check locally, run `pnpm lint` and `pnpm check`. To manually fix style issues, you can call `pnpm lint:fix` from the project environment.
