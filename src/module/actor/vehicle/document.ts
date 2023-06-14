import { ModifierPF2e, StatisticModifier } from "@actor/modifiers.ts";
import { ActorDimensions } from "@actor/types.ts";
import { ItemType } from "@item/data/index.ts";
import { extractModifierAdjustments, extractModifiers } from "@module/rules/helpers.ts";
import { UserPF2e } from "@module/user/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";
import { ArmorStatistic } from "@system/statistic/armor-class.ts";
import { Statistic, StatisticDifficultyClass } from "@system/statistic/index.ts";
import { ActorPF2e, HitPointsSummary } from "../base.ts";
import { TokenDimensions, VehicleSource, VehicleSystemData } from "./data.ts";

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

    getTokenDimensions(dimensions: Omit<ActorDimensions, "height"> = this.dimensions): TokenDimensions {
        return {
            width: Math.max(Math.round(dimensions.width / 5), 1),
            height: Math.max(Math.round(dimensions.length / 5), 1),
        };
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        // Vehicles never have negative healing
        const { attributes, details } = this.system;
        attributes.hp.negativeHealing = false;
        details.alliance = null;

        // Set the dimensions of this vehicle in its size object
        const { size } = this.system.traits;
        const { dimensions } = this;
        size.length = dimensions.length;
        size.width = dimensions.width;

        // Set the prototype token's dimensions according to the vehicle dimensions
        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const { width, height } = this.getTokenDimensions();
            this.prototypeToken.width = width;
            this.prototypeToken.height = height;
        }
    }

    override prepareEmbeddedDocuments(): void {
        super.prepareEmbeddedDocuments();

        for (const rule of this.rules) {
            rule.onApplyActiveEffects?.();
        }
    }

    override prepareDerivedData(): void {
        super.prepareDerivedData();
        this.prepareSynthetics();

        const { modifierAdjustments, statisticsModifiers } = this.synthetics;

        // If broken, inject some synthetics first
        if (this.hasCondition("broken")) {
            for (const selector of ["ac", "saving-throw"]) {
                const modifiers = (statisticsModifiers[selector] ??= []);
                const brokenModifier = new ModifierPF2e({
                    slug: "broken",
                    label: "PF2E.ConditionTypeBroken",
                    modifier: -2,
                    adjustments: extractModifierAdjustments(modifierAdjustments, [selector], "broken"),
                });

                modifiers.push(() => brokenModifier);
            }
        }

        // Hit Points
        {
            const system = this.system;
            const base = system.attributes.hp.max;
            const modifiers: ModifierPF2e[] = [
                extractModifiers(this.synthetics, ["hp"], { test: this.getRollOptions(["hp"]) }),
                extractModifiers(this.synthetics, ["hp-per-level"], {
                    test: this.getRollOptions(["hp-per-level"]),
                }).map((modifier) => {
                    modifier.modifier *= this.level;
                    return modifier;
                }),
            ].flat();

            const hpData = deepClone(system.attributes.hp);
            const stat = mergeObject(new StatisticModifier("hp", modifiers), hpData, { overwrite: false });
            stat.max = stat.max + stat.totalModifier;
            stat.value = Math.min(stat.value, stat.max); // Make sure the current HP isn't higher than the max HP
            stat.breakdown = [
                game.i18n.format("PF2E.MaxHitPointsBaseLabel", { base }),
                ...stat.modifiers
                    .filter((m) => m.enabled)
                    .map((m) => `${m.label} ${m.modifier < 0 ? "" : "+"}${m.modifier}`),
            ].join(", ");

            system.attributes.hp = stat;

            // Set a roll option for HP percentage
            const percentRemaining = Math.floor((stat.value / stat.max) * 100);
            this.rollOptions.all[`hp-remaining:${stat.value}`] = true;
            this.rollOptions.all[`hp-percent:${percentRemaining}`] = true;

            // Broken threshold is based on the maximum health
            system.attributes.hp.brokenThreshold = Math.floor(system.attributes.hp.max / 2);
        }

        // Prepare AC
        const armorStatistic = new ArmorStatistic(this, {
            modifiers: [
                new ModifierPF2e({
                    slug: "base",
                    label: "PF2E.ModifierTitle",
                    modifier: this.system.attributes.ac.value - 10,
                    adjustments: extractModifierAdjustments(modifierAdjustments, ["all", "ac"], "base"),
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
        this.system.saves.fortitude = mergeObject(this.system.saves.fortitude, fortitude.getTraceData());
    }

    protected override async _preUpdate(
        changed: DeepPartial<VehicleSource>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<void> {
        await super._preUpdate(changed, options, user);
        if (this.prototypeToken.flags?.pf2e?.linkToActorSize) {
            const { space } = this.system.details;
            const spaceUpdates = {
                width: changed.system?.details?.space?.wide ?? space.wide,
                length: changed.system?.details?.space?.long ?? space.long,
            };
            const tokenDimensions = this.getTokenDimensions(spaceUpdates);
            mergeObject(changed, { token: tokenDimensions });

            if (canvas.scene) {
                const updates = this.getActiveTokens()
                    .filter((token) => token.document.linkToActorSize)
                    .map((token) => ({ _id: token.id, ...tokenDimensions }));
                await TokenDocumentPF2e.updateDocuments(updates, { parent: canvas.scene });
            }
        }
    }
}

interface VehiclePF2e<TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends ActorPF2e<TParent> {
    readonly _source: VehicleSource;
    readonly abilities?: never;
    system: VehicleSystemData;

    get hitPoints(): HitPointsSummary;

    saves: { fortitude: Statistic };
}

export { VehiclePF2e };
