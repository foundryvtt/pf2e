import { CharacterPF2e } from "@actor/character";
import { Abilities } from "@actor/creature/data";
import { AbilityString } from "@actor/data/base";
import { ABILITY_ABBREVIATIONS } from "@actor/data/values";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";

class BoostFlawState {
    lockedFlaw = false;
    lockedBoost = false;
    boosted = false;
    available = false;
    voluntaryFlaw = false;
    canVoluntaryFlaw = false;
    voluntaryBoost = false;
    canVoluntaryBoost = false;
}
type BoostFlawRow = Record<AbilityString, BoostFlawState>;

interface PopupData extends DocumentSheetData<CharacterPF2e> {
    abilityScores?: Abilities;
    abilities?: Record<AbilityString, string>;
    ancestry?: Embedded<AncestryPF2e> | null;
    background?: Embedded<BackgroundPF2e> | null;
    class?: Embedded<ClassPF2e> | null;
    manual?: boolean;
    voluntaryFlaw?: boolean;
    ancestryBoosts?: {
        boosts: BoostFlawRow;
        remaining: number;
        voluntaryBoostsRemaining: number;
        labels: string[];
        flawLabels: string[];
    };
    backgroundBoosts?: {
        boosts: BoostFlawRow;
        remaining: number;
        labels: string[];
        tooltip?: string;
    };
    keyOptions?: AbilityString[];
    levelBoosts?: Record<number, AbilityString[]>;
}

interface PopupFormData extends FormData {
    actorIds: string[];
    breakCoins: boolean;
}

type PopupOptions = ActorSheetOptions;

/**
 * @category Other
 */
export class AbilityBuilderPopup extends DocumentSheet<CharacterPF2e, PopupOptions> {
    static override get defaultOptions(): PopupOptions {
        const options: PopupOptions = {
            ...super.defaultOptions,
            token: null,
            id: "ability-builder",
            classes: ["loot-actor-popup"],
            title: game.i18n.localize("PF2E.AbilityScoresHeader"),
            template: "systems/pf2e/templates/actors/ability-builder.html",
            width: "auto",
        };
        return options;
    }

    override async _updateObject(_event: Event, _formData: Record<string, unknown> & PopupFormData): Promise<void> {}

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const thisActor = this.object;

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

        $html.find<HTMLInputElement>('input[name="data.build.manual"]').on("change", async (event) => {
            if (event.originalEvent instanceof Event) {
                await thisActor.toggleAbilityManagement();
            }
        });

        $html.find<HTMLInputElement>('input[name="data.build.voluntaryFlaw"]').on("change", async (event) => {
            if (event.originalEvent instanceof Event) {
                await thisActor.toggleVoluntaryFlaw();
            }
        });

        $html.find('button[data-action="ancestry-boost"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(thisActor.ancestry?.data.data.boosts ?? {}).find(
                ([_, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await thisActor.ancestry?.update({
                    [`data.boosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(thisActor.ancestry?.data.data.boosts ?? {}).find(
                ([_, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await thisActor.ancestry?.update({
                    [`data.boosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find('button[data-action="voluntary-flaw"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const flawToRemove = Object.entries(thisActor.ancestry?.data.data.voluntaryFlaws ?? {}).find(
                ([_, b]) => b.selected === ability
            );
            if (flawToRemove) {
                // we can only remove a voluntary flaw if they don't have a voluntary boost selected
                const hasVoluntaryBoostSelected = Object.entries(
                    thisActor.ancestry?.data.data.voluntaryBoosts ?? {}
                ).find(([_, b]) => b.selected);
                if (!hasVoluntaryBoostSelected) {
                    await thisActor.ancestry?.update({
                        [`data.voluntaryFlaws.${flawToRemove[0]}.selected`]: null,
                    });
                }
                return;
            }

            const freeFlaw = Object.entries(thisActor.ancestry?.data.data.voluntaryFlaws ?? {}).find(
                ([_, b]) => !b.selected && b.value.length > 0
            );
            if (freeFlaw) {
                await thisActor.ancestry?.update({
                    [`data.voluntaryFlaws.${freeFlaw[0]}.selected`]: ability,
                });
            }
        });

        $html.find('button[data-action="voluntary-boost"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(thisActor.ancestry?.data.data.voluntaryBoosts ?? {}).find(
                ([_, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await thisActor.ancestry?.update({
                    [`data.voluntaryBoosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(thisActor.ancestry?.data.data.voluntaryBoosts ?? {}).find(
                ([_, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await thisActor.ancestry?.update({
                    [`data.voluntaryBoosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find('button[data-action="background-boost"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(thisActor.background?.data.data.boosts ?? {}).find(
                ([_, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await thisActor.background?.update({
                    [`data.boosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(thisActor.background?.data.data.boosts ?? {}).find(
                ([_, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await thisActor.background?.update({
                    [`data.boosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find('button[data-action="class-keyAbility"]').on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");
            await thisActor.class?.update({
                [`data.keyAbility.selected`]: ability,
            });
        });

        $html.find("button[data-action=level]").on("click", async (event) => {
            const ability: AbilityString = $(event.currentTarget).attr("data-ability") as AbilityString;
            const level = ($(event.currentTarget).attr("data-level") ?? "1") as "1" | "5" | "10" | "15" | "20";
            let boosts = thisActor.data._source.data.build?.abilities?.boosts?.[level] ?? [];
            if (boosts.includes(ability)) {
                boosts = boosts.filter((a) => a !== ability);
            } else {
                boosts.push(ability);
            }
            await thisActor.update(
                {
                    [`data.build.abilities.boosts.${level}`]: boosts,
                },
                { diff: false } // arrays are stupid. This is necessary or it doesn't work
            );
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", async (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            await thisActor.update({
                [propertyPath]: $input.val(),
            });
        });
    }

    override async getData(): Promise<PopupData> {
        const sheetData: PopupData = await super.getData();

        const thisActor = this.object;
        if (!(thisActor instanceof CharacterPF2e)) {
            return sheetData;
        }

        const build = thisActor.data.data.build.abilities;

        sheetData.abilities = CONFIG.PF2E.abilities;
        sheetData.manual = build.manual;

        sheetData.ancestry = thisActor.ancestry;
        sheetData.background = thisActor.background;
        sheetData.class = thisActor.class;
        sheetData.abilityScores = thisActor.data.data.abilities;
        sheetData.keyOptions = build.keyOptions;
        sheetData.levelBoosts = [1, 5, 10, 15, 20].reduce(
            (ret, level) => ({
                ...ret,
                [level]: {
                    boosts: build.boosts[level as 1],
                    full: build.boosts[level as 1].length >= 4,
                    eligible: thisActor.data.data.details.level.value >= level,
                    remaining: 4 - build.boosts[level as 1].length,
                },
            }),
            {}
        );

        sheetData.ancestryBoosts = this.calculateAncestryBoosts(thisActor);
        sheetData.backgroundBoosts = this.calculateBackgroundBoosts(thisActor);

        sheetData.voluntaryFlaw = Object.keys(thisActor.ancestry?.data?.data?.voluntaryBoosts || {}).length > 0;

        return sheetData;
    }

    private calculateAncestryBoosts(thisActor: CharacterPF2e) {
        if (!thisActor.ancestry) {
            return undefined;
        }

        const ancestryBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: new BoostFlawState(),
            }),
            {} as BoostFlawRow
        );

        for (const [_, flaw] of Object.entries(thisActor.ancestry.data.data.flaws)) {
            if (flaw.selected) {
                ancestryBoosts[flaw.selected].lockedFlaw = true;
            }
        }

        let shownBoost = false;
        let boostsRemaining = 0;
        for (const [_, boost] of Object.entries(thisActor.ancestry.data.data.boosts)) {
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
        for (const [_, flaw] of Object.entries(thisActor.ancestry.data.data.voluntaryFlaws)) {
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

        for (const [_, boost] of Object.entries(thisActor.ancestry.data.data.voluntaryBoosts)) {
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

        // do some house-keeping and make sure they can't do things multiple times
        for (const ability of Array.from(ABILITY_ABBREVIATIONS)) {
            if (ancestryBoosts[ability].lockedFlaw) {
                ancestryBoosts[ability].canVoluntaryFlaw = false;
            }
            if (ancestryBoosts[ability].boosted && !ancestryBoosts[ability].lockedFlaw) {
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
            labels: this.calculateBoostLabels(thisActor.ancestry.data.data.boosts),
            flawLabels: this.calculateBoostLabels(thisActor.ancestry.data.data.flaws),
        };
    }

    private calculateBackgroundBoosts(thisActor: CharacterPF2e) {
        const backgroundBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: new BoostFlawState(),
            }),
            {} as BoostFlawRow
        );
        let boostsRemaining = 0;

        if (!thisActor.background) {
            return undefined;
        }

        let shownBoost = false;
        for (const boost of Object.values(thisActor.background.data.data.boosts)) {
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

        const labels = this.calculateBoostLabels(thisActor.background.data.data.boosts);
        let tooltip = undefined;

        if (
            Object.values(thisActor.background.data.data.boosts).length === 2 &&
            Object.values(thisActor.background.data.data.boosts)[0].value.length === 2 &&
            Object.values(thisActor.background.data.data.boosts)[1].value.length === 6
        ) {
            // in the very common case where background boosts are a choice of 2, and a free
            // give it a helpful tooltip
            const choices = Object.values(thisActor.background.data.data.boosts)[0].value.map((ability) =>
                game.i18n.localize(CONFIG.PF2E.abilities[ability])
            );
            tooltip = game.i18n.format("PF2E.AbilityBuilder.BackgroundBoostDescription", {
                a: choices[0],
                b: choices[1],
            });
        }

        return {
            boosts: backgroundBoosts,
            remaining: boostsRemaining,
            labels: labels,
            tooltip: tooltip,
        };
    }

    private calculateBoostLabels(boosts: Record<string, { value: AbilityString[]; selected: AbilityString | null }>) {
        return Object.values(boosts).map((b) => {
            if (b.value.length === 6) {
                return game.i18n.localize("PF2E.AbilityFree");
            } else {
                return b.value.map((ability) => game.i18n.localize(CONFIG.PF2E.abilities[ability])).join(" or ");
            }
        });
    }
}
