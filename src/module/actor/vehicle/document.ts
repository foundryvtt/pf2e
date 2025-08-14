import { ActorSizePF2e } from "@actor/data/size.ts";
import { setHitPointsRollOptions } from "@actor/helpers.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { ActorDimensions } from "@actor/types.ts";
import { ItemType } from "@item/base/data/index.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ArmorStatistic, HitPointsStatistic, Statistic, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { ActorPF2e, ActorUpdateCallbackOptions, HitPointsSummary } from "../base.ts";
import { VehicleSource, VehicleSystemData } from "./data.ts";

class VehiclePF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    declare armorClass: StatisticDifficultyClass<ArmorStatistic>;

    override get allowedItemTypes(): (ItemType | "physical")[] {
        return [...super.allowedItemTypes, "physical", "action"];
    }

    /** Vehicle dimensions are specified for all three axes and usually do not form cubes */
    override get dimensions(): ActorDimensions {
        return {
            length: this.system.details.space.long,
            width: this.system.details.space.wide,
            height: this.system.details.space.high,
        };
    }

    override get hardness(): number {
        return this.system.attributes.hardness;
    }

    /** Whether the creature emits sound: overridable by AE-like */
    override get emitsSound(): boolean {
        const { emitsSound } = this.system.attributes;
        return !this.isDead && typeof emitsSound === "boolean"
            ? emitsSound
            : !!game.combats.active?.started && game.combats.active.combatants.some((c) => c.actor === this);
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Set the dimensions of this vehicle in its size object
        const size = this.system.traits.size;
        const dimensions = this.dimensions;
        size.long = dimensions.length;
        size.wide = dimensions.width;

        // Set the prototype token's dimensions according to the vehicle dimensions
        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const { width, height } = size.tokenDimensions;
            this.prototypeToken.width = width;
            this.prototypeToken.height = height;
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.prepareSynthetics();

        // If broken, inject some synthetics first
        if (this.hasCondition("broken")) {
            for (const selector of ["ac", "saving-throw"]) {
                const modifiers = (this.synthetics.modifiers[selector] ??= []);
                const brokenModifier = new ModifierPF2e({
                    slug: "broken",
                    label: "PF2E.ConditionTypeBroken",
                    modifier: -2,
                    adjustments: extractModifierAdjustments(this.synthetics.modifierAdjustments, [selector], "broken"),
                });

                modifiers.push(() => brokenModifier);
            }
        }

        // Hit Points
        const { attributes } = this;
        const hitPoints = new HitPointsStatistic(this, { baseMax: attributes.hp.max });
        attributes.hp = fu.mergeObject(hitPoints.getTraceData(), { brokenThreshold: Math.floor(hitPoints.max / 2) });
        setHitPointsRollOptions(this);

        // Prepare AC
        const armorStatistic = new ArmorStatistic(this, {
            modifiers: [
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: this.system.attributes.ac.value - 10,
                    adjustments: extractModifierAdjustments(this.synthetics.modifierAdjustments, ["all", "ac"], "base"),
                }),
            ],
        });
        this.armorClass = armorStatistic.dc;
        this.system.attributes.ac = armorStatistic.getTraceData();

        this.prepareSaves();
    }

    private prepareSaves(): void {
        const { synthetics } = this;

        const slug = "fortitude";
        const domains = [slug, "saving-throw", "all"];
        const modifiers = [
            new ModifierPF2e({
                label: "PF2E.ModifierTitle",
                slug,
                type: "untyped",
                modifier: this.system.saves.fortitude.value,
            }),
            ...extractModifiers(synthetics, domains),
        ];

        const fortitude = new Statistic(this, {
            slug: "fortitude",
            label: CONFIG.PF2E.saves.fortitude,
            modifiers,
            domains,
            check: {
                type: "saving-throw",
            },
        });

        this.saves = { fortitude };
        this.system.saves.fortitude = fu.mergeObject(this.system.saves.fortitude, fortitude.getTraceData());
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: ActorUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        const result = await super._preUpdate(changed, options, user);
        if (result === false) return result;

        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const currentSpace = this.system.details.space;
            const spaceUpdates = {
                wide: changed.system?.details?.space?.wide ?? currentSpace.wide,
                long: changed.system?.details?.space?.long ?? currentSpace.long,
            };
            const sizeCategory = changed.system?.traits?.size?.value ?? this.size;
            const size = new ActorSizePF2e({ value: sizeCategory, ...spaceUpdates });
            const tokenDimensions = size.tokenDimensions;
            changed.prototypeToken = fu.mergeObject(changed.prototypeToken ?? {}, tokenDimensions);

            if (canvas.scene) {
                const updates = this.getActiveTokens(true, true)
                    .filter((token) => token.linkToActorSize)
                    .map((token) => ({ _id: token.id, ...tokenDimensions }));
                await TokenDocumentPF2e.updateDocuments(updates, { parent: canvas.scene });
            }
        }
    }
}

interface VehiclePF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: VehicleSource;
    system: VehicleSystemData;

    get hitPoints(): HitPointsSummary;

    saves: { fortitude: Statistic };
}

export { VehiclePF2e };
