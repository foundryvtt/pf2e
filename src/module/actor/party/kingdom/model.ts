import { ActorPF2e, type ArmyPF2e, type PartyPF2e } from "@actor";
import { FeatGroup } from "@actor/character/feats/index.ts";
import { MODIFIER_TYPES, Modifier, RawModifier, createProficiencyModifier } from "@actor/modifiers.ts";
import { CampaignFeaturePF2e, ItemPF2e } from "@item";
import type { ItemType } from "@item/types.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { ZeroToFour } from "@module/data.ts";
import { extractModifierAdjustments } from "@module/rules/helpers.ts";
import { Statistic } from "@system/statistic/index.ts";
import { ErrorPF2e, createHTMLElement, fontAwesomeIcon, objectHasKey, setHasElement } from "@util";
import * as R from "remeda";
import { PartySystemData } from "../data.ts";
import { PartyCampaign } from "../types.ts";
import { KingdomBuilder } from "./builder.ts";
import { calculateKingdomCollectionData, importDocuments, resolveKingdomBoosts } from "./helpers.ts";
import {
    KingdomCHG,
    KingdomCharter,
    KingdomData,
    KingdomGovernment,
    KingdomSchema,
    KingdomSource,
    defineKingdomSchema,
} from "./schema.ts";
import { KingdomSheetPF2e } from "./sheet.ts";
import type { KingdomNationType, KingdomSkill } from "./types.ts";
import {
    CONTROL_DC_BY_LEVEL,
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_LEADERSHIP,
    KINGDOM_LEADERSHIP_ABILITIES,
    KINGDOM_RUIN_LABELS,
    KINGDOM_SETTLEMENT_TYPE_DATA,
    KINGDOM_SIZE_DATA,
    KINGDOM_SKILLS,
    KINGDOM_SKILL_ABILITIES,
    KINGDOM_SKILL_LABELS,
    VACANCY_PENALTIES,
} from "./values.ts";

/** Model for the Kingmaker campaign data type, which represents a Kingdom */
class Kingdom extends foundry.abstract.DataModel<PartySystemData, KingdomSchema> implements PartyCampaign {
    declare nationType: KingdomNationType;
    declare features: FeatGroup<PartyPF2e, CampaignFeaturePF2e>;
    declare feats: FeatGroup<PartyPF2e, CampaignFeaturePF2e>;
    declare bonusFeats: FeatGroup<PartyPF2e, CampaignFeaturePF2e>;
    declare skills: Record<KingdomSkill, Statistic>;
    declare control: Statistic;
    declare armies: ArmyPF2e[];

    static override defineSchema(): KingdomSchema {
        return defineKingdomSchema();
    }

    get actor(): PartyPF2e {
        return this.parent.parent;
    }

    get extraItemTypes(): ItemType[] {
        return ["campaignFeature", "effect"];
    }

    get activities(): CampaignFeaturePF2e[] {
        return this.actor.itemTypes.campaignFeature.filter((k) => k.category === "kingdom-activity");
    }

    get charter(): KingdomCharter | null {
        return this.build.charter;
    }

    get heartland(): KingdomCHG | null {
        return this.build.heartland;
    }

    get government(): KingdomGovernment | null {
        return this.build.government;
    }

    /** Creates sidebar buttons to inject into the chat message sidebar */
    createSidebarButtons(): HTMLElement[] {
        // Do not show kingdom to party members until building starts or it becomes activated.
        if (!(this.active || game.user.isGM) || game.pf2e.settings.campaign.type !== "kingmaker") return [];

        const hoverIcon = this.active === "building" ? ["icon-plus", "icon-wrench"] : !this.active ? ["icon-plus"] : [];
        const icon = createHTMLElement("button", {
            classes: ["create-button", "icon", ...hoverIcon],
            children: [fontAwesomeIcon("crown")],
            dataset: {
                tooltip: game.i18n.localize(
                    `PF2E.Kingmaker.SIDEBAR.${this.active === true ? "OpenSheet" : "CreateKingdom"}`,
                ),
            },
        });

        icon.addEventListener("click", async (event) => {
            event.stopPropagation();

            if (!this.active) {
                const startBuilding = await foundry.applications.api.DialogV2.confirm({
                    window: { title: "PF2E.Kingmaker.KingdomBuilder.Title", icon: "fa-solid fa-castle" },
                    content: `<p>${game.i18n.localize("PF2E.Kingmaker.KingdomBuilder.ActivationMessage")}</p>`,
                });
                if (startBuilding) {
                    await this.update({ active: "building" });
                    KingdomBuilder.showToPlayers({ uuid: this.actor.uuid });
                    new KingdomBuilder(this).render(true);
                }
            } else {
                const type = this.active === true ? null : "builder";
                this.renderSheet({ type });
            }
        });

        return [icon];
    }

    /** Perform the collection portion of the upkeep phase */
    async collect(): Promise<void> {
        const { formula, commodities } = calculateKingdomCollectionData(this);
        const roll = await new Roll(formula).evaluate();
        await roll.toMessage(
            {
                flavor: game.i18n.localize("PF2E.Kingmaker.Kingdom.CollectDialog.NewResourcePoints"),
                speaker: {
                    ...ChatMessagePF2e.getSpeaker(this.actor),
                    alias: this.name,
                },
            },
            { rollMode: "publicroll" },
        );

        this.update({
            resources: {
                points: roll.total,
                commodities: R.mapValues(commodities, (incoming, type) => {
                    const current = this.resources.commodities[type];
                    return { value: Math.min(current.value + incoming, current.max) };
                }),
            },
        });
    }

    /**
     * Adds a custom modifier that will be included when determining the final value of a stat. The slug generated by
     * the name parameter must be unique for the custom modifiers for the specified stat, or it will be ignored.
     */
    async addCustomModifier(stat: string, data: RawModifier): Promise<void> {
        if (stat.length === 0) throw ErrorPF2e("A custom modifier's statistic must be a non-empty string");
        if (data.label.length === 0) throw ErrorPF2e("A custom modifier's label must be a non-empty string");

        const customModifiers = this.toObject().customModifiers ?? {};
        const modifiers = customModifiers[stat] ?? [];
        if (!modifiers.some((m) => m.label === data.label)) {
            data.type = setHasElement(MODIFIER_TYPES, data.type) ? data.type : "untyped";
            const modifier = new Modifier({ ...data, custom: true }).toObject();
            await this.update({ [`customModifiers.${stat}`]: [...modifiers, modifier] });
        }
    }

    /** Removes a custom modifier by slug */
    async removeCustomModifier(stat: string, slug: string): Promise<void> {
        if (stat.length === 0) throw ErrorPF2e("A custom modifier's statistic must be a non-empty string");

        const customModifiers = this.toObject().customModifiers ?? {};
        const modifiers = customModifiers[stat] ?? [];
        if (modifiers.length === 0) return;

        if (typeof slug === "string") {
            const withRemoved = modifiers.filter((m) => m.slug !== slug);
            await this.update({ [`customModifiers.${stat}`]: withRemoved });
        } else {
            throw ErrorPF2e("Custom modifiers can only be removed by slug (string) or index (number)");
        }
    }

    /**
     * Updates the party's campaign data. All data is scoped to system.campaign unless it is already in system.campaign.
     * Scoping to system.campaign is necessary for certain sheet listeners such as data-property.
     */
    async update(data: DeepPartial<KingdomSource> & Record<string, unknown>): Promise<void> {
        const expanded: DeepPartial<KingdomSource> & { system?: { campaign?: DeepPartial<KingdomSource> } } =
            fu.expandObject(data);

        const updateData = fu.mergeObject(expanded, expanded.system?.campaign ?? {});
        delete updateData.system;
        await this.actor.update({ "system.campaign": updateData });

        if (updateData.level) {
            await this.updateFeatures(updateData.level);
        }
    }

    /** Resets kingdom data preparation and re-renders all party actor sheets, which includes the kingmaker sheet */
    notifyUpdate = fu.debounce(() => {
        this.reset();
        this.prepareBaseData();
        this.prepareDerivedData();
        this.actor.render();
    }, 50);

    prepareBaseData(): void {
        const synthetics = this.actor.synthetics;
        const build = this.build;

        // All friendly armies are gathered to determine consumption
        this.armies = game.actors.filter((a): a is ArmyPF2e<null> => a.isOfType("army") && a.alliance === "party");
        this.consumption.army = R.sumBy(this.armies, (a) => a.system.consumption);

        // Calculate Ability Boosts (if calculated automatically)
        if (!build.manual) {
            for (const ability of KINGDOM_ABILITIES) {
                this.abilities[ability].value = 10;
            }

            // Charter/Heartland/Government boosts
            for (const category of ["charter", "heartland", "government"] as const) {
                const data = build[category];
                const chosen = build.boosts[category];
                if (!data) continue;

                if ("flaw" in data && data.flaw) {
                    this.abilities[data.flaw].value -= 2;
                }

                const activeBoosts = resolveKingdomBoosts(data, chosen);
                for (const ability of activeBoosts) {
                    this.abilities[ability].value += this.abilities[ability].value >= 18 ? 1 : 2;
                }
            }

            // Level boosts
            const activeLevels = ([1, 5, 10, 15, 20] as const).filter((l) => this.level >= l);
            for (const level of activeLevels) {
                const chosen = build.boosts[level].slice(0, 2);
                for (const ability of chosen) {
                    this.abilities[ability].value += this.abilities[ability].value >= 18 ? 1 : 2;
                }
            }
        }

        // Government skills
        if (build.government && build.government.skills.length > 0) {
            for (const skill of build.government.skills) {
                build.skills[skill].rank = Math.max(1, build.skills[skill].rank) as ZeroToFour;
            }
        }

        // Bless raw custom modifiers as `ModifierPF2e`s
        const customModifiers = (this.customModifiers ??= {});
        for (const selector of Object.keys(customModifiers)) {
            const modifiers = (customModifiers[selector] = customModifiers[selector].map(
                (rawModifier: RawModifier) => new Modifier(rawModifier),
            ));
            (synthetics.modifiers[selector] ??= []).push(...modifiers.map((m) => () => m));
        }

        const sizeData =
            Object.entries(KINGDOM_SIZE_DATA).findLast(([size]) => this.size >= Number(size))?.[1] ??
            KINGDOM_SIZE_DATA[1];

        this.nationType = sizeData.type;
        this.resources.dice.faces = sizeData.faces;

        // Inject control dc size modifier
        if (sizeData.controlMod) {
            const modifiers = (synthetics.modifiers["control-dc"] ??= []);
            modifiers.push(
                () =>
                    new Modifier({
                        slug: "size",
                        label: "Size Modifier",
                        modifier: sizeData.controlMod,
                    }),
            );
        }

        // Add any relevant ruin penalties
        for (const ability of KINGDOM_ABILITIES) {
            const penalty = this.abilities[ability].penalty;
            if (penalty) {
                const modifiers = (synthetics.modifiers[`${ability}-based`] ??= []);
                modifiers.push(
                    () =>
                        new Modifier({
                            slug: "ruin",
                            type: "item",
                            label: KINGDOM_RUIN_LABELS[ability],
                            modifier: penalty,
                        }),
                );
            }
        }

        // Auto-set if vacant (for npcs), and inject vacancy penalty modifiers and adjustments into synthetics
        for (const role of KINGDOM_LEADERSHIP) {
            const data = this.leadership[role];
            const actor = fromUuidSync(data.uuid ?? "");
            if (actor instanceof ActorPF2e) {
                if (!actor.hasPlayerOwner) data.vacant = false;
            } else {
                data.vacant = true;
            }

            if (data.vacant) {
                const penalties = VACANCY_PENALTIES[role]();
                for (const [selector, entries] of Object.entries(penalties.adjustments ?? {})) {
                    const adjustments = (synthetics.modifierAdjustments[selector] ??= []);
                    adjustments.push(...entries);
                }
                for (const [selector, entries] of Object.entries(penalties.modifiers ?? {})) {
                    const modifiers = (synthetics.modifiers[selector] ??= []);
                    modifiers.push(...entries.map((e) => () => new Modifier(e)));
                }
            }

            if (data.invested) {
                const ability = KINGDOM_LEADERSHIP_ABILITIES[role];
                const modifiers = (synthetics.modifiers[`${ability}-skill-check`] ??= []);
                modifiers.push(
                    () =>
                        new Modifier({
                            slug: "invested",
                            label: "PF2E.Kingmaker.Kingdom.Invested",
                            type: "status",
                            modifier: 1,
                        }),
                );
            }
        }

        // Add a status penalty due to unrest
        if (this.unrest.value > 0) {
            const thresholds = [1, 5, 10, 15];
            const modifier = -(thresholds.findLastIndex((t) => this.unrest.value >= t) + 1);
            const modifiers = (synthetics.modifiers["kingdom-check"] ??= []);
            modifiers.push(
                () =>
                    new Modifier({
                        slug: "unrest",
                        label: "PF2E.Kingmaker.Kingdom.Unrest",
                        type: "status",
                        modifier,
                    }),
            );
        }

        const settlements = Object.values(this.settlements).filter(R.isTruthy);

        // Initialize settlement data
        for (const settlement of settlements) {
            if (!settlement) continue;
            const typeData = KINGDOM_SETTLEMENT_TYPE_DATA[settlement.type];
            settlement.consumption.base = typeData.consumption;
            settlement.consumption.total = Math.max(0, typeData.consumption - settlement.consumption.reduction);
        }

        // Compute commodity max values
        for (const [type, value] of R.entries(this.resources.commodities)) {
            const settlementStorage = R.sumBy(settlements, (s) => s.storage[type]);
            value.max = sizeData.storage + settlementStorage;
        }
    }

    prepareDerivedData(): void {
        const synthetics = this.actor.synthetics;
        const { consumption, resources } = this;

        // Assign Ability modifiers base on values
        for (const ability of KINGDOM_ABILITIES) {
            this.abilities[ability].mod = (this.abilities[ability].value - 10) / 2;
        }

        // Autocompute resource dice
        resources.dice.number = Math.max(0, this.level + 4 + resources.dice.bonus - resources.dice.penalty);

        // Settlement consumption data
        const settlements = Object.values(this.settlements).filter(R.isTruthy);
        consumption.settlement = R.sumBy(settlements, (s) => s.consumption.total);

        // Compute consumption using a statistic, though we just extract the modifier
        // This allows rule elements to apply specific consumption modifiers
        const consumptionStatistic = new Statistic(this.actor, {
            slug: "consumption",
            label: "PF2E.Kingmaker.Consumption.Label",
            domains: ["consumption"],
            modifiers: [
                consumption.settlement &&
                    new Modifier({
                        slug: "settlements",
                        label: "PF2E.Kingmaker.Settlement.Label",
                        modifier: consumption.settlement,
                    }),
                consumption.army &&
                    new Modifier({
                        slug: "army",
                        label: "PF2E.Kingmaker.Army.Label",
                        modifier: consumption.army,
                    }),
                this.resources.workSites.food.value &&
                    new Modifier({
                        slug: "farmland",
                        label: "PF2E.Kingmaker.WorkSites.food.Name",
                        modifier: -this.resources.workSites.food.value,
                    }),
            ].filter(R.isTruthy),
        });
        consumption.value = Math.max(0, consumptionStatistic.mod);
        consumption.breakdown = consumptionStatistic.check.breakdown;

        // Calculate the control dc, used for skill checks
        const controlMod = CONTROL_DC_BY_LEVEL[Math.clamp(this.level - 1, 0, 19)] - 10;
        this.control = new Statistic(this.actor, {
            slug: "control",
            label: "PF2E.Kingmaker.Kingdom.ControlDC",
            domains: ["control-dc"],
            modifiers: [new Modifier({ slug: "base", label: "PF2E.ModifierTitle", modifier: controlMod })],
        });

        // Calculate all kingdom skills
        this.skills = R.mapToObj(KINGDOM_SKILLS, (skill) => {
            const ability = KINGDOM_SKILL_ABILITIES[skill];
            const abilityMod = this.abilities[ability].mod;
            const rank = this.build.skills[skill].rank;
            const domains = ["kingdom-check", `${ability}-based`, `${ability}-skill-check`, skill];
            const statistic = new Statistic(this.actor, {
                slug: skill,
                rank,
                label: KINGDOM_SKILL_LABELS[skill],
                domains,
                modifiers: [
                    new Modifier({
                        slug: ability,
                        label: KINGDOM_ABILITY_LABELS[ability],
                        modifier: abilityMod,
                        type: "ability",
                        adjustments: extractModifierAdjustments(synthetics.modifierAdjustments, domains, ability),
                    }),
                    createProficiencyModifier({ actor: this.actor, rank, domains, level: this.level }),
                ],
                check: { type: "skill-check" },
            });

            return [skill, statistic];
        });

        // Create feat groups
        const evenLevels = new Array(this.level)
            .fill(0)
            .map((_, idx) => idx + 1)
            .filter((idx) => idx % 2 === 0);
        this.features = new FeatGroup(
            this.actor,
            {
                id: "features",
                label: "PF2E.Kingmaker.Kingdom.FeatSlot.Features",
            },
            { limit: this.level },
        );
        this.feats = new FeatGroup(
            this.actor,
            {
                id: "kingdom",
                label: "PF2E.Kingmaker.Kingdom.FeatSlot.Feats",
                slots: [{ id: "government", label: "G" }, ...evenLevels],
                filter: {
                    traits: ["kingdom"],
                },
            },
            { limit: this.level },
        );
        this.bonusFeats = new FeatGroup(
            this.actor,
            {
                id: "bonus",
                label: "PF2E.Kingmaker.Kingdom.FeatSlot.Bonus",
                filter: {
                    traits: ["kingdom"],
                },
            },
            { limit: this.level },
        );

        // Assign feats and features
        const allFeatures = this.actor.itemTypes.campaignFeature;
        const features = R.sortBy(
            allFeatures.filter((f) => f.isFeature),
            (f) => f.level ?? 1,
            (f) => f.name,
        );
        const feats = R.sortBy(
            allFeatures.filter((f) => f.isFeat),
            (f) => f.sort,
        );
        for (const feature of features) {
            this.features.assignFeat(feature);
        }
        for (const feat of feats) {
            if (!this.feats.assignFeat(feat)) {
                this.bonusFeats.assignFeat(feat);
            }
        }
    }

    getRollOptions(): string[] {
        const prefix = "kingdom";
        return [this.unrest.value ? `${prefix}:unrest:${this.unrest.value}` : null].filter(R.isTruthy);
    }

    getRollData(): Record<string, unknown> {
        return { kingdom: this };
    }

    async importActivities({ skipDialog = false }: { skipDialog?: boolean } = {}): Promise<void> {
        const pack = game.packs.get("pf2e.kingmaker-features");
        if (!pack) {
            throw ErrorPF2e("Could not load kingdom features compendium");
        }

        // Add any relevant kingdom features first
        await this.updateFeatures(this.level);

        const documents = (await pack.getDocuments({ type: "campaignFeature" }))
            .filter((d): d is CampaignFeaturePF2e<null> => d instanceof ItemPF2e && d.isOfType("campaignFeature"))
            .filter((d) => d.system.category === "kingdom-activity");

        await importDocuments(this.actor, documents, skipDialog);
    }

    /** Adds/removes kingdom features as appropriate. Private instead of # because # explodes */
    private async updateFeatures(level: number): Promise<void> {
        const existingFeatures = this.actor.itemTypes.campaignFeature.filter((f) => f.isFeature);
        const featuresToDelete = existingFeatures.filter((f) => (f.level ?? 0) > level).map((f) => f.id);

        const featuresToAdd = await (async () => {
            const pack = game.packs.get("pf2e.kingmaker-features");
            if (!pack) {
                console.error("PF2E System | Could not load kingdom features compendium");
                return [];
            }

            const documents = (await pack.getDocuments({ type: "campaignFeature" }))
                .filter((d): d is CampaignFeaturePF2e<null> => d instanceof ItemPF2e && d.isOfType("campaignFeature"))
                .filter((d) => d.system.category === "kingdom-feature")
                .filter((d) => level >= (d.level ?? 0));
            return documents
                .filter((d) => !this.actor.items.some((i) => i.sourceId === d.uuid))
                .map((i) => i.toObject());
        })();

        await this.actor.deleteEmbeddedDocuments("Item", featuresToDelete);
        await this.actor.createEmbeddedDocuments("Item", featuresToAdd);
    }

    getStatistic(slug: string): Statistic | null {
        if (this.skills && objectHasKey(this.skills, slug)) {
            return this.skills[slug] ?? null;
        }

        return null;
    }

    renderSheet(options: { tab?: string; type?: "builder" | null } = {}): void {
        if (options.type === "builder") {
            new KingdomBuilder(this).render(true);
        } else {
            new KingdomSheetPF2e(this.actor).render(true, { tab: options.tab });
        }
    }

    _preUpdate(changed: DeepPartial<KingdomSource>): void {
        const actor = this.actor;
        const feat = changed.build?.government?.feat;
        if (feat) {
            console.log("Replacing feat");
            fromUuid(feat).then(async (f) => {
                if (!(f instanceof CampaignFeaturePF2e)) return;
                const currentGovernmentFeat = actor.itemTypes.campaignFeature.find(
                    (f) => f.system.location === "government",
                );
                const newFeat = f.clone({ "system.location": "government" });
                await currentGovernmentFeat?.delete();
                await actor.createEmbeddedDocuments("Item", [newFeat.toObject()]);
            });
        }
    }
}

interface Kingdom extends foundry.abstract.DataModel<PartySystemData, KingdomSchema>, KingdomData {}

export { Kingdom };
