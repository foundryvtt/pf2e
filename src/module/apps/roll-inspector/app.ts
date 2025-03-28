import type { RawDamageDice, RawModifier } from "@actor/modifiers.ts";
import type { ChatContextFlag } from "@module/chat-message/data.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import * as R from "remeda";
import type { ApplicationConfiguration } from "types/foundry/client-esm/applications/_types.js";
import Root from "./app.svelte";

interface RollInspectorConfiguration extends ApplicationConfiguration {
    message: ChatMessagePF2e;
}

class RollInspector extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
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

    declare options: RollInspectorConfiguration;

    override root = Root;

    get message(): ChatMessagePF2e {
        return this.options.message;
    }

    constructor(options: Partial<RollInspectorConfiguration>) {
        super(options);
    }

    protected override async _prepareContext(): Promise<RollInspectorContext> {
        const context = this.message.flags.pf2e.context;
        if (!context) {
            throw new Error("RollInspector must receive a context");
        }

        const contextualOptions = context && "contextualOptions" in context ? context.contextualOptions : {};
        const rollOptions = R.sortBy(context?.options?.sort() ?? [], (o) => o.includes(":"));

        return {
            foundryApp: this,
            state: {
                context,
                dice: this.message.flags.pf2e.dice ?? [],
                domains: context?.domains?.sort() ?? [],
                modifiers: this.message.flags.pf2e.modifiers ?? [],
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
