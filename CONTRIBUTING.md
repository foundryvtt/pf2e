# CONTRIBUTING.md

## Welcome All

If you would like to contribute to the project then I welcome all support. If you are (or would like to be) a developer, then hit us up on Discord (https://discord.gg/pf2e) and we can help get you up and running. Pull requests are welcome, and there are plenty of issues logged if you want to sink your teeth into something.

## Setup

The project uses webpack to package the SASS files needed for a build and can create a local distribution for your own Foundry server. If you want to give it a go yourself follow these steps:

* Clone the repo into a local folder in your dev environment `git clone https://github.com/foundryvtt/pf2e.git`

* From within the clone's folder, Install dependencies with `npm ci`.

* You'll now need to create a symbolic link between the build folder ("dist") and your Foundry data folder. This can be done manually or by running `npm run link` and following the instructions.

* Run `npm run build` to perform a one-off build.

* Run `npm run watch` to have any coding changes you make in your dev environment trigger an automatic rebuild.

* To update compendium datafiles, run `npm run extractPacks ${compendium db filename}` after editing the item directly in the built world's compendium, rather than editing the json files directly.

## How to Help

As a project, we are using a modified gitlab flow, with a development branch (`master`) for development and a release branch (`release`) that mirrors the development branch at a certain point in its revision history. If you want to make improvements to the project, you can ask to be added to the project or make a fork of the project in GitHub. Then push your branch to GitHub and open a pull request for your branch to our development branch. After being reviewed it can be pulled into the project by one of the project maintainers.

### Compendium Content

As new OGL content is released by Paizo, we would like to incorporate it as soon as we are permitted (usually on a street release date). If you would like to contribute such content, please keep in mind the following guidelines:
* Name the entities (be they physical items, abilities, or other discrete game features) exactly as they are in the source material, with one exception: square brackets (`[` and `]`) should replaced with another set of characters, like parentheses, or simply omitted.
* Any embedded links to other entities should be of the form `@Compendium[pf2e.pack-name.Entity Name]`. For ease of maintenance, the linked entities should be referenced by *name* rather than by ID.
* Do not submit new graphics (especially copyrighted graphics) without first receiving clearance from the copyright holders, if applicable, as well as this repository's maintainers.

### Pull Requests

Pull requests ("PRs") can be made by anyone. PRs titles should be in imperative mood and state clearly and concisely what is being changed. A description is often needed to expand on any details. For new contributors, CI actions must be manually triggered by the system maintainers. It will automatically trigger for subsequent pull requests after a first one is merged into `master`.

#### Prettier

We have integrated [Prettier](https://prettier.io/) into this project to enforce a consistent coding—even if it's not one everybody likes. Github CI will block merges of any PR that fails the test suite, which includes style linting. To manually fix style issues, you can call `npm run lint:fix` from the project environment.
