import type { VehiclePF2e } from "@actor/vehicle/index.ts";
import type { PublicationData } from "@module/data.ts";
import type {
    ActorSheetContextV2,
    ActorSheetStateV2,
    IWRCategory,
    SheetTabsConfiguration,
} from "../../sheet/v2/base.svelte.ts";
import { ActorSheetPF2eV2 } from "../../sheet/v2/base.svelte.ts";
import Root from "./app.svelte";

class VehicleSheetV2 extends ActorSheetPF2eV2<VehiclePF2e> {
    static override DEFAULT_OPTIONS: DeepPartial<fa.api.DocumentSheetConfiguration> = {
        classes: ["vehicle"],
        position: { width: 700, height: 565 },
        actions: {
            openTraitSelector: VehicleSheetV2.#onOpenTraitSelector,
        },
    };

    static override TABS: Record<string, SheetTabsConfiguration> = {
        primary: {
            tabs: [
                { id: "details", label: "PF2E.Details", icon: "fa-solid fa-dharmachakra" },
                { id: "description", label: "PF2E.TabDescriptionLabel", icon: "fa-solid fa-book-open-reader" },
            ],
        },
    };

    protected root = Root;

    protected override async _prepareContext(options: fa.api.DocumentSheetRenderOptions): Promise<VehicleSheetContext> {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        const system = actor.system;
        const source = actor._source.system;
        const toOptions = (record: Record<string, string>) =>
            Object.entries(record).map(([value, label]) => ({ value, label: _loc(label) }));
        const byLabel = (a: string, b: string) => a.localeCompare(b, game.i18n.lang);
        const iwrLabels = (category: IWRCategory) => system.attributes[category].map((e) => e.label).sort(byLabel);
        const vehicleTraits: Record<string, string> = CONFIG.PF2E.vehicleTraits;
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;

        const state: VehicleSheetState = {
            ...context.state,
            header: {
                rarity: source.traits.rarity,
                rarityOptions: toOptions(CONFIG.PF2E.rarityTraits),
                size: source.traits.size.value,
                sizeOptions: toOptions(CONFIG.PF2E.actorSizes),
                level: source.details.level.value,
            },
            sidebar: {
                hp: {
                    value: system.attributes.hp.value,
                    max: system.attributes.hp.max,
                    maxSource: source.attributes.hp.max,
                    brokenThreshold: system.attributes.hp.brokenThreshold,
                },
                ac: { value: system.attributes.ac.value, source: source.attributes.ac.value },
                hardness: { value: system.attributes.hardness, source: source.attributes.hardness },
                fortitude: { value: actor.saves.fortitude.mod, source: source.saves.fortitude.value },
                iwr: [
                    { category: "immunities", label: "PF2E.ImmunitiesLabel", entries: iwrLabels("immunities") },
                    { category: "weaknesses", label: "PF2E.WeaknessesLabel", entries: iwrLabels("weaknesses") },
                    { category: "resistances", label: "PF2E.ResistancesLabel", entries: iwrLabels("resistances") },
                ],
                emitsSound: source.attributes.emitsSound,
            },
            details: {
                space: source.details.space,
                price: source.details.price,
                speed: source.details.speed,
                crew: source.details.crew,
                passengers: source.details.passengers,
                collisionDC: source.attributes.collisionDC.value,
                collisionDamage: source.attributes.collisionDamage.value,
                pilotingCheck: source.details.pilotingCheck,
                traits: system.traits.value
                    .map((value) => ({
                        value,
                        label: _loc(vehicleTraits[value] ?? value),
                        description: traitDescriptions[value] ?? null,
                    }))
                    .sort((a, b) => byLabel(a.label, b.label)),
            },
            description: {
                value: source.details.description,
                // Only the description tab shows it
                enriched:
                    this.activeTab === "description"
                        ? await fa.ux.TextEditor.enrichHTML(system.details.description, {
                              rollData: actor.getRollData(),
                              secrets: actor.isOwner,
                          })
                        : "",
                publication: source.details.publication,
            },
        };
        return { ...context, foundryApp: this, state };
    }

    async updateEmitsSound(value: boolean | "encounter"): Promise<unknown> {
        return this.updateField("system.attributes.emitsSound", value);
    }

    static #onOpenTraitSelector(this: VehicleSheetV2): void {
        this.openTagSelector("system.traits", ["vehicleTraits"]);
    }
}

interface AdjustableValue {
    value: number;
    source: number;
}

interface SheetSelectOption {
    value: string;
    label: string;
}

interface VehicleSheetState extends ActorSheetStateV2 {
    header: {
        rarity: string;
        rarityOptions: SheetSelectOption[];
        size: string;
        sizeOptions: SheetSelectOption[];
        level: number;
    };
    sidebar: {
        hp: { value: number; max: number; maxSource: number; brokenThreshold: number };
        ac: AdjustableValue;
        hardness: AdjustableValue;
        fortitude: AdjustableValue;
        iwr: { category: IWRCategory; label: string; entries: string[] }[];
        emitsSound: boolean | "encounter";
    };
    details: {
        space: { long: number; wide: number; high: number };
        price: number;
        speed: string;
        crew: string;
        passengers: string;
        collisionDC: number;
        collisionDamage: string;
        pilotingCheck: string;
        traits: { value: string; label: string; description: string | null }[];
    };
    description: {
        value: string;
        enriched: string;
        publication: PublicationData;
    };
}

interface VehicleSheetContext extends ActorSheetContextV2<VehiclePF2e> {
    foundryApp: VehicleSheetV2;
    state: VehicleSheetState;
}

export { VehicleSheetV2 };
export type { AdjustableValue, SheetSelectOption, VehicleSheetContext, VehicleSheetState };
