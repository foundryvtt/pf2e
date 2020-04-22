const gulp = require('gulp');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const archiver = require('archiver');
const stringify = require('json-stringify-pretty-compact');
const typescript = require('typescript');
const FormData = require('form-data');
const ky = require('ky-universal');

const ts = require('gulp-typescript');
const less = require('gulp-less');
const sass = require('gulp-sass');
const git = require('gulp-git');

const { argv } = require('yargs');

sass.compiler = require('sass');

function getConfig() {
  const configPath = path.resolve(process.cwd(), 'foundryconfig.json');
  let config;

  if (fs.existsSync(configPath)) {
    config = fs.readJSONSync(configPath);
    return config;
  }
}

function getManifest() {
  const json = {};

  json.root = '';
  const modulePath = path.join(json.root, 'module.json');
  const systemPath = path.join(json.root, 'system.json');

  if (fs.existsSync(modulePath)) {
    json.file = fs.readJSONSync(modulePath);
    json.name = 'module.json';
  } else if (fs.existsSync(systemPath)) {
    json.file = fs.readJSONSync(systemPath);
    json.name = 'system.json';
  } else {
    return;
  }

  return json;
}

/**
 * TypeScript transformers
 * @returns {typescript.TransformerFactory<typescript.SourceFile>}
 */
function createTransformer() {
  /**
   * @param {typescript.Node} node
   */
  function shouldMutateModuleSpecifier(node) {
    if (!typescript.isImportDeclaration(node) && !typescript.isExportDeclaration(node)) return false;
    if (node.moduleSpecifier === undefined) return false;
    if (!typescript.isStringLiteral(node.moduleSpecifier)) return false;
    if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../')) return false;
    if (path.extname(node.moduleSpecifier.text) !== '') return false;
    return true;
  }

  /**
   * Transforms import/export declarations to append `.js` extension
   * @param {typescript.TransformationContext} context
   */
  function importTransformer(context) {
    return (node) => {
      /**
       * @param {typescript.Node} node
       */
      function visitor(node) {
        if (shouldMutateModuleSpecifier(node)) {
          if (typescript.isImportDeclaration(node)) {
            const newModuleSpecifier = typescript.createLiteral(`${node.moduleSpecifier.text}.js`);
            return typescript.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier);
          } if (typescript.isExportDeclaration(node)) {
            const newModuleSpecifier = typescript.createLiteral(`${node.moduleSpecifier.text}.js`);
            return typescript.updateExportDeclaration(node, node.decorators, node.modifiers, node.exportClause, newModuleSpecifier);
          }
        }
        return typescript.visitEachChild(node, visitor, context);
      }

      return typescript.visitNode(node, visitor);
    };
  }

  return importTransformer;
}

const tsConfig = ts.createProject('tsconfig.json', {
  getCustomTransformers: (prgram) => ({
    after: [
      createTransformer(),
    ],
  }),
});

/** ***************** */
/*		BUILD		*/
/** ***************** */

/**
 * Build TypeScript
 */
function buildTS() {
  return gulp.src('src/**/*.ts')
    .pipe(tsConfig())
    .pipe(gulp.dest('dist'));
}

function buildJS() {
  return gulp.src('src/**/*.js')
    .pipe(gulp.dest('dist'));
}

/**
 * Build Less
 */
function buildLess() {
  return gulp.src('src/*.less')
    .pipe(less())
    .pipe(gulp.dest('dist'));
}

/**
   * Build SASS
   */
function buildSASS() {
  return gulp.src('src/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist'));
}

/**
   * Copy static files
   */
async function copyFiles(cb) {
  const statics = [
    'lang',
    'fonts',
    'assets',
    'templates',
    'LICENSE',
    'README.md',
    'module.json',
    'system.json',
    'template.json',
  ];
  try {
    for (const file of statics) {
      if (fs.existsSync(path.join('src', file))) {
        await fs.copy(path.join('src', file), path.join('dist', file));
      }
    }
    if (fs.existsSync(path.join('system.json'))) {
      await fs.copy(path.join('system.json'), path.join('dist', 'system.json'));
    }
    return cb();
  } catch (err) {
    cb(err);
  }
}

/**
 * Watch for changes for each build step
 */
function buildWatch() {
  gulp.watch('src/**/*.ts', { ignoreInitial: false }, buildTS);
  gulp.watch('src/**/*.js', { ignoreInitial: false }, buildJS);
  gulp.watch('src/**/*.less', { ignoreInitial: false }, buildLess);
  gulp.watch('src/**/*.scss', { ignoreInitial: false }, buildSASS);
  gulp.watch(['src/fonts', 'src/templates', 'src/*.json', 'system.json'], { ignoreInitial: false }, copyFiles);
  gulp.watch('dist/**/*', copyToUserData);
}

/** ***************** */
/*		CLEAN		*/
/** ***************** */

/**
 * Remove built files from `dist` folder
 * while ignoring source files
 */
async function clean(cb) {
  const config = fs.readJSONSync('foundryconfig.json');
  const name = config.systemName;
  const files = [];

  files.push(
    'lang',
    'templates',
    'assets',
    'module',
    `${name}.js`,
    'module.json',
    'system.json',
    'template.json',
    'scripts',
    'README.md',
    'LICENSE'
  );
  files.push('system.json');

  // If the project uses Less or SASS
  if (
    fs.existsSync(path.join('src', `${name}.less`))
      || fs.existsSync(path.join('src', `${name}.scss`))
  ) {
    files.push(
      'fonts',
      `${name}.css`,
    );
  }

  console.log(' ', chalk.yellow('Files to clean:'));
  console.log('   ', chalk.blueBright(files.join('\n    ')));

  // Attempt to remove the files
  try {
    for (const filePath of files) {
      await fs.remove(path.join('dist', filePath));
    }
    return cb();
  } catch (err) {
    cb(err);
  }
}

/** ***************** */
/*		COPY		*/
/** ***************** */

/**
 * Copy build to User Data folder
 */
async function copyToUserData(cb) {
  const config = fs.readJSONSync('foundryconfig.json');
  const name = config.systemName;

  let destDir;
  try {
    if (fs.existsSync(path.resolve('.', 'dist', 'module.json'))
        || fs.existsSync(path.resolve('.', 'src', 'module.json'))) {
      destDir = 'modules';
    } else if (fs.existsSync(path.resolve('.', 'dist', 'system.json'))
               || fs.existsSync(path.resolve('.', 'src', 'system.json'))) {
      destDir = 'systems';
    } else {
      throw Error(`Could not find ${chalk.blueBright('module.json')} or ${chalk.blueBright('system.json')}`);
    }

    let linkDir;
    if (config.dataPath) {
      if (!fs.existsSync(path.join(config.dataPath, 'Data'))) throw Error('User Data path invalid, no Data directory found');

      linkDir = path.join(config.dataPath, 'Data', destDir, name);
    } else {
      throw Error('No User Data path defined in foundryconfig.json');
    }

    if (argv.clean || argv.c) {
      console.log(chalk.yellow(`Removing build in ${chalk.blueBright(linkDir)}`));

      await fs.remove(linkDir);
    } else {
      console.log(chalk.green(`Copying build to ${chalk.blueBright(linkDir)}`));

      await fs.emptyDir(linkDir);
      await fs.copy('dist', linkDir);
    }
    return cb();
  } catch (err) {
    cb(err);
  }
}

/** ****************** */
/*		PACKAGE		 */
/** ****************** */

/**
 * Package build
 */
async function packageBuild(cb, version) {
  const manifest = getManifest();

  // Remove the package dir without doing anything else
  if (argv.clean || argv.c) {
    console.log(chalk.yellow('Removing all packaged files'));
    await fs.remove('package');
    return;
  }

  // Ensure there is a directory to hold all the packaged versions
  await fs.ensureDir('package');

  await updateManifest('', version);
  await copyFiles(() => {});

  // Initialize the zip file
  const zipName = `${manifest.file.name}-v${version || manifest.file.version}.zip`;
  const zipFile = fs.createWriteStream(path.join('package', zipName));
  const zip = archiver('zip', { zlib: { level: 9 } });

  zipFile.on('close', () => {
    console.log(chalk.green(`${zip.pointer()} total bytes`));
    console.log(chalk.green(`Zip file ${zipName} has been written`));
    return cb(zipName, version);
  });

  zip.on('error', (err) => {
    throw err;
  });

  zip.pipe(zipFile);

  // Add the directory with the final code
  zip.directory('dist/', manifest.file.name);

  zip.finalize();
}

/** ****************** */
/*		PACKAGE		 */
/** ****************** */

/**
 * Update version and URLs in the manifest JSON
 */
function updateManifest(zipUrl, version) {
  const packageJson = fs.readJSONSync('package.json');
  const config = getConfig();
  const manifest = getManifest();
  const { rawURL } = config;
  const { branch } = config;
  const repoURL = config.repository;
  const manifestRoot = manifest.root;

  if (!config) throw Error(chalk.red('foundryconfig.json not found'));
  if (!manifest) throw Error(chalk.red('Manifest JSON not found'));
  if (!rawURL || !repoURL) throw (Error(chalk.red('Repository URLs not configured in foundryconfig.json')));

  const targetVersion = version || nextVersion();

  console.log(`Updating version number to '${targetVersion}'`);

  packageJson.version = targetVersion;
  manifest.file.version = targetVersion;

  /* Update URLs */

  manifest.file.url = repoURL;
  manifest.file.manifest = `${rawURL}/${branch}/${manifest.name}`;
  manifest.file.download = zipUrl;

  const prettyProjectJson = stringify(manifest.file, { maxLength: 35 });

  fs.writeJSONSync('package.json', packageJson, { spaces: 2 });
  fs.writeFileSync(path.join(manifest.root, manifest.name), prettyProjectJson, 'utf8');
}

function gitAdd() {
  return gulp.src('.')
    .pipe(git.add({ args: '--no-all' }));
}

function gitCommit() {
  return gulp.src('./*')
    .pipe(git.commit(`v${getManifest().file.version}`, { args: '-a', disableAppendPaths: true }));
}

function gitTag() {
  const manifest = getManifest();
  return git.tag(`v${manifest.file.version}`, `Updated to ${manifest.file.version}`, (err) => {
    if (err) throw err;
  });
}

const execGit = gulp.series(gitAdd, gitCommit, gitTag);

const execBuild = gulp.parallel(buildTS, buildJS, buildLess, buildSASS, copyFiles);

async function releaseAndTag(zipFile, version) {
  const config = getConfig();
  const token = config.gitlabToken;
  const gitlabId = config.gitlabProjectId;
  const form = new FormData();
  const file = fs.createReadStream(`package/${zipFile}`);
  form.append('file', file, zipFile);
  console.log('Uploading to Gitlab');
  const response = await ky.post(`https://gitlab.com/api/v4/projects/${gitlabId}/uploads`,
    {
      body: form,
      headers: {
        'PRIVATE-TOKEN': token,
      },
      timeout: false,
    });
  const parsed = await response.json();
  console.log(parsed);
  const zipUrl = `${config.repository}${parsed.url}`;
  console.log(`Uploaded to ${zipUrl}`);
  updateManifest(zipUrl, version);
  execGit();
}
function nextVersion() {
  const manifest = getManifest();
  const version = argv.update || argv.u;

  /* Update version */

  const versionMatch = /^(\d{1,}).(\d{1,}).(\d{1,})$/;
  const currentVersion = manifest.file.version;
  let targetVersion = '';

  if (!version) {
    throw Error('Missing version number');
  }

  if (versionMatch.test(version)) {
    targetVersion = version;
  } else {
    targetVersion = currentVersion.replace(versionMatch, (substring, major, minor, patch) => {
      if (version === 'major') {
        return `${Number(major) + 1}.0.0`;
      } if (version === 'minor') {
        return `${major}.${Number(minor) + 1}.0`;
      } if (version === 'patch') {
        return `${major}.${minor}.${Number(minor) + 1}`;
      }
      return '';
    });
  }

  if (targetVersion === '') {
    throw Error(chalk.red('Error: Incorrect version arguments.'));
  }

  if (targetVersion === currentVersion) {
    throw Error(chalk.red('Error: Target version is identical to current version.'));
  }
  return targetVersion;
}
async function packageThenGit() {
  await packageBuild(releaseAndTag, nextVersion());
}

exports.build = gulp.series(clean, execBuild);
exports.watch = buildWatch;
exports.clean = clean;
exports.copy = copyToUserData;
exports.package = packageBuild;
exports.packageThenGit = packageThenGit;
exports.publish = gulp.series(clean, execBuild, packageThenGit);
