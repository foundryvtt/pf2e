import * as constants from "@common/constants.mjs";
import * as PixiGraphicsSmooth from "@pixi/graphics-smooth";
import * as PixiParticles from "@pixi/particle-emitter";
import "gsap";
import "handlebars";
import clipperlib from "js-angusj-clipper";
import PixiJS from "pixi.js";
import "showdown";
import * as SocketIO from "socket.io-client";
import { TinyMCE as tinymce } from "./../tinymce-stub.mjs";
import * as globalFoundry from "./client.mjs";

declare module "pixi.js" {
    export import LegacyGraphics = PixiJS.Graphics;
    export import smooth = PixiGraphicsSmooth;
    export import particles = PixiParticles;
}

declare global {
    namespace globalThis {
        export import ClipperLib = clipperlib;
        export import CONST = constants;
        export import Hooks = foundry.helpers.Hooks;
        export import PIXI = PixiJS;
        export import TinyMCE = tinymce;
        export import foundry = globalFoundry;
        export import io = SocketIO;
    }
}
