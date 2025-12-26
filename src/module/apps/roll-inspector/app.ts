import type { RawDamageDice, RawModifier } from "@actor/modifiers.ts";
import type { ApplicationConfiguration } from "@client/applications/_types.d.mts";
import type { ChatContextFlag } from "@module/chat-message/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import * as R from "remeda";
import Root from "./app.svelte";

class RollInspector extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        position: {
            width: 650,
            height: 500,
        },
        window: {
            icon: "fa-solid fa-face-monocle",
            title: "PF2E.ChatRollDetails.Title",
            resizable: true,
        },
    };

    protected override root = Root;

    message: ChatMessagePF2e;

    constructor(options: DeepPartial<ApplicationConfiguration> & { message: ChatMessagePF2e }) {
        super(options);
        this.message = options.message;
    }

    protected override async _prepareContext(): Promise<RollInspectorContext> {
        const context = this.message.flags[SYSTEM_ID].context;
        if (!context) {
            throw new Error("RollInspector must receive a context");
        }

        const contextualOptions = context && "contextualOptions" in context ? context.contextualOptions : {};
        const rollOptions = R.sortBy(context?.options?.sort() ?? [], (o) => o.includes(":"));

        return {
            foundryApp: this,
            state: {
                context,
                dice: this.message.flags[SYSTEM_ID].dice ?? [],
                domains: context?.domains?.sort() ?? [],
                modifiers: this.message.flags[SYSTEM_ID].modifiers ?? [],
                rollOptions,
                contextualOptions: Object.entries(contextualOptions ?? {})
                    .map(([key, value]) => ({
                        header: game.i18n.localize(`PF2E.ChatRollDetails.ContextualOptions.${key}`),
                        options: value ?? [],
                    }))
                    .filter((o) => !!o.options.length),
            },
        };
    }
}

interface RollInspectorContext extends SvelteApplicationRenderContext {
    state: RollInspectorState;
}

interface RollInspectorState {
    context: ChatContextFlag;
    domains: string[];
    modifiers: RawModifier[];
    dice: RawDamageDice[];
    rollOptions: string[];
    contextualOptions: { header: string; options: string[] }[];
}

export { RollInspector };
export type { RollInspectorContext };
