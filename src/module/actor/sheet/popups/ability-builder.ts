import { CharacterPF2e } from "@actor";
import { Abilities } from "@actor/creature/data";
import { AbilityString } from "@actor/types";
import { ABILITY_ABBREVIATIONS } from "@actor/values";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";

export class AbilityBuilderPopup extends Application {
    constructor(private actor: CharacterPF2e) {
        super();
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["ability-builder-popup"],
            title: game.i18n.localize("PF2E.AbilityScoresHeader"),
            template: "systems/pf2e/templates/actors/ability-builder.html",
            width: "auto",
        };
    }

    override get id(): string {
        return `ability-builder-${this.actor.id}`;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const { actor } = this;

        $html.find("div[data-tooltip-content]").tooltipster({
            contentAsHTML: true,
            arrow: false,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["bottom"],
            theme: "crb-hover",
        });

        $html.find("div.tooltip").tooltipster();

        $html.find<HTMLInputElement>("input[type=text], input[type=number]").on("focus", (event) => {
            event.currentTarget.select();
        });

        $html.find<HTMLInputElement>("input[name=toggle-manual-mode]").on("change", async (event) => {
            if (event.originalEvent) {
                await actor.toggleAbilityManagement();
            }
        });

        $html.find<HTMLInputElement>("input[name=toggle-voluntary-flaw]").on("change", async (event) => {
            if (event.originalEvent) {
                await actor.toggleVoluntaryFlaw();
            }
        });

        $html.find("button[data-action=ancestry-boost]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(actor.ancestry?.data.data.boosts ?? {}).find(
                ([, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await actor.ancestry?.update({ [`data.boosts.${boostToRemove[0]}.selected`]: null });
                return;
            }

            const freeBoost = Object.entries(actor.ancestry?.data.data.boosts ?? {}).find(
                ([, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await actor.ancestry?.update({ [`data.boosts.${freeBoost[0]}.selected`]: ability });
            }
        });

        $html.find("button[data-action=voluntary-flaw]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const flawToRemove = Object.entries(actor.ancestry?.data.data.voluntaryFlaws ?? {}).find(
                ([, b]) => b.selected === ability
            );
            if (flawToRemove) {
                // we can only remove a voluntary flaw if they don't have a voluntary boost selected
                const hasVoluntaryBoostSelected = Object.entries(actor.ancestry?.data.data.voluntaryBoosts ?? {}).find(
                    ([, b]) => b.selected
                );
                if (!hasVoluntaryBoostSelected) {
                    await actor.ancestry?.update({
                        [`data.voluntaryFlaws.${flawToRemove[0]}.selected`]: null,
                    });
                }
                return;
            }

            const freeFlaw = Object.entries(actor.ancestry?.data.data.voluntaryFlaws ?? {}).find(
                ([, b]) => !b.selected && b.value.length > 0
            );
            if (freeFlaw) {
                await actor.ancestry?.update({
                    [`data.voluntaryFlaws.${freeFlaw[0]}.selected`]: ability,
                });
            }
        });

        $html.find("button[data-action=voluntary-boost]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(actor.ancestry?.data.data.voluntaryBoosts ?? {}).find(
                ([, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await actor.ancestry?.update({
                    [`data.voluntaryBoosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(actor.ancestry?.data.data.voluntaryBoosts ?? {}).find(
                ([, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await actor.ancestry?.update({
                    [`data.voluntaryBoosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find("button[data-action=background-boost]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(actor.background?.data.data.boosts ?? {}).find(
                ([, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await actor.background?.update({
                    [`data.boosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(actor.background?.data.data.boosts ?? {}).find(
                ([, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await actor.background?.update({
                    [`data.boosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find("button[data-action=class-key-ability]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");
            if (actor.data.data.build.abilities.manual) {
                await actor.update({ [`data.details.keyability.value`]: ability });
            } else {
                await actor.class?.update({ [`data.keyAbility.selected`]: ability });
            }
        });

        $html.find("button[data-action=level]").on("click", async (event) => {
            const ability: AbilityString = $(event.currentTarget).attr("data-ability") as AbilityString;
            const level = ($(event.currentTarget).attr("data-level") ?? "1") as "1" | "5" | "10" | "15" | "20";
            let boosts = actor.data.data.build.abilities.boosts[level] ?? [];
            if (boosts.includes(ability)) {
                boosts = boosts.filter((a) => a !== ability);
            } else {
                boosts.push(ability);
            }
            await actor.update(
                { [`data.build.abilities.boosts.${level}`]: boosts },
                { diff: false } // arrays are stupid. This is necessary or it doesn't work
            );
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", async (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            await actor.update({ [propertyPath]: $input.val() });
        });

        $html.find("button[data-action=close]").on("click", () => {
            this.close();
        });
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<PopupData> {
        const { actor } = this;
        const build = actor.data.data.build.abilities;

        const isGradual = game.settings.get("pf2e", "gradualBoostsVariant");
        const levelBoosts = ([1, 5, 10, 15, 20] as const).reduce(
            (ret: Record<number, LevelBoostData>, level) => ({
                ...ret,
                [level]: {
                    boosts: build.boosts[level],
                    full: build.boosts[level].length >= build.allowedBoosts[level],
                    eligible: build.allowedBoosts[level] > 0,
                    remaining: build.allowedBoosts[level] - build.boosts[level].length,
                    minLevel: isGradual ? Math.max(1, level - 3) : level,
                    level,
                },
            }),
            {}
        );

        return {
            ...(await super.getData(options)),
            actor,
            abilities: CONFIG.PF2E.abilities,
            manual: build.manual,
            ancestry: actor.ancestry,
            background: actor.background,
            class: actor.class,
            abilityScores: actor.abilities,
            manualKeyAbility: actor.keyAbility,
            keyOptions: build.keyOptions,
            levelBoosts,
            ancestryBoosts: this.calculateAncestryBoosts(),
            backgroundBoosts: this.calculateBackgroundBoosts(),
            voluntaryFlaw: Object.keys(actor.ancestry?.data.data.voluntaryBoosts ?? {}).length > 0,
        };
    }

    private calculateAncestryBoosts(): AncestryBoosts | null {
        const { actor } = this;
        if (!actor.ancestry) return null;

        const ancestryBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: defaultBoostFlawState(),
            }),
            {} as BoostFlawRow
        );

        for (const flaw of Object.values(actor.ancestry.data.data.flaws)) {
            if (flaw.selected) {
                ancestryBoosts[flaw.selected].lockedFlaw = true;
            }
        }

        let shownBoost = false;
        let boostsRemaining = 0;
        for (const boost of Object.values(actor.ancestry.data.data.boosts)) {
            if (boost.selected) {
                if (boost.value.length === 1) {
                    ancestryBoosts[boost.selected].lockedBoost = true;
                }
                ancestryBoosts[boost.selected].boosted = true;
                ancestryBoosts[boost.selected].available = true;
            } else if (boost.value.length > 0) {
                boostsRemaining += 1;
                if (!shownBoost) {
                    for (const ability of boost.value) {
                        ancestryBoosts[ability].available = true;
                    }
                    shownBoost = true;
                }
            }
        }

        let voluntaryBoostsRemaining = 0;
        let voluntaryFlawsRemaining = false;
        for (const flaw of Object.values(actor.ancestry.data.data.voluntaryFlaws)) {
            if (flaw.selected) {
                ancestryBoosts[flaw.selected].voluntaryFlaw = true;
                ancestryBoosts[flaw.selected].canVoluntaryFlaw = true;
            } else {
                voluntaryFlawsRemaining = true;
                for (const ability of Array.from(ABILITY_ABBREVIATIONS)) {
                    ancestryBoosts[ability].canVoluntaryFlaw = true;
                }
            }
        }

        for (const boost of Object.values(actor.ancestry.data.data.voluntaryBoosts)) {
            if (boost.selected) {
                ancestryBoosts[boost.selected].voluntaryBoost = true;
                ancestryBoosts[boost.selected].canVoluntaryBoost = true;
            } else {
                voluntaryBoostsRemaining += 1;
                if (!voluntaryFlawsRemaining) {
                    for (const ability of Array.from(ABILITY_ABBREVIATIONS)) {
                        ancestryBoosts[ability].canVoluntaryBoost = true;
                    }
                }
            }
        }

        // Do some house-keeping and make sure they can't do things multiple times
        for (const ability of Array.from(ABILITY_ABBREVIATIONS)) {
            const hasFlaw = ancestryBoosts[ability].lockedFlaw || ancestryBoosts[ability].voluntaryFlaw;

            if (ancestryBoosts[ability].lockedFlaw) {
                ancestryBoosts[ability].canVoluntaryFlaw = false;
            }
            if (ancestryBoosts[ability].boosted && !hasFlaw) {
                ancestryBoosts[ability].canVoluntaryBoost = false;
            }
            if (ancestryBoosts[ability].voluntaryBoost && !ancestryBoosts[ability].lockedFlaw) {
                ancestryBoosts[ability].available = false;
            }
        }

        return {
            boosts: ancestryBoosts,
            remaining: boostsRemaining,
            voluntaryBoostsRemaining: voluntaryBoostsRemaining,
            labels: this.calculateBoostLabels(actor.ancestry.data.data.boosts),
            flawLabels: this.calculateBoostLabels(actor.ancestry.data.data.flaws),
        };
    }

    private calculateBackgroundBoosts(): BackgroundBoosts | null {
        const { actor } = this;
        if (!actor.background) return null;

        const backgroundBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: defaultBoostFlawState(),
            }),
            {} as BoostFlawRow
        );
        let boostsRemaining = 0;

        let shownBoost = false;
        for (const boost of Object.values(actor.background.data.data.boosts)) {
            if (boost.selected) {
                if (boost.value.length === 1) {
                    backgroundBoosts[boost.selected].lockedBoost = true;
                }
                backgroundBoosts[boost.selected].available = true;
                backgroundBoosts[boost.selected].boosted = true;
            } else if (boost.value.length > 0) {
                boostsRemaining += 1;
                if (!shownBoost) {
                    for (const ability of boost.value) {
                        backgroundBoosts[ability].available = true;
                    }
                    shownBoost = true;
                }
            }
        }

        const labels = this.calculateBoostLabels(actor.background.data.data.boosts);
        const tooltip = ((): string | null => {
            const boosts = actor.background?.data.data.boosts ?? {};
            if (
                Object.values(boosts).length === 2 &&
                Object.values(boosts)[0].value.length === 2 &&
                Object.values(boosts)[1].value.length === 6
            ) {
                // in the very common case where background boosts are a choice of 2, and a free
                // give it a helpful tooltip
                const choices = Object.values(boosts)[0].value.map((ability) =>
                    game.i18n.localize(CONFIG.PF2E.abilities[ability])
                );
                return game.i18n.format("PF2E.Actor.Character.AbilityBuilder.BackgroundBoostDescription", {
                    a: choices[0],
                    b: choices[1],
                });
            } else {
                return null;
            }
        })();

        return {
            boosts: backgroundBoosts,
            remaining: boostsRemaining,
            labels,
            tooltip,
        };
    }

    private calculateBoostLabels(
        boosts: Record<string, { value: AbilityString[]; selected: AbilityString | null }>
    ): string[] {
        return Object.values(boosts).map((b) => {
            if (b.value.length === 6) {
                return game.i18n.localize("PF2E.AbilityFree");
            } else {
                return b.value.map((ability) => game.i18n.localize(CONFIG.PF2E.abilities[ability])).join(" or ");
            }
        });
    }

    /** Remove this application from the actor's apps on close */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        delete this.actor.apps[this.appId];
        return super.close(options);
    }
}

interface PopupData {
    actor: CharacterPF2e;
    abilityScores: Abilities;
    manualKeyAbility: AbilityString;
    abilities: Record<AbilityString, string>;
    ancestry: Embedded<AncestryPF2e> | null;
    background: Embedded<BackgroundPF2e> | null;
    class: Embedded<ClassPF2e> | null;
    manual: boolean;
    ancestryBoosts: AncestryBoosts | null;
    backgroundBoosts: BackgroundBoosts | null;
    keyOptions: AbilityString[] | null;
    levelBoosts: Record<number, LevelBoostData>;
    voluntaryFlaw: boolean;
}

interface BoostFlawState {
    lockedFlaw: boolean;
    lockedBoost: boolean;
    boosted: boolean;
    available: boolean;
    voluntaryFlaw: boolean;
    canVoluntaryFlaw: boolean;
    voluntaryBoost: boolean;
    canVoluntaryBoost: boolean;
}

function defaultBoostFlawState(): BoostFlawState {
    return {
        lockedFlaw: false,
        lockedBoost: false,
        boosted: false,
        available: false,
        voluntaryFlaw: false,
        canVoluntaryFlaw: false,
        voluntaryBoost: false,
        canVoluntaryBoost: false,
    };
}

type BoostFlawRow = Record<AbilityString, BoostFlawState>;

interface AncestryBoosts {
    boosts: BoostFlawRow;
    remaining: number;
    voluntaryBoostsRemaining: number;
    labels: string[];
    flawLabels: string[];
}

interface BackgroundBoosts {
    boosts: BoostFlawRow;
    remaining: number;
    labels: string[];
    tooltip: string | null;
}

interface LevelBoostData {
    boosts: AbilityString[];
    full: boolean;
    eligible: boolean;
    remaining: number;
}
