<script lang="ts">
    import { DamageDicePF2e, Modifier } from "@actor/modifiers.ts";
    import type { RollInspectorContext } from "./app.ts";
    import * as R from "remeda";
    import { createHTMLElement, signedInteger } from "@util";
    import { getDamageDiceOverrideLabel, getDamageDiceValueLabel } from "@system/damage/helpers.ts";

    const localize = game.i18n.localize.bind(game.i18n);
    const { state: data }: RollInspectorContext = $props();
    let searchTerm = $state("");

    const context = $derived(data.context);
    const modifiers = $derived(data.modifiers);
    const dice = $derived(data.dice);

    const results = $derived({
        rollOptions: data.rollOptions.filter((r) => r.includes(searchTerm)),
        contextualOptions: data.contextualOptions
            .map((c) => ({
                header: c.header,
                options: c.options.filter((o) => o.includes(searchTerm)),
            }))
            .filter((c) => c.options.length > 0),
    });

    function getCriticalLabel(critical: boolean | null | undefined) {
        return typeof critical === "boolean"
            ? game.i18n.localize(`PF2E.RuleEditor.General.CriticalBehavior.${critical}`)
            : null;
    }

    /** Shows the roll options for a specific modifier */
    async function showOptionsTooltip(element: HTMLElement, object: Modifier | DamageDicePF2e) {
        const rollOptions = R.sortBy(object.getRollOptions().sort(), (o) => o.includes(":"));
        const content = await fa.handlebars.renderTemplate("systems/pf2e/templates/system/roll-options-tooltip.hbs", {
            description: game.i18n.localize("PF2E.ChatRollDetails.DiceRollOptionsHint"),
            rollOptions,
        });
        game.tooltip.dismissLockedTooltips();
        game.tooltip.activate(element, {
            html: createHTMLElement("div", { innerHTML: content }),
            locked: true,
            direction: "RIGHT",
        });
    }
</script>

<div class="content standard-form" data-tooltip-class="pf2e">
    <section class="summary">
        <div class="type">
            <span>{localize("PF2E.Roll.Type")}:</span>
            <span class="value">{context.type}</span>
        </div>
        {#if data.domains}
            <div class="tags domains">
                {#each data.domains as domain}<span class="tag tag_alt">{domain}</span>{/each}
            </div>
        {/if}
    </section>

    <section class="roll-options">
        <header>{localize("PF2E.ChatRollDetails.RollOptions")}</header>
        <input
            type="search"
            class="filter"
            bind:value={searchTerm}
            placeholder={localize("PF2E.CompendiumBrowser.Filter.SearchPlaceholder")}
        />
        <ul class="scrollable">
            {#each results.rollOptions as option}
                <li>{option}</li>
            {/each}
            {#each results.contextualOptions as list}
                <ul class="sub-list">
                    <li class="header">{list.header}</li>
                    {#each list.options as option}
                        <li>{option}</li>
                    {/each}
                </ul>
            {/each}
        </ul>
    </section>

    <section class="modifiers">
        <header>
            {#if dice}
                {localize("PF2E.ChatRollDetails.DiceAndModifiers")}
            {:else}
                {localize("PF2E.ModifiersTitle")}
            {/if}
        </header>

        <ul class="modifier-list">
            {#if context.type === "flat-check"}
                <li class="empty">
                    {localize("PF2E.ChatRollDetails.FlatCheckNoModifiers")}
                </li>
            {:else if !modifiers.length && !dice.length}
                <li class="empty">
                    {localize("None")}
                </li>
            {/if}

            {#each dice as d, idx}
                {@const value = [getDamageDiceValueLabel(d, { sign: true }), getDamageDiceOverrideLabel(d)]
                    .filter(R.isTruthy)
                    .join(" ")}
                <li class="modifier" class:disabled={!d.enabled} data-type="dice" data-idx={idx}>
                    <header>
                        <span class="label-slug">{d.label} ({d.slug})</span>
                        <i
                            class="fa-solid fa-circle-info"
                            onpointerenter={(evt) => showOptionsTooltip(evt.currentTarget, new DamageDicePF2e(d))}
                        ></i>
                    </header>
                    <div>
                        <span>
                            {value}
                            {d.damageType}
                            {#if d.category}({d.category}){/if}
                        </span>
                        <span>{getCriticalLabel(d.critical)}</span>
                    </div>
                </li>
            {/each}

            {#each modifiers as m, idx}
                <li class="modifier" class:disabled={!m.enabled} data-type="modifier" data-idx={idx}>
                    <header>
                        <span class="label-slug">{m.label} ({m.slug})</span>
                        <i
                            class="fa-solid fa-circle-info"
                            onpointerenter={(evt) => showOptionsTooltip(evt.currentTarget, new Modifier(m))}
                        ></i>
                    </header>
                    <div>
                        <span>
                            {localize(`PF2E.ModifierType.${m.type}`)}
                            {signedInteger(m.modifier)}
                            {m.damageType}
                            {#if m.damageCategory}({m.damageCategory}){/if}
                        </span>
                        <span>{getCriticalLabel(m.critical)}</span>
                    </div>
                </li>
            {/each}
        </ul>
    </section>
</div>

<style>
    ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
    }

    .content {
        display: grid;
        gap: 1rem;
        grid-template-rows: auto minmax(0, 1fr);
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        height: 100%;
    }

    .summary {
        grid-column: span 2;

        .type {
            align-items: baseline;
            display: flex;
            gap: var(--space-4);
            .value {
                color: var(--color-text-secondary);
            }
        }

        .tags.domains {
            justify-items: end;
            margin-top: var(--space-4);

            .tag {
                font-size: var(--font-size-12);
                font-weight: normal;
                text-transform: none;
                user-select: all;
            }
        }
    }

    .roll-options,
    .modifiers {
        display: flex;
        flex-direction: column;
        max-height: 100%;

        > header {
            font-size: var(--font-size-18);
            margin-bottom: var(--space-2);
        }

        > ul {
            background-color: var(--table-row-color-odd);
            border: 1px solid var(--color-border);
            border-radius: 3px;
            width: 100%;

            li:nth-child(even of :not([hidden])) {
                background-color: var(--table-row-color-even);
            }
        }
    }

    .roll-options {
        .filter {
            margin-bottom: var(--space-4);
        }

        > ul {
            white-space: nowrap;
            flex: 1;

            li {
                line-height: 1.65em;
                margin: 0;
                overflow-x: hidden;
                padding-left: var(--space-4);
                text-overflow: ellipsis;
                user-select: text;
            }

            .sub-list .header {
                border-bottom: 1px solid var(--color-underline-header);
                font-size: var(--font-size-18);
            }
        }
    }

    .modifiers {
        grid-area: "modifiers";

        ul {
            li {
                display: block;
                padding: var(--space-4);
                margin: 0;

                &.disabled {
                    border-style: dashed;
                    opacity: 0.6;
                }

                header {
                    align-items: baseline;
                    display: flex;
                    font-size: var(--font-size-16);
                    gap: var(--space-4);
                    margin-bottom: 0.25em;

                    i {
                        margin-left: auto;
                        padding-left: var(--space-4);
                    }
                }

                & > div {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                }
            }
        }
    }
</style>
