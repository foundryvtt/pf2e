import { FeatGroup } from "@actor/character/feats.ts";
import { ModifierPF2e, createProficiencyModifier } from "@actor/modifiers.ts";
import { ItemType } from "@item/data/index.ts";
import { Statistic } from "@system/statistic/index.ts";
import { createHTMLElement, fontAwesomeIcon, objectHasKey } from "@util";
import * as R from "remeda";
import type { PartyPF2e } from "../document.ts";
import { PartyCampaign } from "../types.ts";
import { KingdomBuilder } from "./builder.ts";
import {
    KingdomCHG,
    KingdomGovernment,
    KingdomNationType,
    KingdomSchema,
    KingdomSkill,
    KingdomSource,
} from "./data.ts";
import { resolveKingdomBoosts } from "./helpers.ts";
import { KINGDOM_SCHEMA } from "./schema.ts";
import {
    CONTROL_DC_BY_LEVEL,
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_LEADERSHIP,
    KINGDOM_SIZE_DATA,
    KINGDOM_SKILLS,
    KINGDOM_SKILL_ABILITIES,
    KINGDOM_SKILL_LABELS,
    VACANCY_PENALTIES,
} from "./values.ts";
import { ActorPF2e } from "@actor";

const { DataModel } = foundry.abstract;

/** Model for the Kingmaker campaign data type, which represents a Kingdom */
class Kingdom extends DataModel<PartyPF2e, KingdomSchema> implements PartyCampaign {
    declare nationType: KingdomNationType;
    declare feats: FeatGroup<PartyPF2e>;
    declare bonusFeats: FeatGroup<PartyPF2e>;
    declare skills: Record<KingdomSkill, Statistic>;
    declare control: Statistic;

    static override defineSchema(): KingdomSchema {
        return KINGDOM_SCHEMA;
    }

    get actor(): PartyPF2e {
        return this.parent;
    }

    get extraItemTypes(): ItemType[] {
        return ["action", "feat"];
    }

    get charter(): KingdomCHG | null {
        return this.build.charter;
    }

    get heartland(): KingdomCHG | null {
        return this.build.heartland;
    }

    get government(): KingdomGovernment | null {
        return this.build.government;
    }

    override _initialize(options?: Record<string, unknown>): void {
        super._initialize(options);
        this.prepareAbilityScores();
        this.prepareData();
        this.prepareFeats();
    }

    /** Creates sidebar buttons to inject into the chat message sidebar */
    createSidebarButtons(): HTMLElement[] {
        // Do not show kingdom to party members until it becomes activated.
        if (!this.active && !game.user.isGM) return [];

        const crownIcon = fontAwesomeIcon("crown");
        const icon = createHTMLElement("a", { classes: ["create-button"], children: [crownIcon] });
        if (!this.active) {
            icon.appendChild(fontAwesomeIcon("plus"));
        }

        icon.addEventListener("click", () => {
            // todo: open actual kingdom sheet once active
            new KingdomBuilder(this).render(true);
        });
        return [icon];
    }

    async update(data: DeepPartial<KingdomSource> & Record<string, unknown>): Promise<void> {
        await this.actor.update({ "system.campaign": data });
    }

    private prepareAbilityScores(): void {
        // Calculate Ability Boosts (if calculated automatically)
        if (!this.build.manual) {
            for (const ability of KINGDOM_ABILITIES) {
                this.abilities[ability].value = 10;
            }

            // Charter/Heartland/Government boosts
            for (const category of ["charter", "heartland", "government"] as const) {
                const data = this.build[category];
                const chosen = this.build.boosts[category];
                if (!data) continue;

                if (data.flaw) {
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
                const chosen = this.build.boosts[level].slice(0, 2);
                for (const ability of chosen) {
                    this.abilities[ability].value += this.abilities[ability].value >= 18 ? 1 : 2;
                }
            }
        }

        // Assign Ability modifiers base on values
        for (const ability of KINGDOM_ABILITIES) {
            this.abilities[ability].mod = (this.abilities[ability].value - 10) / 2;
        }
    }

    private prepareData(): void {
        const { synthetics } = this.actor;

        const sizeData =
            Object.entries(KINGDOM_SIZE_DATA).findLast(([size]) => this.size >= Number(size))?.[1] ??
            KINGDOM_SIZE_DATA[1];

        this.nationType = sizeData.type;

        // Autocompute resource dice
        this.resources.dice = mergeObject(this.resources.dice, {
            faces: sizeData.faces,
            number: Math.max(0, this.level + 4 + this.resources.dice.bonus - this.resources.dice.penalty),
        });

        // Inject control dc modifier
        if (sizeData.controlMod) {
            const modifiers = (synthetics.statisticsModifiers["control-dc"] ??= []);
            modifiers.push(
                () =>
                    new ModifierPF2e({
                        slug: "size",
                        label: "Size Modifier",
                        modifier: sizeData.controlMod,
                    })
            );
        }

        // Auto-set if vacant (for npcs), and inject vacancy penalty modifiers into synthetics
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
                for (const [selector, entries] of Object.entries(penalties.modifiers ?? {})) {
                    const modifiers = (synthetics.statisticsModifiers[selector] ??= []);
                    modifiers.push(...entries.map((e) => () => new ModifierPF2e(e)));
                }
            }
        }

        // Compute commodity max values
        for (const value of Object.values(this.resources.commodities)) {
            value.max = value.sites + 2 * value.resourceSites;
        }

        // Calculate the control dc, used for skill checks
        const controlMod = CONTROL_DC_BY_LEVEL[Math.clamped(this.level - 1, 0, 19)] - 10;
        this.control = new Statistic(this.actor, {
            slug: "control",
            label: "PF2E.Kingmaker.Kingdom.ControlDC",
            domains: ["control-dc"],
            modifiers: [new ModifierPF2e({ slug: "base", label: "PF2E.ModifierTitle", modifier: controlMod })],
        });

        // Calculate all kingdom skills
        this.skills = R.mapToObj(KINGDOM_SKILLS, (skill) => {
            const ability = KINGDOM_SKILL_ABILITIES[skill];
            const abilityMod = this.abilities[ability].mod;
            const rank = this.build.skills[skill].rank;
            const domains = ["kingdom-check", `${ability}-based`, skill];
            const statistic = new Statistic(this.actor, {
                slug: skill,
                rank,
                label: KINGDOM_SKILL_LABELS[skill],
                domains,
                modifiers: [
                    new ModifierPF2e({
                        slug: ability,
                        label: KINGDOM_ABILITY_LABELS[ability],
                        modifier: abilityMod,
                    }),
                    createProficiencyModifier({ actor: this.actor, rank, domains }),
                ],
                check: { type: "skill-check" },
            });

            return [skill, statistic];
        });
    }

    private prepareFeats(): void {
        const { actor } = this;

        const evenLevels = new Array(actor.level)
            .fill(0)
            .map((_, idx) => idx + 1)
            .filter((idx) => idx % 2 === 0);

        this.feats = new FeatGroup(actor, {
            id: "kingdom",
            label: "Kingdom Feats",
            slots: evenLevels,
            featFilter: ["traits-kingdom"],
        });

        this.bonusFeats = new FeatGroup(actor, {
            id: "bonus",
            label: "PF2E.FeatBonusHeader",
            featFilter: ["traits-kingdom"],
        });

        for (const feat of this.actor.itemTypes.feat) {
            if (!this.feats.assignFeat(feat)) {
                this.bonusFeats.assignFeat(feat);
            }
        }
    }

    getRollData(): Record<string, unknown> {
        return { kingdom: this };
    }

    getStatistic(slug: string): Statistic | null {
        if (this.skills && objectHasKey(this.skills, slug)) {
            return this.skills[slug] ?? null;
        }

        return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Kingdom extends ModelPropsFromSchema<KingdomSchema> {}

export { Kingdom };
