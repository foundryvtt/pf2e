import { CharacterPF2e } from "@actor";
import { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";
import { maintainFocusInRender } from "@module/sheet/helpers.ts";
import { ErrorPF2e, addSign, htmlClosest, htmlQuery, htmlQueryAll, setHasElement, tupleHasValue } from "@util";
import * as R from "remeda";

class AttributeBuilder extends Application {
    actor: CharacterPF2e;

    #abpEnabled: boolean;

    constructor(actor: CharacterPF2e) {
        super();
        this.actor = actor;
        this.#abpEnabled = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(actor);
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["attribute-builder"],
            title: game.i18n.localize("PF2E.Actor.Character.Attribute.Boosts"),
            template: "systems/pf2e/templates/actors/character/attribute-builder.hbs",
            width: "auto",
            height: "auto",
        };
    }

    override get id(): string {
        return `attribute-builder-${this.actor.uuid}`;
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<AttributeBuilderSheetData> {
        const { actor } = this;
        const build = actor.system.build.attributes;

        return {
            ...(await super.getData(options)),
            actor,
            attributes: CONFIG.PF2E.abilities,
            manual: build.manual,
            ancestry: actor.ancestry,
            background: actor.background,
            class: actor.class,
            attributeModifiers: R.mapValues(actor.abilities, (value, attribute) => {
                // Allow decimal values in manual mode (to track partial boosts)
                const mod = build.manual ? actor._source.system.abilities?.[attribute].mod ?? 0 : value.base;
                return {
                    mod: addSign(Number(mod.toFixed(1))),
                    label: CONFIG.PF2E.abilities[attribute],
                };
            }),
            manualKeyAttribute: actor.keyAttribute,
            keyOptions: build.keyOptions,
            ...this.#calculateAncestryBoosts(),
            backgroundBoosts: this.#calculateBackgroundBoosts(),
            legacyFlaws: actor.ancestry?.system.voluntary?.boost !== undefined,
            levelBoosts: this.#calculateLeveledBoosts(),
        };
    }

    #createButtons(): Record<AttributeString, BoostFlawState> {
        return Array.from(ATTRIBUTE_ABBREVIATIONS).reduce(
            (accumulated, attribute) => {
                accumulated[attribute] = { ability: attribute };
                return accumulated;
            },
            {} as Record<AttributeString, BoostFlawState>,
        );
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
            const selectedBoosts = baseBoosts.map((b) => b.selected).filter((b): b is AttributeString => !!b);
            const maxBoosts = baseBoosts.filter((b) => b.value.length > 0 || b.selected).length;
            return [maxBoosts, selectedBoosts];
        })();

        // Get accumultated boosts (and flaws) from the actor
        // These are necessary to prevent double boosting in legacy flaws
        const build = actor.system.build.attributes;
        const netBoosted = R.difference(build.boosts.ancestry, build.flaws.ancestry);

        // Create boost (and flaw) buttons for the ancestry
        const remaining = maxBoosts - selectedBoosts.length;
        const lockedBoosts = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedBoosts;
        const lockedFlaws = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedFlaws;
        for (const attribute of ATTRIBUTE_ABBREVIATIONS) {
            const state = buttons[attribute];
            const selected = selectedBoosts.includes(attribute);
            state.boost = {
                selected,
                locked: lockedBoosts?.includes(attribute),
                disabled: selected ? false : !remaining || netBoosted.includes(attribute),
            };

            if (lockedFlaws?.includes(attribute)) {
                state.flaw = { selected: true, locked: true };
            }
        }

        const voluntaryFlaws = ((): VoluntaryFlaws | null => {
            const voluntary = ancestry.system.voluntary ?? { flaws: [] };

            const legacyFlaws = voluntary.boost !== undefined;
            const flawsComplete = legacyFlaws && voluntary.flaws.length >= 2;

            const buttons = this.#createButtons();
            for (const attribute of ATTRIBUTE_ABBREVIATIONS) {
                const state = buttons[attribute];
                const numFlaws = voluntary.flaws.filter((f) => f === attribute).length;
                state.flaw = {
                    selected: numFlaws > 0,
                    disabled: !numFlaws && flawsComplete,
                };

                if (legacyFlaws) {
                    // Locked ancestry boosts can accept a second flaw
                    if (lockedBoosts?.includes(attribute)) {
                        state.flaw.second = {
                            selected: numFlaws > 1,
                            disabled: !numFlaws || (numFlaws < 2 && flawsComplete),
                        };
                    }

                    const boosted = voluntary.boost === attribute;
                    state.boost = {
                        selected: boosted,
                        disabled: boosted
                            ? false
                            : !flawsComplete || !!voluntary.boost || netBoosted.includes(attribute),
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
        const selectedBoosts = boosts.map((b) => b.selected).filter((b): b is AttributeString => !!b);
        const unselectedRestricted = boosts.filter((b) => b.value.length < 6 && !b.selected).flatMap((b) => b.value);
        const remaining = boosts.length - selectedBoosts.length;

        for (const attribute of ATTRIBUTE_ABBREVIATIONS) {
            const selected = selectedBoosts.includes(attribute);
            const mightBeForced = unselectedRestricted.includes(attribute);
            buttons[attribute].boost = {
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
                const choices = Object.values(boosts)[0].value.map((b) => game.i18n.localize(CONFIG.PF2E.abilities[b]));
                return game.i18n.format("PF2E.Actor.Character.AttributeBuilder.BackgroundBoostDescription", {
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
        const build = this.actor.system.build.attributes;
        const isGradual = game.settings.get("pf2e", "gradualBoostsVariant");

        const boostIsPartial = (attribute: AttributeString, level: number, isApex: boolean): boolean => {
            if (level < 5 || build.manual || isApex) {
                return false;
            }
            const boosts = R.compact([
                build.boosts.ancestry.find((a) => a === attribute),
                build.boosts.background.find((a) => a === attribute),
                build.boosts.class === attribute ? attribute : null,
                build.boosts[1].find((a) => a === attribute),
                level === 20 ? build.boosts[20].find((a) => a === attribute) : null,
                level >= 15 ? build.boosts[15].find((a) => a === attribute) : null,
                level >= 10 ? build.boosts[10].find((a) => a === attribute) : null,
                level >= 5 ? build.boosts[5].find((a) => a === attribute) : null,
            ]).length;
            const flaws = Number(build.flaws.ancestry.some((a) => a === attribute));
            const netBoosts = boosts - flaws;

            const cssClasses: Record<number, boolean> = { 0: false, 1: true };
            return netBoosts >= 5 ? cssClasses[netBoosts % 2] : false;
        };

        return ([1, 5, 10, 15, 17, 20] as const).flatMap((level): LevelBoostData | never[] => {
            // Although the Attribute Apex increase from ABP isn't a boost, display it between level-15 and -20 boosts
            const isApex = level === 17;
            if (isApex && !this.#abpEnabled) return [];

            const remaining = isApex ? Number(!build.apex) : build.allowedBoosts[level] - build.boosts[level].length;
            const buttons = this.#createButtons();
            for (const attribute of ATTRIBUTE_ABBREVIATIONS) {
                const selected = isApex ? build.apex === attribute : build.boosts[level].includes(attribute);
                const partial = selected && boostIsPartial(attribute, level, isApex);
                buttons[attribute].boost = {
                    selected,
                    partial,
                    disabled: !remaining,
                };
            }
            const eligible = isApex ? this.actor.level >= 17 : build.allowedBoosts[level] > 0;
            const minLevel = isGradual && !isApex ? Math.max(1, level - 3) : level;

            return { buttons, remaining, level, eligible, minLevel, isApex };
        });
    }

    #getBoostFlawLabels(
        boostData: Record<string, { value: AttributeString[]; selected: AttributeString | null }>,
    ): string[] {
        return Object.values(boostData).flatMap((boosts) => {
            if (boosts.value.length === 6) {
                return game.i18n.localize("PF2E.AbilityFree");
            } else if (boosts.value.length > 0) {
                return boosts.value.map((b) => game.i18n.localize(CONFIG.PF2E.abilities[b])).join(" or ");
            } else {
                return [];
            }
        });
    }

    /** Maintain focus on manual entry inputs */
    protected override async _render(force?: boolean, options?: RenderOptions): Promise<void> {
        return maintainFocusInRender(this, () => super._render(force, options));
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
            maxWidth: 350,
            side: ["bottom"],
            theme: "crb-hover",
        });

        // Input handling for manual attribute score entry
        for (const input of htmlQueryAll<HTMLInputElement>(html, "input[type=text], input[type=number]")) {
            input.addEventListener("focus", () => {
                if (input.type === "text" && input.dataset.dtype === "Number") {
                    input.value = input.value.replace(/[^-.0-9]/g, "");
                    input.type = "number";
                }
                input.select();
            });

            input.addEventListener("blur", () => {
                if (input.type === "number" && input.dataset.dtype === "Number") {
                    input.type = "text";
                    const newValue = Math.clamped(Number(input.value) || 0, -5, 10);
                    input.value = addSign(newValue);

                    const propertyPath = input.dataset.property;
                    if (!propertyPath) throw ErrorPF2e("Empty property path");
                    actor.update({ [propertyPath]: newValue });
                }
            });
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
                const attribute = button.dataset.attribute;
                if (!ancestry || !setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                    return;
                }

                // If alternative ancestry boosts, write to there instead
                if (ancestry.system.alternateAncestryBoosts) {
                    const existingBoosts = ancestry.system.alternateAncestryBoosts;
                    const boosts = existingBoosts.includes(attribute)
                        ? existingBoosts.filter((b) => b !== attribute)
                        : [...existingBoosts, attribute].slice(0, 2);
                    ancestry.update({ "system.alternateAncestryBoosts": boosts });
                    return;
                }

                const boostToRemove = Object.entries(ancestry.system.boosts ?? {}).find(
                    ([, b]) => b.selected === attribute,
                );
                if (boostToRemove) {
                    await ancestry.update({ [`system.boosts.${boostToRemove[0]}.selected`]: null });
                    return;
                }

                const freeBoost = Object.entries(ancestry.system.boosts ?? {}).find(
                    ([, b]) => !b.selected && b.value.length > 0,
                );
                if (freeBoost) {
                    await ancestry.update({ [`system.boosts.${freeBoost[0]}.selected`]: attribute });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-section=voluntary] .boost-button")) {
            button.addEventListener("click", () => {
                const ancestry = actor.ancestry;
                const attribute = button.dataset.attribute;
                if (!ancestry || !setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                    return;
                }

                const removing = button.classList.contains("selected");

                if (button.dataset.action === "flaw") {
                    const { flaws, boost } = ancestry.system.voluntary ?? { flaws: [] };
                    const alreadyHasFlaw = flaws.includes(attribute);
                    const isLegacy = boost !== undefined;

                    // If removing, it must exist and there shouldn't be a boost selected
                    if (removing && alreadyHasFlaw && !boost) {
                        flaws.splice(flaws.indexOf(attribute), 1);
                        ancestry.update({ system: { voluntary: { flaws } } });
                        return;
                    }

                    // If adding, we need to be under 2 flaws if legacy, it must be new or be a locked ancestry boost (to double flaw)
                    const boostedByAncestry = ancestry.lockedBoosts.includes(attribute);
                    const canDoubleFlaw = boostedByAncestry && isLegacy;
                    const maxFlaws = isLegacy ? 2 : 6;
                    if (flaws.length < maxFlaws && (!alreadyHasFlaw || canDoubleFlaw)) {
                        flaws.push(attribute);
                        ancestry.update({ system: { voluntary: { flaws } } });
                    }
                } else {
                    const boost = removing ? null : attribute;
                    ancestry.update({ system: { voluntary: { boost } } });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-section=background] .boost")) {
            button.addEventListener("click", () => {
                const attribute = button.dataset.attribute;
                if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                    return;
                }

                const boostToRemove = Object.entries(actor.background?.system.boosts ?? {}).find(
                    ([, b]) => b.selected === attribute,
                );
                if (boostToRemove) {
                    actor.background?.update({
                        [`system.boosts.${boostToRemove[0]}.selected`]: null,
                    });
                    return;
                }

                const freeBoost = Object.entries(actor.background?.system.boosts ?? {}).find(
                    ([, b]) => !b.selected && b.value.length > 0,
                );
                if (freeBoost) {
                    actor.background?.update({
                        [`system.boosts.${freeBoost[0]}.selected`]: attribute,
                    });
                }
            });
        }

        for (const button of htmlQueryAll(html, "button[data-action=class-key-attribute]")) {
            button.addEventListener("click", () => {
                const attribute = button.dataset.attribute;
                if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                    throw ErrorPF2e(`Unrecognized attribute abbreviation: ${attribute}`);
                }

                if (actor.system.build.attributes.manual) {
                    actor.update({ [`system.details.keyability.value`]: attribute });
                } else {
                    actor.class?.update({ [`system.keyAbility.selected`]: attribute });
                }
            });
        }

        for (const button of htmlQueryAll(html, "[data-level] .boost")) {
            button.addEventListener("click", () => {
                const level = Number(htmlClosest(button, "[data-level]")?.dataset.level);
                const attribute = button.dataset.attribute;
                if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute) || !tupleHasValue([1, 5, 10, 15, 20], level)) {
                    return;
                }

                const buildSource = mergeObject(actor.toObject().system.build ?? {}, { attributes: { boosts: {} } });
                const boosts = (buildSource.attributes.boosts[level] ??= []);
                if (boosts.includes(attribute)) {
                    boosts.splice(boosts.indexOf(attribute), 1);
                } else {
                    boosts.push(attribute);
                }

                actor.update({ "system.build": buildSource });
            });
        }

        for (const button of htmlQueryAll(html, "button[data-action=apex]")) {
            button.addEventListener("click", () => {
                const attribute = button.dataset.attribute;
                if (!setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                    throw ErrorPF2e(`Unrecognized attribute abbreviation: ${attribute}`);
                }

                const current = this.actor.system.build.attributes.apex;
                actor.update({
                    [`system.build.attributes.apex`]: this.#abpEnabled && attribute !== current ? attribute : null,
                });
            });
        }

        htmlQuery(html, "input[name=toggle-manual-mode]")?.addEventListener("click", () => {
            actor.toggleAttributeManagement();
        });
        htmlQuery(html, "button[data-action=close]")?.addEventListener("click", () => this.close());
    }
}

interface AttributeBuilderSheetData {
    actor: CharacterPF2e;
    attributeModifiers: Record<AttributeString, { label: string; mod: string }>;
    manualKeyAttribute: AttributeString;
    attributes: Record<AttributeString, string>;
    ancestry: AncestryPF2e<CharacterPF2e> | null;
    background: BackgroundPF2e<CharacterPF2e> | null;
    class: ClassPF2e<CharacterPF2e> | null;
    manual: boolean;
    ancestryBoosts: AncestryBoosts | null;
    voluntaryFlaws: VoluntaryFlaws | null;
    backgroundBoosts: BackgroundBoosts | null;
    keyOptions: AttributeString[] | null;
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
    partial?: boolean;
    second?: Omit<BuilderButton, "second">;
}

interface BoostFlawRow {
    buttons: Record<AttributeString, BoostFlawState>;
    remaining: number;
    isApex?: boolean;
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

export { AttributeBuilder, type BoostFlawState };
