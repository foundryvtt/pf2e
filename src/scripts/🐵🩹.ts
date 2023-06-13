import { TextEditorPF2e } from "@system/text-editor.ts";
import { tupleHasValue } from "@util";

export function monkeyPatchFoundry(): void {
    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
    TextEditor._createInlineRoll = TextEditorPF2e._createInlineRoll;
    TextEditor._onClickInlineRoll = TextEditorPF2e._onClickInlineRoll;
}

// Work around https://github.com/foundryvtt/foundryvtt/issues/9549
export function monkeyPatchSettings(): void {
    const PRIMITIVE_TYPES = [String, Number, Boolean, Array]; // v10 "primitive" config types
    const originalGet = game.settings.get;
    game.settings.get = function (namespace: string, key: string) {
        const value = originalGet.call(game.settings, namespace, key);
        const resolvedKey = `${namespace}.${key}`;
        const config = game.settings.settings.get(resolvedKey);
        if (config && tupleHasValue(PRIMITIVE_TYPES, config.type)) {
            return config.type(value);
        }

        return value;
    } as typeof originalGet;
}
