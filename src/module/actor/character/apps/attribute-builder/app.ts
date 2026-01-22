import type { CharacterPF2e } from "@actor";
import type { AttributeBoosts } from "@actor/character/data.ts";
import type { AttributeString } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import * as R from "remeda";
import Root from "./app.svelte";

interface AttributeBuilderConfiguration extends fa.ApplicationConfiguration {
    actor: CharacterPF2e;
}

class AttributeBuilder extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<AttributeBuilderConfiguration> }
>(fa.api.ApplicationV2) {
    /** Number of attributes in the game (str, dex, con, int, wis, cha) */
    static ALL_ATTRIBUTES_COUNT = 6;
    /** Maximum alternate ancestry boosts allowed */
    static MAX_ALTERNATE_ANCESTRY_BOOSTS = 2;
    /** Maximum voluntary flaws in legacy mode */
    static MAX_VOLUNTARY_FLAWS_LEGACY = 2;
    /** Threshold at which boosts become "partial" (require 2 boosts per +1) */
    static PARTIAL_BOOST_THRESHOLD = 5;
    /** Minimum allowed manual attribute modifier */
    static MODIFIER_MIN = -5;
    /** Maximum allowed manual attribute modifier */
    static MODIFIER_MAX = 10;

    static override DEFAULT_OPTIONS: DeepPartial<AttributeBuilderConfiguration> = {
        id: "attribute-builder",
        position: { width: "auto", height: "auto" },
        window: {
            title: "PF2E.Actor.Character.Attribute.Boosts",
        },
    };

    declare options: AttributeBuilderConfiguration;

    protected root = Root;

    get #actor(): CharacterPF2e {
        return this.options.actor;
    }

    /** Re-evaluate ABP status on each access rather than caching at construction to avoid need for page reload */
    get #abpEnabled(): boolean {
        return game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(this.#actor);
    }

    protected override async _onFirstRender(
        context: AttributeBuilderContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.options.actor.apps[this.id] = this;
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        delete this.options.actor.apps[this.id];
        super._tearDown(options);
    }

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<AttributeBuilderContext> {
        const actor = this.#actor;
        const build = actor.system.build.attributes;

        return {
            ...(await super._prepareContext(options)),
            foundryApp: this,
            state: {
                ancestry: actor.ancestry,
                background: actor.background,
                class: actor.class,
                attributeModifiers: R.mapValues(actor.abilities, (value, attribute) => {
                    const mod = build.manual ? (actor._source.system.abilities?.[attribute].mod ?? 0) : value.base;
                    return {
                        mod: Number(mod.toFixed(1)).signedString(),
                        rawMod: mod,
                        label: CONFIG.PF2E.abilities[attribute],
                    };
                }),
                build,
                keyAttribute: actor.keyAttribute,
                currentLevel: actor.level,
                abpEnabled: this.#abpEnabled,
                gradualBoostsVariant: game.settings.get("pf2e", "gradualBoostsVariant"),
            },
        };
    }

    async toggleAlternateAncestryBoosts(): Promise<void> {
        const ancestry = this.#actor.ancestry;
        if (!ancestry) return;
        if (ancestry.system.alternateAncestryBoosts) {
            await ancestry.update({ "system.-=alternateAncestryBoosts": null });
        } else {
            await ancestry.update({ "system.alternateAncestryBoosts": [] });
        }
    }

    async toggleLegacyVoluntaryFlaw(): Promise<void> {
        const ancestry = this.#actor.ancestry;
        if (!ancestry) return;

        const voluntary = ancestry.system.voluntary;
        if (voluntary?.boost !== undefined) {
            const flaws = R.unique(voluntary.flaws);
            await ancestry.update({ system: { voluntary: { "-=boost": null, flaws } } });
        } else {
            const flaws = voluntary?.flaws.slice(0, 2) ?? [];
            await ancestry.update({ system: { voluntary: { boost: null, flaws } } });
        }
    }

    async handleAncestryBoost(attribute: AttributeString): Promise<void> {
        const ancestry = this.#actor.ancestry;
        if (!ancestry) return;

        if (ancestry.system.alternateAncestryBoosts) {
            const existingBoosts = ancestry.system.alternateAncestryBoosts;
            const boosts = existingBoosts.includes(attribute)
                ? existingBoosts.filter((b) => b !== attribute)
                : [...existingBoosts, attribute].slice(0, 2);
            await ancestry.update({ "system.alternateAncestryBoosts": boosts });
            return;
        }

        const boostToRemove = Object.entries(ancestry.system.boosts ?? {}).find(([, b]) => b.selected === attribute);
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
    }

    async handleVoluntaryFlaw(attribute: AttributeString, action: "flaw" | "boost" | "doubleFlaw"): Promise<void> {
        const ancestry = this.#actor.ancestry;
        if (!ancestry) return;

        const { flaws, boost } = ancestry.system.voluntary ?? { flaws: [] };

        if (action === "flaw") {
            const alreadyHasFlaw = flaws.includes(attribute);

            // Toggle: if already has flaw and no boost selected, remove it
            if (alreadyHasFlaw && !boost) {
                flaws.splice(flaws.indexOf(attribute), 1);
                await ancestry.update({ system: { voluntary: { flaws } } });
                return;
            }

            // Add a flaw if allowed (legacy mode has max 2, modern has max 6)
            const maxFlaws =
                boost !== undefined
                    ? AttributeBuilder.MAX_VOLUNTARY_FLAWS_LEGACY
                    : AttributeBuilder.ALL_ATTRIBUTES_COUNT;
            if (flaws.length < maxFlaws && !alreadyHasFlaw) {
                flaws.push(attribute);
                await ancestry.update({ system: { voluntary: { flaws } } });
            }
        } else if (action === "doubleFlaw") {
            // x2 button: toggle second flaw on locked ancestry boost
            const numFlaws = flaws.filter((f) => f === attribute).length;
            if (numFlaws >= 2) {
                // Remove one flaw
                flaws.splice(flaws.indexOf(attribute), 1);
            } else if (numFlaws === 1 && flaws.length < AttributeBuilder.MAX_VOLUNTARY_FLAWS_LEGACY) {
                // Add second flaw
                flaws.push(attribute);
            }
            await ancestry.update({ system: { voluntary: { flaws } } });
        } else {
            // boost action
            const currentBoost = ancestry.system.voluntary?.boost;
            const newBoost = currentBoost === attribute ? null : attribute;
            await ancestry.update({ system: { voluntary: { boost: newBoost } } });
        }
    }

    async handleBackgroundBoost(attribute: AttributeString): Promise<void> {
        const background = this.#actor.background;
        if (!background) return;

        const boostToRemove = Object.entries(background.system.boosts ?? {}).find(([, b]) => b.selected === attribute);
        if (boostToRemove) {
            await background.update({ [`system.boosts.${boostToRemove[0]}.selected`]: null });
            return;
        }

        const freeBoost = Object.entries(background.system.boosts ?? {}).find(
            ([, b]) => !b.selected && b.value.length > 0,
        );
        if (freeBoost) {
            await background.update({ [`system.boosts.${freeBoost[0]}.selected`]: attribute });
        }
    }

    async handleClassKeyAttribute(attribute: AttributeString): Promise<void> {
        if (this.#actor.system.build.attributes.manual) {
            await this.#actor.update({ "system.details.keyability.value": attribute });
        } else {
            await this.#actor.class?.update({ "system.keyAbility.selected": attribute });
        }
    }

    async handleLevelBoost(attribute: AttributeString, level: 1 | 5 | 10 | 15 | 20): Promise<void> {
        const buildSource = fu.mergeObject(this.#actor.toObject().system.build ?? {}, { attributes: { boosts: {} } });
        const boosts = (buildSource.attributes.boosts[level] ??= []);
        if (boosts.includes(attribute)) {
            boosts.splice(boosts.indexOf(attribute), 1);
        } else {
            boosts.push(attribute);
        }
        await this.#actor.update({ "system.build": buildSource });
    }

    async handleApexBoost(attribute: AttributeString): Promise<void> {
        const current = this.#actor.system.build.attributes.apex;
        await this.#actor.update({
            "system.build.attributes.apex": this.#abpEnabled && attribute !== current ? attribute : null,
        });
    }

    async handleManualModChange(attribute: AttributeString, value: number): Promise<void> {
        const clampedValue = Math.clamp(value, AttributeBuilder.MODIFIER_MIN, AttributeBuilder.MODIFIER_MAX);
        await this.#actor.update({ [`system.abilities.${attribute}.mod`]: clampedValue });
    }

    async toggleManualMode(): Promise<void> {
        if (Object.keys(this.#actor._source.system.abilities ?? {}).length === 0) {
            const baseAbilities = Array.from(ATTRIBUTE_ABBREVIATIONS).reduce(
                (accumulated: Record<string, { value: 10 }>, abbrev) => ({
                    ...accumulated,
                    [abbrev]: { value: 10 as const },
                }),
                {},
            );
            await this.#actor.update({ "system.abilities": baseAbilities });
        } else {
            await this.#actor.update({ "system.abilities": null });
        }
    }
}

interface AttributeBuilderContext extends SvelteApplicationRenderContext {
    foundryApp: AttributeBuilder;
    state: AttributeBuilderState;
}

interface AttributeBuilderState {
    attributeModifiers: Record<AttributeString, { label: string; mod: string; rawMod: number }>;
    ancestry: AncestryPF2e<CharacterPF2e> | null;
    background: BackgroundPF2e<CharacterPF2e> | null;
    class: ClassPF2e<CharacterPF2e> | null;
    build: AttributeBoosts;
    keyAttribute: AttributeString;
    currentLevel: number;
    abpEnabled: boolean;
    gradualBoostsVariant: boolean;
}

export { AttributeBuilder };
export type { AttributeBuilderContext, AttributeBuilderState };
