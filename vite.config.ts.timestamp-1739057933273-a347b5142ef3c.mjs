// vite.config.ts
import { svelte as sveltePlugin } from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import { execSync } from "child_process";
import esbuild from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/esbuild/lib/main.js";
import fs from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/fs-extra/lib/index.js";
import Glob from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/glob/glob.js";
import path from "path";
import Peggy from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/peggy/lib/peg.js";
import * as Vite from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/vite/dist/node/index.js";
import checker from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/vite-plugin-checker/dist/esm/main.js";
import { viteStaticCopy } from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/vite-plugin-static-copy/dist/index.js";
import tsconfigPaths from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/vite-tsconfig-paths/dist/index.js";

// package.json
var package_default = {
  name: "foundry-pf2e",
  version: "6.8.5",
  description: "",
  private: true,
  type: "module",
  scripts: {
    build: "npm run clean && npm run build:packs && vite build",
    "build:packs": "tsx ./build/build-packs.ts",
    "build:packs:json": "tsx ./build/build-packs.ts json",
    "build:conditions": "tsx ./build/conditions.ts",
    clean: "tsx ./build/clean.ts",
    watch: "npm run clean && npm run build:packs && vite build --watch --mode development",
    hot: "vite serve",
    link: "tsx ./build/link-foundry.ts",
    extractPacks: "tsx ./build/extract-packs.ts",
    pretest: "npm run lint",
    test: "jest",
    migrate: "tsx ./build/run-migration.ts",
    lint: "npm run lint:ts && npm run lint:json && npm run prettier:scss-svelte",
    "lint:ts": "eslint ./build ./src ./tests ./types",
    "prettier:scss-svelte": "prettier --check src/styles src/**/*.svelte",
    "lint:json": "eslint -c eslint.json.config.js",
    "lint:fix": "eslint ./build ./src ./tests ./types --fix && prettier --write src/styles src/**/*.svelte"
  },
  author: "The PF2e System Developers",
  license: "Apache-2.0",
  engines: {
    node: ">=20.15.0"
  },
  devDependencies: {
    "@eslint/js": "^9.13.0",
    "@pixi/graphics-smooth": "^1.1.0",
    "@pixi/particle-emitter": "5.0.8",
    "@sveltejs/vite-plugin-svelte": "^4.0.4",
    "@types/eslint__js": "^8.42.3",
    "@types/fs-extra": "^11.0.4",
    "@types/glob": "^8.1.0",
    "@types/jest": "^29.5.14",
    "@types/jquery": "^3.5.32",
    "@types/jsdom": "^21.1.7",
    "@types/luxon": "^3.4.2",
    "@types/node": "^20.16.13",
    "@types/prompts": "^2.4.9",
    "@types/showdown": "^2.0.6",
    "@types/sortablejs": "^1.15.8",
    "@types/tooltipster": "^0.0.35",
    "@types/uuid": "^10.0.0",
    "@types/yaireo__tagify": "4.17.0",
    "@typescript-eslint/eslint-plugin": "^8.14.0",
    "@typescript-eslint/parser": "^8.14.0",
    "classic-level": "^1.3.0",
    "es-jest": "^2.1.0",
    eslint: "^9.13.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-jest": "^28.9.0",
    "eslint-plugin-json": "^4.0.1",
    "eslint-plugin-prettier": "^5.2.1",
    "fs-extra": "^11.2.0",
    gsap: "3.11.5",
    handlebars: "4.7.8",
    jest: "^29.7.0",
    "jest-each": "^29.7.0",
    "js-angusj-clipper": "^1.3.1",
    jsdom: "^25.0.1",
    "node-glob": "^1.2.0",
    peggy: "^4.1.1",
    "pixi.js": "^7.4.2",
    prettier: "^3.3.3",
    "prettier-plugin-svelte": "^3.3.3",
    prompts: "^2.4.2",
    "prosemirror-commands": "^1.5.2",
    "prosemirror-view": "^1.33.6",
    sass: "^1.81.0",
    "socket.io": "4.7.5",
    "socket.io-client": "4.7.5",
    "svelte-preprocess": "^6.0.3",
    tinymce: "6.8.4",
    "tsconfig-paths": "^4.2.0",
    tsx: "^4.19.2",
    typescript: "^5.3.3",
    "typescript-eslint": "^8.14.0",
    vite: "^5.4.11",
    "vite-plugin-checker": "^0.8.0",
    "vite-plugin-static-copy": "^2.1.0",
    "vite-tsconfig-paths": "^5.1.2",
    yargs: "^17.7.2"
  },
  dependencies: {
    "@codemirror/autocomplete": "^6.18.3",
    "@codemirror/lang-json": "^6.0.1",
    "@yaireo/tagify": "4.16.4",
    codemirror: "^6.0.1",
    luxon: "^3.5.0",
    minisearch: "^7.1.0",
    nouislider: "^15.8.1",
    remeda: "^2.17.3",
    sortablejs: "^1.15.3",
    svelecte: "^5.1.4",
    svelte: "^5.19.0",
    uuid: "^11.0.3"
  }
};

// src/util/misc.ts
import * as R from "file:///G:/Programming/FoundryVTT/pf2e/node_modules/remeda/dist/index.js";
var wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
var nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
var nonWordBoundary = String.raw`(?=^|$|${wordCharacter})`;
var lowerCaseLetter = String.raw`\p{Lowercase_Letter}`;
var upperCaseLetter = String.raw`\p{Uppercase_Letter}`;
var nonWordCharacterRE = new RegExp(nonWordCharacter, "gu");
var lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, "gu");
var nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu;
var upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|${nonWordCharacter}${lowerCaseLetter}`, "gu");
function sluggify(text, { camel = null } = {}) {
  if (typeof text !== "string") {
    console.warn("Non-string argument passed to `sluggify`");
    return "";
  }
  if (text === "-") return text;
  switch (camel) {
    case null:
      return text.replace(lowerCaseThenUpperCaseRE, "$1-$2").toLowerCase().replace(/['’]/g, "").replace(nonWordCharacterRE, " ").trim().replace(/[-\s]+/g, "-");
    case "bactrian": {
      const dromedary = sluggify(text, { camel: "dromedary" });
      return dromedary.charAt(0).toUpperCase() + dromedary.slice(1);
    }
    case "dromedary":
      return text.replace(nonWordCharacterHyphenOrSpaceRE, "").replace(/[-_]+/g, " ").replace(
        upperOrWordBoundariedLowerRE,
        (part, index) => index === 0 ? part.toLowerCase() : part.toUpperCase()
      ).replace(/\s+/g, "");
    default:
      throw ErrorPF2e("I don't think that's a real camel.");
  }
}
function ErrorPF2e(message) {
  return Error(`PF2e System | ${message}`);
}

// static/system.json
var system_default = {
  id: "pf2e",
  title: "Pathfinder Second Edition",
  description: "A community contributed game system for Pathfinder Second Edition",
  version: "6.8.5",
  license: "./LICENSE",
  compatibility: {
    minimum: "12.328",
    verified: "12.331",
    maximum: "13"
  },
  authors: [
    {
      name: "The PF2e System Developers",
      url: "https://github.com/foundryvtt/pf2e",
      flags: {}
    }
  ],
  esmodules: [
    "vendor.mjs",
    "pf2e.mjs"
  ],
  scripts: [
    "greensock/dist/gsap.min.js",
    "lib/tooltipster.bundle.min.js"
  ],
  styles: [
    "styles/pf2e.css"
  ],
  grid: {
    distance: 5,
    units: "ft",
    diagonals: 4
  },
  documentTypes: {
    RegionBehavior: {
      environment: {},
      environmentFeature: {}
    }
  },
  packs: [
    {
      name: "abomination-vaults-bestiary",
      label: "Abomination Vaults",
      path: "packs/abomination-vaults-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "age-of-ashes-bestiary",
      label: "Age of Ashes",
      path: "packs/age-of-ashes-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "agents-of-edgewatch-bestiary",
      label: "Agents of Edgewatch",
      path: "packs/agents-of-edgewatch-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "book-of-the-dead-bestiary",
      label: "Book of the Dead",
      path: "packs/book-of-the-dead-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "blood-lords-bestiary",
      label: "Blood Lords",
      path: "packs/blood-lords-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "blog-bestiary",
      label: "Paizo Blog",
      path: "packs/blog-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "curtain-call-bestiary",
      label: "Curtain Call",
      path: "packs/curtain-call-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "extinction-curse-bestiary",
      label: "Extinction Curse",
      path: "packs/extinction-curse-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "fall-of-plaguestone-bestiary",
      label: "Fall of Plaguestone",
      path: "packs/fall-of-plaguestone",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "fists-of-the-ruby-phoenix-bestiary",
      label: "Fists of the Ruby Phoenix",
      path: "packs/fists-of-the-ruby-phoenix-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "hazards",
      label: "Hazards (Rulebooks)",
      path: "packs/hazards",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "howl-of-the-wild-bestiary",
      label: "Howl of the Wild",
      path: "packs/howl-of-the-wild-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "gatewalkers-bestiary",
      label: "Gatewalkers",
      path: "packs/gatewalkers-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "lost-omens-impossible-lands-bestiary",
      label: "Lost Omens: Impossible Lands",
      path: "packs/impossible-lands-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "lost-omens-mwangi-expanse-bestiary",
      label: "Lost Omens: Mwangi Expanse",
      path: "packs/mwangi-expanse-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "lost-omens-highhelm-bestiary",
      label: "Lost Omens: Highhelm",
      path: "packs/highhelm-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "lost-omens-monsters-of-myth-bestiary",
      label: "Lost Omens: Monsters of Myth",
      path: "packs/monsters-of-myth-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "lost-omens-tian-xia-world-guide",
      label: "Lost Omens: Tian Xia World Guide",
      path: "packs/tian-xia-world-guide-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "lost-omens-travel-guide-bestiary",
      label: "Lost Omens: Travel Guide",
      path: "packs/travel-guide-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "malevolence-bestiary",
      label: "Malevolence",
      path: "packs/malevolence-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "menace-under-otari-bestiary",
      label: "Menace Under Otari",
      path: "packs/menace-under-otari-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "npc-gallery",
      label: "NPC Gallery",
      path: "packs/npc-gallery",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "one-shot-bestiary",
      label: "One-Shots",
      path: "packs/one-shot-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "outlaws-of-alkenstar-bestiary",
      label: "Outlaws of Alkenstar",
      path: "packs/outlaws-of-alkenstar-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "kingmaker-bestiary",
      label: "Kingmaker",
      path: "packs/kingmaker-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pathfinder-bestiary",
      label: "Bestiary 1",
      path: "packs/pathfinder-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pathfinder-bestiary-2",
      label: "Bestiary 2",
      path: "packs/pathfinder-bestiary-2",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pathfinder-bestiary-3",
      label: "Bestiary 3",
      path: "packs/pathfinder-bestiary-3",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pathfinder-monster-core",
      label: "Monster Core",
      path: "packs/pathfinder-monster-core",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pathfinder-dark-archive",
      label: "Dark Archive",
      path: "packs/pathfinder-dark-archive",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-introductions-bestiary",
      label: "Introductions",
      path: "packs/pfs-introductions-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-season-1-bestiary",
      label: "Season 1",
      path: "packs/pfs-season-1-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-season-2-bestiary",
      label: "Season 2",
      path: "packs/pfs-season-2-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-season-3-bestiary",
      label: "Season 3",
      path: "packs/pfs-season-3-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-season-4-bestiary",
      label: "Season 4",
      path: "packs/pfs-season-4-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-season-5-bestiary",
      label: "Season 5",
      path: "packs/pfs-season-5-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pfs-season-6-bestiary",
      label: "Season 6",
      path: "packs/pfs-season-6-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "prey-for-death-bestiary",
      label: "Prey for Death",
      path: "packs/prey-for-death-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "quest-for-the-frozen-flame-bestiary",
      label: "Quest for the Frozen Flame",
      path: "packs/quest-for-the-frozen-flame-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "rusthenge-bestiary",
      label: "Rusthenge",
      path: "packs/rusthenge-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "season-of-ghosts-bestiary",
      label: "Season of Ghosts",
      path: "packs/season-of-ghosts-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "seven-dooms-for-sandpoint-bestiary",
      label: "Seven Dooms for Sandpoint",
      path: "packs/seven-dooms-for-sandpoint-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "shadows-at-sundown-bestiary",
      label: "Shadows at Sundown",
      path: "packs/shadows-at-sundown-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "sky-kings-tomb-bestiary",
      label: "Sky King's Tomb",
      path: "packs/sky-kings-tomb-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "spore-war-bestiary",
      label: "Spore War",
      path: "packs/spore-war-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "strength-of-thousands-bestiary",
      label: "Strength of Thousands",
      path: "packs/strength-of-thousands-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "the-enmity-cycle-bestiary",
      label: "The Enmity Cycle",
      path: "packs/the-enmity-cycle-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "the-slithering-bestiary",
      label: "The Slithering",
      path: "packs/the-slithering-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "triumph-of-the-tusk-bestiary",
      label: "Triumph of the Tusk",
      path: "packs/triumph-of-the-tusk-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "troubles-in-otari-bestiary",
      label: "Troubles in Otari",
      path: "packs/troubles-in-otari-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "night-of-the-gray-death-bestiary",
      label: "Night of the Gray Death",
      path: "packs/night-of-the-gray-death-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "crown-of-the-kobold-king-bestiary",
      label: "Crown of the Kobold King",
      path: "packs/crown-of-the-kobold-king-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "stolen-fate-bestiary",
      label: "Stolen Fate",
      path: "packs/stolen-fate-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "rage-of-elements-bestiary",
      label: "Rage of Elements",
      path: "packs/rage-of-elements-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "wardens-of-wildwood-bestiary",
      label: "Wardens of Wildwood",
      path: "packs/wardens-of-wildwood-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "war-of-immortals-bestiary",
      label: "War of Immortals",
      path: "packs/war-of-immortals-bestiary",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "vehicles",
      label: "Vehicles",
      path: "packs/vehicles",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "actionspf2e",
      label: "Actions",
      path: "packs/actions",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "ancestries",
      label: "Ancestries",
      path: "packs/ancestries",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "ancestryfeatures",
      label: "Ancestry Features",
      path: "packs/ancestryfeatures",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "backgrounds",
      label: "Backgrounds",
      path: "packs/backgrounds",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "classes",
      label: "Classes",
      path: "packs/classes",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "classfeatures",
      label: "Class Features",
      path: "packs/classfeatures",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "familiar-abilities",
      label: "Familiar Abilities",
      path: "packs/familiar-abilities",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "feats-srd",
      label: "Feats",
      path: "packs/feats",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "heritages",
      label: "Heritages",
      path: "packs/heritages",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "spells-srd",
      label: "Spells",
      path: "packs/spells",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "bestiary-effects",
      label: "Bestiary Effects",
      path: "packs/bestiary-effects",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "boons-and-curses",
      label: "Divine Intercessions",
      path: "packs/boons-and-curses",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "conditionitems",
      label: "Conditions",
      path: "packs/conditions",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "campaign-effects",
      label: "Campaign Effects",
      path: "packs/campaign-effects",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "equipment-effects",
      label: "Equipment Effects",
      path: "packs/equipment-effects",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "other-effects",
      label: "Other Effects",
      path: "packs/other-effects",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "feat-effects",
      label: "Feat/Feature Effects",
      path: "packs/feat-effects",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pathfinder-society-boons",
      label: "Pathfinder Society Boons",
      path: "packs/pathfinder-society-boons",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "spell-effects",
      label: "Spell Effects",
      path: "packs/spell-effects",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "equipment-srd",
      label: "Equipment",
      path: "packs/equipment",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/blue.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "deities",
      label: "Deities",
      path: "packs/deities",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "iconics",
      label: "Iconics",
      path: "packs/iconics",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "paizo-pregens",
      label: "Adventure Pregens",
      path: "packs/paizo-pregens",
      type: "Actor",
      banner: "systems/pf2e/assets/compendium-banner/red.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "rollable-tables",
      label: "Rollable Tables",
      path: "packs/rollable-tables",
      type: "RollTable",
      banner: "systems/pf2e/assets/compendium-banner/orange.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "criticaldeck",
      label: "Critical Hit/Fumble Deck",
      path: "packs/criticaldeck",
      type: "JournalEntry",
      banner: "systems/pf2e/assets/compendium-banner/orange.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "journals",
      label: "PF2e Journals",
      path: "packs/journals",
      type: "JournalEntry",
      banner: "systems/pf2e/assets/compendium-banner/orange.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "action-macros",
      label: "Action Macros",
      path: "packs/action-macros",
      type: "Macro",
      banner: "systems/pf2e/assets/compendium-banner/orange.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "pf2e-macros",
      label: "PF2e Macros",
      path: "packs/macros",
      type: "Macro",
      banner: "systems/pf2e/assets/compendium-banner/orange.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "bestiary-ability-glossary-srd",
      label: "Bestiary Ability Glossary",
      path: "packs/bestiary-ability-glossary-srd",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "bestiary-family-ability-glossary",
      label: "Creature Family Ability Glossary",
      path: "packs/bestiary-family-ability-glossary",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "adventure-specific-actions",
      label: "Adventure-Specific Actions",
      path: "packs/adventure-specific-actions",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/green.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "LIMITED",
        ASSISTANT: "OWNER"
      },
      flags: {}
    },
    {
      name: "kingmaker-features",
      label: "Kingmaker Features",
      path: "packs/kingmaker-features",
      type: "Item",
      banner: "systems/pf2e/assets/compendium-banner/orange.webp",
      system: "pf2e",
      ownership: {
        PLAYER: "OBSERVER",
        ASSISTANT: "OWNER"
      },
      flags: {}
    }
  ],
  packFolders: [
    {
      name: "Bestiaries",
      sorting: "m",
      color: "#3b2524",
      folders: [
        {
          name: "Adventure Paths",
          sorting: "m",
          color: "#573938",
          packs: [
            "abomination-vaults-bestiary",
            "age-of-ashes-bestiary",
            "agents-of-edgewatch-bestiary",
            "blood-lords-bestiary",
            "curtain-call-bestiary",
            "extinction-curse-bestiary",
            "fists-of-the-ruby-phoenix-bestiary",
            "gatewalkers-bestiary",
            "outlaws-of-alkenstar-bestiary",
            "kingmaker-bestiary",
            "quest-for-the-frozen-flame-bestiary",
            "season-of-ghosts-bestiary",
            "seven-dooms-for-sandpoint-bestiary",
            "sky-kings-tomb-bestiary",
            "spore-war-bestiary",
            "strength-of-thousands-bestiary",
            "stolen-fate-bestiary",
            "triumph-of-the-tusk-bestiary",
            "wardens-of-wildwood-bestiary"
          ]
        },
        {
          name: "Rulebooks",
          sorting: "m",
          color: "#573938",
          packs: [
            "pathfinder-dark-archive",
            "book-of-the-dead-bestiary",
            "rage-of-elements-bestiary",
            "hazards",
            "howl-of-the-wild-bestiary",
            "lost-omens-impossible-lands-bestiary",
            "lost-omens-highhelm-bestiary",
            "lost-omens-mwangi-expanse-bestiary",
            "lost-omens-monsters-of-myth-bestiary",
            "lost-omens-tian-xia-world-guide",
            "lost-omens-travel-guide-bestiary",
            "war-of-immortals-bestiary",
            "npc-gallery",
            "vehicles",
            "blog-bestiary"
          ]
        },
        {
          name: "Standalone Adventures",
          sorting: "m",
          color: "#573938",
          packs: [
            "fall-of-plaguestone-bestiary",
            "malevolence-bestiary",
            "menace-under-otari-bestiary",
            "one-shot-bestiary",
            "prey-for-death-bestiary",
            "rusthenge-bestiary",
            "shadows-at-sundown-bestiary",
            "the-enmity-cycle-bestiary",
            "the-slithering-bestiary",
            "troubles-in-otari-bestiary",
            "night-of-the-gray-death-bestiary",
            "crown-of-the-kobold-king-bestiary"
          ]
        },
        {
          name: "Pathfinder Society",
          sorting: "m",
          color: "#573938",
          packs: [
            "pfs-introductions-bestiary",
            "pfs-season-1-bestiary",
            "pfs-season-2-bestiary",
            "pfs-season-3-bestiary",
            "pfs-season-4-bestiary",
            "pfs-season-5-bestiary",
            "pfs-season-6-bestiary"
          ]
        }
      ],
      packs: [
        "pathfinder-bestiary",
        "pathfinder-bestiary-2",
        "pathfinder-bestiary-3",
        "pathfinder-monster-core"
      ]
    },
    {
      name: "Pregenerated PCs",
      sorting: "m",
      color: "#3b2524",
      packs: [
        "iconics",
        "paizo-pregens"
      ]
    },
    {
      name: "Effects",
      sorting: "m",
      color: "#2f3339",
      packs: [
        "bestiary-effects",
        "conditionitems",
        "campaign-effects",
        "equipment-effects",
        "feat-effects",
        "other-effects",
        "spell-effects"
      ]
    },
    {
      name: "Character Building",
      sorting: "m",
      color: "#343c33",
      packs: [
        "actionspf2e",
        "ancestries",
        "ancestryfeatures",
        "backgrounds",
        "classes",
        "classfeatures",
        "deities",
        "equipment-srd",
        "familiar-abilities",
        "feats-srd",
        "heritages",
        "spells-srd",
        "kingmaker-features"
      ]
    },
    {
      name: "GM Tools",
      sorting: "m",
      color: "#181818",
      packs: [
        "adventure-specific-actions",
        "boons-and-curses",
        "pathfinder-society-boons",
        "bestiary-ability-glossary-srd",
        "bestiary-family-ability-glossary",
        "rollable-tables"
      ]
    },
    {
      name: "Macros",
      sorting: "m",
      color: "#181818",
      packs: [
        "action-macros",
        "pf2e-macros"
      ]
    },
    {
      name: "Journals",
      sorting: "m",
      color: "#181818",
      packs: [
        "criticaldeck",
        "domains",
        "journals"
      ]
    }
  ],
  languages: [
    {
      lang: "en",
      name: "Main (English)",
      path: "lang/en.json",
      flags: {}
    },
    {
      lang: "en",
      name: "Actions (English)",
      path: "lang/action-en.json",
      flags: {}
    },
    {
      lang: "en",
      name: "Rules Elements (English)",
      path: "lang/re-en.json",
      flags: {}
    },
    {
      lang: "en",
      name: "Kingmaker (English)",
      path: "lang/kingmaker-en.json",
      flags: {}
    }
  ],
  socket: true,
  initiative: "1d20 + @attributes.perception.value + (@abilities.wis.value / 100)",
  primaryTokenAttribute: "attributes.hp",
  url: "https://github.com/foundryvtt/pf2e",
  bugs: "https://github.com/foundryvtt/pf2e/issues",
  changelog: "https://github.com/foundryvtt/pf2e/blob/release/CHANGELOG.md",
  manifest: "https://github.com/foundryvtt/pf2e/releases/latest/download/system.json",
  download: "https://github.com/foundryvtt/pf2e/releases/latest/download/pf2e.zip"
};

// vite.config.ts
var __vite_injected_original_dirname = "G:\\Programming\\FoundryVTT\\pf2e";
var CONDITION_SOURCES = (() => {
  const output = execSync("npm run build:conditions", { encoding: "utf-8" });
  return JSON.parse(output.slice(output.indexOf("[")));
})();
var EN_JSON = JSON.parse(fs.readFileSync("./static/lang/en.json", { encoding: "utf-8" }));
var FOUNDRY_CONFIG = fs.existsSync("./foundryconfig.json") ? JSON.parse(fs.readFileSync("./foundryconfig.json", { encoding: "utf-8" })) : null;
var port = Number(FOUNDRY_CONFIG?.port) || 30001;
var foundryPort = Number(FOUNDRY_CONFIG?.foundryPort) || 3e4;
console.log(`Connecting to foundry hosted at http://localhost:${foundryPort}/`);
function getUuidRedirects() {
  const redirectJSON = JSON.parse(fs.readFileSync(path.resolve(__vite_injected_original_dirname, "build/uuid-redirects.json"), "utf-8"));
  for (const [from, to] of Object.entries(redirectJSON)) {
    const [, , pack, documentType, name] = to.split(".", 5);
    const packDir = system_default.packs.find((p) => p.type === documentType && p.name === pack)?.path;
    const dirPath = path.resolve(__vite_injected_original_dirname, packDir ?? "");
    const filename = `${sluggify(name)}.json`;
    const jsonPath = fs.existsSync(path.resolve(dirPath, filename)) ? path.resolve(dirPath, filename) : Glob.sync(path.resolve(dirPath, "**", filename)).at(0);
    if (!jsonPath) throw new Error(`Failure looking up pack JSON for ${to}`);
    const docJSON = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const id = docJSON._id;
    if (!id) throw new Error(`No UUID redirect match found for ${documentType} ${name} in ${pack}`);
    redirectJSON[from] = `Compendium.pf2e.${pack}.${documentType}.${id}`;
  }
  return redirectJSON;
}
var config = Vite.defineConfig(({ command, mode }) => {
  const buildMode = mode === "production" ? "production" : "development";
  const outDir = "dist";
  const rollGrammar = fs.readFileSync("roll-grammar.peggy", { encoding: "utf-8" });
  const ROLL_PARSER = Peggy.generate(rollGrammar, { output: "source" }).replace(
    'return {\n    StartRules: ["Expression"],\n    SyntaxError: peg$SyntaxError,\n    parse: peg$parse\n  };',
    'AbstractDamageRoll.parser = { StartRules: ["Expression"], SyntaxError: peg$SyntaxError, parse: peg$parse };'
  );
  const plugins = [checker({ typescript: true }), tsconfigPaths({ loose: true }), sveltePlugin()];
  if (buildMode === "production") {
    plugins.push(
      {
        name: "minify",
        renderChunk: {
          order: "post",
          async handler(code, chunk) {
            return chunk.fileName.endsWith(".mjs") ? esbuild.transform(code, {
              keepNames: true,
              minifyIdentifiers: false,
              minifySyntax: true,
              minifyWhitespace: true
            }) : code;
          }
        }
      },
      ...viteStaticCopy({
        targets: [
          { src: "CHANGELOG.md", dest: "." },
          { src: "README.md", dest: "." },
          { src: "CONTRIBUTING.md", dest: "." }
        ]
      })
    );
  } else {
    plugins.push(
      // Foundry expects all esm files listed in system.json to exist: create empty vendor module when in dev mode
      {
        name: "touch-vendor-mjs",
        apply: "build",
        writeBundle: {
          async handler() {
            fs.closeSync(fs.openSync(path.resolve(outDir, "vendor.mjs"), "w"));
          }
        }
      },
      // Vite HMR is only preconfigured for css files: add handler for HBS templates and localization JSON
      {
        name: "hmr-handler",
        apply: "serve",
        handleHotUpdate(context) {
          if (context.file.startsWith(outDir)) return;
          if (context.file.endsWith("en.json")) {
            const basePath = context.file.slice(context.file.indexOf("lang/"));
            console.log(`Updating lang file at ${basePath}`);
            fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
              context.server.ws.send({
                type: "custom",
                event: "lang-update",
                data: { path: `systems/pf2e/${basePath}` }
              });
            });
          } else if (context.file.endsWith(".hbs")) {
            const basePath = context.file.slice(context.file.indexOf("templates/"));
            console.log(`Updating template file at ${basePath}`);
            fs.promises.copyFile(context.file, `${outDir}/${basePath}`).then(() => {
              context.server.ws.send({
                type: "custom",
                event: "template-update",
                data: { path: `systems/pf2e/${basePath}` }
              });
            });
          }
        }
      }
    );
  }
  if (command === "serve") {
    const message = "This file is for a running vite dev server and is not copied to a build";
    fs.writeFileSync("./index.html", `<h1>${message}</h1>
`);
    if (!fs.existsSync("./styles")) fs.mkdirSync("./styles");
    fs.writeFileSync("./styles/pf2e.css", `/** ${message} */
`);
    fs.writeFileSync("./pf2e.mjs", `/** ${message} */

import "./src/pf2e.ts";
`);
    fs.writeFileSync("./vendor.mjs", `/** ${message} */
`);
  }
  const reEscape = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return {
    base: command === "build" ? "./" : "/systems/pf2e/",
    publicDir: "static",
    define: {
      BUILD_MODE: JSON.stringify(buildMode),
      CONDITION_SOURCES: JSON.stringify(CONDITION_SOURCES),
      EN_JSON: JSON.stringify(EN_JSON),
      ROLL_PARSER: JSON.stringify(ROLL_PARSER),
      UUID_REDIRECTS: JSON.stringify(getUuidRedirects()),
      fu: "foundry.utils"
    },
    esbuild: { keepNames: true },
    build: {
      outDir,
      emptyOutDir: false,
      // Fails if world is running due to compendium locks: handled with `npm run clean`
      minify: false,
      sourcemap: buildMode === "development",
      lib: {
        name: "pf2e",
        entry: "src/pf2e.ts",
        formats: ["es"],
        fileName: "pf2e"
      },
      rollupOptions: {
        external: new RegExp(
          [
            "(?:",
            reEscape("../../icons/weapons/"),
            "[-a-z/]+",
            reEscape(".webp"),
            "|",
            reEscape("../ui/parchment.jpg"),
            ")$"
          ].join("")
        ),
        output: {
          assetFileNames: ({ name }) => name === "style.css" ? "styles/pf2e.css" : name ?? "",
          chunkFileNames: "[name].mjs",
          entryFileNames: "pf2e.mjs",
          manualChunks: {
            vendor: buildMode === "production" ? Object.keys(package_default.dependencies) : []
          }
        },
        watch: { buildDelay: 100 }
      },
      target: "es2022"
    },
    server: {
      port,
      open: "/game",
      proxy: {
        "^(?!/systems/pf2e/)": `http://localhost:${foundryPort}/`,
        "/socket.io": {
          target: `ws://localhost:${foundryPort}`,
          ws: true
        }
      }
    },
    plugins,
    css: { devSourcemap: buildMode === "development" }
  };
});
var vite_config_default = config;
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicGFja2FnZS5qc29uIiwgInNyYy91dGlsL21pc2MudHMiLCAic3RhdGljL3N5c3RlbS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRzpcXFxcUHJvZ3JhbW1pbmdcXFxcRm91bmRyeVZUVFxcXFxwZjJlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxQcm9ncmFtbWluZ1xcXFxGb3VuZHJ5VlRUXFxcXHBmMmVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0c6L1Byb2dyYW1taW5nL0ZvdW5kcnlWVFQvcGYyZS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB0eXBlIHsgQ29uZGl0aW9uU291cmNlIH0gZnJvbSBcIkBpdGVtL2Jhc2UvZGF0YS9pbmRleC50c1wiO1xuaW1wb3J0IHsgc3ZlbHRlIGFzIHN2ZWx0ZVBsdWdpbiB9IGZyb20gXCJAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlXCI7XG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgZXNidWlsZCBmcm9tIFwiZXNidWlsZFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmcy1leHRyYVwiO1xuaW1wb3J0IEdsb2IgZnJvbSBcImdsb2JcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgUGVnZ3kgZnJvbSBcInBlZ2d5XCI7XG5pbXBvcnQgKiBhcyBWaXRlIGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgY2hlY2tlciBmcm9tIFwidml0ZS1wbHVnaW4tY2hlY2tlclwiO1xuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tIFwidml0ZS1wbHVnaW4tc3RhdGljLWNvcHlcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5pbXBvcnQgcGFja2FnZUpTT04gZnJvbSBcIi4vcGFja2FnZS5qc29uXCI7XG5pbXBvcnQgeyBzbHVnZ2lmeSB9IGZyb20gXCIuL3NyYy91dGlsL21pc2MudHNcIjtcbmltcG9ydCBzeXN0ZW1KU09OIGZyb20gXCIuL3N0YXRpYy9zeXN0ZW0uanNvblwiO1xuXG5jb25zdCBDT05ESVRJT05fU09VUkNFUyA9ICgoKTogQ29uZGl0aW9uU291cmNlW10gPT4ge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNTeW5jKFwibnBtIHJ1biBidWlsZDpjb25kaXRpb25zXCIsIHsgZW5jb2Rpbmc6IFwidXRmLThcIiB9KTtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShvdXRwdXQuc2xpY2Uob3V0cHV0LmluZGV4T2YoXCJbXCIpKSk7XG59KSgpO1xuY29uc3QgRU5fSlNPTiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKFwiLi9zdGF0aWMvbGFuZy9lbi5qc29uXCIsIHsgZW5jb2Rpbmc6IFwidXRmLThcIiB9KSk7XG5cbi8vIExvYWQgZm91bmRyeSBjb25maWcgaWYgYXZhaWxhYmxlIHRvIHBvdGVudGlhbGx5IHVzZSBhIGRpZmZlcmVudCBwb3J0XG5jb25zdCBGT1VORFJZX0NPTkZJRyA9IGZzLmV4aXN0c1N5bmMoXCIuL2ZvdW5kcnljb25maWcuanNvblwiKVxuICAgID8gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoXCIuL2ZvdW5kcnljb25maWcuanNvblwiLCB7IGVuY29kaW5nOiBcInV0Zi04XCIgfSkpXG4gICAgOiBudWxsO1xuY29uc3QgcG9ydCA9IE51bWJlcihGT1VORFJZX0NPTkZJRz8ucG9ydCkgfHwgMzAwMDE7XG5jb25zdCBmb3VuZHJ5UG9ydCA9IE51bWJlcihGT1VORFJZX0NPTkZJRz8uZm91bmRyeVBvcnQpIHx8IDMwMDAwO1xuY29uc29sZS5sb2coYENvbm5lY3RpbmcgdG8gZm91bmRyeSBob3N0ZWQgYXQgaHR0cDovL2xvY2FsaG9zdDoke2ZvdW5kcnlQb3J0fS9gKTtcblxuLyoqIEdldCBVVUlEIHJlZGlyZWN0cyBmcm9tIEpTT04gZmlsZSwgY29udmVydGluZyBuYW1lcyB0byBJRHMuICovXG5mdW5jdGlvbiBnZXRVdWlkUmVkaXJlY3RzKCk6IFJlY29yZDxDb21wZW5kaXVtVVVJRCwgQ29tcGVuZGl1bVVVSUQ+IHtcbiAgICBjb25zdCByZWRpcmVjdEpTT04gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcImJ1aWxkL3V1aWQtcmVkaXJlY3RzLmpzb25cIiksIFwidXRmLThcIikpO1xuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvXSBvZiBPYmplY3QuZW50cmllczxzdHJpbmc+KHJlZGlyZWN0SlNPTikpIHtcbiAgICAgICAgY29uc3QgWywgLCBwYWNrLCBkb2N1bWVudFR5cGUsIG5hbWVdID0gdG8uc3BsaXQoXCIuXCIsIDUpO1xuICAgICAgICBjb25zdCBwYWNrRGlyID0gc3lzdGVtSlNPTi5wYWNrcy5maW5kKChwKSA9PiBwLnR5cGUgPT09IGRvY3VtZW50VHlwZSAmJiBwLm5hbWUgPT09IHBhY2spPy5wYXRoO1xuICAgICAgICBjb25zdCBkaXJQYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgcGFja0RpciA/PyBcIlwiKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHtzbHVnZ2lmeShuYW1lKX0uanNvbmA7XG4gICAgICAgIGNvbnN0IGpzb25QYXRoID0gZnMuZXhpc3RzU3luYyhwYXRoLnJlc29sdmUoZGlyUGF0aCwgZmlsZW5hbWUpKVxuICAgICAgICAgICAgPyBwYXRoLnJlc29sdmUoZGlyUGF0aCwgZmlsZW5hbWUpXG4gICAgICAgICAgICA6IEdsb2Iuc3luYyhwYXRoLnJlc29sdmUoZGlyUGF0aCwgXCIqKlwiLCBmaWxlbmFtZSkpLmF0KDApO1xuICAgICAgICBpZiAoIWpzb25QYXRoKSB0aHJvdyBuZXcgRXJyb3IoYEZhaWx1cmUgbG9va2luZyB1cCBwYWNrIEpTT04gZm9yICR7dG99YCk7XG4gICAgICAgIGNvbnN0IGRvY0pTT04gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhqc29uUGF0aCwgXCJ1dGYtOFwiKSk7XG4gICAgICAgIGNvbnN0IGlkID0gZG9jSlNPTi5faWQ7XG4gICAgICAgIGlmICghaWQpIHRocm93IG5ldyBFcnJvcihgTm8gVVVJRCByZWRpcmVjdCBtYXRjaCBmb3VuZCBmb3IgJHtkb2N1bWVudFR5cGV9ICR7bmFtZX0gaW4gJHtwYWNrfWApO1xuICAgICAgICByZWRpcmVjdEpTT05bZnJvbV0gPSBgQ29tcGVuZGl1bS5wZjJlLiR7cGFja30uJHtkb2N1bWVudFR5cGV9LiR7aWR9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVkaXJlY3RKU09OO1xufVxuXG5jb25zdCBjb25maWcgPSBWaXRlLmRlZmluZUNvbmZpZygoeyBjb21tYW5kLCBtb2RlIH0pOiBWaXRlLlVzZXJDb25maWcgPT4ge1xuICAgIGNvbnN0IGJ1aWxkTW9kZSA9IG1vZGUgPT09IFwicHJvZHVjdGlvblwiID8gXCJwcm9kdWN0aW9uXCIgOiBcImRldmVsb3BtZW50XCI7XG4gICAgY29uc3Qgb3V0RGlyID0gXCJkaXN0XCI7XG5cbiAgICBjb25zdCByb2xsR3JhbW1hciA9IGZzLnJlYWRGaWxlU3luYyhcInJvbGwtZ3JhbW1hci5wZWdneVwiLCB7IGVuY29kaW5nOiBcInV0Zi04XCIgfSk7XG4gICAgY29uc3QgUk9MTF9QQVJTRVIgPSBQZWdneS5nZW5lcmF0ZShyb2xsR3JhbW1hciwgeyBvdXRwdXQ6IFwic291cmNlXCIgfSkucmVwbGFjZShcbiAgICAgICAgJ3JldHVybiB7XFxuICAgIFN0YXJ0UnVsZXM6IFtcIkV4cHJlc3Npb25cIl0sXFxuICAgIFN5bnRheEVycm9yOiBwZWckU3ludGF4RXJyb3IsXFxuICAgIHBhcnNlOiBwZWckcGFyc2VcXG4gIH07JyxcbiAgICAgICAgJ0Fic3RyYWN0RGFtYWdlUm9sbC5wYXJzZXIgPSB7IFN0YXJ0UnVsZXM6IFtcIkV4cHJlc3Npb25cIl0sIFN5bnRheEVycm9yOiBwZWckU3ludGF4RXJyb3IsIHBhcnNlOiBwZWckcGFyc2UgfTsnLFxuICAgICk7XG5cbiAgICBjb25zdCBwbHVnaW5zID0gW2NoZWNrZXIoeyB0eXBlc2NyaXB0OiB0cnVlIH0pLCB0c2NvbmZpZ1BhdGhzKHsgbG9vc2U6IHRydWUgfSksIHN2ZWx0ZVBsdWdpbigpXTtcbiAgICAvLyBIYW5kbGUgbWluaWZpY2F0aW9uIGFmdGVyIGJ1aWxkIHRvIGFsbG93IGZvciB0cmVlLXNoYWtpbmcgYW5kIHdoaXRlc3BhY2UgbWluaWZpY2F0aW9uXG4gICAgLy8gXCJOb3RlIHRoZSBidWlsZC5taW5pZnkgb3B0aW9uIGRvZXMgbm90IG1pbmlmeSB3aGl0ZXNwYWNlcyB3aGVuIHVzaW5nIHRoZSAnZXMnIGZvcm1hdCBpbiBsaWIgbW9kZSwgYXMgaXQgcmVtb3Zlc1xuICAgIC8vIHB1cmUgYW5ub3RhdGlvbnMgYW5kIGJyZWFrcyB0cmVlLXNoYWtpbmcuXCJcbiAgICBpZiAoYnVpbGRNb2RlID09PSBcInByb2R1Y3Rpb25cIikge1xuICAgICAgICBwbHVnaW5zLnB1c2goXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJtaW5pZnlcIixcbiAgICAgICAgICAgICAgICByZW5kZXJDaHVuazoge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcjogXCJwb3N0XCIsXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGhhbmRsZXIoY29kZSwgY2h1bmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaHVuay5maWxlTmFtZS5lbmRzV2l0aChcIi5tanNcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGVzYnVpbGQudHJhbnNmb3JtKGNvZGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZWVwTmFtZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaWZ5SWRlbnRpZmllcnM6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlmeVN5bnRheDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pZnlXaGl0ZXNwYWNlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGNvZGU7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAuLi52aXRlU3RhdGljQ29weSh7XG4gICAgICAgICAgICAgICAgdGFyZ2V0czogW1xuICAgICAgICAgICAgICAgICAgICB7IHNyYzogXCJDSEFOR0VMT0cubWRcIiwgZGVzdDogXCIuXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBzcmM6IFwiUkVBRE1FLm1kXCIsIGRlc3Q6IFwiLlwiIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgc3JjOiBcIkNPTlRSSUJVVElORy5tZFwiLCBkZXN0OiBcIi5cIiB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwbHVnaW5zLnB1c2goXG4gICAgICAgICAgICAvLyBGb3VuZHJ5IGV4cGVjdHMgYWxsIGVzbSBmaWxlcyBsaXN0ZWQgaW4gc3lzdGVtLmpzb24gdG8gZXhpc3Q6IGNyZWF0ZSBlbXB0eSB2ZW5kb3IgbW9kdWxlIHdoZW4gaW4gZGV2IG1vZGVcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcInRvdWNoLXZlbmRvci1tanNcIixcbiAgICAgICAgICAgICAgICBhcHBseTogXCJidWlsZFwiLFxuICAgICAgICAgICAgICAgIHdyaXRlQnVuZGxlOiB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGhhbmRsZXIoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5jbG9zZVN5bmMoZnMub3BlblN5bmMocGF0aC5yZXNvbHZlKG91dERpciwgXCJ2ZW5kb3IubWpzXCIpLCBcIndcIikpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gVml0ZSBITVIgaXMgb25seSBwcmVjb25maWd1cmVkIGZvciBjc3MgZmlsZXM6IGFkZCBoYW5kbGVyIGZvciBIQlMgdGVtcGxhdGVzIGFuZCBsb2NhbGl6YXRpb24gSlNPTlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6IFwiaG1yLWhhbmRsZXJcIixcbiAgICAgICAgICAgICAgICBhcHBseTogXCJzZXJ2ZVwiLFxuICAgICAgICAgICAgICAgIGhhbmRsZUhvdFVwZGF0ZShjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LmZpbGUuc3RhcnRzV2l0aChvdXREaXIpKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQuZmlsZS5lbmRzV2l0aChcImVuLmpzb25cIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VQYXRoID0gY29udGV4dC5maWxlLnNsaWNlKGNvbnRleHQuZmlsZS5pbmRleE9mKFwibGFuZy9cIikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFVwZGF0aW5nIGxhbmcgZmlsZSBhdCAke2Jhc2VQYXRofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnMucHJvbWlzZXMuY29weUZpbGUoY29udGV4dC5maWxlLCBgJHtvdXREaXJ9LyR7YmFzZVBhdGh9YCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXJ2ZXIud3Muc2VuZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY3VzdG9tXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBcImxhbmctdXBkYXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgcGF0aDogYHN5c3RlbXMvcGYyZS8ke2Jhc2VQYXRofWAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnRleHQuZmlsZS5lbmRzV2l0aChcIi5oYnNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VQYXRoID0gY29udGV4dC5maWxlLnNsaWNlKGNvbnRleHQuZmlsZS5pbmRleE9mKFwidGVtcGxhdGVzL1wiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgdGVtcGxhdGUgZmlsZSBhdCAke2Jhc2VQYXRofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnMucHJvbWlzZXMuY29weUZpbGUoY29udGV4dC5maWxlLCBgJHtvdXREaXJ9LyR7YmFzZVBhdGh9YCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zZXJ2ZXIud3Muc2VuZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY3VzdG9tXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBcInRlbXBsYXRlLXVwZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IHBhdGg6IGBzeXN0ZW1zL3BmMmUvJHtiYXNlUGF0aH1gIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBkdW1teSBmaWxlcyBmb3Igdml0ZSBkZXYgc2VydmVyXG4gICAgaWYgKGNvbW1hbmQgPT09IFwic2VydmVcIikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gXCJUaGlzIGZpbGUgaXMgZm9yIGEgcnVubmluZyB2aXRlIGRldiBzZXJ2ZXIgYW5kIGlzIG5vdCBjb3BpZWQgdG8gYSBidWlsZFwiO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFwiLi9pbmRleC5odG1sXCIsIGA8aDE+JHttZXNzYWdlfTwvaDE+XFxuYCk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhcIi4vc3R5bGVzXCIpKSBmcy5ta2RpclN5bmMoXCIuL3N0eWxlc1wiKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhcIi4vc3R5bGVzL3BmMmUuY3NzXCIsIGAvKiogJHttZXNzYWdlfSAqL1xcbmApO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFwiLi9wZjJlLm1qc1wiLCBgLyoqICR7bWVzc2FnZX0gKi9cXG5cXG5pbXBvcnQgXCIuL3NyYy9wZjJlLnRzXCI7XFxuYCk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMoXCIuL3ZlbmRvci5tanNcIiwgYC8qKiAke21lc3NhZ2V9ICovXFxuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVFc2NhcGUgPSAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1stL1xcXFxeJCorPy4oKXxbXFxde31dL2csIFwiXFxcXCQmXCIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYmFzZTogY29tbWFuZCA9PT0gXCJidWlsZFwiID8gXCIuL1wiIDogXCIvc3lzdGVtcy9wZjJlL1wiLFxuICAgICAgICBwdWJsaWNEaXI6IFwic3RhdGljXCIsXG4gICAgICAgIGRlZmluZToge1xuICAgICAgICAgICAgQlVJTERfTU9ERTogSlNPTi5zdHJpbmdpZnkoYnVpbGRNb2RlKSxcbiAgICAgICAgICAgIENPTkRJVElPTl9TT1VSQ0VTOiBKU09OLnN0cmluZ2lmeShDT05ESVRJT05fU09VUkNFUyksXG4gICAgICAgICAgICBFTl9KU09OOiBKU09OLnN0cmluZ2lmeShFTl9KU09OKSxcbiAgICAgICAgICAgIFJPTExfUEFSU0VSOiBKU09OLnN0cmluZ2lmeShST0xMX1BBUlNFUiksXG4gICAgICAgICAgICBVVUlEX1JFRElSRUNUUzogSlNPTi5zdHJpbmdpZnkoZ2V0VXVpZFJlZGlyZWN0cygpKSxcbiAgICAgICAgICAgIGZ1OiBcImZvdW5kcnkudXRpbHNcIixcbiAgICAgICAgfSxcbiAgICAgICAgZXNidWlsZDogeyBrZWVwTmFtZXM6IHRydWUgfSxcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcixcbiAgICAgICAgICAgIGVtcHR5T3V0RGlyOiBmYWxzZSwgLy8gRmFpbHMgaWYgd29ybGQgaXMgcnVubmluZyBkdWUgdG8gY29tcGVuZGl1bSBsb2NrczogaGFuZGxlZCB3aXRoIGBucG0gcnVuIGNsZWFuYFxuICAgICAgICAgICAgbWluaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZW1hcDogYnVpbGRNb2RlID09PSBcImRldmVsb3BtZW50XCIsXG4gICAgICAgICAgICBsaWI6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcInBmMmVcIixcbiAgICAgICAgICAgICAgICBlbnRyeTogXCJzcmMvcGYyZS50c1wiLFxuICAgICAgICAgICAgICAgIGZvcm1hdHM6IFtcImVzXCJdLFxuICAgICAgICAgICAgICAgIGZpbGVOYW1lOiBcInBmMmVcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgZXh0ZXJuYWw6IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiKD86XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICByZUVzY2FwZShcIi4uLy4uL2ljb25zL3dlYXBvbnMvXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJbLWEtei9dK1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVFc2NhcGUoXCIud2VicFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwifFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVFc2NhcGUoXCIuLi91aS9wYXJjaG1lbnQuanBnXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCIpJFwiLFxuICAgICAgICAgICAgICAgICAgICBdLmpvaW4oXCJcIiksXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICh7IG5hbWUgfSk6IHN0cmluZyA9PiAobmFtZSA9PT0gXCJzdHlsZS5jc3NcIiA/IFwic3R5bGVzL3BmMmUuY3NzXCIgOiAobmFtZSA/PyBcIlwiKSksXG4gICAgICAgICAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiBcIltuYW1lXS5tanNcIixcbiAgICAgICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6IFwicGYyZS5tanNcIixcbiAgICAgICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZW5kb3I6IGJ1aWxkTW9kZSA9PT0gXCJwcm9kdWN0aW9uXCIgPyBPYmplY3Qua2V5cyhwYWNrYWdlSlNPTi5kZXBlbmRlbmNpZXMpIDogW10sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB3YXRjaDogeyBidWlsZERlbGF5OiAxMDAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0YXJnZXQ6IFwiZXMyMDIyXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlcjoge1xuICAgICAgICAgICAgcG9ydCxcbiAgICAgICAgICAgIG9wZW46IFwiL2dhbWVcIixcbiAgICAgICAgICAgIHByb3h5OiB7XG4gICAgICAgICAgICAgICAgXCJeKD8hL3N5c3RlbXMvcGYyZS8pXCI6IGBodHRwOi8vbG9jYWxob3N0OiR7Zm91bmRyeVBvcnR9L2AsXG4gICAgICAgICAgICAgICAgXCIvc29ja2V0LmlvXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiBgd3M6Ly9sb2NhbGhvc3Q6JHtmb3VuZHJ5UG9ydH1gLFxuICAgICAgICAgICAgICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgcGx1Z2lucyxcbiAgICAgICAgY3NzOiB7IGRldlNvdXJjZW1hcDogYnVpbGRNb2RlID09PSBcImRldmVsb3BtZW50XCIgfSxcbiAgICB9O1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmZpZztcbiIsICJ7XG4gICAgXCJuYW1lXCI6IFwiZm91bmRyeS1wZjJlXCIsXG4gICAgXCJ2ZXJzaW9uXCI6IFwiNi44LjVcIixcbiAgICBcImRlc2NyaXB0aW9uXCI6IFwiXCIsXG4gICAgXCJwcml2YXRlXCI6IHRydWUsXG4gICAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gICAgXCJzY3JpcHRzXCI6IHtcbiAgICAgICAgXCJidWlsZFwiOiBcIm5wbSBydW4gY2xlYW4gJiYgbnBtIHJ1biBidWlsZDpwYWNrcyAmJiB2aXRlIGJ1aWxkXCIsXG4gICAgICAgIFwiYnVpbGQ6cGFja3NcIjogXCJ0c3ggLi9idWlsZC9idWlsZC1wYWNrcy50c1wiLFxuICAgICAgICBcImJ1aWxkOnBhY2tzOmpzb25cIjogXCJ0c3ggLi9idWlsZC9idWlsZC1wYWNrcy50cyBqc29uXCIsXG4gICAgICAgIFwiYnVpbGQ6Y29uZGl0aW9uc1wiOiBcInRzeCAuL2J1aWxkL2NvbmRpdGlvbnMudHNcIixcbiAgICAgICAgXCJjbGVhblwiOiBcInRzeCAuL2J1aWxkL2NsZWFuLnRzXCIsXG4gICAgICAgIFwid2F0Y2hcIjogXCJucG0gcnVuIGNsZWFuICYmIG5wbSBydW4gYnVpbGQ6cGFja3MgJiYgdml0ZSBidWlsZCAtLXdhdGNoIC0tbW9kZSBkZXZlbG9wbWVudFwiLFxuICAgICAgICBcImhvdFwiOiBcInZpdGUgc2VydmVcIixcbiAgICAgICAgXCJsaW5rXCI6IFwidHN4IC4vYnVpbGQvbGluay1mb3VuZHJ5LnRzXCIsXG4gICAgICAgIFwiZXh0cmFjdFBhY2tzXCI6IFwidHN4IC4vYnVpbGQvZXh0cmFjdC1wYWNrcy50c1wiLFxuICAgICAgICBcInByZXRlc3RcIjogXCJucG0gcnVuIGxpbnRcIixcbiAgICAgICAgXCJ0ZXN0XCI6IFwiamVzdFwiLFxuICAgICAgICBcIm1pZ3JhdGVcIjogXCJ0c3ggLi9idWlsZC9ydW4tbWlncmF0aW9uLnRzXCIsXG4gICAgICAgIFwibGludFwiOiBcIm5wbSBydW4gbGludDp0cyAmJiBucG0gcnVuIGxpbnQ6anNvbiAmJiBucG0gcnVuIHByZXR0aWVyOnNjc3Mtc3ZlbHRlXCIsXG4gICAgICAgIFwibGludDp0c1wiOiBcImVzbGludCAuL2J1aWxkIC4vc3JjIC4vdGVzdHMgLi90eXBlc1wiLFxuICAgICAgICBcInByZXR0aWVyOnNjc3Mtc3ZlbHRlXCI6IFwicHJldHRpZXIgLS1jaGVjayBzcmMvc3R5bGVzIHNyYy8qKi8qLnN2ZWx0ZVwiLFxuICAgICAgICBcImxpbnQ6anNvblwiOiBcImVzbGludCAtYyBlc2xpbnQuanNvbi5jb25maWcuanNcIixcbiAgICAgICAgXCJsaW50OmZpeFwiOiBcImVzbGludCAuL2J1aWxkIC4vc3JjIC4vdGVzdHMgLi90eXBlcyAtLWZpeCAmJiBwcmV0dGllciAtLXdyaXRlIHNyYy9zdHlsZXMgc3JjLyoqLyouc3ZlbHRlXCJcbiAgICB9LFxuICAgIFwiYXV0aG9yXCI6IFwiVGhlIFBGMmUgU3lzdGVtIERldmVsb3BlcnNcIixcbiAgICBcImxpY2Vuc2VcIjogXCJBcGFjaGUtMi4wXCIsXG4gICAgXCJlbmdpbmVzXCI6IHtcbiAgICAgICAgXCJub2RlXCI6IFwiPj0yMC4xNS4wXCJcbiAgICB9LFxuICAgIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICAgICAgXCJAZXNsaW50L2pzXCI6IFwiXjkuMTMuMFwiLFxuICAgICAgICBcIkBwaXhpL2dyYXBoaWNzLXNtb290aFwiOiBcIl4xLjEuMFwiLFxuICAgICAgICBcIkBwaXhpL3BhcnRpY2xlLWVtaXR0ZXJcIjogXCI1LjAuOFwiLFxuICAgICAgICBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjogXCJeNC4wLjRcIixcbiAgICAgICAgXCJAdHlwZXMvZXNsaW50X19qc1wiOiBcIl44LjQyLjNcIixcbiAgICAgICAgXCJAdHlwZXMvZnMtZXh0cmFcIjogXCJeMTEuMC40XCIsXG4gICAgICAgIFwiQHR5cGVzL2dsb2JcIjogXCJeOC4xLjBcIixcbiAgICAgICAgXCJAdHlwZXMvamVzdFwiOiBcIl4yOS41LjE0XCIsXG4gICAgICAgIFwiQHR5cGVzL2pxdWVyeVwiOiBcIl4zLjUuMzJcIixcbiAgICAgICAgXCJAdHlwZXMvanNkb21cIjogXCJeMjEuMS43XCIsXG4gICAgICAgIFwiQHR5cGVzL2x1eG9uXCI6IFwiXjMuNC4yXCIsXG4gICAgICAgIFwiQHR5cGVzL25vZGVcIjogXCJeMjAuMTYuMTNcIixcbiAgICAgICAgXCJAdHlwZXMvcHJvbXB0c1wiOiBcIl4yLjQuOVwiLFxuICAgICAgICBcIkB0eXBlcy9zaG93ZG93blwiOiBcIl4yLjAuNlwiLFxuICAgICAgICBcIkB0eXBlcy9zb3J0YWJsZWpzXCI6IFwiXjEuMTUuOFwiLFxuICAgICAgICBcIkB0eXBlcy90b29sdGlwc3RlclwiOiBcIl4wLjAuMzVcIixcbiAgICAgICAgXCJAdHlwZXMvdXVpZFwiOiBcIl4xMC4wLjBcIixcbiAgICAgICAgXCJAdHlwZXMveWFpcmVvX190YWdpZnlcIjogXCI0LjE3LjBcIixcbiAgICAgICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvZXNsaW50LXBsdWdpblwiOiBcIl44LjE0LjBcIixcbiAgICAgICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvcGFyc2VyXCI6IFwiXjguMTQuMFwiLFxuICAgICAgICBcImNsYXNzaWMtbGV2ZWxcIjogXCJeMS4zLjBcIixcbiAgICAgICAgXCJlcy1qZXN0XCI6IFwiXjIuMS4wXCIsXG4gICAgICAgIFwiZXNsaW50XCI6IFwiXjkuMTMuMFwiLFxuICAgICAgICBcImVzbGludC1jb25maWctcHJldHRpZXJcIjogXCJeOS4xLjBcIixcbiAgICAgICAgXCJlc2xpbnQtcGx1Z2luLWplc3RcIjogXCJeMjguOS4wXCIsXG4gICAgICAgIFwiZXNsaW50LXBsdWdpbi1qc29uXCI6IFwiXjQuMC4xXCIsXG4gICAgICAgIFwiZXNsaW50LXBsdWdpbi1wcmV0dGllclwiOiBcIl41LjIuMVwiLFxuICAgICAgICBcImZzLWV4dHJhXCI6IFwiXjExLjIuMFwiLFxuICAgICAgICBcImdzYXBcIjogXCIzLjExLjVcIixcbiAgICAgICAgXCJoYW5kbGViYXJzXCI6IFwiNC43LjhcIixcbiAgICAgICAgXCJqZXN0XCI6IFwiXjI5LjcuMFwiLFxuICAgICAgICBcImplc3QtZWFjaFwiOiBcIl4yOS43LjBcIixcbiAgICAgICAgXCJqcy1hbmd1c2otY2xpcHBlclwiOiBcIl4xLjMuMVwiLFxuICAgICAgICBcImpzZG9tXCI6IFwiXjI1LjAuMVwiLFxuICAgICAgICBcIm5vZGUtZ2xvYlwiOiBcIl4xLjIuMFwiLFxuICAgICAgICBcInBlZ2d5XCI6IFwiXjQuMS4xXCIsXG4gICAgICAgIFwicGl4aS5qc1wiOiBcIl43LjQuMlwiLFxuICAgICAgICBcInByZXR0aWVyXCI6IFwiXjMuMy4zXCIsXG4gICAgICAgIFwicHJldHRpZXItcGx1Z2luLXN2ZWx0ZVwiOiBcIl4zLjMuM1wiLFxuICAgICAgICBcInByb21wdHNcIjogXCJeMi40LjJcIixcbiAgICAgICAgXCJwcm9zZW1pcnJvci1jb21tYW5kc1wiOiBcIl4xLjUuMlwiLFxuICAgICAgICBcInByb3NlbWlycm9yLXZpZXdcIjogXCJeMS4zMy42XCIsXG4gICAgICAgIFwic2Fzc1wiOiBcIl4xLjgxLjBcIixcbiAgICAgICAgXCJzb2NrZXQuaW9cIjogXCI0LjcuNVwiLFxuICAgICAgICBcInNvY2tldC5pby1jbGllbnRcIjogXCI0LjcuNVwiLFxuICAgICAgICBcInN2ZWx0ZS1wcmVwcm9jZXNzXCI6IFwiXjYuMC4zXCIsXG4gICAgICAgIFwidGlueW1jZVwiOiBcIjYuOC40XCIsXG4gICAgICAgIFwidHNjb25maWctcGF0aHNcIjogXCJeNC4yLjBcIixcbiAgICAgICAgXCJ0c3hcIjogXCJeNC4xOS4yXCIsXG4gICAgICAgIFwidHlwZXNjcmlwdFwiOiBcIl41LjMuM1wiLFxuICAgICAgICBcInR5cGVzY3JpcHQtZXNsaW50XCI6IFwiXjguMTQuMFwiLFxuICAgICAgICBcInZpdGVcIjogXCJeNS40LjExXCIsXG4gICAgICAgIFwidml0ZS1wbHVnaW4tY2hlY2tlclwiOiBcIl4wLjguMFwiLFxuICAgICAgICBcInZpdGUtcGx1Z2luLXN0YXRpYy1jb3B5XCI6IFwiXjIuMS4wXCIsXG4gICAgICAgIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiOiBcIl41LjEuMlwiLFxuICAgICAgICBcInlhcmdzXCI6IFwiXjE3LjcuMlwiXG4gICAgfSxcbiAgICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgICAgIFwiQGNvZGVtaXJyb3IvYXV0b2NvbXBsZXRlXCI6IFwiXjYuMTguM1wiLFxuICAgICAgICBcIkBjb2RlbWlycm9yL2xhbmctanNvblwiOiBcIl42LjAuMVwiLFxuICAgICAgICBcIkB5YWlyZW8vdGFnaWZ5XCI6IFwiNC4xNi40XCIsXG4gICAgICAgIFwiY29kZW1pcnJvclwiOiBcIl42LjAuMVwiLFxuICAgICAgICBcImx1eG9uXCI6IFwiXjMuNS4wXCIsXG4gICAgICAgIFwibWluaXNlYXJjaFwiOiBcIl43LjEuMFwiLFxuICAgICAgICBcIm5vdWlzbGlkZXJcIjogXCJeMTUuOC4xXCIsXG4gICAgICAgIFwicmVtZWRhXCI6IFwiXjIuMTcuM1wiLFxuICAgICAgICBcInNvcnRhYmxlanNcIjogXCJeMS4xNS4zXCIsXG4gICAgICAgIFwic3ZlbGVjdGVcIjogXCJeNS4xLjRcIixcbiAgICAgICAgXCJzdmVsdGVcIjogXCJeNS4xOS4wXCIsXG4gICAgICAgIFwidXVpZFwiOiBcIl4xMS4wLjNcIlxuICAgIH1cbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRzpcXFxcUHJvZ3JhbW1pbmdcXFxcRm91bmRyeVZUVFxcXFxwZjJlXFxcXHNyY1xcXFx1dGlsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJHOlxcXFxQcm9ncmFtbWluZ1xcXFxGb3VuZHJ5VlRUXFxcXHBmMmVcXFxcc3JjXFxcXHV0aWxcXFxcbWlzYy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRzovUHJvZ3JhbW1pbmcvRm91bmRyeVZUVC9wZjJlL3NyYy91dGlsL21pc2MudHNcIjtpbXBvcnQgdHlwZSB7IEFjdGlvbkNvc3QgfSBmcm9tIFwiQGl0ZW0vYmFzZS9kYXRhL3N5c3RlbS50c1wiO1xuaW1wb3J0ICogYXMgUiBmcm9tIFwicmVtZWRhXCI7XG5pbXBvcnQgdHlwZSBTb3J0YWJsZSBmcm9tIFwic29ydGFibGVqc1wiO1xuXG4vKipcbiAqIEdpdmVuIGFuIGFycmF5IGFuZCBhIGtleSBmdW5jdGlvbiwgY3JlYXRlIGEgbWFwIHdoZXJlIHRoZSBrZXkgaXMgdGhlIHZhbHVlIHRoYXRcbiAqIGdldHMgcmV0dXJuZWQgd2hlbiBlYWNoIGl0ZW0gaXMgcHVzaGVkIGludG8gdGhlIGZ1bmN0aW9uLiBBY2N1bXVsYXRlXG4gKiBpdGVtcyBpbiBhbiBhcnJheSB0aGF0IGhhdmUgdGhlIHNhbWUga2V5XG4gKiBAcGFyYW0gYXJyYXlcbiAqIEBwYXJhbSBjcml0ZXJpb25cbiAqIEByZXR1cm5cbiAqL1xuZnVuY3Rpb24gZ3JvdXBCeTxULCBSPihhcnJheTogVFtdLCBjcml0ZXJpb246ICh2YWx1ZTogVCkgPT4gUik6IE1hcDxSLCBUW10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPFIsIFRbXT4oKTtcbiAgICBmb3IgKGNvbnN0IGVsZW0gb2YgYXJyYXkpIHtcbiAgICAgICAgY29uc3Qga2V5ID0gY3JpdGVyaW9uKGVsZW0pO1xuICAgICAgICBjb25zdCBncm91cCA9IHJlc3VsdC5nZXQoa2V5KTtcbiAgICAgICAgaWYgKGdyb3VwKSB7XG4gICAgICAgICAgICBncm91cC5wdXNoKGVsZW0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LnNldChrZXksIFtlbGVtXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBHaXZlbiBhbiBhcnJheSwgYWRkcyBhIGNlcnRhaW4gYW1vdW50IG9mIGVsZW1lbnRzIHRvIGl0XG4gKiB1bnRpbCB0aGUgZGVzaXJlZCBsZW5ndGggaXMgYmVpbmcgcmVhY2hlZFxuICovXG5mdW5jdGlvbiBwYWRBcnJheTxUPihhcnJheTogVFtdLCByZXF1aXJlZExlbmd0aDogbnVtYmVyLCBwYWRXaXRoOiBUKTogVFtdIHtcbiAgICBjb25zdCByZXN1bHQgPSBbLi4uYXJyYXldO1xuICAgIGZvciAobGV0IGkgPSBhcnJheS5sZW5ndGg7IGkgPCByZXF1aXJlZExlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHBhZFdpdGgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogR2l2ZW4gYW4gb2JqZWN0LCByZXR1cm5zIGEgbmV3IG9iamVjdCB3aXRoIHRoZSBzYW1lIGtleXMsIGJ1dCB3aXRoIGVhY2ggdmFsdWUgY29udmVydGVkIGJ5IGEgZnVuY3Rpb24uICovXG5mdW5jdGlvbiBtYXBWYWx1ZXM8SyBleHRlbmRzIHN0cmluZyB8IG51bWJlciB8IHN5bWJvbCwgViwgUj4oXG4gICAgb2JqZWN0OiBSZWNvcmQ8SywgVj4sXG4gICAgbWFwcGluZzogKHZhbHVlOiBWLCBrZXk6IEspID0+IFIsXG4pOiBSZWNvcmQ8SywgUj4ge1xuICAgIHJldHVybiBPYmplY3QuZW50cmllczxWPihvYmplY3QpLnJlZHVjZShcbiAgICAgICAgKHJlc3VsdCwgW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICByZXN1bHRba2V5IGFzIEtdID0gbWFwcGluZyh2YWx1ZSwga2V5IGFzIEspO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcbiAgICAgICAge30gYXMgUmVjb3JkPEssIFI+LFxuICAgICk7XG59XG5cbi8qKlxuICogQ29udGludWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBvbiB0aGUgcmVzdWx0IG9mIGl0c2VsZiB1bnRpbCB0aW1lcyBpcyByZWFjaGVkXG4gKlxuICogQHBhcmFtIGZ1bmNcbiAqIEBwYXJhbSB0aW1lc1xuICogQHBhcmFtIHN0YXJ0IHN0YXJ0IGVsZW1lbnQsIGFsc28gcmVzdWx0IGlmIHRpbWVzIGlzIDBcbiAqL1xuZnVuY3Rpb24gYXBwbHlOVGltZXM8VD4oZnVuYzogKHZhbDogVCkgPT4gVCwgdGltZXM6IG51bWJlciwgc3RhcnQ6IFQpOiBUIHtcbiAgICBsZXQgcmVzdWx0ID0gc3RhcnQ7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aW1lczsgaSArPSAxKSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMocmVzdWx0KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIGtleSBpcyBwcmVzZW50IGluIGEgZ2l2ZW4gb2JqZWN0IGluIGEgdHlwZSBzYWZlIHdheVxuICpcbiAqIEBwYXJhbSBvYmogVGhlIG9iamVjdCB0byBjaGVja1xuICogQHBhcmFtIGtleSBUaGUga2V5IHRvIGNoZWNrXG4gKi9cbmZ1bmN0aW9uIG9iamVjdEhhc0tleTxPIGV4dGVuZHMgb2JqZWN0PihvYmo6IE8sIGtleTogdW5rbm93bik6IGtleSBpcyBrZXlvZiBPIHtcbiAgICByZXR1cm4gKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIGtleSA9PT0gXCJudW1iZXJcIikgJiYga2V5IGluIG9iajtcbn1cblxuLyoqIENoZWNrIGlmIGEgdmFsdWUgaXMgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIGZvciBjaGVja2luZyBhZ2FpbnN0IGxpdGVyYWwgdHVwbGVzICovXG5mdW5jdGlvbiB0dXBsZUhhc1ZhbHVlPGNvbnN0IEEgZXh0ZW5kcyByZWFkb25seSB1bmtub3duW10+KGFycmF5OiBBLCB2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEFbbnVtYmVyXSB7XG4gICAgcmV0dXJuIGFycmF5LmluY2x1ZGVzKHZhbHVlKTtcbn1cblxuLyoqIENoZWNrIGlmIGFuIGVsZW1lbnQgaXMgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgc2V0LiBFc3BlY2lhbGx5IHVzZWZ1bCBmb3IgY2hlY2tpbmcgYWdhaW5zdCBsaXRlcmFsIHNldHMgKi9cbmZ1bmN0aW9uIHNldEhhc0VsZW1lbnQ8VCBleHRlbmRzIFNldDx1bmtub3duPj4oc2V0OiBULCB2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFNldEVsZW1lbnQ8VD4ge1xuICAgIHJldHVybiBzZXQuaGFzKHZhbHVlKTtcbn1cblxubGV0IGludGxOdW1iZXJGb3JtYXQ6IEludGwuTnVtYmVyRm9ybWF0O1xuLyoqXG4gKiBSZXR1cm4gYW4gaW50ZWdlciBzdHJpbmcgb2YgYSBudW1iZXIsIGFsd2F5cyB3aXRoIHNpZ24gKCsvLSlcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgbnVtYmVyIHRvIGNvbnZlcnQgdG8gYSBzdHJpbmdcbiAqIEBwYXJhbSBvcHRpb25zLmVtcHR5U3RyaW5nWmVybyBJZiB0aGUgdmFsdWUgaXMgemVybywgcmV0dXJuIGFuIGVtcHR5IHN0cmluZ1xuICogQHBhcmFtIG9wdGlvbnMuemVyb0lzTmVnYXRpdmUgVHJlYXQgemVybyBhcyBhIG5lZ2F0aXZlIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIHNpZ25lZEludGVnZXIodmFsdWU6IG51bWJlciwgeyBlbXB0eVN0cmluZ1plcm8gPSBmYWxzZSwgemVyb0lzTmVnYXRpdmUgPSBmYWxzZSB9ID0ge30pOiBzdHJpbmcge1xuICAgIGlmICh2YWx1ZSA9PT0gMCAmJiBlbXB0eVN0cmluZ1plcm8pIHJldHVybiBcIlwiO1xuICAgIGNvbnN0IG5mID0gKGludGxOdW1iZXJGb3JtYXQgPz89IG5ldyBJbnRsLk51bWJlckZvcm1hdChnYW1lLmkxOG4ubGFuZywge1xuICAgICAgICBtYXhpbXVtRnJhY3Rpb25EaWdpdHM6IDAsXG4gICAgICAgIHNpZ25EaXNwbGF5OiBcImFsd2F5c1wiLFxuICAgIH0pKTtcbiAgICBjb25zdCBtYXliZU5lZ2F0aXZlWmVybyA9IHplcm9Jc05lZ2F0aXZlICYmIHZhbHVlID09PSAwID8gLTAgOiB2YWx1ZTtcblxuICAgIHJldHVybiBuZi5mb3JtYXQobWF5YmVOZWdhdGl2ZVplcm8pO1xufVxuXG5jb25zdCB3b3JkQ2hhcmFjdGVyID0gU3RyaW5nLnJhd2BbXFxwe0FscGhhYmV0aWN9XFxwe01hcmt9XFxwe0RlY2ltYWxfTnVtYmVyfVxccHtKb2luX0NvbnRyb2x9XWA7XG5jb25zdCBub25Xb3JkQ2hhcmFjdGVyID0gU3RyaW5nLnJhd2BbXlxccHtBbHBoYWJldGljfVxccHtNYXJrfVxccHtEZWNpbWFsX051bWJlcn1cXHB7Sm9pbl9Db250cm9sfV1gO1xuY29uc3Qgbm9uV29yZEJvdW5kYXJ5ID0gU3RyaW5nLnJhd2AoPz1efCR8JHt3b3JkQ2hhcmFjdGVyfSlgO1xuY29uc3QgbG93ZXJDYXNlTGV0dGVyID0gU3RyaW5nLnJhd2BcXHB7TG93ZXJjYXNlX0xldHRlcn1gO1xuY29uc3QgdXBwZXJDYXNlTGV0dGVyID0gU3RyaW5nLnJhd2BcXHB7VXBwZXJjYXNlX0xldHRlcn1gO1xuXG5jb25zdCBub25Xb3JkQ2hhcmFjdGVyUkUgPSBuZXcgUmVnRXhwKG5vbldvcmRDaGFyYWN0ZXIsIFwiZ3VcIik7XG5jb25zdCBsb3dlckNhc2VUaGVuVXBwZXJDYXNlUkUgPSBuZXcgUmVnRXhwKGAoJHtsb3dlckNhc2VMZXR0ZXJ9KSgke3VwcGVyQ2FzZUxldHRlcn0ke25vbldvcmRCb3VuZGFyeX0pYCwgXCJndVwiKTtcbmNvbnN0IG5vbldvcmRDaGFyYWN0ZXJIeXBoZW5PclNwYWNlUkUgPSAvW14tXFxwe1doaXRlX1NwYWNlfVxccHtBbHBoYWJldGljfVxccHtNYXJrfVxccHtEZWNpbWFsX051bWJlcn1cXHB7Sm9pbl9Db250cm9sfV0vZ3U7XG5jb25zdCB1cHBlck9yV29yZEJvdW5kYXJpZWRMb3dlclJFID0gbmV3IFJlZ0V4cChgJHt1cHBlckNhc2VMZXR0ZXJ9fCR7bm9uV29yZENoYXJhY3Rlcn0ke2xvd2VyQ2FzZUxldHRlcn1gLCBcImd1XCIpO1xuXG4vKipcbiAqIFRoZSBzeXN0ZW0ncyBzbHVnZ2lmaWNhdGlvbiBhbGdvcml0aG0gZm9yIGxhYmVscyBhbmQgb3RoZXIgdGVybXMuXG4gKiBAcGFyYW0gdGV4dCBUaGUgdGV4dCB0byBzbHVnZ2lmeVxuICogQHBhcmFtIFtvcHRpb25zLmNhbWVsPW51bGxdIFRoZSBzbHVnZ2lmaWNhdGlvbiBzdHlsZSB0byB1c2VcbiAqL1xuZnVuY3Rpb24gc2x1Z2dpZnkodGV4dDogc3RyaW5nLCB7IGNhbWVsID0gbnVsbCB9OiB7IGNhbWVsPzogU2x1Z0NhbWVsIH0gPSB7fSk6IHN0cmluZyB7XG4gICAgLy8gU2FuaXR5IGNoZWNrXG4gICAgaWYgKHR5cGVvZiB0ZXh0ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcIk5vbi1zdHJpbmcgYXJndW1lbnQgcGFzc2VkIHRvIGBzbHVnZ2lmeWBcIik7XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEEgaHlwaGVuIGJ5IGl0cyBsb25lc29tZSB3b3VsZCBiZSB3aXBlZDogcmV0dXJuIGl0IGFzLWlzXG4gICAgaWYgKHRleHQgPT09IFwiLVwiKSByZXR1cm4gdGV4dDtcblxuICAgIHN3aXRjaCAoY2FtZWwpIHtcbiAgICAgICAgY2FzZSBudWxsOlxuICAgICAgICAgICAgcmV0dXJuIHRleHRcbiAgICAgICAgICAgICAgICAucmVwbGFjZShsb3dlckNhc2VUaGVuVXBwZXJDYXNlUkUsIFwiJDEtJDJcIilcbiAgICAgICAgICAgICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bJ1x1MjAxOV0vZywgXCJcIilcbiAgICAgICAgICAgICAgICAucmVwbGFjZShub25Xb3JkQ2hhcmFjdGVyUkUsIFwiIFwiKVxuICAgICAgICAgICAgICAgIC50cmltKClcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvWy1cXHNdKy9nLCBcIi1cIik7XG4gICAgICAgIGNhc2UgXCJiYWN0cmlhblwiOiB7XG4gICAgICAgICAgICBjb25zdCBkcm9tZWRhcnkgPSBzbHVnZ2lmeSh0ZXh0LCB7IGNhbWVsOiBcImRyb21lZGFyeVwiIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRyb21lZGFyeS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGRyb21lZGFyeS5zbGljZSgxKTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIFwiZHJvbWVkYXJ5XCI6XG4gICAgICAgICAgICByZXR1cm4gdGV4dFxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKG5vbldvcmRDaGFyYWN0ZXJIeXBoZW5PclNwYWNlUkUsIFwiXCIpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoL1stX10rL2csIFwiIFwiKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKHVwcGVyT3JXb3JkQm91bmRhcmllZExvd2VyUkUsIChwYXJ0LCBpbmRleCkgPT5cbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPT09IDAgPyBwYXJ0LnRvTG93ZXJDYXNlKCkgOiBwYXJ0LnRvVXBwZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHMrL2csIFwiXCIpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgRXJyb3JQRjJlKFwiSSBkb24ndCB0aGluayB0aGF0J3MgYSByZWFsIGNhbWVsLlwiKTtcbiAgICB9XG59XG5cbnR5cGUgU2x1Z0NhbWVsID0gXCJkcm9tZWRhcnlcIiB8IFwiYmFjdHJpYW5cIiB8IG51bGw7XG5cbi8qKiBQYXJzZSBhIHN0cmluZyBjb250YWluaW5nIGh0bWwgKi9cbmZ1bmN0aW9uIHBhcnNlSFRNTCh1bnBhcnNlZDogc3RyaW5nKTogSFRNTEVsZW1lbnQge1xuICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRlbXBsYXRlXCIpO1xuICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHVucGFyc2VkO1xuICAgIGNvbnN0IGVsZW1lbnQgPSBmcmFnbWVudC5jb250ZW50LmZpcnN0RWxlbWVudENoaWxkO1xuICAgIGlmICghKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkpIHRocm93IEVycm9yUEYyZShcIlVuZXhwZWN0ZWQgZXJyb3IgcGFyc2luZyBIVE1MXCIpO1xuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGlvblR5cGVMYWJlbChcbiAgICB0eXBlOiBNYXliZTxcImFjdGlvblwiIHwgXCJmcmVlXCIgfCBcInJlYWN0aW9uXCIgfCBcInBhc3NpdmVcIj4sXG4gICAgY29zdDogTWF5YmU8bnVtYmVyPixcbik6IHN0cmluZyB8IG51bGwge1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFwiYWN0aW9uXCI6XG4gICAgICAgICAgICByZXR1cm4gY29zdCA9PT0gMSA/IFwiUEYyRS5JdGVtLkFiaWxpdHkuVHlwZS5TaW5nbGVcIiA6IFwiUEYyRS5JdGVtLkFiaWxpdHkuVHlwZS5BY3Rpdml0eVwiO1xuICAgICAgICBjYXNlIFwiZnJlZVwiOlxuICAgICAgICAgICAgcmV0dXJuIFwiUEYyRS5JdGVtLkFiaWxpdHkuVHlwZS5GcmVlXCI7XG4gICAgICAgIGNhc2UgXCJyZWFjdGlvblwiOlxuICAgICAgICAgICAgcmV0dXJuIFwiUEYyRS5JdGVtLkFiaWxpdHkuVHlwZS5SZWFjdGlvblwiO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5jb25zdCBhY3Rpb25JbWdNYXA6IFJlY29yZDxzdHJpbmcsIEltYWdlRmlsZVBhdGg+ID0ge1xuICAgIDA6IFwic3lzdGVtcy9wZjJlL2ljb25zL2FjdGlvbnMvRnJlZUFjdGlvbi53ZWJwXCIsXG4gICAgZnJlZTogXCJzeXN0ZW1zL3BmMmUvaWNvbnMvYWN0aW9ucy9GcmVlQWN0aW9uLndlYnBcIixcbiAgICAxOiBcInN5c3RlbXMvcGYyZS9pY29ucy9hY3Rpb25zL09uZUFjdGlvbi53ZWJwXCIsXG4gICAgMjogXCJzeXN0ZW1zL3BmMmUvaWNvbnMvYWN0aW9ucy9Ud29BY3Rpb25zLndlYnBcIixcbiAgICAzOiBcInN5c3RlbXMvcGYyZS9pY29ucy9hY3Rpb25zL1RocmVlQWN0aW9ucy53ZWJwXCIsXG4gICAgXCIxIG9yIDJcIjogXCJzeXN0ZW1zL3BmMmUvaWNvbnMvYWN0aW9ucy9PbmVUd29BY3Rpb25zLndlYnBcIixcbiAgICBcIjEgdG8gM1wiOiBcInN5c3RlbXMvcGYyZS9pY29ucy9hY3Rpb25zL09uZVRocmVlQWN0aW9ucy53ZWJwXCIsXG4gICAgXCIyIG9yIDNcIjogXCJzeXN0ZW1zL3BmMmUvaWNvbnMvYWN0aW9ucy9Ud29UaHJlZUFjdGlvbnMud2VicFwiLFxuICAgIHJlYWN0aW9uOiBcInN5c3RlbXMvcGYyZS9pY29ucy9hY3Rpb25zL1JlYWN0aW9uLndlYnBcIixcbiAgICBwYXNzaXZlOiBcInN5c3RlbXMvcGYyZS9pY29ucy9hY3Rpb25zL1Bhc3NpdmUud2VicFwiLFxufTtcblxuZnVuY3Rpb24gZ2V0QWN0aW9uSWNvbihhY3Rpb25UeXBlOiBzdHJpbmcgfCBBY3Rpb25Db3N0IHwgbnVsbCwgZmFsbGJhY2s6IEltYWdlRmlsZVBhdGgpOiBJbWFnZUZpbGVQYXRoO1xuZnVuY3Rpb24gZ2V0QWN0aW9uSWNvbihhY3Rpb25UeXBlOiBzdHJpbmcgfCBBY3Rpb25Db3N0IHwgbnVsbCwgZmFsbGJhY2s6IEltYWdlRmlsZVBhdGggfCBudWxsKTogSW1hZ2VGaWxlUGF0aCB8IG51bGw7XG5mdW5jdGlvbiBnZXRBY3Rpb25JY29uKGFjdGlvblR5cGU6IHN0cmluZyB8IEFjdGlvbkNvc3QgfCBudWxsKTogSW1hZ2VGaWxlUGF0aDtcbmZ1bmN0aW9uIGdldEFjdGlvbkljb24oXG4gICAgYWN0aW9uOiBzdHJpbmcgfCBBY3Rpb25Db3N0IHwgbnVsbCxcbiAgICBmYWxsYmFjazogSW1hZ2VGaWxlUGF0aCB8IG51bGwgPSBcInN5c3RlbXMvcGYyZS9pY29ucy9hY3Rpb25zL0VtcHR5LndlYnBcIixcbik6IEltYWdlRmlsZVBhdGggfCBudWxsIHtcbiAgICBpZiAoYWN0aW9uID09PSBudWxsKSByZXR1cm4gYWN0aW9uSW1nTWFwLnBhc3NpdmU7XG4gICAgY29uc3QgdmFsdWUgPSB0eXBlb2YgYWN0aW9uICE9PSBcIm9iamVjdFwiID8gYWN0aW9uIDogYWN0aW9uLnR5cGUgPT09IFwiYWN0aW9uXCIgPyBhY3Rpb24udmFsdWUgOiBhY3Rpb24udHlwZTtcbiAgICBjb25zdCBzYW5pdGl6ZWQgPSBTdHJpbmcodmFsdWUgPz8gXCJcIilcbiAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgICAgLnRyaW0oKTtcbiAgICByZXR1cm4gYWN0aW9uSW1nTWFwW3Nhbml0aXplZF0gPz8gZmFsbGJhY2s7XG59XG5cbmNvbnN0IGFjdGlvbkdseXBoTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgIDA6IFwiRlwiLFxuICAgIGZyZWU6IFwiRlwiLFxuICAgIDE6IFwiMVwiLFxuICAgIDI6IFwiMlwiLFxuICAgIDM6IFwiM1wiLFxuICAgIFwiMSBvciAyXCI6IFwiMS8yXCIsXG4gICAgXCIxIHRvIDNcIjogXCIxIC0gM1wiLFxuICAgIFwiMiBvciAzXCI6IFwiMi8zXCIsXG4gICAgXCIyIHJvdW5kc1wiOiBcIjMsM1wiLFxuICAgIHJlYWN0aW9uOiBcIlJcIixcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIGNoYXJhY3RlciB0aGF0IGNhbiBiZSB1c2VkIHdpdGggdGhlIFBhdGhmaW5kZXIgYWN0aW9uIGZvbnRcbiAqIHRvIGRpc3BsYXkgYW4gaWNvbi4gSWYgbnVsbCBpdCByZXR1cm5zIGVtcHR5IHN0cmluZy5cbiAqL1xuZnVuY3Rpb24gZ2V0QWN0aW9uR2x5cGgoYWN0aW9uOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsIHwgQWN0aW9uQ29zdCk6IHN0cmluZyB7XG4gICAgaWYgKCFhY3Rpb24gJiYgYWN0aW9uICE9PSAwKSByZXR1cm4gXCJcIjtcblxuICAgIGNvbnN0IHZhbHVlID0gdHlwZW9mIGFjdGlvbiAhPT0gXCJvYmplY3RcIiA/IGFjdGlvbiA6IGFjdGlvbi50eXBlID09PSBcImFjdGlvblwiID8gYWN0aW9uLnZhbHVlIDogYWN0aW9uLnR5cGU7XG4gICAgY29uc3Qgc2FuaXRpemVkID0gU3RyaW5nKHZhbHVlID8/IFwiXCIpXG4gICAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAgIC50cmltKCk7XG5cbiAgICByZXR1cm4gYWN0aW9uR2x5cGhNYXBbc2FuaXRpemVkXT8ucmVwbGFjZShcIi1cIiwgXCJcdTIwMTNcIikgPz8gXCJcIjtcbn1cblxuZnVuY3Rpb24gRXJyb3JQRjJlKG1lc3NhZ2U6IHN0cmluZyk6IEVycm9yIHtcbiAgICByZXR1cm4gRXJyb3IoYFBGMmUgU3lzdGVtIHwgJHttZXNzYWdlfWApO1xufVxuXG4vKiogUmV0dXJucyB0aGUgbnVtYmVyIGluIGFuIG9yZGluYWwgZm9ybWF0LCBsaWtlIDFzdCwgMm5kLCAzcmQsIDR0aCwgZXRjLiAqL1xuZnVuY3Rpb24gb3JkaW5hbFN0cmluZyh2YWx1ZTogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBwbHVyYWxSdWxlcyA9IG5ldyBJbnRsLlBsdXJhbFJ1bGVzKGdhbWUuaTE4bi5sYW5nLCB7IHR5cGU6IFwib3JkaW5hbFwiIH0pO1xuICAgIGNvbnN0IHN1ZmZpeCA9IGdhbWUuaTE4bi5sb2NhbGl6ZShgUEYyRS5PcmRpbmFsU3VmZml4ZXMuJHtwbHVyYWxSdWxlcy5zZWxlY3QodmFsdWUpfWApO1xuICAgIHJldHVybiBnYW1lLmkxOG4uZm9ybWF0KFwiUEYyRS5PcmRpbmFsTnVtYmVyXCIsIHsgdmFsdWUsIHN1ZmZpeCB9KTtcbn1cblxuLyoqIExvY2FsaXplcyBhIGxpc3Qgb2Ygc3RyaW5ncyBpbnRvIGEgKHBvc3NpYmx5IGNvbW1hLWRlbGltaXRlZCkgbGlzdCBmb3IgdGhlIGN1cnJlbnQgbGFuZ3VhZ2UgKi9cbmZ1bmN0aW9uIGxvY2FsaXplTGlzdChpdGVtczogc3RyaW5nW10sIHsgY29uanVuY3Rpb24gPSBcIm9yXCIgfTogeyBjb25qdW5jdGlvbj86IFwiYW5kXCIgfCBcIm9yXCIgfSA9IHt9KTogc3RyaW5nIHtcbiAgICBpdGVtcyA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4gYS5sb2NhbGVDb21wYXJlKGIsIGdhbWUuaTE4bi5sYW5nKSk7XG4gICAgY29uc3QgcGFydHMgPSBjb25qdW5jdGlvbiA9PT0gXCJvclwiID8gXCJQRjJFLkxpc3RQYXJ0c09yXCIgOiBcIlBGMkUuTGlzdFBhcnRzQW5kXCI7XG5cbiAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAxKSByZXR1cm4gaXRlbXNbMF07XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA9PT0gMikge1xuICAgICAgICByZXR1cm4gZ2FtZS5pMThuLmZvcm1hdChgJHtwYXJ0c30udHdvYCwgeyBmaXJzdDogaXRlbXNbMF0sIHNlY29uZDogaXRlbXNbMV0gfSk7XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCA9IGdhbWUuaTE4bi5mb3JtYXQoYCR7cGFydHN9LnN0YXJ0YCwgeyBmaXJzdDogaXRlbXNbMF0sIHNlY29uZDogXCJ7c2Vjb25kfVwiIH0pO1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IGl0ZW1zLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICBpZiAoaSA9PT0gaXRlbXMubGVuZ3RoIC0gMikge1xuICAgICAgICAgICAgY29uc3QgZW5kID0gZ2FtZS5pMThuLmZvcm1hdChgJHtwYXJ0c30uZW5kYCwgeyBmaXJzdDogaXRlbXNbaV0sIHNlY29uZDogaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0gfSk7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQucmVwbGFjZShcIntzZWNvbmR9XCIsIGVuZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBuZXdTZWdtZW50ID0gZ2FtZS5pMThuLmZvcm1hdChgJHtwYXJ0c30ubWlkZGxlYCwgeyBmaXJzdDogaXRlbXNbaV0sIHNlY29uZDogXCJ7c2Vjb25kfVwiIH0pO1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoXCJ7c2Vjb25kfVwiLCBuZXdTZWdtZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogU3BsaXQgYW5kIHNhbml0aXplIGEgbGlzdCBpbiBzdHJpbmcgZm9ybS4gVGhlIGVtcHR5IHN0cmluZyBpcyBhbHdheXMgZXhjbHVkZWQgZnJvbSB0aGUgcmVzdWx0aW5nIGFycmF5LlxuICogQHBhcmFtIFtvcHRpb25zLmRlbGltaXRlcl0gVGhlIGRlbGltaXRlciBieSB3aGljaCB0byBzcGxpdCAoZGVmYXVsdCBvZiBcIixcIilcbiAqIEBwYXJhbSBbb3B0aW9ucy51bmlxdWVdICAgIFdoZXRoZXIgdG8gZW5zdXJlIHRoZSB1bmlxdWVuZXNzIG9mIHRoZSByZXN1bHRpbmcgYXJyYXkncyBlbGVtZW50cyAoZGVmYXVsdCBvZiB0cnVlKVxuICovXG5mdW5jdGlvbiBzcGxpdExpc3RTdHJpbmcoc3RyOiBzdHJpbmcsIHsgZGVsaW1pdGVyID0gXCIsXCIsIHVuaXF1ZSA9IHRydWUgfTogU3BsaXRMaXN0U3RyaW5nT3B0aW9ucyA9IHt9KTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGxpc3QgPSBzdHJcbiAgICAgICAgLnNwbGl0KGRlbGltaXRlcilcbiAgICAgICAgLm1hcCgoZWwpID0+IGVsLnRyaW0oKSlcbiAgICAgICAgLmZpbHRlcigoZWwpID0+IGVsICE9PSBcIlwiKTtcbiAgICByZXR1cm4gdW5pcXVlID8gUi51bmlxdWUobGlzdCkgOiBsaXN0O1xufVxuXG5pbnRlcmZhY2UgU3BsaXRMaXN0U3RyaW5nT3B0aW9ucyB7XG4gICAgZGVsaW1pdGVyPzogc3RyaW5nIHwgUmVnRXhwO1xuICAgIHVuaXF1ZT86IGJvb2xlYW47XG59XG5cbi8qKiBHZW5lcmF0ZSBhbmQgcmV0dXJuIGFuIEhUTUwgZWxlbWVudCBmb3IgYSBGb250QXdlc29tZSBpY29uICovXG50eXBlIEZvbnRBd2Vzb21lU3R5bGUgPSBcInNvbGlkXCIgfCBcInJlZ3VsYXJcIiB8IFwiZHVvdG9uZVwiO1xuXG5mdW5jdGlvbiBmb250QXdlc29tZUljb24oXG4gICAgZ2x5cGg6IHN0cmluZyxcbiAgICB7IHN0eWxlID0gXCJzb2xpZFwiLCBmaXhlZFdpZHRoID0gZmFsc2UgfTogeyBzdHlsZT86IEZvbnRBd2Vzb21lU3R5bGU7IGZpeGVkV2lkdGg/OiBib29sZWFuIH0gPSB7fSxcbik6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBzdHlsZUNsYXNzID0gYGZhLSR7c3R5bGV9YDtcbiAgICBjb25zdCBnbHlwaENsYXNzID0gZ2x5cGguc3RhcnRzV2l0aChcImZhLVwiKSA/IGdseXBoIDogYGZhLSR7Z2x5cGh9YDtcbiAgICBjb25zdCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlcIik7XG4gICAgaWNvbi5jbGFzc0xpc3QuYWRkKHN0eWxlQ2xhc3MsIGdseXBoQ2xhc3MpO1xuICAgIGlmIChmaXhlZFdpZHRoKSBpY29uLmNsYXNzTGlzdC5hZGQoXCJmYS1md1wiKTtcblxuICAgIHJldHVybiBpY29uO1xufVxuXG4vKiogU2hvcnQgZm9ybSBvZiB0eXBlIGFuZCBub24tbnVsbCBjaGVjayAqL1xuZnVuY3Rpb24gaXNPYmplY3Q8VCBleHRlbmRzIG9iamVjdD4odmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEZWVwUGFydGlhbDxUPjtcbmZ1bmN0aW9uIGlzT2JqZWN0PFQgZXh0ZW5kcyBzdHJpbmc+KHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgeyBbSyBpbiBUXT86IHVua25vd24gfTtcbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlOiB1bmtub3duKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbDtcbn1cblxuLyoqIENyZWF0ZSBhIGNvcHkgb2YgYSByZWNvcmQgd2l0aCBpdHMgaW5zZXJ0aW9uIG9yZGVyIHNvcnRlZCBieSBsYWJlbCAqL1xuZnVuY3Rpb24gc29ydExhYmVsZWRSZWNvcmQ8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHsgbGFiZWw6IHN0cmluZyB9Pj4ocmVjb3JkOiBUKTogVCB7XG4gICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHJlY29yZClcbiAgICAgICAgLnNvcnQoKGEsIGIpID0+IGFbMV0ubGFiZWwubG9jYWxlQ29tcGFyZShiWzFdLmxhYmVsLCBnYW1lLmkxOG4ubGFuZykpXG4gICAgICAgIC5yZWR1Y2UoKGNvcHksIFtrZXksIHZhbHVlXSkgPT4gZnUubWVyZ2VPYmplY3QoY29weSwgeyBba2V5XTogdmFsdWUgfSksIHt9IGFzIFQpO1xufVxuXG4vKiogTG9jYWxpemUgdGhlIHZhbHVlcyBvZiBhIGBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+YCBhbmQgc29ydCBieSB0aG9zZSB2YWx1ZXMgKi9cbmZ1bmN0aW9uIHNvcnRTdHJpbmdSZWNvcmQ8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4+KHJlY29yZDogVCk6IFQ7XG5mdW5jdGlvbiBzb3J0U3RyaW5nUmVjb3JkKHJlY29yZDogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICAgIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKHJlY29yZClcbiAgICAgICAgICAgIC5tYXAoKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICAgICAgZW50cnlbMV0gPSBnYW1lLmkxOG4ubG9jYWxpemUoZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYVsxXS5sb2NhbGVDb21wYXJlKGJbMV0sIGdhbWUuaTE4bi5sYW5nKSksXG4gICAgKTtcbn1cblxuLyoqIEpTT04uc3RyaW5naWZ5IHdpdGggcmVjdXJzaXZlIGtleSBzb3J0aW5nICovXG5mdW5jdGlvbiBzb3J0T2JqQnlLZXkodmFsdWU6IHVua25vd24pOiB1bmtub3duIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSlcbiAgICAgICAgPyB2YWx1ZS5tYXAoc29ydE9iakJ5S2V5KVxuICAgICAgICA6IFIuaXNQbGFpbk9iamVjdCh2YWx1ZSlcbiAgICAgICAgICA/IE9iamVjdC5rZXlzKHZhbHVlKVxuICAgICAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgICAgICAucmVkdWNlKChvOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwga2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICBvW2tleV0gPSBzb3J0T2JqQnlLZXkodik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvO1xuICAgICAgICAgICAgICAgIH0sIHt9KVxuICAgICAgICAgIDogdmFsdWU7XG59XG5cbi8qKiBXYWxrIGFuIG9iamVjdCB0cmVlIGFuZCByZXBsYWNlIGFueSBzdHJpbmcgdmFsdWVzIGZvdW5kIGFjY29yZGluZyB0byBhIHByb3ZpZGVkIGZ1bmN0aW9uICovXG5mdW5jdGlvbiByZWN1cnNpdmVSZXBsYWNlU3RyaW5nPFQ+KHNvdXJjZTogVCwgcmVwbGFjZTogKHM6IHN0cmluZykgPT4gc3RyaW5nKTogVDtcbmZ1bmN0aW9uIHJlY3Vyc2l2ZVJlcGxhY2VTdHJpbmcoc291cmNlOiB1bmtub3duLCByZXBsYWNlOiAoczogc3RyaW5nKSA9PiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBjb25zdCBjbG9uZSA9IEFycmF5LmlzQXJyYXkoc291cmNlKSB8fCBSLmlzUGxhaW5PYmplY3Qoc291cmNlKSA/IGZ1LmRlZXBDbG9uZShzb3VyY2UpIDogc291cmNlO1xuICAgIGlmICh0eXBlb2YgY2xvbmUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIHJlcGxhY2UoY2xvbmUpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShjbG9uZSkpIHtcbiAgICAgICAgcmV0dXJuIGNsb25lLm1hcCgoZSkgPT4gcmVjdXJzaXZlUmVwbGFjZVN0cmluZyhlLCByZXBsYWNlKSk7XG4gICAgfSBlbHNlIGlmIChSLmlzUGxhaW5PYmplY3QoY2xvbmUpKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNsb25lKSkge1xuICAgICAgICAgICAgY2xvbmVba2V5XSA9IHJlY3Vyc2l2ZVJlcGxhY2VTdHJpbmcodmFsdWUsIHJlcGxhY2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsb25lO1xufVxuXG4vKiogQ3JlYXRlIGEgbG9jYWxpemF0aW9uIGZ1bmN0aW9uIHdpdGggYSBwcmVmaXhlZCBsb2NhbGl6YXRpb24gb2JqZWN0IHBhdGggKi9cbmZ1bmN0aW9uIGxvY2FsaXplcihwcmVmaXg6IHN0cmluZyk6ICguLi5hcmdzOiBQYXJhbWV0ZXJzPExvY2FsaXphdGlvbltcImZvcm1hdFwiXT4pID0+IHN0cmluZyB7XG4gICAgcmV0dXJuICguLi5bc3VmZml4LCBmb3JtYXRBcmdzXTogUGFyYW1ldGVyczxMb2NhbGl6YXRpb25bXCJmb3JtYXRcIl0+KSA9PlxuICAgICAgICBmb3JtYXRBcmdzID8gZ2FtZS5pMThuLmZvcm1hdChgJHtwcmVmaXh9LiR7c3VmZml4fWAsIGZvcm1hdEFyZ3MpIDogZ2FtZS5pMThuLmxvY2FsaXplKGAke3ByZWZpeH0uJHtzdWZmaXh9YCk7XG59XG5cbi8qKiBXYWxrIGEgbG9jYWxpemF0aW9uIG9iamVjdCBhbmQgcmVjdXJzaXZlbHkgbWFwIHRoZSBrZXlzIGFzIGxvY2FsaXphdGlvbiBzdHJpbmdzIHN0YXJ0aW5nIHdpdGggYSBnaXZlbiBwcmVmaXggKi9cbmZ1bmN0aW9uIGNvbmZpZ0Zyb21Mb2NhbGl6YXRpb248VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIFRyYW5zbGF0aW9uRGljdGlvbmFyeVZhbHVlPj4oXG4gICAgbG9jYWxpemF0aW9uOiBULFxuICAgIHByZWZpeDogc3RyaW5nLFxuKTogVCB7XG4gICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKGxvY2FsaXphdGlvbikucmVkdWNlKChyZXN1bHQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgcmVzdWx0W2tleV0gPVxuICAgICAgICAgICAgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gYCR7cHJlZml4fS4ke2tleX1gIDogY29uZmlnRnJvbUxvY2FsaXphdGlvbih2YWx1ZSwgYCR7cHJlZml4fS4ke2tleX1gKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSkgYXMgVDtcbn1cblxuLyoqIERvZXMgdGhlIHBhcmFtZXRlciBsb29rIGxpa2UgYW4gaW1hZ2UgZmlsZSBwYXRoPyAqL1xuZnVuY3Rpb24gaXNJbWFnZUZpbGVQYXRoKHBhdGg6IHVua25vd24pOiBwYXRoIGlzIEltYWdlRmlsZVBhdGgge1xuICAgIHJldHVybiB0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiAmJiBJbWFnZUhlbHBlci5oYXNJbWFnZUV4dGVuc2lvbihwYXRoKTtcbn1cblxuLyoqIERvZXMgdGhlIHBhcmFtZXRlciBsb29rIGxpa2UgYSB2aWRlbyBmaWxlIHBhdGg/ICovXG5mdW5jdGlvbiBpc1ZpZGVvRmlsZVBhdGgocGF0aDogdW5rbm93bik6IHBhdGggaXMgVmlkZW9GaWxlUGF0aCB7XG4gICAgcmV0dXJuIHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIFZpZGVvSGVscGVyLmhhc1ZpZGVvRXh0ZW5zaW9uKHBhdGgpO1xufVxuXG5mdW5jdGlvbiBpc0ltYWdlT3JWaWRlb1BhdGgocGF0aDogdW5rbm93bik6IHBhdGggaXMgSW1hZ2VGaWxlUGF0aCB8IFZpZGVvRmlsZVBhdGgge1xuICAgIHJldHVybiB0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiAmJiAoSW1hZ2VIZWxwZXIuaGFzSW1hZ2VFeHRlbnNpb24ocGF0aCkgfHwgVmlkZW9IZWxwZXIuaGFzVmlkZW9FeHRlbnNpb24ocGF0aCkpO1xufVxuXG5jb25zdCBTT1JUQUJMRV9CQVNFX09QVElPTlM6IFNvcnRhYmxlLk9wdGlvbnMgPSB7XG4gICAgYW5pbWF0aW9uOiAyMDAsXG4gICAgZGlyZWN0aW9uOiBcInZlcnRpY2FsXCIsXG4gICAgZHJhZ0NsYXNzOiBcImRyYWctcHJldmlld1wiLFxuICAgIGRyYWdvdmVyQnViYmxlOiB0cnVlLFxuICAgIGVhc2luZzogXCJjdWJpYy1iZXppZXIoMSwgMCwgMCwgMSlcIixcbiAgICBmYWxsYmFja09uQm9keTogdHJ1ZSxcbiAgICBmaWx0ZXI6IFwiZGl2Lml0ZW0tc3VtbWFyeVwiLFxuICAgIGdob3N0Q2xhc3M6IFwiZHJhZy1nYXBcIixcbiAgICBncm91cDogXCJpbnZlbnRvcnlcIixcbiAgICBwcmV2ZW50T25GaWx0ZXI6IGZhbHNlLFxuICAgIHN3YXBUaHJlc2hvbGQ6IDAuMjUsXG5cbiAgICAvLyBUaGVzZSBvcHRpb25zIGFyZSBmcm9tIHRoZSBBdXRvc2Nyb2xsIHBsdWdpbiBhbmQgc2VydmUgYXMgYSBmYWxsYmFjayBvbiBtb2JpbGUvc2FmYXJpL2llL2VkZ2VcbiAgICAvLyBPdGhlciBicm93c2VycyB1c2UgdGhlIG5hdGl2ZSBpbXBsZW1lbnRhdGlvblxuICAgIHNjcm9sbDogdHJ1ZSxcbiAgICBzY3JvbGxTZW5zaXRpdml0eTogMzAsXG4gICAgc2Nyb2xsU3BlZWQ6IDE1LFxuXG4gICAgZGVsYXk6IDUwMCxcbiAgICBkZWxheU9uVG91Y2hPbmx5OiB0cnVlLFxufTtcblxuZXhwb3J0IHtcbiAgICBFcnJvclBGMmUsXG4gICAgU09SVEFCTEVfQkFTRV9PUFRJT05TLFxuICAgIGFwcGx5TlRpbWVzLFxuICAgIGNvbmZpZ0Zyb21Mb2NhbGl6YXRpb24sXG4gICAgZm9udEF3ZXNvbWVJY29uLFxuICAgIGdldEFjdGlvbkdseXBoLFxuICAgIGdldEFjdGlvbkljb24sXG4gICAgZ2V0QWN0aW9uVHlwZUxhYmVsLFxuICAgIGdyb3VwQnksXG4gICAgaXNJbWFnZUZpbGVQYXRoLFxuICAgIGlzSW1hZ2VPclZpZGVvUGF0aCxcbiAgICBpc09iamVjdCxcbiAgICBpc1ZpZGVvRmlsZVBhdGgsXG4gICAgbG9jYWxpemVMaXN0LFxuICAgIGxvY2FsaXplcixcbiAgICBtYXBWYWx1ZXMsXG4gICAgb2JqZWN0SGFzS2V5LFxuICAgIG9yZGluYWxTdHJpbmcsXG4gICAgcGFkQXJyYXksXG4gICAgcGFyc2VIVE1MLFxuICAgIHJlY3Vyc2l2ZVJlcGxhY2VTdHJpbmcsXG4gICAgc2V0SGFzRWxlbWVudCxcbiAgICBzaWduZWRJbnRlZ2VyLFxuICAgIHNsdWdnaWZ5LFxuICAgIHNvcnRMYWJlbGVkUmVjb3JkLFxuICAgIHNvcnRPYmpCeUtleSxcbiAgICBzb3J0U3RyaW5nUmVjb3JkLFxuICAgIHNwbGl0TGlzdFN0cmluZyxcbiAgICB0dXBsZUhhc1ZhbHVlLFxuICAgIHR5cGUgU2x1Z0NhbWVsLFxufTtcbiIsICJ7XG4gICAgXCJpZFwiOiBcInBmMmVcIixcbiAgICBcInRpdGxlXCI6IFwiUGF0aGZpbmRlciBTZWNvbmQgRWRpdGlvblwiLFxuICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbW11bml0eSBjb250cmlidXRlZCBnYW1lIHN5c3RlbSBmb3IgUGF0aGZpbmRlciBTZWNvbmQgRWRpdGlvblwiLFxuICAgIFwidmVyc2lvblwiOiBcIjYuOC41XCIsXG4gICAgXCJsaWNlbnNlXCI6IFwiLi9MSUNFTlNFXCIsXG4gICAgXCJjb21wYXRpYmlsaXR5XCI6IHtcbiAgICAgICAgXCJtaW5pbXVtXCI6IFwiMTIuMzI4XCIsXG4gICAgICAgIFwidmVyaWZpZWRcIjogXCIxMi4zMzFcIixcbiAgICAgICAgXCJtYXhpbXVtXCI6IFwiMTNcIlxuICAgIH0sXG4gICAgXCJhdXRob3JzXCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGhlIFBGMmUgU3lzdGVtIERldmVsb3BlcnNcIixcbiAgICAgICAgICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2ZvdW5kcnl2dHQvcGYyZVwiLFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImVzbW9kdWxlc1wiOiBbXG4gICAgICAgIFwidmVuZG9yLm1qc1wiLFxuICAgICAgICBcInBmMmUubWpzXCJcbiAgICBdLFxuICAgIFwic2NyaXB0c1wiOiBbXG4gICAgICAgIFwiZ3JlZW5zb2NrL2Rpc3QvZ3NhcC5taW4uanNcIixcbiAgICAgICAgXCJsaWIvdG9vbHRpcHN0ZXIuYnVuZGxlLm1pbi5qc1wiXG4gICAgXSxcbiAgICBcInN0eWxlc1wiOiBbXG4gICAgICAgIFwic3R5bGVzL3BmMmUuY3NzXCJcbiAgICBdLFxuICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgIFwiZGlzdGFuY2VcIjogNSxcbiAgICAgICAgXCJ1bml0c1wiOiBcImZ0XCIsXG4gICAgICAgIFwiZGlhZ29uYWxzXCI6IDRcbiAgICB9LFxuICAgIFwiZG9jdW1lbnRUeXBlc1wiOiB7XG4gICAgICAgIFwiUmVnaW9uQmVoYXZpb3JcIjoge1xuICAgICAgICAgICAgXCJlbnZpcm9ubWVudFwiOiB7fSxcbiAgICAgICAgICAgIFwiZW52aXJvbm1lbnRGZWF0dXJlXCI6IHt9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFwicGFja3NcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJhYm9taW5hdGlvbi12YXVsdHMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJBYm9taW5hdGlvbiBWYXVsdHNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2Fib21pbmF0aW9uLXZhdWx0cy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJhZ2Utb2YtYXNoZXMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJBZ2Ugb2YgQXNoZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2FnZS1vZi1hc2hlcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJhZ2VudHMtb2YtZWRnZXdhdGNoLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQWdlbnRzIG9mIEVkZ2V3YXRjaFwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYWdlbnRzLW9mLWVkZ2V3YXRjaC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJib29rLW9mLXRoZS1kZWFkLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQm9vayBvZiB0aGUgRGVhZFwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYm9vay1vZi10aGUtZGVhZC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJibG9vZC1sb3Jkcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkJsb29kIExvcmRzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9ibG9vZC1sb3Jkcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJibG9nLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiUGFpem8gQmxvZ1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYmxvZy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJjdXJ0YWluLWNhbGwtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJDdXJ0YWluIENhbGxcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2N1cnRhaW4tY2FsbC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJleHRpbmN0aW9uLWN1cnNlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiRXh0aW5jdGlvbiBDdXJzZVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvZXh0aW5jdGlvbi1jdXJzZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJmYWxsLW9mLXBsYWd1ZXN0b25lLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiRmFsbCBvZiBQbGFndWVzdG9uZVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvZmFsbC1vZi1wbGFndWVzdG9uZVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJmaXN0cy1vZi10aGUtcnVieS1waG9lbml4LWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiRmlzdHMgb2YgdGhlIFJ1YnkgUGhvZW5peFwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvZmlzdHMtb2YtdGhlLXJ1YnktcGhvZW5peC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJoYXphcmRzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiSGF6YXJkcyAoUnVsZWJvb2tzKVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvaGF6YXJkc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJob3dsLW9mLXRoZS13aWxkLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiSG93bCBvZiB0aGUgV2lsZFwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvaG93bC1vZi10aGUtd2lsZC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJnYXRld2Fsa2Vycy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkdhdGV3YWxrZXJzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9nYXRld2Fsa2Vycy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJsb3N0LW9tZW5zLWltcG9zc2libGUtbGFuZHMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJMb3N0IE9tZW5zOiBJbXBvc3NpYmxlIExhbmRzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9pbXBvc3NpYmxlLWxhbmRzLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImxvc3Qtb21lbnMtbXdhbmdpLWV4cGFuc2UtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJMb3N0IE9tZW5zOiBNd2FuZ2kgRXhwYW5zZVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvbXdhbmdpLWV4cGFuc2UtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwibG9zdC1vbWVucy1oaWdoaGVsbS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkxvc3QgT21lbnM6IEhpZ2hoZWxtXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9oaWdoaGVsbS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJsb3N0LW9tZW5zLW1vbnN0ZXJzLW9mLW15dGgtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJMb3N0IE9tZW5zOiBNb25zdGVycyBvZiBNeXRoXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9tb25zdGVycy1vZi1teXRoLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImxvc3Qtb21lbnMtdGlhbi14aWEtd29ybGQtZ3VpZGVcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJMb3N0IE9tZW5zOiBUaWFuIFhpYSBXb3JsZCBHdWlkZVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvdGlhbi14aWEtd29ybGQtZ3VpZGUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwibG9zdC1vbWVucy10cmF2ZWwtZ3VpZGUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJMb3N0IE9tZW5zOiBUcmF2ZWwgR3VpZGVcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3RyYXZlbC1ndWlkZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJtYWxldm9sZW5jZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIk1hbGV2b2xlbmNlXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9tYWxldm9sZW5jZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJtZW5hY2UtdW5kZXItb3RhcmktYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJNZW5hY2UgVW5kZXIgT3RhcmlcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL21lbmFjZS11bmRlci1vdGFyaS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJucGMtZ2FsbGVyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIk5QQyBHYWxsZXJ5XCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9ucGMtZ2FsbGVyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJvbmUtc2hvdC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIk9uZS1TaG90c1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3Mvb25lLXNob3QtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwib3V0bGF3cy1vZi1hbGtlbnN0YXItYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJPdXRsYXdzIG9mIEFsa2Vuc3RhclwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3Mvb3V0bGF3cy1vZi1hbGtlbnN0YXItYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwia2luZ21ha2VyLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiS2luZ21ha2VyXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9raW5nbWFrZXItYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGF0aGZpbmRlci1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkJlc3RpYXJ5IDFcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3BhdGhmaW5kZXItYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGF0aGZpbmRlci1iZXN0aWFyeS0yXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQmVzdGlhcnkgMlwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcGF0aGZpbmRlci1iZXN0aWFyeS0yXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBhdGhmaW5kZXItYmVzdGlhcnktM1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkJlc3RpYXJ5IDNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3BhdGhmaW5kZXItYmVzdGlhcnktM1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwYXRoZmluZGVyLW1vbnN0ZXItY29yZVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIk1vbnN0ZXIgQ29yZVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcGF0aGZpbmRlci1tb25zdGVyLWNvcmVcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGF0aGZpbmRlci1kYXJrLWFyY2hpdmVcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJEYXJrIEFyY2hpdmVcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3BhdGhmaW5kZXItZGFyay1hcmNoaXZlXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBmcy1pbnRyb2R1Y3Rpb25zLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiSW50cm9kdWN0aW9uc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcGZzLWludHJvZHVjdGlvbnMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGZzLXNlYXNvbi0xLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiU2Vhc29uIDFcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3Bmcy1zZWFzb24tMS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwZnMtc2Vhc29uLTItYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJTZWFzb24gMlwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcGZzLXNlYXNvbi0yLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBmcy1zZWFzb24tMy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNlYXNvbiAzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9wZnMtc2Vhc29uLTMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGZzLXNlYXNvbi00LWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiU2Vhc29uIDRcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3Bmcy1zZWFzb24tNC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwZnMtc2Vhc29uLTUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJTZWFzb24gNVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcGZzLXNlYXNvbi01LWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInBmcy1zZWFzb24tNi1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNlYXNvbiA2XCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9wZnMtc2Vhc29uLTYtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicHJleS1mb3ItZGVhdGgtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJQcmV5IGZvciBEZWF0aFwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcHJleS1mb3ItZGVhdGgtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicXVlc3QtZm9yLXRoZS1mcm96ZW4tZmxhbWUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJRdWVzdCBmb3IgdGhlIEZyb3plbiBGbGFtZVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvcXVlc3QtZm9yLXRoZS1mcm96ZW4tZmxhbWUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicnVzdGhlbmdlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiUnVzdGhlbmdlXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9ydXN0aGVuZ2UtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic2Vhc29uLW9mLWdob3N0cy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNlYXNvbiBvZiBHaG9zdHNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3NlYXNvbi1vZi1naG9zdHMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic2V2ZW4tZG9vbXMtZm9yLXNhbmRwb2ludC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNldmVuIERvb21zIGZvciBTYW5kcG9pbnRcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3NldmVuLWRvb21zLWZvci1zYW5kcG9pbnQtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic2hhZG93cy1hdC1zdW5kb3duLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiU2hhZG93cyBhdCBTdW5kb3duXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9zaGFkb3dzLWF0LXN1bmRvd24tYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkFjdG9yXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvcmVkLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic2t5LWtpbmdzLXRvbWItYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJTa3kgS2luZydzIFRvbWJcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3NreS1raW5ncy10b21iLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInNwb3JlLXdhci1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNwb3JlIFdhclwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3Mvc3BvcmUtd2FyLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN0cmVuZ3RoLW9mLXRob3VzYW5kcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlN0cmVuZ3RoIG9mIFRob3VzYW5kc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3Mvc3RyZW5ndGgtb2YtdGhvdXNhbmRzLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRoZS1lbm1pdHktY3ljbGUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJUaGUgRW5taXR5IEN5Y2xlXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy90aGUtZW5taXR5LWN5Y2xlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRoZS1zbGl0aGVyaW5nLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiVGhlIFNsaXRoZXJpbmdcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3RoZS1zbGl0aGVyaW5nLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRyaXVtcGgtb2YtdGhlLXR1c2stYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJUcml1bXBoIG9mIHRoZSBUdXNrXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy90cml1bXBoLW9mLXRoZS10dXNrLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInRyb3VibGVzLWluLW90YXJpLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiVHJvdWJsZXMgaW4gT3RhcmlcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3Ryb3VibGVzLWluLW90YXJpLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIm5pZ2h0LW9mLXRoZS1ncmF5LWRlYXRoLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiTmlnaHQgb2YgdGhlIEdyYXkgRGVhdGhcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL25pZ2h0LW9mLXRoZS1ncmF5LWRlYXRoLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImNyb3duLW9mLXRoZS1rb2JvbGQta2luZy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkNyb3duIG9mIHRoZSBLb2JvbGQgS2luZ1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvY3Jvd24tb2YtdGhlLWtvYm9sZC1raW5nLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInN0b2xlbi1mYXRlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiU3RvbGVuIEZhdGVcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3N0b2xlbi1mYXRlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInJhZ2Utb2YtZWxlbWVudHMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJSYWdlIG9mIEVsZW1lbnRzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9yYWdlLW9mLWVsZW1lbnRzLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIndhcmRlbnMtb2Ytd2lsZHdvb2QtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJXYXJkZW5zIG9mIFdpbGR3b29kXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy93YXJkZW5zLW9mLXdpbGR3b29kLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIndhci1vZi1pbW1vcnRhbHMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJXYXIgb2YgSW1tb3J0YWxzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy93YXItb2YtaW1tb3J0YWxzLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcInZlaGljbGVzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiVmVoaWNsZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3ZlaGljbGVzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJhY3Rpb25zcGYyZVwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkFjdGlvbnNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2FjdGlvbnNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ncmVlbi53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJhbmNlc3RyaWVzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQW5jZXN0cmllc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYW5jZXN0cmllc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2dyZWVuLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImFuY2VzdHJ5ZmVhdHVyZXNcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJBbmNlc3RyeSBGZWF0dXJlc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYW5jZXN0cnlmZWF0dXJlc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2dyZWVuLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImJhY2tncm91bmRzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQmFja2dyb3VuZHNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2JhY2tncm91bmRzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJJdGVtXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvZ3JlZW4ud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiY2xhc3Nlc1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkNsYXNzZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2NsYXNzZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ncmVlbi53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJjbGFzc2ZlYXR1cmVzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQ2xhc3MgRmVhdHVyZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2NsYXNzZmVhdHVyZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ncmVlbi53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJmYW1pbGlhci1hYmlsaXRpZXNcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJGYW1pbGlhciBBYmlsaXRpZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2ZhbWlsaWFyLWFiaWxpdGllc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2dyZWVuLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImZlYXRzLXNyZFwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkZlYXRzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9mZWF0c1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2dyZWVuLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImhlcml0YWdlc1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkhlcml0YWdlc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvaGVyaXRhZ2VzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJJdGVtXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvZ3JlZW4ud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3BlbGxzLXNyZFwiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNwZWxsc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3Mvc3BlbGxzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJJdGVtXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvYmx1ZS53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJiZXN0aWFyeS1lZmZlY3RzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQmVzdGlhcnkgRWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYmVzdGlhcnktZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2JsdWUud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJib29ucy1hbmQtY3Vyc2VzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiRGl2aW5lIEludGVyY2Vzc2lvbnNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2Jvb25zLWFuZC1jdXJzZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ibHVlLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiY29uZGl0aW9uaXRlbXNcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJDb25kaXRpb25zXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9jb25kaXRpb25zXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJJdGVtXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvYmx1ZS53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJjYW1wYWlnbi1lZmZlY3RzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQ2FtcGFpZ24gRWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvY2FtcGFpZ24tZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2JsdWUud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJlcXVpcG1lbnQtZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkVxdWlwbWVudCBFZmZlY3RzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9lcXVpcG1lbnQtZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2JsdWUud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwib3RoZXItZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIk90aGVyIEVmZmVjdHNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL290aGVyLWVmZmVjdHNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ibHVlLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImZlYXQtZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkZlYXQvRmVhdHVyZSBFZmZlY3RzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9mZWF0LWVmZmVjdHNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ncmVlbi53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwYXRoZmluZGVyLXNvY2lldHktYm9vbnNcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJQYXRoZmluZGVyIFNvY2lldHkgQm9vbnNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3BhdGhmaW5kZXItc29jaWV0eS1ib29uc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2JsdWUud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwic3BlbGwtZWZmZWN0c1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlNwZWxsIEVmZmVjdHNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3NwZWxsLWVmZmVjdHNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ibHVlLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImVxdWlwbWVudC1zcmRcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJFcXVpcG1lbnRcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2VxdWlwbWVudFwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2JsdWUud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiZGVpdGllc1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkRlaXRpZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2RlaXRpZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ncmVlbi53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJpY29uaWNzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiSWNvbmljc1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvaWNvbmljc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiQWN0b3JcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9yZWQud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwicGFpem8tcHJlZ2Vuc1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkFkdmVudHVyZSBQcmVnZW5zXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9wYWl6by1wcmVnZW5zXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJBY3RvclwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL3JlZC53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJyb2xsYWJsZS10YWJsZXNcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJSb2xsYWJsZSBUYWJsZXNcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL3JvbGxhYmxlLXRhYmxlc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiUm9sbFRhYmxlXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvb3JhbmdlLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImNyaXRpY2FsZGVja1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkNyaXRpY2FsIEhpdC9GdW1ibGUgRGVja1wiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvY3JpdGljYWxkZWNrXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJKb3VybmFsRW50cnlcIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9vcmFuZ2Uud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiam91cm5hbHNcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJQRjJlIEpvdXJuYWxzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9qb3VybmFsc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSm91cm5hbEVudHJ5XCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvb3JhbmdlLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImFjdGlvbi1tYWNyb3NcIixcbiAgICAgICAgICAgIFwibGFiZWxcIjogXCJBY3Rpb24gTWFjcm9zXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9hY3Rpb24tbWFjcm9zXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJNYWNyb1wiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL29yYW5nZS53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIk9CU0VSVkVSXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJwZjJlLW1hY3Jvc1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIlBGMmUgTWFjcm9zXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9tYWNyb3NcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIk1hY3JvXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvb3JhbmdlLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiT0JTRVJWRVJcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImJlc3RpYXJ5LWFiaWxpdHktZ2xvc3Nhcnktc3JkXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQmVzdGlhcnkgQWJpbGl0eSBHbG9zc2FyeVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwicGFja3MvYmVzdGlhcnktYWJpbGl0eS1nbG9zc2FyeS1zcmRcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9ncmVlbi53ZWJwXCIsXG4gICAgICAgICAgICBcInN5c3RlbVwiOiBcInBmMmVcIixcbiAgICAgICAgICAgIFwib3duZXJzaGlwXCI6IHtcbiAgICAgICAgICAgICAgICBcIlBMQVlFUlwiOiBcIkxJTUlURURcIixcbiAgICAgICAgICAgICAgICBcIkFTU0lTVEFOVFwiOiBcIk9XTkVSXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcImJlc3RpYXJ5LWZhbWlseS1hYmlsaXR5LWdsb3NzYXJ5XCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiQ3JlYXR1cmUgRmFtaWx5IEFiaWxpdHkgR2xvc3NhcnlcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcInBhY2tzL2Jlc3RpYXJ5LWZhbWlseS1hYmlsaXR5LWdsb3NzYXJ5XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJJdGVtXCIsXG4gICAgICAgICAgICBcImJhbm5lclwiOiBcInN5c3RlbXMvcGYyZS9hc3NldHMvY29tcGVuZGl1bS1iYW5uZXIvZ3JlZW4ud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJMSU1JVEVEXCIsXG4gICAgICAgICAgICAgICAgXCJBU1NJU1RBTlRcIjogXCJPV05FUlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJhZHZlbnR1cmUtc3BlY2lmaWMtYWN0aW9uc1wiLFxuICAgICAgICAgICAgXCJsYWJlbFwiOiBcIkFkdmVudHVyZS1TcGVjaWZpYyBBY3Rpb25zXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9hZHZlbnR1cmUtc3BlY2lmaWMtYWN0aW9uc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwiSXRlbVwiLFxuICAgICAgICAgICAgXCJiYW5uZXJcIjogXCJzeXN0ZW1zL3BmMmUvYXNzZXRzL2NvbXBlbmRpdW0tYmFubmVyL2dyZWVuLndlYnBcIixcbiAgICAgICAgICAgIFwic3lzdGVtXCI6IFwicGYyZVwiLFxuICAgICAgICAgICAgXCJvd25lcnNoaXBcIjoge1xuICAgICAgICAgICAgICAgIFwiUExBWUVSXCI6IFwiTElNSVRFRFwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwia2luZ21ha2VyLWZlYXR1cmVzXCIsXG4gICAgICAgICAgICBcImxhYmVsXCI6IFwiS2luZ21ha2VyIEZlYXR1cmVzXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJwYWNrcy9raW5nbWFrZXItZmVhdHVyZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIkl0ZW1cIixcbiAgICAgICAgICAgIFwiYmFubmVyXCI6IFwic3lzdGVtcy9wZjJlL2Fzc2V0cy9jb21wZW5kaXVtLWJhbm5lci9vcmFuZ2Uud2VicFwiLFxuICAgICAgICAgICAgXCJzeXN0ZW1cIjogXCJwZjJlXCIsXG4gICAgICAgICAgICBcIm93bmVyc2hpcFwiOiB7XG4gICAgICAgICAgICAgICAgXCJQTEFZRVJcIjogXCJPQlNFUlZFUlwiLFxuICAgICAgICAgICAgICAgIFwiQVNTSVNUQU5UXCI6IFwiT1dORVJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJwYWNrRm9sZGVyc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkJlc3RpYXJpZXNcIixcbiAgICAgICAgICAgIFwic29ydGluZ1wiOiBcIm1cIixcbiAgICAgICAgICAgIFwiY29sb3JcIjogXCIjM2IyNTI0XCIsXG4gICAgICAgICAgICBcImZvbGRlcnNcIjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiQWR2ZW50dXJlIFBhdGhzXCIsXG4gICAgICAgICAgICAgICAgICAgIFwic29ydGluZ1wiOiBcIm1cIixcbiAgICAgICAgICAgICAgICAgICAgXCJjb2xvclwiOiBcIiM1NzM5MzhcIixcbiAgICAgICAgICAgICAgICAgICAgXCJwYWNrc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFib21pbmF0aW9uLXZhdWx0cy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhZ2Utb2YtYXNoZXMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYWdlbnRzLW9mLWVkZ2V3YXRjaC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJibG9vZC1sb3Jkcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjdXJ0YWluLWNhbGwtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZXh0aW5jdGlvbi1jdXJzZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJmaXN0cy1vZi10aGUtcnVieS1waG9lbml4LWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdhdGV3YWxrZXJzLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm91dGxhd3Mtb2YtYWxrZW5zdGFyLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImtpbmdtYWtlci1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJxdWVzdC1mb3ItdGhlLWZyb3plbi1mbGFtZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzZWFzb24tb2YtZ2hvc3RzLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInNldmVuLWRvb21zLWZvci1zYW5kcG9pbnQtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic2t5LWtpbmdzLXRvbWItYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3BvcmUtd2FyLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInN0cmVuZ3RoLW9mLXRob3VzYW5kcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzdG9sZW4tZmF0ZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0cml1bXBoLW9mLXRoZS10dXNrLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIndhcmRlbnMtb2Ytd2lsZHdvb2QtYmVzdGlhcnlcIlxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwibmFtZVwiOiBcIlJ1bGVib29rc1wiLFxuICAgICAgICAgICAgICAgICAgICBcInNvcnRpbmdcIjogXCJtXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiY29sb3JcIjogXCIjNTczOTM4XCIsXG4gICAgICAgICAgICAgICAgICAgIFwicGFja3NcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRoZmluZGVyLWRhcmstYXJjaGl2ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJib29rLW9mLXRoZS1kZWFkLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInJhZ2Utb2YtZWxlbWVudHMtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiaGF6YXJkc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJob3dsLW9mLXRoZS13aWxkLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvc3Qtb21lbnMtaW1wb3NzaWJsZS1sYW5kcy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJsb3N0LW9tZW5zLWhpZ2hoZWxtLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvc3Qtb21lbnMtbXdhbmdpLWV4cGFuc2UtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibG9zdC1vbWVucy1tb25zdGVycy1vZi1teXRoLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImxvc3Qtb21lbnMtdGlhbi14aWEtd29ybGQtZ3VpZGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibG9zdC1vbWVucy10cmF2ZWwtZ3VpZGUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwid2FyLW9mLWltbW9ydGFscy1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJucGMtZ2FsbGVyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ2ZWhpY2xlc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJibG9nLWJlc3RpYXJ5XCJcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIm5hbWVcIjogXCJTdGFuZGFsb25lIEFkdmVudHVyZXNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJzb3J0aW5nXCI6IFwibVwiLFxuICAgICAgICAgICAgICAgICAgICBcImNvbG9yXCI6IFwiIzU3MzkzOFwiLFxuICAgICAgICAgICAgICAgICAgICBcInBhY2tzXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiZmFsbC1vZi1wbGFndWVzdG9uZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtYWxldm9sZW5jZS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJtZW5hY2UtdW5kZXItb3RhcmktYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwib25lLXNob3QtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicHJleS1mb3ItZGVhdGgtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicnVzdGhlbmdlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInNoYWRvd3MtYXQtc3VuZG93bi1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0aGUtZW5taXR5LWN5Y2xlLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRoZS1zbGl0aGVyaW5nLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRyb3VibGVzLWluLW90YXJpLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm5pZ2h0LW9mLXRoZS1ncmF5LWRlYXRoLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImNyb3duLW9mLXRoZS1rb2JvbGQta2luZy1iZXN0aWFyeVwiXG4gICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiUGF0aGZpbmRlciBTb2NpZXR5XCIsXG4gICAgICAgICAgICAgICAgICAgIFwic29ydGluZ1wiOiBcIm1cIixcbiAgICAgICAgICAgICAgICAgICAgXCJjb2xvclwiOiBcIiM1NzM5MzhcIixcbiAgICAgICAgICAgICAgICAgICAgXCJwYWNrc1wiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICBcInBmcy1pbnRyb2R1Y3Rpb25zLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInBmcy1zZWFzb24tMS1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwZnMtc2Vhc29uLTItYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicGZzLXNlYXNvbi0zLWJlc3RpYXJ5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInBmcy1zZWFzb24tNC1iZXN0aWFyeVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwZnMtc2Vhc29uLTUtYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicGZzLXNlYXNvbi02LWJlc3RpYXJ5XCJcbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBcInBhY2tzXCI6IFtcbiAgICAgICAgICAgICAgICBcInBhdGhmaW5kZXItYmVzdGlhcnlcIixcbiAgICAgICAgICAgICAgICBcInBhdGhmaW5kZXItYmVzdGlhcnktMlwiLFxuICAgICAgICAgICAgICAgIFwicGF0aGZpbmRlci1iZXN0aWFyeS0zXCIsXG4gICAgICAgICAgICAgICAgXCJwYXRoZmluZGVyLW1vbnN0ZXItY29yZVwiXG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlByZWdlbmVyYXRlZCBQQ3NcIixcbiAgICAgICAgICAgIFwic29ydGluZ1wiOiBcIm1cIixcbiAgICAgICAgICAgIFwiY29sb3JcIjogXCIjM2IyNTI0XCIsXG4gICAgICAgICAgICBcInBhY2tzXCI6IFtcbiAgICAgICAgICAgICAgICBcImljb25pY3NcIixcbiAgICAgICAgICAgICAgICBcInBhaXpvLXByZWdlbnNcIlxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJFZmZlY3RzXCIsXG4gICAgICAgICAgICBcInNvcnRpbmdcIjogXCJtXCIsXG4gICAgICAgICAgICBcImNvbG9yXCI6IFwiIzJmMzMzOVwiLFxuICAgICAgICAgICAgXCJwYWNrc1wiOiBbXG4gICAgICAgICAgICAgICAgXCJiZXN0aWFyeS1lZmZlY3RzXCIsXG4gICAgICAgICAgICAgICAgXCJjb25kaXRpb25pdGVtc1wiLFxuICAgICAgICAgICAgICAgIFwiY2FtcGFpZ24tZWZmZWN0c1wiLFxuICAgICAgICAgICAgICAgIFwiZXF1aXBtZW50LWVmZmVjdHNcIixcbiAgICAgICAgICAgICAgICBcImZlYXQtZWZmZWN0c1wiLFxuICAgICAgICAgICAgICAgIFwib3RoZXItZWZmZWN0c1wiLFxuICAgICAgICAgICAgICAgIFwic3BlbGwtZWZmZWN0c1wiXG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNoYXJhY3RlciBCdWlsZGluZ1wiLFxuICAgICAgICAgICAgXCJzb3J0aW5nXCI6IFwibVwiLFxuICAgICAgICAgICAgXCJjb2xvclwiOiBcIiMzNDNjMzNcIixcbiAgICAgICAgICAgIFwicGFja3NcIjogW1xuICAgICAgICAgICAgICAgIFwiYWN0aW9uc3BmMmVcIixcbiAgICAgICAgICAgICAgICBcImFuY2VzdHJpZXNcIixcbiAgICAgICAgICAgICAgICBcImFuY2VzdHJ5ZmVhdHVyZXNcIixcbiAgICAgICAgICAgICAgICBcImJhY2tncm91bmRzXCIsXG4gICAgICAgICAgICAgICAgXCJjbGFzc2VzXCIsXG4gICAgICAgICAgICAgICAgXCJjbGFzc2ZlYXR1cmVzXCIsXG4gICAgICAgICAgICAgICAgXCJkZWl0aWVzXCIsXG4gICAgICAgICAgICAgICAgXCJlcXVpcG1lbnQtc3JkXCIsXG4gICAgICAgICAgICAgICAgXCJmYW1pbGlhci1hYmlsaXRpZXNcIixcbiAgICAgICAgICAgICAgICBcImZlYXRzLXNyZFwiLFxuICAgICAgICAgICAgICAgIFwiaGVyaXRhZ2VzXCIsXG4gICAgICAgICAgICAgICAgXCJzcGVsbHMtc3JkXCIsXG4gICAgICAgICAgICAgICAgXCJraW5nbWFrZXItZmVhdHVyZXNcIlxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJHTSBUb29sc1wiLFxuICAgICAgICAgICAgXCJzb3J0aW5nXCI6IFwibVwiLFxuICAgICAgICAgICAgXCJjb2xvclwiOiBcIiMxODE4MThcIixcbiAgICAgICAgICAgIFwicGFja3NcIjogW1xuICAgICAgICAgICAgICAgIFwiYWR2ZW50dXJlLXNwZWNpZmljLWFjdGlvbnNcIixcbiAgICAgICAgICAgICAgICBcImJvb25zLWFuZC1jdXJzZXNcIixcbiAgICAgICAgICAgICAgICBcInBhdGhmaW5kZXItc29jaWV0eS1ib29uc1wiLFxuICAgICAgICAgICAgICAgIFwiYmVzdGlhcnktYWJpbGl0eS1nbG9zc2FyeS1zcmRcIixcbiAgICAgICAgICAgICAgICBcImJlc3RpYXJ5LWZhbWlseS1hYmlsaXR5LWdsb3NzYXJ5XCIsXG4gICAgICAgICAgICAgICAgXCJyb2xsYWJsZS10YWJsZXNcIlxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYWNyb3NcIixcbiAgICAgICAgICAgIFwic29ydGluZ1wiOiBcIm1cIixcbiAgICAgICAgICAgIFwiY29sb3JcIjogXCIjMTgxODE4XCIsXG4gICAgICAgICAgICBcInBhY2tzXCI6IFtcbiAgICAgICAgICAgICAgICBcImFjdGlvbi1tYWNyb3NcIixcbiAgICAgICAgICAgICAgICBcInBmMmUtbWFjcm9zXCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSm91cm5hbHNcIixcbiAgICAgICAgICAgIFwic29ydGluZ1wiOiBcIm1cIixcbiAgICAgICAgICAgIFwiY29sb3JcIjogXCIjMTgxODE4XCIsXG4gICAgICAgICAgICBcInBhY2tzXCI6IFtcbiAgICAgICAgICAgICAgICBcImNyaXRpY2FsZGVja1wiLFxuICAgICAgICAgICAgICAgIFwiZG9tYWluc1wiLFxuICAgICAgICAgICAgICAgIFwiam91cm5hbHNcIlxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgXSxcbiAgICBcImxhbmd1YWdlc1wiOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibGFuZ1wiOiBcImVuXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJNYWluIChFbmdsaXNoKVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwibGFuZy9lbi5qc29uXCIsXG4gICAgICAgICAgICBcImZsYWdzXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwibGFuZ1wiOiBcImVuXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBY3Rpb25zIChFbmdsaXNoKVwiLFxuICAgICAgICAgICAgXCJwYXRoXCI6IFwibGFuZy9hY3Rpb24tZW4uanNvblwiLFxuICAgICAgICAgICAgXCJmbGFnc1wiOiB7fVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImxhbmdcIjogXCJlblwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUnVsZXMgRWxlbWVudHMgKEVuZ2xpc2gpXCIsXG4gICAgICAgICAgICBcInBhdGhcIjogXCJsYW5nL3JlLWVuLmpzb25cIixcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJsYW5nXCI6IFwiZW5cIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIktpbmdtYWtlciAoRW5nbGlzaClcIixcbiAgICAgICAgICAgIFwicGF0aFwiOiBcImxhbmcva2luZ21ha2VyLWVuLmpzb25cIixcbiAgICAgICAgICAgIFwiZmxhZ3NcIjoge31cbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJzb2NrZXRcIjogdHJ1ZSxcbiAgICBcImluaXRpYXRpdmVcIjogXCIxZDIwICsgQGF0dHJpYnV0ZXMucGVyY2VwdGlvbi52YWx1ZSArIChAYWJpbGl0aWVzLndpcy52YWx1ZSAvIDEwMClcIixcbiAgICBcInByaW1hcnlUb2tlbkF0dHJpYnV0ZVwiOiBcImF0dHJpYnV0ZXMuaHBcIixcbiAgICBcInVybFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9mb3VuZHJ5dnR0L3BmMmVcIixcbiAgICBcImJ1Z3NcIjogXCJodHRwczovL2dpdGh1Yi5jb20vZm91bmRyeXZ0dC9wZjJlL2lzc3Vlc1wiLFxuICAgIFwiY2hhbmdlbG9nXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2ZvdW5kcnl2dHQvcGYyZS9ibG9iL3JlbGVhc2UvQ0hBTkdFTE9HLm1kXCIsXG4gICAgXCJtYW5pZmVzdFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9mb3VuZHJ5dnR0L3BmMmUvcmVsZWFzZXMvbGF0ZXN0L2Rvd25sb2FkL3N5c3RlbS5qc29uXCIsXG4gICAgXCJkb3dubG9hZFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9mb3VuZHJ5dnR0L3BmMmUvcmVsZWFzZXMvbGF0ZXN0L2Rvd25sb2FkL3BmMmUuemlwXCJcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLFVBQVUsb0JBQW9CO0FBQ3ZDLFNBQVMsZ0JBQWdC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LE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsT0FBUztBQUFBLE1BQ1QsTUFBUTtBQUFBLE1BQ1IsTUFBUTtBQUFBLE1BQ1IsUUFBVTtBQUFBLE1BQ1YsUUFBVTtBQUFBLE1BQ1YsV0FBYTtBQUFBLFFBQ1QsUUFBVTtBQUFBLFFBQ1YsV0FBYTtBQUFBLE1BQ2pCO0FBQUEsTUFDQSxPQUFTLENBQUM7QUFBQSxJQUNkO0FBQUEsRUFDSjtBQUFBLEVBQ0EsYUFBZTtBQUFBLElBQ1g7QUFBQSxNQUNJLE1BQVE7QUFBQSxNQUNSLFNBQVc7QUFBQSxNQUNYLE9BQVM7QUFBQSxNQUNULFNBQVc7QUFBQSxRQUNQO0FBQUEsVUFDSSxNQUFRO0FBQUEsVUFDUixTQUFXO0FBQUEsVUFDWCxPQUFTO0FBQUEsVUFDVCxPQUFTO0FBQUEsWUFDTDtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0o7QUFBQSxRQUNKO0FBQUEsUUFDQTtBQUFBLFVBQ0ksTUFBUTtBQUFBLFVBQ1IsU0FBVztBQUFBLFVBQ1gsT0FBUztBQUFBLFVBQ1QsT0FBUztBQUFBLFlBQ0w7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0o7QUFBQSxRQUNKO0FBQUEsUUFDQTtBQUFBLFVBQ0ksTUFBUTtBQUFBLFVBQ1IsU0FBVztBQUFBLFVBQ1gsT0FBUztBQUFBLFVBQ1QsT0FBUztBQUFBLFlBQ0w7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0o7QUFBQSxRQUNKO0FBQUEsUUFDQTtBQUFBLFVBQ0ksTUFBUTtBQUFBLFVBQ1IsU0FBVztBQUFBLFVBQ1gsT0FBUztBQUFBLFVBQ1QsT0FBUztBQUFBLFlBQ0w7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNKO0FBQUEsUUFDSjtBQUFBLE1BQ0o7QUFBQSxNQUNBLE9BQVM7QUFBQSxRQUNMO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxJQUNBO0FBQUEsTUFDSSxNQUFRO0FBQUEsTUFDUixTQUFXO0FBQUEsTUFDWCxPQUFTO0FBQUEsTUFDVCxPQUFTO0FBQUEsUUFDTDtBQUFBLFFBQ0E7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLElBQ0E7QUFBQSxNQUNJLE1BQVE7QUFBQSxNQUNSLFNBQVc7QUFBQSxNQUNYLE9BQVM7QUFBQSxNQUNULE9BQVM7QUFBQSxRQUNMO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxJQUNBO0FBQUEsTUFDSSxNQUFRO0FBQUEsTUFDUixTQUFXO0FBQUEsTUFDWCxPQUFTO0FBQUEsTUFDVCxPQUFTO0FBQUEsUUFDTDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsSUFDQTtBQUFBLE1BQ0ksTUFBUTtBQUFBLE1BQ1IsU0FBVztBQUFBLE1BQ1gsT0FBUztBQUFBLE1BQ1QsT0FBUztBQUFBLFFBQ0w7QUFBQSxRQUNBO0FBQUEsUUFDQTtB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
