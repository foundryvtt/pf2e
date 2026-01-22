<script lang="ts">
    import type { AttributeString } from "@actor/types.ts";
    import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
    import { createButtonRecord } from "@module/apps/attribute-builder/helpers.ts";
    import AttributeButton from "@module/apps/attribute-builder/components/attribute-button.svelte";
    import RemainingIndicator from "@module/apps/attribute-builder/components/remaining-indicator.svelte";
    import { tupleHasValue } from "@util";
    import * as R from "remeda";
    import { AttributeBuilder, type AttributeBuilderState } from "./app.ts";

    interface Props {
        foundryApp: AttributeBuilder;
        state: AttributeBuilderState;
    }

    const { foundryApp, state: data }: Props = $props();

    const attributeList = [...ATTRIBUTE_ABBREVIATIONS] as const;

    const {
        ALL_ATTRIBUTES_COUNT,
        MAX_ALTERNATE_ANCESTRY_BOOSTS,
        MAX_VOLUNTARY_FLAWS_LEGACY,
        PARTIAL_BOOST_THRESHOLD,
        MODIFIER_MIN,
        MODIFIER_MAX,
    } = AttributeBuilder;

    // Helper function to generate boost/flaw labels from item data
    function getBoostFlawLabels(
        boostData: Record<string, { value: AttributeString[]; selected: AttributeString | null }>,
    ): string[] {
        return Object.values(boostData).flatMap((boosts) => {
            if (boosts.value.length === ALL_ATTRIBUTES_COUNT) {
                return game.i18n.localize("PF2E.AbilityFree");
            } else if (boosts.value.length > 0) {
                return boosts.value.map((b) => game.i18n.localize(CONFIG.PF2E.abilities[b])).join(" or ");
            } else {
                return [];
            }
        });
    }

    /** Boost counts by level for partial boost calculation */
    interface BoostCountsByLevel {
        base: number;
        flaw: number;
        level5: number;
        level10: number;
        level15: number;
        level20: number;
    }

    /** Compute boost counts per attribute across all sources up to level 1 and per-level */
    function computeBoostCounts(build: AttributeBuilderState["build"]): Map<AttributeString, BoostCountsByLevel> {
        const counts = new Map<AttributeString, BoostCountsByLevel>();
        for (const attr of attributeList) {
            const base =
                (build.boosts.ancestry.includes(attr) ? 1 : 0) +
                (build.boosts.background.includes(attr) ? 1 : 0) +
                (build.boosts.class === attr ? 1 : 0) +
                (build.boosts[1].includes(attr) ? 1 : 0);
            const flaw = build.flaws.ancestry.includes(attr) ? 1 : 0;
            counts.set(attr, {
                base,
                flaw,
                level5: build.boosts[5].includes(attr) ? 1 : 0,
                level10: build.boosts[10].includes(attr) ? 1 : 0,
                level15: build.boosts[15].includes(attr) ? 1 : 0,
                level20: build.boosts[20].includes(attr) ? 1 : 0,
            });
        }
        return counts;
    }

    /** Determine if a boost results in a "partial" state (odd number of boosts >= threshold) */
    function isPartialBoost(counts: BoostCountsByLevel, level: number, isApex: boolean, isManual: boolean): boolean {
        if (level < 5 || isManual || isApex) {
            return false;
        }
        const boosts =
            counts.base +
            (level >= 5 ? counts.level5 : 0) +
            (level >= 10 ? counts.level10 : 0) +
            (level >= 15 ? counts.level15 : 0) +
            (level === 20 ? counts.level20 : 0);
        const netBoosts = boosts - counts.flaw;
        return netBoosts >= PARTIAL_BOOST_THRESHOLD && netBoosts % 2 === 1;
    }

    /** Build the background boost tooltip if it matches the standard "X or Y, then free" pattern */
    function buildBackgroundTooltip(
        boostData: Record<string, { value: AttributeString[]; selected: AttributeString | null }>,
    ): string | null {
        const boostValues = Object.values(boostData);
        if (
            boostValues.length === 2 &&
            boostValues[0].value.length === 2 &&
            boostValues[1].value.length === ALL_ATTRIBUTES_COUNT
        ) {
            const choices = boostValues[0].value.map((b) => game.i18n.localize(CONFIG.PF2E.abilities[b]));
            return game.i18n.format("PF2E.Actor.Character.AttributeBuilder.BackgroundBoostDescription", {
                a: choices[0],
                b: choices[1],
            });
        }
        return null;
    }

    const ancestryBoosts = $derived.by(() => {
        const ancestry = data.ancestry;
        if (!ancestry) return null;

        const [maxBoosts, selectedBoosts] = (() => {
            const alternateAncestryBoosts = ancestry.system.alternateAncestryBoosts;
            if (alternateAncestryBoosts) return [MAX_ALTERNATE_ANCESTRY_BOOSTS, alternateAncestryBoosts];

            const baseBoosts = Object.values(ancestry.system.boosts);
            const selectedBoosts = baseBoosts.map((b) => b.selected).filter((b): b is AttributeString => !!b);
            const maxBoosts = baseBoosts.filter((b) => b.value.length > 0 || b.selected).length;
            return [maxBoosts, selectedBoosts];
        })();

        const netBoosted = R.difference(data.build.boosts.ancestry, data.build.flaws.ancestry);
        const remaining = maxBoosts - selectedBoosts.length;
        const lockedBoosts = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedBoosts;
        const lockedFlaws = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedFlaws;

        const buttons = createButtonRecord(attributeList, (attribute) => {
            const selected = selectedBoosts.includes(attribute);
            return {
                boost: {
                    selected,
                    locked: lockedBoosts?.includes(attribute),
                    disabled: selected ? false : !remaining || netBoosted.includes(attribute),
                },
                flaw: lockedFlaws?.includes(attribute) ? { selected: true, locked: true } : undefined,
            };
        });

        return {
            buttons,
            remaining,
            labels: getBoostFlawLabels(ancestry.system.boosts),
            flawLabels: getBoostFlawLabels(ancestry.system.flaws),
            alternate: !!ancestry.system.alternateAncestryBoosts,
        };
    });

    const legacyFlaws = $derived(data.ancestry?.system.voluntary?.boost !== undefined);

    const voluntaryFlaws = $derived.by(() => {
        const ancestry = data.ancestry;
        if (!ancestry) return null;

        const voluntary = ancestry.system.voluntary ?? { flaws: [] };
        const isLegacy = voluntary.boost !== undefined;
        const flawsComplete = isLegacy && voluntary.flaws.length >= MAX_VOLUNTARY_FLAWS_LEGACY;

        const lockedBoosts = ancestry.system.alternateAncestryBoosts ? null : ancestry.lockedBoosts;
        const netBoosted = R.difference(data.build.boosts.ancestry, data.build.flaws.ancestry);

        const buttons = createButtonRecord(attributeList, (attribute) => {
            const numFlaws = voluntary.flaws.filter((f) => f === attribute).length;
            const flaw = {
                selected: numFlaws > 0,
                disabled: !numFlaws && flawsComplete,
            };

            const secondFlaw =
                isLegacy && lockedBoosts?.includes(attribute)
                    ? {
                          selected: numFlaws > 1,
                          disabled: !numFlaws || (numFlaws < 2 && flawsComplete),
                      }
                    : undefined;

            const boosted = voluntary.boost === attribute;
            const boost = isLegacy
                ? {
                      selected: boosted,
                      disabled: boosted ? false : !flawsComplete || !!voluntary.boost || netBoosted.includes(attribute),
                  }
                : undefined;

            return { flaw, secondFlaw, boost };
        });

        return {
            remaining: voluntary && isLegacy && !voluntary.boost ? 1 : 0,
            buttons,
            voluntaryBoostsRemaining: 0,
            labels: getBoostFlawLabels(ancestry.system.flaws),
        };
    });

    const backgroundBoosts = $derived.by(() => {
        const background = data.background;
        if (!background) return null;

        const selectedBoosts = data.build.boosts.background;
        const boosts = Object.values(background.system.boosts).filter((b) => b.value.length > 0);
        const unselectedRestricted = boosts
            .filter((b) => b.value.length < ALL_ATTRIBUTES_COUNT && !b.selected)
            .flatMap((b) => b.value);
        const remaining = boosts.length - selectedBoosts.length;

        const buttons = createButtonRecord(attributeList, (attribute) => {
            const selected = selectedBoosts.includes(attribute);
            const mightBeForced = unselectedRestricted.includes(attribute);
            return {
                boost: {
                    selected,
                    disabled: !(selected || remaining) || (unselectedRestricted.length > 0 && !mightBeForced),
                },
            };
        });

        const labels = getBoostFlawLabels(background.system.boosts);
        const tooltip = buildBackgroundTooltip(background.system.boosts ?? {});

        return { buttons, remaining, labels, tooltip };
    });

    const levelBoosts = $derived.by(() => {
        const build = data.build;
        const boostCounts = computeBoostCounts(build);

        return ([1, 5, 10, 15, 17, 20] as const).flatMap((level) => {
            const isApex = level === 17;
            if (isApex && !data.abpEnabled) return [];

            const eligible = isApex ? data.currentLevel >= 17 : build.allowedBoosts[level] > 0;
            const remaining = eligible
                ? isApex
                    ? Number(!build.apex)
                    : build.allowedBoosts[level] - build.boosts[level].length
                : 0;

            const buttons = createButtonRecord(attributeList, (attribute) => {
                const selected = isApex
                    ? build.apex === attribute && eligible
                    : build.boosts[level].includes(attribute);
                const counts = boostCounts.get(attribute)!;
                const partial = selected && isPartialBoost(counts, level, isApex, build.manual);
                return {
                    boost: { selected, partial, disabled: !remaining || !eligible },
                };
            });

            const minLevel = data.gradualBoostsVariant && !isApex ? Math.max(1, level - 3) : level;

            return { buttons, remaining, level, eligible, minLevel, isApex };
        });
    });

    function handleManualInputFocus(event: FocusEvent): void {
        const input = event.target as HTMLInputElement;
        input.select();
    }

    function handleManualInputBlur(event: FocusEvent, attribute: AttributeString): void {
        const input = event.target as HTMLInputElement;
        const value = Number(input.value) || 0;
        const clampedValue = Math.clamp(value, MODIFIER_MIN, MODIFIER_MAX);
        foundryApp.handleManualModChange(attribute, clampedValue);
    }

    function handleLevelBoostClick(attribute: AttributeString, level: number, isApex: boolean): void {
        if (isApex) {
            foundryApp.handleApexBoost(attribute);
        } else if (tupleHasValue([1, 5, 10, 15, 20], level)) {
            foundryApp.handleLevelBoost(attribute, level);
        }
    }

    function getLevelLabel(boosts: { level: number; minLevel: number; isApex?: boolean }): string {
        if (boosts.isApex) {
            return game.i18n.localize("PF2E.TraitApex");
        } else if (boosts.minLevel === boosts.level) {
            return game.i18n.format("PF2E.LevelN", { level: boosts.level });
        } else {
            return game.i18n.format("PF2E.LevelRange", { minLevel: boosts.minLevel, level: boosts.level });
        }
    }

    const ancestryTooltipHtml = $derived.by(() => {
        if (!ancestryBoosts) return "";
        const boostsHeader = game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Boosts");
        const flawsHeader = game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Flaws");
        const boostItems = ancestryBoosts.labels.map((b) => `<li>${b}</li>`).join("");
        const flawItems = ancestryBoosts.flawLabels.map((f) => `<li>${f}</li>`).join("");
        return `<h2>${boostsHeader}</h2><ul class="boost-details">${boostItems}</ul><h2>${flawsHeader}</h2><ul class="boost-details">${flawItems}</ul>`;
    });

    const backgroundTooltipHtml = $derived.by(() => {
        if (!backgroundBoosts) return "";
        if (backgroundBoosts.tooltip) return backgroundBoosts.tooltip;
        const boostsHeader = game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Boosts");
        const boostItems = backgroundBoosts.labels
            .filter((b) => b)
            .map((b) => `<li><i class="fa-solid fa-circle"></i>${b}</li>`)
            .join("");
        return `<h2>${boostsHeader}</h2><ul class="boost-details">${boostItems}</ul>`;
    });
</script>

{#snippet missingItem(typeLabel: string, helpKey: string)}
    <div class="row-heading">
        <div class="label">
            <div class="title">{game.i18n.localize(typeLabel)}</div>
            <div class="description">
                {game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.NotSelected")}
            </div>
        </div>
    </div>
    <div class="full-row">
        {game.i18n.localize(helpKey)}
    </div>
{/snippet}

<form class="scrollable" autocomplete="off" data-tooltip-class="pf2e">
    <div class="attribute-rows">
        <!-- Header Row -->
        <header class="row" class:not-eligible={data.build.manual}>
            <div class="row-heading">
                <h3>{game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Title")}</h3>
            </div>
            <div class="attributes">
                {#each attributeList as attribute}
                    <div class="row-column">
                        <h3>{game.i18n.localize(`PF2E.AbilityId.${attribute}`)}</h3>
                    </div>
                {/each}
            </div>
        </header>

        <!-- Ancestry Boosts Section -->
        <section
            class="row double-row"
            class:not-eligible={data.build.manual}
            data-section="ancestry"
            role="group"
            aria-label={game.i18n.format("PF2E.Actor.Character.AttributeBuilder.Aria.AncestrySection", {
                name: data.ancestry?.name ?? "",
            })}
        >
            {#if ancestryBoosts}
                <div class="row-heading">
                    <RemainingIndicator count={ancestryBoosts.remaining} />
                    <img src={data.ancestry?.img} alt={data.ancestry?.name} loading="lazy" />
                    <div class="label">
                        <div class="title">{game.i18n.localize("TYPES.Item.ancestry")}</div>
                        <div
                            class="description has-tooltip"
                            data-tooltip-html={ancestryTooltipHtml}
                            data-tooltip-direction="DOWN"
                        >
                            {data.ancestry?.name}
                        </div>
                        <label class="extra" for={`${foundryApp.id}.alternate-boosts`}>
                            {game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.AlternateBoostsLabel")}
                            <input
                                type="checkbox"
                                id={`${foundryApp.id}.alternate-boosts`}
                                name="alternate-boosts"
                                checked={ancestryBoosts.alternate}
                                onchange={() => foundryApp.toggleAlternateAncestryBoosts()}
                            />
                        </label>
                    </div>
                </div>
                <div class="attributes">
                    {#each attributeList as attribute}
                        {@const buttonState = ancestryBoosts.buttons[attribute]}
                        <div class="row-column">
                            {#if buttonState.flaw}
                                <AttributeButton type="flaw" {attribute} button={buttonState.flaw} onclick={() => {}} />
                            {/if}
                            <AttributeButton
                                type="boost"
                                {attribute}
                                button={buttonState.boost}
                                onclick={(attr) => foundryApp.handleAncestryBoost(attr)}
                            />
                        </div>
                    {/each}
                </div>
            {:else}
                {@render missingItem(
                    "TYPES.Item.ancestry",
                    "PF2E.Actor.Character.AttributeBuilder.AncestryMissingHelp",
                )}
            {/if}
        </section>

        <!-- Voluntary Flaws Section -->
        <section
            class="row double-row voluntary-flaw-row"
            class:not-eligible={data.build.manual}
            data-section="voluntary"
            role="group"
            aria-label={game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.VoluntaryFlaw.Title")}
        >
            {#if data.ancestry}
                <div class="row-heading">
                    <RemainingIndicator count={voluntaryFlaws?.remaining ?? 0} />
                    <div class="label">
                        <div
                            class="description has-tooltip"
                            data-tooltip="PF2E.Actor.Character.AttributeBuilder.VoluntaryFlaw.Description"
                        >
                            {game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.VoluntaryFlaw.Title")}
                        </div>
                        <label
                            class="extra"
                            for={`${foundryApp.id}.legacy-flaws`}
                            data-tooltip="PF2E.Actor.Character.AttributeBuilder.VoluntaryFlaw.LegacyDescription"
                        >
                            {game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.LegacyFlaws")}
                            <i class="fa-solid fa-circle-info small" aria-hidden="true"></i>
                            <input
                                type="checkbox"
                                id={`${foundryApp.id}.legacy-flaws`}
                                name="legacy-flaws"
                                checked={legacyFlaws}
                                onchange={() => foundryApp.toggleLegacyVoluntaryFlaw()}
                            />
                        </label>
                    </div>
                </div>
                {#if voluntaryFlaws}
                    <div class="attributes">
                        {#each attributeList as attribute}
                            {@const buttonState = voluntaryFlaws.buttons[attribute]}
                            <div class="row-column">
                                {#if buttonState.flaw}
                                    <AttributeButton
                                        type="flaw"
                                        {attribute}
                                        button={buttonState.flaw}
                                        onclick={(attr) => foundryApp.handleVoluntaryFlaw(attr, "flaw")}
                                        secondFlaw={buttonState.secondFlaw
                                            ? {
                                                  button: buttonState.secondFlaw,
                                                  onclick: (attr) => foundryApp.handleVoluntaryFlaw(attr, "doubleFlaw"),
                                              }
                                            : undefined}
                                    />
                                {/if}
                                {#if buttonState.boost}
                                    <AttributeButton
                                        type="boost"
                                        {attribute}
                                        button={buttonState.boost}
                                        onclick={(attr) => foundryApp.handleVoluntaryFlaw(attr, "boost")}
                                    />
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            {/if}
        </section>

        <hr />

        <!-- Background Boosts Section -->
        <section
            class="row"
            class:not-eligible={data.build.manual}
            data-section="background"
            role="group"
            aria-label={game.i18n.format("PF2E.Actor.Character.AttributeBuilder.Aria.BackgroundSection", {
                name: data.background?.name ?? "",
            })}
        >
            {#if backgroundBoosts}
                <div
                    class="row-heading has-tooltip"
                    data-tooltip-html={backgroundTooltipHtml}
                    data-tooltip-direction="DOWN"
                >
                    <RemainingIndicator count={backgroundBoosts.remaining} />
                    <img src={data.background?.img} alt={data.background?.name} loading="lazy" />
                    <div class="label">
                        <div class="title">{game.i18n.localize("TYPES.Item.background")}</div>
                        <div class="description">{data.background?.name}</div>
                    </div>
                </div>
                <div class="attributes">
                    {#each attributeList as attribute}
                        {@const buttonState = backgroundBoosts.buttons[attribute]}
                        <div class="row-column">
                            <AttributeButton
                                type="boost"
                                {attribute}
                                button={buttonState.boost}
                                onclick={(attr) => foundryApp.handleBackgroundBoost(attr)}
                            />
                        </div>
                    {/each}
                </div>
            {:else}
                {@render missingItem(
                    "TYPES.Item.background",
                    "PF2E.Actor.Character.AttributeBuilder.BackgroundMissingHelp",
                )}
            {/if}
        </section>

        <hr />

        <!-- Class Key Attribute Section -->
        <section
            class="row"
            class:not-eligible={data.build.manual}
            role="group"
            aria-label={game.i18n.format("PF2E.Actor.Character.AttributeBuilder.Aria.ClassSection", {
                name: data.class?.name ?? "",
            })}
        >
            {#if data.class}
                <div class="row-heading">
                    <img src={data.class.img} alt={data.class.name} loading="lazy" />
                    <div class="label">
                        <div class="title">{game.i18n.localize("TYPES.Item.class")}</div>
                        <div class="description">{data.class.name}</div>
                    </div>
                </div>
                <div class="attributes">
                    {#each attributeList as attribute}
                        {@const isKeyOption = data.build.keyOptions?.includes(attribute)}
                        {@const isSelected = data.build.boosts.class === attribute}
                        <div class="row-column">
                            {#if isKeyOption && !data.build.manual}
                                <AttributeButton
                                    type="key"
                                    {attribute}
                                    button={{ selected: isSelected }}
                                    onclick={(attr) => foundryApp.handleClassKeyAttribute(attr)}
                                />
                            {/if}
                        </div>
                    {/each}
                </div>
            {:else}
                {@render missingItem("TYPES.Item.class", "PF2E.Actor.Character.AttributeBuilder.ClassMissingHelp")}
            {/if}
        </section>

        <hr />

        <!-- Free Boosts Label -->
        <div class="row" class:not-eligible={data.build.manual}>
            <div class="row-heading">
                <div class="label">
                    <div class="title">{game.i18n.localize("PF2E.AbilityFree")}</div>
                </div>
            </div>
        </div>

        <!-- Level Boosts -->
        {#each levelBoosts as boosts}
            <section
                class="row"
                class:not-eligible={data.build.manual || !boosts.eligible}
                data-section={boosts.isApex ? "apex" : undefined}
                data-level={boosts.isApex ? undefined : boosts.level}
                role="group"
                aria-label={game.i18n.format("PF2E.Actor.Character.AttributeBuilder.Aria.LevelSection", {
                    level: getLevelLabel(boosts),
                })}
            >
                <div class="row-heading">
                    <RemainingIndicator count={boosts.remaining} />
                    <div class="label">
                        <div class="description">{getLevelLabel(boosts)}</div>
                    </div>
                </div>
                <div class="attributes">
                    {#each attributeList as attribute}
                        {@const buttonState = boosts.buttons[attribute]}
                        <div class="row-column">
                            <AttributeButton
                                type={boosts.isApex ? "apex" : "boost"}
                                {attribute}
                                button={buttonState.boost}
                                onclick={(attr) => handleLevelBoostClick(attr, boosts.level, boosts.isApex)}
                            />
                        </div>
                    {/each}
                </div>
            </section>
        {/each}

        <!-- Summary Row -->
        <section class="row summary-row">
            <div class="row-heading">
                <aside class="hint-container">
                    <h3>{game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.InputMethod.Title")}</h3>
                    <p>{game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.InputMethod.Description")}</p>
                    <label for={`${foundryApp.id}.manual-mode`}>
                        <input
                            type="checkbox"
                            id={`${foundryApp.id}.manual-mode`}
                            name="manual-mode"
                            checked={data.build.manual}
                            onchange={() => foundryApp.toggleManualMode()}
                        />
                        {game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.InputMethod.Manual")}
                    </label>
                </aside>
            </div>
            <div class="attributes">
                {#each attributeList as attribute}
                    {@const attrData = data.attributeModifiers[attribute]}
                    <div class="row-column">
                        {#if data.build.manual}
                            <AttributeButton
                                type="key"
                                {attribute}
                                button={{ selected: data.keyAttribute === attribute }}
                                onclick={(attr) => foundryApp.handleClassKeyAttribute(attr)}
                            />
                            <input
                                type="number"
                                data-property="system.abilities.{attribute}.mod"
                                name="system.abilities.{attribute}.mod"
                                value={attrData.rawMod}
                                step="0.5"
                                placeholder="0"
                                onfocus={handleManualInputFocus}
                                onblur={(e) => handleManualInputBlur(e, attribute)}
                            />
                        {:else}
                            <div class="value">{attrData.mod}</div>
                        {/if}
                        <h4>{game.i18n.localize(attrData.label)}</h4>
                    </div>
                {/each}
                <button class="complete" type="button" data-action="close" onclick={() => foundryApp.close()}>
                    {game.i18n.localize("PF2E.Actor.Character.AttributeBuilder.Complete")}
                </button>
            </div>
        </section>
        <!-- Background Stripes -->
        <div class="row background-stripes">
            <div class="row-heading"></div>
            <div class="attributes">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>
    </div>
</form>

<style lang="scss">
    form {
        position: relative;
    }

    h3 {
        font: 400 var(--font-size-24) var(--serif-condensed);
        color: var(--color-text-primary);
        margin: 0;
    }

    h4 {
        font: 400 var(--font-size-10) var(--font-primary);
        text-transform: uppercase;
        color: var(--color-text-secondary);
        margin: 0 0 var(--space-8);
    }

    .attribute-rows {
        position: relative;
    }

    .row {
        display: flex;
        align-items: center;

        .row-heading {
            width: min(13.75rem, 220px);
        }

        &.not-eligible {
            pointer-events: none;
            opacity: 0.6;

            &,
            + hr {
                filter: blur(var(--space-1));
            }
        }

        .attributes {
            display: grid;
            grid-template-columns: repeat(6, 5.25rem);
            grid-template-rows: auto;
            flex: 0 0 auto;
        }

        .full-row {
            display: flex;
            flex: 1;
            justify-content: center;
            color: var(--color-text-secondary);
        }
    }

    header.row {
        align-items: normal;
        padding-top: var(--space-10);
        border-bottom: 1px solid var(--table-header-border-color);
        margin-bottom: var(--space-21);

        .row-column {
            display: block;
        }

        .attributes {
            align-items: normal;
        }
    }

    /* Reserve space for both flaw and boost buttons to prevent layout shift */
    .double-row:has(.attributes) {
        min-height: calc(var(--font-size-48) + var(--space-4));
    }

    .background-stripes {
        position: absolute;
        z-index: -1;
        left: 0;
        top: 0;
        bottom: 2.75rem;
        right: 0;
        pointer-events: none;
        align-items: normal;

        .attributes div:nth-child(odd) {
            background-color: var(--table-row-color-even);
        }
    }

    .voluntary-flaw-row {
        margin: var(--space-8) 0;
    }

    /* Add spacing between level boost rows */
    section.row[data-level] + section.row[data-level],
    section.row[data-section="apex"],
    section.summary-row {
        margin-top: var(--space-4);
    }

    .row-heading {
        align-items: center;
        display: grid;
        grid-template-areas: "img description remaining";
        grid-template-columns: var(--font-size-42) 1fr auto;

        h3 {
            grid-column: 1 / 4;
        }

        .hint-container {
            grid-column: 1 / 4;
        }

        img {
            border: 0;
            grid-area: img;
            height: 2rem;
            width: 2rem;
        }

        .label {
            grid-area: description;
            margin-right: var(--space-10);
            overflow: hidden;
            white-space: nowrap;
        }

        .title,
        .description {
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .title {
            font: 500 var(--font-size-10) / 1.2 var(--sans-serif-condensed);
            text-transform: uppercase;
            color: var(--color-text-secondary);
        }

        .description {
            font: 600 var(--font-size-16) / 1.2 var(--serif);
            color: var(--color-text-primary);
        }

        .has-tooltip,
        &.has-tooltip .description {
            text-decoration: underline dotted;
            text-underline-offset: var(--space-2);
            cursor: help;
        }

        .extra {
            align-items: center;
            display: flex;
            font-size: var(--font-size-12);
            gap: var(--space-2);
            color: var(--color-text-secondary);

            > i {
                margin-left: var(--space-2);
            }

            input[type="checkbox"] {
                line-height: 1;
                --checkbox-size: var(--font-size-14);
            }
        }
    }

    .row-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-4);
        text-align: center;
    }

    .summary-row {
        align-items: stretch;

        .row-heading {
            display: block;
        }

        .hint-container {
            background: var(--table-row-color-even);
            padding: var(--space-12);
            margin-right: var(--space-10);
            border: 1px solid var(--color-form-hint);
            border-radius: var(--space-3);

            h3 {
                font-variant: small-caps;
                font-size: var(--font-size-20);
                font-family: var(--sans-serif-condensed);
                font-weight: 500;
                border-bottom: 1px solid var(--color-border);
            }

            p {
                font-style: italic;
                font-size: var(--font-size-12);
                font-family: var(--font-primary);
                font-weight: 500;
                margin-bottom: var(--space-3);
                color: var(--color-text-secondary);
            }

            label {
                display: flex;
                align-items: center;
                gap: var(--space-4);
                margin-top: var(--space-10);
                white-space: nowrap;
            }

            input[type="checkbox"] {
                --checkbox-background-color: var(--table-row-color-highlight);
            }
        }

        .attributes {
            grid-template-rows: auto min-content;
            grid-row-gap: var(--space-10);
        }

        .row-column {
            padding-top: var(--space-10);
        }

        .value {
            font: 700 var(--font-size-24) var(--serif);
            height: var(--font-size-40);
            color: var(--color-text-primary);
        }

        input[type="number"] {
            font: 500 var(--font-size-24) var(--serif);
            border: 0;
            border-bottom: 1px solid var(--color-border);
            border-radius: 0;
            background-color: transparent;
            margin: 0 var(--space-10) var(--space-10);
            color: var(--color-text-primary);
            text-align: center;

            &::placeholder {
                opacity: 0.5;
            }
        }

        h4 {
            font-size: var(--font-size-10);
        }

        .complete {
            grid-row: 2;
            grid-column: 1 / 7;
            margin-left: auto;
            padding: var(--space-17) var(--space-15);
        }
    }

    hr {
        position: relative;
        margin: var(--space-8) 0;
        z-index: -1;
    }
</style>
