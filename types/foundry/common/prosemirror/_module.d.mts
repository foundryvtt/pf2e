/** @module prosemirror */

import * as collab from "prosemirror-collab";
import { baseKeymap } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { history } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { DOMSerializer, Schema } from "prosemirror-model";
import { AllSelection, EditorState, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { columnResizing, tableEditing } from "prosemirror-tables";
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
import ProseMirrorPasteTransformer from "./paste-transformer.mjs";
import ProseMirrorPlugin from "./plugin.mjs";
import { schema as defaultSchema } from "./schema.mjs";
import { parseHTMLString, serializeHTMLString } from "./util.mjs";

const dom = {
    parser: DOMParser.fromSchema(defaultSchema),
    serializer: DOMSerializer.fromSchema(defaultSchema),
    parseString: parseHTMLString,
    serializeString: serializeHTMLString,
};

const defaultPlugins = {
    inputRules: ProseMirrorInputRules.build(defaultSchema),
    keyMaps: ProseMirrorKeyMaps.build(defaultSchema),
    menu: ProseMirrorMenu.build(defaultSchema),
    isDirty: ProseMirrorDirtyPlugin.build(defaultSchema),
    clickHandler: ProseMirrorClickHandler.build(defaultSchema),
    pasteTransformer: ProseMirrorPasteTransformer.build(defaultSchema),
    baseKeyMap: keymap(baseKeymap),
    dropCursor: dropCursor(),
    gapCursor: gapCursor(),
    history: history(),
    columnResizing: columnResizing(),
    tables: tableEditing(),
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
