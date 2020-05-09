If you would like to contribute to the project then I welcome all support. If you are a developer (or would like to be) the hit me up in discord and I can help get you up and running. Merge requests are welcome and there are plenty of issues logged if you want to sink your teeth into something. 

The project uses gulp to package the SASS/LESS files needed for a build and can create a local distribution for your own Foundry server. If you want to give it a go yourself follow these steps:
* clone the repo into a local folder in your dev environment `git clone https://gitlab.com/hooking/foundry-vtt---pathfinder-2e.git pf2e-dev`
* install Gulp globally if you don't have it `npm install --global gulp-cli`
* install dev dependencies with `npm install`
* check that Gulp is installed with a CLI version and local version by running `gulp --version` 
* configure a `foundryconfig.json` file in the root folder of the project with `dataPath` and `systemName` attributes. An example can be found in `foundryconfig.example.json`, simply copy it and remove the `.example`, and configure it accordingly. The dataPath attribute is your User Data Folder from Foundry and can be found on the Configuration tab on the Setup screen.
* run `gulp build` to perform a one off compile/build step to setup the dist folder correctly.
* run `gulp watch` to keep the pf2e system in your Foundry User Data Folder up to date with any coding changes you make in your dev environment.

Note: we have started to integrate Prettier into this project but it is still early days. Please do not submit any merge requests with reformatted / auto-formatted code outside of what you are actively contributing to. Unfortunately there is a lot of technical debt in this project and we will be biting it off in small chunks.