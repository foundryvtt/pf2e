import { ActorPF2e } from "@actor";
import { createConsumableFromSpell } from "@item/consumable/spell-consumables.ts";
import { SpellPF2e } from "@item/spell/document.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import Root from "./app.svelte";
import fapi = foundry.applications.api;

/** An application to create a scroll or wand out of a spell */
class SpellcastingItemCreator extends SvelteApplicationMixin(fapi.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<CreateSpellConsumableConfiguration> = {
        id: "spellcasting-item-creator",
        window: {
            icon: "fa-solid fa-scroll",
            title: "PF2E.SpellcastingItemCreator.Title",
            contentClasses: ["standard-form"],
        },
        position: {
            width: 340,
        },
        tag: "form",
        form: {
            closeOnSubmit: true,
            handler: SpellcastingItemCreator.#onSubmit,
        },
    };

    override root = Root;

    #actor: ActorPF2e;

    #spell: SpellPF2e;

    /** Whether or not hiding identification is enabled by default */
    #initialMystified: boolean;

    constructor(options: CreateSpellConsumableConfiguration) {
        super(options);
        this.#actor = options.actor;
        this.#spell = options.spell;
        this.#initialMystified = !!options.mystified;
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<CreateSpellConsumableContext> {
        const context = await super._prepareContext(options);
        const spell = this.#spell;
        return Object.assign(context, {
            foundryApp: this,
            state: {
                name: spell.name,
                isCantrip: spell.isCantrip,
                minimumRank: spell.baseRank,
                initialMystified: this.#initialMystified,
            },
        });
    }

    static async #onSubmit(
        this: SpellcastingItemCreator,
        _event: Event,
        _form: HTMLFormElement,
        formData: fa.ux.FormDataExtended,
    ) {
        const item = await createConsumableFromSpell(this.#spell, {
            type: String(formData.object.type),
            rank: Number(formData.object.rank),
            mystified: !!formData.object.mystified,
        });
        this.#actor.inventory.add(item, { stack: true });
    }
}

interface CreateSpellConsumableConfiguration extends DeepPartial<fa.ApplicationConfiguration> {
    actor: ActorPF2e;
    /** The spell we're creating the scroll/wand for */
    spell: SpellPF2e;
    /** The initial setting for whether or not to hide the created item's identification */
    mystified?: boolean;
}

interface CreateSpellConsumableContext extends SvelteApplicationRenderContext {
    foundryApp: SpellcastingItemCreator;
    state: {
        name: string;
        isCantrip: boolean;
        minimumRank: number;
        initialMystified: boolean;
    };
}

export { SpellcastingItemCreator };
export type { CreateSpellConsumableContext };
