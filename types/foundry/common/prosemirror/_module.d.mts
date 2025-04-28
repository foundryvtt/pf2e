/** @module prosemirror */

import * as collab from "prosemirror-collab";
import { keymap } from "prosemirror-keymap";
import { DOMSerializer, Schema } from "prosemirror-model";
import { AllSelection, EditorState, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Step } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import ProseMirrorClickHandler from "./click-handler.mjs";
import ProseMirrorContentLinkPlugin from "./content-link-plugin.mjs";
import ProseMirrorDirtyPlugin from "./dirty-plugin.mjs";
import DOMParser from "./dom-parser.mjs";
import "./extensions.mjs";
import ProseMirrorHighlightMatchesPlugin from "./highlight-matches-plugin.mjs";
import ProseMirrorImagePlugin from "./image-plugin.mjs";
import ProseMirrorInputRules from "./input-rules.mjs";
import ProseMirrorKeyMaps from "./keymaps.mjs";
import ProseMirrorMenu from "./menu.mjs";
import ProseMirrorPlugin from "./plugin.mjs";
import { schema as defaultSchema } from "./schema.mjs";
import { parseHTMLString, serializeHTMLString } from "./util.mjs";

declare const dom: {
    parser: DOMParser;
    serializer: DOMSerializer;
    parseString: parseHTMLString;
    serializeString: serializeHTMLString;
};

declare const defaultPlugins: {
    inputRules: ProseMirror.Plugin;
    keyMaps: ProseMirror.Plugin;
    menu: ProseMirror.Plugin;
    isDirty: ProseMirror.Plugin;
    clickHandler: ProseMirror.Plugin;
    pasteTransformer: ProseMirror.Plugin;
    baseKeyMap: ProseMirror.Plugin;
    dropCursor: ProseMirror.Plugin;
    gapCursor: ProseMirror.Plugin;
    history: ProseMirror.Plugin;
    columnResizing: ProseMirror.Plugin;
    tables: ProseMirror.Plugin;
};

export * as commands from "prosemirror-commands";
export * as input from "prosemirror-inputrules";
export * as list from "prosemirror-schema-list";
export * as state from "prosemirror-state";
export * as tables from "prosemirror-tables";
export * as transform from "prosemirror-transform";

export {
    AllSelection,
    DOMParser,
    DOMSerializer,
    EditorState,
    EditorView,
    Plugin,
    PluginKey,
    ProseMirrorClickHandler,
    ProseMirrorContentLinkPlugin,
    ProseMirrorDirtyPlugin,
    ProseMirrorHighlightMatchesPlugin,
    ProseMirrorImagePlugin,
    ProseMirrorInputRules,
    ProseMirrorKeyMaps,
    ProseMirrorMenu,
    ProseMirrorPlugin,
    Schema,
    Step,
    TextSelection,
    collab,
    defaultPlugins,
    defaultSchema,
    dom,
    keymap,
};
