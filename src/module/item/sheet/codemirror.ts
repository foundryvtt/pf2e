import { EditorView, basicSetup } from "codemirror";
import { autocompletion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { linter } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { RuleElements } from "@module/rules";
import { DataSchema } from "types/foundry/common/data/fields.mjs";

export const CodeMirror = {
    EditorView,
    basicSetup,
    json,
    jsonLinter: () => linter(jsonParseLinter()),
    keybindings: keymap.of([indentWithTab]),

    /** All language and autocomplete extensions for rule element editing */
    ruleElementExtensions: (options: RuleElementOptions) => [
        json(),
        CodeMirror.jsonLinter(),
        autocompletion({
            override: [ruleElementAutocomplete(options)],
        }),
    ],
};

interface RuleElementOptions {
    schema?: DataSchema;
}

function ruleElementAutocomplete(options: RuleElementOptions) {
    // Pre-process valid keys by base path
    const validKeysByPath = ((): Record<string, string[] | undefined> => {
        if (!options.schema) {
            return { "": ["key"] };
        }

        // todo: make recursive
        const topLevel = Object.keys(options.schema);
        return { "": topLevel };
    })();

    return (context: CompletionContext): null | CompletionResult => {
        const node = syntaxTree(context.state).resolveInner(context.pos, -1);

        // Note that node's for values that haven't been typed yet (such as "key": have the name property)
        // Once the value has started being typed, the parent is property
        const isProperty = node.name === "Object" || node.type.name === "PropertyName";
        const isValue = !isProperty && (node.name === "Property" || node.parent?.name === "Property");

        if (isProperty) {
            const basePath = resolveNodePath(context, node);
            const keys = basePath !== null ? validKeysByPath[basePath] : [];
            if (keys?.length) {
                return {
                    from: node.from,
                    to: node.to,
                    options: keys.map((o) => ({ label: `"${o}"` })),
                };
            }

            return null;
        } else if (isValue) {
            const basePath = resolveNodePath(context, node);
            if (basePath === "key") {
                const options: string[] = Object.keys(RuleElements.all);
                return {
                    from: node.from,
                    to: node.to,
                    options: options.map((o) => ({ label: `"${o}"` })),
                };
            }
        }

        return null;
    };
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
