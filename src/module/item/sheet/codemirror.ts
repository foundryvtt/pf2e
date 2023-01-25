import { EditorView, basicSetup } from "codemirror";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { linter } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { RuleElements } from "@module/rules";

export const CodeMirror = {
    EditorView,
    basicSetup,
    json,
    jsonLinter: () => linter(jsonParseLinter()),
    keybindings: keymap.of([indentWithTab]),

    /** All language and autocomplete extensions for rule element editing */
    ruleElementExtensions: () => [
        json(),
        CodeMirror.jsonLinter(),
        autocompletion({
            override: [ruleElementAutocomplete],
        }),
    ],
};

function ruleElementAutocomplete(context: CompletionContext): null | CompletionResult {
    const node = syntaxTree(context.state).resolveInner(context.pos, -1);

    // Check if this is a property
    if (node.name === "Object" || node.type.name === "PropertyName") {
        const basePath = resolveNodePath(context, node);
        if (basePath === "") {
            return {
                from: node.from,
                to: node.to,
                options: ["key"].map((o) => ({ label: `"${o}"` })),
            };
        }

        return null;
    }

    // Check if this is a value. If the value hasn't started yet (ex: "key": ), the node name is Property.
    // If it has (ex: "key": ""), the parent is Property
    if (node.name === "Property" || node.parent?.name === "Property") {
        const basePath = resolveNodePath(context, node);
        if (basePath === "key") {
            const options: string[] = Object.keys(RuleElements.all);
            return {
                from: node.from,
                to: node.to,
                options: options.map((o) => ({ label: `"${o}"` })),
            };
        }

        return null;
    }

    return null;
}

type SyntaxNode = ReturnType<ReturnType<typeof syntaxTree>["resolveInner"]>;

function resolveNodePath(context: CompletionContext, node: SyntaxNode): string | null {
    // If we are currently typing a property, start from the parent
    node = node.type.name === "PropertyName" && node.parent ? node.parent : node;

    const parent = node.parent;
    if (!parent || parent.type.name === "JsonText") return "";

    const parentType = parent.type.name;
    if (parentType === "⚠") return null;

    const name = (() => {
        // Add a . if this is a parent, unless there is no further parent or the parent is the tree root
        if (parentType === "Object") {
            return !parent.parent || parent.parent.type.name === "JsonText" ? "" : ".";
        }

        if (parentType === "Property") {
            return context.state.sliceDoc(parent.from, parent.to).match(/^"([^"]*)"/)?.[1];
        }

        if (parentType === "Array") {
            return "[]";
        }

        // Unsupported
        return null;
    })();

    if (name === null) return null;

    const basePath = resolveNodePath(context, parent);
    return basePath === null ? null : basePath + name;
}
