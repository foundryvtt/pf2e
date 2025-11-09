import type { ActorPF2e, CharacterPF2e } from "@actor";
import type { CraftingAbility } from "@actor/character/crafting/ability.ts";
import type { ResourceData } from "@actor/creature/index.ts";
import type ApplicationV2 from "@client/applications/api/application.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import type { AbilityItemPF2e, FeatPF2e, PhysicalItemPF2e } from "@item";
import type { TraitChatData } from "@item/base/data/index.ts";
import type { ItemType } from "@item/types.ts";
import { Rarity } from "@module/data.ts";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import MiniSearch from "minisearch";
import * as R from "remeda";
import Root from "./app.svelte";

interface FormulaPickerConfiguration extends fa.ApplicationConfiguration {
    actor: CharacterPF2e;
    ability: CraftingAbility;
    item?: FeatPF2e | AbilityItemPF2e;
    mode: "craft" | "prepare";
}

/** Creates a formula picker dialog that resolves with the selected item */
class FormulaPicker extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<FormulaPickerConfiguration> }
>(fa.api.ApplicationV2) {
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
    protected override async _onFirstRender(
        context: fa.ApplicationRenderContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.options.actor.apps[this.id] = this;
    }

    protected override _onClose(options: fa.ApplicationClosingOptions): void {
        delete this.options.actor.apps[this.id];
        super._onClose(options);
        this.#resolve?.(this.selection);
    }

    async resolveSelection(): Promise<PhysicalItemPF2e | null> {
        this.render({ force: true });
        return new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    protected override async _prepareContext(): Promise<FormulaPickerContext> {
        const { actor, ability, mode } = this.options;
        const formulas = await ability.getValidFormulas();
        const sheetData = await ability.getSheetData();
        const resource = sheetData.resource;
        this.#searchEngine.removeAll();
        this.#searchEngine.addAll(formulas.map((f) => R.pick(f.item, ["id", "name"])));

        const prompt =
            mode === "prepare"
                ? game.i18n.format("PF2E.Actor.Character.Crafting.PrepareHint", {
                      remaining: sheetData.remainingSlots,
                  })
                : resource
                  ? game.i18n.format("PF2E.Actor.Character.Crafting.Action.Hint", {
                        resource: resource.label,
                        value: resource.value,
                        max: resource.max,
                    })
                  : game.i18n.localize("PF2E.Actor.Character.Crafting.Action.HintResourceless");

        return {
            foundryApp: this,
            actor,
            ability,
            mode: this.options.mode,
            onSelect: (uuid: ItemUUID) => {
                if (this.#resolve) {
                    const item = formulas.find((f) => f.item.uuid === uuid)?.item;
                    this.selection = item ?? null;
                    this.close();
                } else if (mode === "prepare") {
                    ability.prepareFormula(uuid);
                }
            },
            onDeselect: (uuid: ItemUUID) => {
                if (mode === "prepare") {
                    ability.unprepareFormula(uuid);
                }
            },
            searchEngine: this.#searchEngine,
            state: {
                name: this.options.item?.name ?? ability.label,
                resource,
                prompt,
                sections: R.pipe(
                    formulas.map((f) => {
                        const preparedQuantity =
                            mode === "prepare"
                                ? ability.preparedFormulaData
                                      .filter((d) => d.uuid === f.item.uuid)
                                      .reduce((sum, v) => sum + (v.quantity ?? 1), 0)
                                : 0;

                        return {
                            item: {
                                ...R.pick(f.item, ["id", "uuid", "img", "name"]),
                                type: f.item.type as ItemType,
                                level: f.item.level,
                                rarity: f.item.rarity,
                                traits: f.item.traitChatData(),
                            },
                            quantity: mode === "prepare" ? preparedQuantity : f.batchSize,
                            selected: preparedQuantity > 0,
                        };
                    }),
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
    mode: "craft" | "prepare";
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
        /** The batch size or quantity prepared depending on context */
        quantity: number;
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

export { FormulaPicker };
export type { FormulaPickerContext };
