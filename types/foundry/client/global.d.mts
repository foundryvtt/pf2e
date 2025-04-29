import * as constants from "@common/constants.mjs";
import "gsap";
import "handlebars";
import clipperlib from "js-angusj-clipper";
import PixiJS from "pixi.js";
import * as Showdown from "showdown";
import * as SocketIO from "socket.io-client";
import { TinyMCE as tinymce } from "./../tinymce-stub.mjs";
import * as globalFoundry from "./client.mjs";

declare global {
    namespace globalThis {
        export import ClipperLib = clipperlib;
        export import CONST = constants;
        export import Hooks = foundry.helpers.Hooks;
        export import PIXI = PixiJS;
        export import TinyMCE = tinymce;
        export import foundry = globalFoundry;
        export import io = SocketIO;

        const showdown: typeof Showdown;
    }
}
