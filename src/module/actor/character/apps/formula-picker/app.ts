import { ActorPF2e } from "@actor/base.ts";
import type { CraftingAbility } from "@actor/character/crafting/ability.ts";
import { CraftingFormula } from "@actor/character/crafting/types.ts";
import { CharacterPF2e } from "@actor/character/document.ts";
import { ResourceData } from "@actor/creature/index.ts";
import { AbilityItemPF2e, FeatPF2e, PhysicalItemPF2e } from "@item";
import { ItemType, TraitChatData } from "@item/base/data/index.ts";
import { Rarity } from "@module/data.ts";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import MiniSearch from "minisearch";
import * as R from "remeda";
import { ApplicationConfiguration, ApplicationRenderOptions } from "types/foundry/client-esm/applications/_types.js";
import type ApplicationV2 from "types/foundry/client-esm/applications/api/application.js";
import Root from "./app.svelte";

interface FormulaPickerConfiguration extends ApplicationConfiguration {
    actor: CharacterPF2e;
    ability: CraftingAbility;
    prompt: string;
    item?: FeatPF2e | AbilityItemPF2e;
    getSelected?: () => ItemUUID[];
    onSelect: SelectFunction;
    onDeselect: SelectFunction;
}

/** Creates a formula picker dialog that resolves with the selected item */
class FormulaPicker extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<FormulaPickerConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS = {
        id: "{id}-formula-picker",
        position: {
            width: 480,
            height: 600,
        },
        window: {
            icon: "fa-solid fa-toolbox",
            contentClasses: ["standard-form", "compact"],
            resizable: true,
        },
        onSelect: (): void => {},
        onDeselect: (): void => {},
    };

    declare options: FormulaPickerConfiguration;

    override root = Root;

    #resolve?: (value: PhysicalItemPF2e | null) => void;

    #searchEngine = new MiniSearch<Pick<PhysicalItemPF2e, "id" | "name">>({
        fields: ["name"],
        idField: "id",
        processTerm: (t) => (t.length > 1 ? t.toLocaleLowerCase(game.i18n.lang) : null),
        searchOptions: { combineWith: "AND", prefix: true },
    });

    selection: PhysicalItemPF2e | null = null;

    constructor(options: Partial<FormulaPickerConfiguration>) {
        super(options);
    }

    override get title(): string {
        return this.options.item?.name ?? this.options.ability.label;
    }

    /** Overriden to re-render when the actor re-renders */
    override _onFirstRender(context: object, options: ApplicationRenderOptions): void {
        super._onFirstRender(context, options);
        this.options.actor.apps[this.id] = this;
    }

    override _onClose(options: ApplicationRenderOptions): void {
        delete this.options.actor.apps[this.id];
        super._onClose(options);
        this.#resolve?.(this.selection);
    }

    async resolveSelection(): Promise<PhysicalItemPF2e | null> {
        this.render(true);
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    protected override async _prepareContext(): Promise<FormulaPickerContext> {
        const actor = this.options.actor;
        const ability = this.options.ability;
        const resource = actor.getResource(ability.resource ?? "");
        const selected = this.options.getSelected?.() ?? [];

        const formulas = (await actor.crafting.getFormulas()).filter((f) => ability.canCraft(f.item, { warn: false }));
        this.#searchEngine.removeAll();
        this.#searchEngine.addAll(formulas.map((f) => R.pick(f.item, ["id", "name"])));

        return {
            foundryApp: this,
            actor,
            ability,
            onSelect: (uuid: ItemUUID) => {
                if (this.#resolve) {
                    const item = formulas.find((f) => f.item.uuid === uuid)?.item;
                    this.selection = item ?? null;
                    this.close();
                }

                this.options.onSelect(uuid, { formulas });
            },
            onDeselect: (uuid: ItemUUID) => {
                this.options.onDeselect(uuid, { formulas });
            },
            searchEngine: this.#searchEngine,
            state: {
                name: this.options.item?.name ?? ability.label,
                resource,
                prompt: this.options.prompt,
                sections: R.pipe(
                    formulas.map((f) => ({
                        item: {
                            ...R.pick(f.item, ["id", "uuid", "img", "name"]),
                            type: f.item.type as ItemType,
                            level: f.item.level,
                            rarity: f.item.rarity,
                            traits: f.item.traitChatData(),
                        },
                        batchSize: f.batchSize,
                        selected: selected.includes(f.item.uuid),
                    })),
                    R.groupBy((f) => f.item.level || 0),
                    R.entries(),
                    R.map(([level, formulas]): FormulaSection => ({ level: Number(level), formulas })),
                    R.sortBy((s) => -s.level),
                ),
            },
        };
    }
}

interface FormulaPickerContext extends SvelteApplicationRenderContext {
    actor: ActorPF2e;
    ability: CraftingAbility;
    onSelect: (uuid: ItemUUID) => void;
    onDeselect: (uuid: ItemUUID) => void;
    searchEngine: MiniSearch<Pick<PhysicalItemPF2e, "id" | "name">>;
    state: {
        name: string;
        resource: ResourceData | null;
        prompt: string;
        sections: FormulaSection[];
    };
}

interface FormulaSection {
    level: number;
    formulas: {
        item: FormulaViewData;
        batchSize: number;
        selected: boolean;
    }[];
}

interface FormulaViewData {
    id: string;
    uuid: ItemUUID;
    type: ItemType;
    img: string;
    name: string;
    traits: TraitChatData[];
    level: number | null;
    rarity: Rarity | null;
}

type SelectFunction = (uuid: ItemUUID, options: { formulas: CraftingFormula[] }) => void;

export { FormulaPicker };
export type { FormulaPickerContext };
