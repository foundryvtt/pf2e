import { CharacterPF2e } from "@actor";
import { Abilities } from "@actor/creature/data.ts";
import { AbilityString } from "@actor/types.ts";
import { ABILITY_ABBREVIATIONS } from "@actor/values.ts";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";

class AbilityBuilderPopup extends Application {
    constructor(private actor: CharacterPF2e) {
        super();
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["ability-builder-popup"],
            title: game.i18n.localize("PF2E.AbilityScoresHeader"),
            template: "systems/pf2e/templates/actors/character/ability-builder.hbs",
            width: "auto",
            height: "auto",
        };
    }

    override get id(): string {
        return `ability-builder-${this.actor.id}`;
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<AbilityBuilderSheetData> {
        const { actor } = this;
        const build = actor.system.build.abilities;

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
            ...this.#calculateAncestryBoosts(),
            backgroundBoosts: this.#calculateBackgroundBoosts(),
            legacyFlaws: actor.ancestry?.system.voluntary?.boost !== undefined,
            levelBoosts: this.#calculateLeveledBoosts(),
        };
    }

    #createButtons(): Record<AbilityString, BoostFlawState> {
        return Array.from(ABILITY_ABBREVIATIONS).reduce((accumulated, ability) => {
            accumulated[ability] = { ability };
            return accumulated;
        }, {} as Record<AbilityString, BoostFlawState>);
    }

    #calculateAncestryBoosts(): { ancestryBoosts: AncestryBoosts | null; voluntaryFlaws: VoluntaryFlaws | null } {
        const { actor } = this;
        const ancestry = actor.ancestry;
        if (!ancestry) return { ancestryBoosts: null, voluntaryFlaws: null };

        // Create initial state. These are updated to gain the final result
        const buttons = this.#createButtons();

        // Determine what boosts are selected and how many we can pick
        const [maxBoosts, selectedBoosts] = (() => {
            const alternateAncestryBoosts = ancestry.system.alternateAncestryBoosts;
            if (alternateAncestryBoosts) return [2, alternateAncestryBoosts];

            const baseBoosts = Object.values(ancestry.system.boosts);
            const selectedBoosts = baseBoosts.map((b) => b.selected).filter((b): b is AbilityString => !!b);
            const maxBoosts = baseBoosts.filter((b) => b.value.length > 0 || b.selected).length;
            return [maxBoosts, selectedBoosts];
        })();

        // Get accumultated boosts (and flaws) from the actor
        // These are necessary to prevent double boosting in legacy flaws
        const build = actor.system.build.abilities;
        const netBoosted = R.difference(build.boosts.ancestry, build.flaws.ancestry);

        // Create boost (and flaw) buttons for the ancestry
        const remaining = maxBoosts - selectedBoosts.length;
        const lockedBoosts = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedBoosts;
        const lockedFlaws = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedFlaws;
        for (const ability of ABILITY_ABBREVIATIONS) {
            const state = buttons[ability];
            const selected = selectedBoosts.includes(ability);
            state.boost = {
                selected,
                locked: lockedBoosts?.includes(ability),
                disabled: selected ? false : !remaining || netBoosted.includes(ability),
            };

            if (lockedFlaws?.includes(ability)) {
                state.flaw = { selected: true, locked: true };
            }
        }

        const voluntaryFlaws = ((): VoluntaryFlaws | null => {
            const voluntary = ancestry.system.voluntary ?? { flaws: [] };

            const legacyFlaws = voluntary.boost !== undefined;
            const flawsComplete = legacyFlaws && voluntary.flaws.length >= 2;

            const buttons = this.#createButtons();
            for (const ability of ABILITY_ABBREVIATIONS) {
                const state = buttons[ability];
                const numFlaws = voluntary.flaws.filter((f) => f === ability).length;
                state.flaw = {
                    selected: numFlaws > 0,
                    disabled: !numFlaws && flawsComplete,
                };

                if (legacyFlaws) {
                    // Locked ancestry boosts can accept a second flaw
                    if (lockedBoosts?.includes(ability)) {
                        state.flaw.second = {
                            selected: numFlaws > 1,
                            disabled: !numFlaws || (numFlaws < 2 && flawsComplete),
                        };
                    }

                    const boosted = voluntary.boost === ability;
                    state.boost = {
                        selected: boosted,
                        disabled: boosted ? false : !flawsComplete || !!voluntary.boost || netBoosted.includes(ability),
                    };
                }
            }

            return {
                remaining: voluntary && legacyFlaws && !voluntary.boost ? 1 : 0,
                buttons,
                voluntaryBoostsRemaining: 0,
                labels: this.#getBoostFlawLabels(ancestry.system.flaws),
            };
        })();

        const ancestryBoosts: AncestryBoosts = {
            buttons,
            remaining,
            labels: this.#getBoostFlawLabels(ancestry.system.boosts),
            alternate: !!ancestry.system.alternateAncestryBoosts,
        };

        return { ancestryBoosts, voluntaryFlaws };
    }

    #calculateBackgroundBoosts(): BackgroundBoosts | null {
        const { actor } = this;
        if (!actor.background) return null;

        const buttons = this.#createButtons();

        const boosts = Object.values(actor.background.system.boosts).filter((b) => b.value.length > 0);
        const selectedBoosts = boosts.map((b) => b.selected).filter((b): b is AbilityString => !!b);
        const unselectedRestricted = boosts.filter((b) => b.value.length < 6 && !b.selected).flatMap((b) => b.value);
        const remaining = boosts.length - selectedBoosts.length;

        for (const ability of ABILITY_ABBREVIATIONS) {
            const selected = selectedBoosts.includes(ability);
            const mightBeForced = unselectedRestricted.includes(ability);
            buttons[ability].boost = {
                selected,
                disabled: !(selected || remaining) || (!!unselectedRestricted.length && !mightBeForced),
            };
        }

        const labels = this.#getBoostFlawLabels(actor.background.system.boosts);
        const tooltip = ((): string | null => {
            const boosts = actor.background?.system.boosts ?? {};
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

        return { buttons, remaining, labels, tooltip };
    }

    #calculateLeveledBoosts(): LevelBoostData[] {
        const build = this.actor.system.build.abilities;
        const isGradual = game.settings.get("pf2e", "gradualBoostsVariant");
        return ([1, 5, 10, 15, 20] as const).map((level): LevelBoostData => {
            const remaining = build.allowedBoosts[level] - build.boosts[level].length;
            const buttons = this.#createButtons();
            for (const ability of ABILITY_ABBREVIATIONS) {
                buttons[ability].boost = {
                    selected: build.boosts[level].includes(ability),
                    disabled: !remaining,
                };
            }

            const eligible = build.allowedBoosts[level] > 0;
            const minLevel = isGradual ? Math.max(1, level - 3) : level;
            return { buttons, remaining, level, eligible, minLevel };
        });
    }

    #getBoostFlawLabels(
        boostData: Record<string, { value: AbilityString[]; selected: AbilityString | null }>
    ): string[] {
        return Object.values(boostData).flatMap((boosts) => {
            if (boosts.value.length === 6) {
                return game.i18n.localize("PF2E.AbilityFree");
            } else if (boosts.value.length > 0) {
                return boosts.value.map((ability) => game.i18n.localize(CONFIG.PF2E.abilities[ability])).join(" or ");
            } else {
                return [];
            }
        });
    }

    /** Remove this application from the actor's apps on close */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        delete this.actor.apps[this.appId];
        return super.close(options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];
        const { actor } = this;

        $html.find("[data-tooltip-content]").tooltipster({
            contentAsHTML: true,
            arrow: false,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["bottom"],
            theme: "crb-hover",
        });

        $html.find("div.tooltip").tooltipster();

        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=text], input[type=number]")) {
            input.addEventListener("focus", () => input.select());
        }

        htmlQuery(html, "[data-action=toggle-alternate-ancestry-boosts]")?.addEventListener("click", () => {
            if (!actor.ancestry) return;
            if (actor.ancestry.system.alternateAncestryBoosts) {
                actor.ancestry.update({ "system.-=alternateAncestryBoosts": null });
            } else {
                actor.ancestry.update({ "system.alternateAncestryBoosts": [] });
            }
        });

        htmlQuery(html, "[data-action=toggle-legacy-voluntary-flaw]")?.addEventListener("click", async () => {
            const ancestry = actor.ancestry;
            if (!ancestry) return;

            const voluntary = ancestry.system.voluntary;
            if (voluntary?.boost !== undefined) {
                // Convert from legacy. Flaws must each be unique
                const flaws = R.uniq(voluntary.flaws);
                ancestry.update({ system: { voluntary: { "-=boost": null, flaws } } });
            } else {
                // Convert to legacy. We can only have up to 2 total flaws in legacy
                const flaws = voluntary?.flaws.slice(0, 2) ?? [];
                ancestry.update({ system: { voluntary: { boost: null, flaws } } });
            }
        });

        for (const button of htmlQueryAll(html, "[data-section=ancestry] .boost")) {
            button.addEventListener("click", async () => {
                const ancestry = actor.ancestry;
                const ability = htmlClosest(button, "[data-ability]")?.dataset.ability as AbilityString;
                if (!ancestry || !ability) return;

                // If alternative ancestry boosts, write to there instead
                if (ancestry.system.alternateAncestryBoosts) {
                    const existingBoosts = ancestry.system.alternateAncestryBoosts;
                    const boosts = existingBoosts.includes(ability)
                        ? existingBoosts.filter((b) => b !== ability)
                        : [...existingBoosts, ability].slice(0, 2);
                    ancestry.update({ "system.alternateAncestryBoosts": boosts });
                    return;
                }

                const boostToRemove = Object.entries(ancestry.system.boosts ?? {}).find(
                    ([, b]) => b.selected === ability
                );
                if (boostToRemove) {
                    await ancestry.update({ [`system.boosts.${boostToRemove[0]}.selected`]: null });
                    return;
                }

                const freeBoost = Object.entries(ancestry.system.boosts ?? {}).find(
                    ([, b]) => !b.selected && b.value.length > 0
                );
                if (freeBoost) {
                    await ancestry.update({ [`system.boosts.${freeBoost[0]}.selected`]: ability });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-section=voluntary] .boost-button")) {
            button.addEventListener("click", () => {
                const ancestry = actor.ancestry;
                const ability = htmlClosest(button, "[data-ability]")?.dataset.ability as AbilityString;
                if (!ancestry || !ability) return;

                const removing = button.classList.contains("selected");

                if (button.dataset.action === "flaw") {
                    const { flaws, boost } = ancestry.system.voluntary ?? { flaws: [] };
                    const alreadyHasFlaw = flaws.includes(ability);
                    const isLegacy = boost !== undefined;

                    // If removing, it must exist and there shouldn't be a boost selected
                    if (removing && alreadyHasFlaw && !boost) {
                        flaws.splice(flaws.indexOf(ability), 1);
                        ancestry.update({ system: { voluntary: { flaws } } });
                        return;
                    }

                    // If adding, we need to be under 2 flaws if legacy, it must be new or be a locked ancestry boost (to double flaw)
                    const boostedByAncestry = ancestry.lockedBoosts.includes(ability);
                    const canDoubleFlaw = boostedByAncestry && isLegacy;
                    const maxFlaws = isLegacy ? 2 : 6;
                    if (flaws.length < maxFlaws && (!alreadyHasFlaw || canDoubleFlaw)) {
                        flaws.push(ability);
                        ancestry.update({ system: { voluntary: { flaws } } });
                    }
                } else {
                    const boost = removing ? null : ability;
                    ancestry.update({ system: { voluntary: { boost } } });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-section=background] .boost")) {
            button.addEventListener("click", () => {
                const ability = htmlClosest(button, "[data-ability]")?.dataset.ability as AbilityString;
                if (!ability) return;

                const boostToRemove = Object.entries(actor.background?.system.boosts ?? {}).find(
                    ([, b]) => b.selected === ability
                );
                if (boostToRemove) {
                    actor.background?.update({
                        [`system.boosts.${boostToRemove[0]}.selected`]: null,
                    });
                    return;
                }

                const freeBoost = Object.entries(actor.background?.system.boosts ?? {}).find(
                    ([, b]) => !b.selected && b.value.length > 0
                );
                if (freeBoost) {
                    actor.background?.update({
                        [`system.boosts.${freeBoost[0]}.selected`]: ability,
                    });
                }
            });
        }

        for (const button of htmlQueryAll(html, "button[data-action=class-key-ability]")) {
            button.addEventListener("click", () => {
                const ability = button.dataset.ability;
                if (!setHasElement(ABILITY_ABBREVIATIONS, ability)) {
                    throw ErrorPF2e(`Unrecognized ability abbreviation: ${ability}`);
                }

                if (actor.system.build.abilities.manual) {
                    actor.update({ [`system.details.keyability.value`]: ability });
                } else {
                    actor.class?.update({ [`system.keyAbility.selected`]: ability });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-level] .boost")) {
            button.addEventListener("click", () => {
                const level = Number(htmlClosest(button, "[data-level]")?.dataset.level);
                const ability = htmlClosest(button, "[data-ability]")?.dataset.ability as AbilityString;
                if (!ability || !tupleHasValue([1, 5, 10, 15, 20] as const, level)) return;

                const buildSource = mergeObject(actor.toObject().system.build ?? {}, { abilities: { boosts: {} } });
                const boosts = (buildSource.abilities.boosts[level] ??= []);
                if (boosts.includes(ability)) {
                    boosts.splice(boosts.indexOf(ability), 1);
                } else {
                    boosts.push(ability);
                }

                actor.update({ "system.build": buildSource });
            });
        }

        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=number][data-property]")) {
            input.addEventListener("blur", () => {
                const propertyPath = input.dataset.property;
                if (!propertyPath) throw ErrorPF2e("Empty property path");
                const value = Math.trunc(Number(input.value));
                actor.update({ [propertyPath]: value });
            });
        }

        htmlQuery(html, "input[name=toggle-manual-mode]")?.addEventListener("click", () => {
            actor.toggleAbilityManagement();
        });
        htmlQuery(html, "button[data-action=close]")?.addEventListener("click", () => this.close());
    }
}

interface AbilityBuilderSheetData {
    actor: CharacterPF2e;
    abilityScores: Abilities;
    manualKeyAbility: AbilityString;
    abilities: Record<AbilityString, string>;
    ancestry: AncestryPF2e<CharacterPF2e> | null;
    background: BackgroundPF2e<CharacterPF2e> | null;
    class: ClassPF2e<CharacterPF2e> | null;
    manual: boolean;

    ancestryBoosts: AncestryBoosts | null;
    voluntaryFlaws: VoluntaryFlaws | null;
    backgroundBoosts: BackgroundBoosts | null;
    keyOptions: AbilityString[] | null;
    levelBoosts: LevelBoostData[];

    legacyFlaws: boolean;
}

interface BoostFlawState {
    ability: string;
    flaw?: BuilderButton;
    boost?: BuilderButton;
}

interface BuilderButton {
    selected?: boolean;
    locked?: boolean;
    disabled?: boolean;
    second?: Omit<BuilderButton, "second">;
}

interface BoostFlawRow {
    buttons: Record<AbilityString, BoostFlawState>;
    remaining: number;
}

interface AncestryBoosts extends BoostFlawRow {
    alternate: boolean;
    labels: string[];
}

interface VoluntaryFlaws extends BoostFlawRow {
    voluntaryBoostsRemaining: number;
    labels: string[];
}

interface BackgroundBoosts extends BoostFlawRow {
    labels: string[];
    tooltip: string | null;
}

interface LevelBoostData extends BoostFlawRow {
    level: number;
    eligible: boolean;
    minLevel: number;
}

export { AbilityBuilderPopup, BoostFlawState };
