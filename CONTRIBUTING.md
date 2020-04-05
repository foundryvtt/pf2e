If you would like to contribute to the project then I welcome all support. If you are a developer (or would like to be) the hit me up in discord and I can help get you up and running. Merge requests are welcome and there are plenty of issues logged if you want to sink your teeth into something. 

The project uses gulp to package the SASS/LESS files needed for a build and can create a local distribution for your own Foundry server. If you want to give it a go yourself follow these steps:
* clone the repo into a local folder in your dev environment `git clone https://gitlab.com/hooking/foundry-vtt---pathfinder-2e.git pf2e-dev`
* install dev dependencies with `npm install`
* configure a `foundryconfig.json` file with `dataPath` and `systemName` attributes as follows:
{
    dataPath: %absolute_path_to_your_foundry_userdata_folder% (i.e. "C:\\Users\\username\\AppData\\Local\\foundryvtt" for Windows)
    systemName: 'pf2e'
}
* run `gulp copy` or `gulp watch` to keep your system up to date with any coding changes you make.