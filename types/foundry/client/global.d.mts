import * as constants from "@common/constants.mjs";
import { ForcedDeletion, ForcedReplacement } from "@common/data/operators.mjs";
import * as PixiGraphicsSmooth from "@pixi/graphics-smooth";
import * as PixiParticles from "@pixi/particle-emitter";
import "gsap";
import "handlebars";
import clipperlib from "js-angusj-clipper";
import PixiJS from "pixi.js";
import "showdown";
import * as SocketIO from "socket.io-client";
import * as globalFoundry from "./client.mjs";
import Localization from "./helpers/localization.mjs";

declare module "pixi.js" {
    export import LegacyGraphics = PixiJS.Graphics;
    export import smooth = PixiGraphicsSmooth;
    export import particles = PixiParticles;
    enum UPDATE_PRIORITY {
        PERCEPTION = 2,
        PRIMARY = 3,
        INTERFACE = 22,
        OBJECTS = 23,
    }
}

declare global {
    namespace globalThis {
        const _del: ForcedDeletion;
        const _loc: Localization["localize"];
        const _replace: typeof ForcedReplacement.create;
        export import ClipperLib = clipperlib;
        export import CONST = constants;
        export import Hooks = foundry.helpers.Hooks;
        export import PIXI = PixiJS;
        export import foundry = globalFoundry;
        export import io = SocketIO;
    }
}
