/** @module prosemirror */

import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { keymap } from "prosemirror-keymap";
import { DOMSerializer, Schema } from "prosemirror-model";
import { AllSelection, EditorState, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Step } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import * as chat from "./chat/_module.mjs";
import ProseMirrorClickHandler from "./click-handler.mjs";
import ProseMirrorContentLinkPlugin from "./content-link-plugin.mjs";
import ProseMirrorDirtyPlugin from "./dirty-plugin.mjs";
import DOMParser from "./dom-parser.mjs";
import ProseMirrorDropDown from "./dropdown.mjs";
import ProseMirrorHighlightMatchesPlugin from "./highlight-matches-plugin.mjs";
import ProseMirrorImagePlugin from "./image-plugin.mjs";
import ProseMirrorInputRules from "./input-rules.mjs";
import ProseMirrorKeyMaps from "./keymaps.mjs";
import ProseMirrorMenu from "./menu.mjs";
import ProseMirrorPasteTransformer from "./paste-transformer.mjs";
import ProseMirrorPlugin from "./plugin.mjs";
import { schema as defaultSchema } from "./schema.mjs";
import DisclosureWidget from "./schema/disclosure.mjs";
import { parseHTMLString, serializeHTMLString } from "./util.mjs";

declare const dom: {
    parser: DOMParser;
    serializer: DOMSerializer;
    parseString: typeof parseHTMLString;
    serializeString: typeof serializeHTMLString;
};

export * as collab from "prosemirror-collab";
export * as commands from "prosemirror-commands";
export * as input from "prosemirror-inputrules";
export * as list from "prosemirror-schema-list";
export * as state from "prosemirror-state";
export * as tables from "prosemirror-tables";
export * as transform from "prosemirror-transform";

export const nodeViews: { details: typeof DisclosureWidget.view };

declare const defaultPlugins: {
    inputRules: Plugin;
    keyMaps: Plugin;
    menu: Plugin;
    isDirty: Plugin;
    clickHandler: Plugin;
    pasteTransformer: Plugin;
    baseKeyMap: Plugin;
    dropCursor: Plugin;
    gapCursor: Plugin;
    history: Plugin;
    columnResizing: Plugin;
    tables: Plugin;
};

export const plugins: {
    ProseMirrorPlugin: typeof ProseMirrorPlugin;
    ProseMirrorContentLinkPlugin: typeof ProseMirrorContentLinkPlugin;
    ProseMirrorHighlightMatchesPlugin: typeof ProseMirrorHighlightMatchesPlugin;
    ProseMirrorDirtyPlugin: typeof ProseMirrorDirtyPlugin;
    ProseMirrorImagePlugin: typeof ProseMirrorImagePlugin;
    ProseMirrorClickHandler: typeof ProseMirrorClickHandler;
    ProseMirrorPasteTransformer: typeof ProseMirrorPasteTransformer;
    ProseMirrorInputRules: typeof ProseMirrorInputRules;
    ProseMirrorKeyMaps: typeof ProseMirrorKeyMaps;
    ProseMirrorMenu: typeof ProseMirrorMenu;
    ProseMirrorDropDown: typeof ProseMirrorDropDown;
    chat: typeof chat;
    dropCursor: typeof dropCursor;
    gapCursor: typeof gapCursor;
    history: typeof history;
    keymap: typeof keymap;
};

export {
    AllSelection,
    defaultPlugins,
    defaultSchema,
    dom,
    DOMParser,
    DOMSerializer,
    EditorState,
    EditorView,
    keymap,
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
};
