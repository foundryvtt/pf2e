<script lang="ts">
    import Svelecte from "svelecte";
    import type { Snippet } from "svelte";
    import type { Action } from "svelte/action";
    import type { TraitData } from "../../../tabs/data.ts";

    type TraitOption = TraitData["options"][number];

    interface TraitsProps {
        closeAfterSelect?: boolean;
        clearable?: boolean;
        creatable?: boolean;
        multiple?: boolean;
        options: TraitOption[];
        placeholder?: string;
        selection?: Snippet<[TraitOption[], Action<HTMLElement, TraitOption>]>;
        value?: string[];

        onChange?: (selection: TraitOption[]) => void;
    }

    interface SvelecteI18n {
        empty: string;
        nomatch: string;
        max: (max: number) => string;
        fetchBefore: string;
        fetchQuery: (minQuery: number, inputLength: number) => string;
        fetchInit: string;
        fetchEmpty: string;
        collapsedSelection: (count: number) => string;
        createRowLabel: (value: string) => string;
        aria_selected: (opts: string[]) => string;
        aria_listActive: (opt: TraitOption, labelField: string, resultCount: number) => string;
        aria_inputFocused: () => string;
        aria_label: string;
        aria_describedby: string;
    }

    const props: TraitsProps = $props();
    const i18n: Partial<SvelecteI18n> = {
        empty: game.i18n.localize("PF2E.CompendiumBrowser.TraitsComponent.Empty"),
        nomatch: game.i18n.localize("PF2E.CompendiumBrowser.TraitsComponent.NoMatch"),
    };
</script>

<div class="traits-select">
    <Svelecte {...props} {i18n} />
</div>

<style lang="scss">
    .traits-select {
        display: flex;
        margin-bottom: 0.25em;
    }

    :global {
        #compendium-browser {
            --sv-color: var(--color-dark-1);
            --sv-item-btn-color: var(--color-text-trait);
            --sv-item-btn-color-hover: var(--color-text-trait);
            --sv-control-bg: rgba(0, 0, 0, 0.1);
            --sv-icon-color: var(--color-dark-6);
            --sv-item-selected-bg: var(--color-bg-trait);
            --sv-item-btn-bg: var(--color-bg-trait);

            --sv-selection-multi-wrap-padding: 0.15em;
            --sv-selection-gap: 0.2em;

            .sv-input--text {
                width: auto;
                height: unset;
                line-height: unset;
                padding: 0 0.25em;
                background: none;
                border: none;
                border-radius: unset;
                outline: unset;
                color: var(--input-text-color);
                user-select: unset;
                font-size: unset;
                transition: unset;

                &:focus {
                    box-shadow: none;
                    outline: unset;
                }
            }

            .sv-control {
                cursor: text;

                .sv-buttons {
                    .sv-btn-separator {
                        display: none;
                    }
                    button[data-action="toggle"] {
                        display: none;
                    }
                }
            }

            .sv-item--container {
                border: solid var(--color-border-trait);
                border-width: 1px 3px;
            }

            .sv-item--wrap.in-selection {
                color: var(--color-text-trait);
                font: 500 var(--font-size-10) var(--sans-serif);
                text-transform: uppercase;
                line-height: 1.75em;

                .sv-item--content {
                    margin: 0 0.25em;
                }
            }

            .sv-item--btn {
                display: inline-flex;
                width: auto;
                border-width: 0;
                background-color: var(--sv-item-btn-bg);
                border-radius: unset;
                padding: 0 var(--space-1);

                &:hover {
                    background-color: #c77777;
                    i {
                        color: var(--sv-item-btn-color-hover);
                    }
                }
            }
        }

        .theme-dark #compendium-browser {
            --sv-color: var(--color-light-3);
            --sv-control-bg: var(--color-cool-4);
            --sv-icon-color: var(--color-light-3);
            --sv-dropdown-bg: var(--color-dark-2);
            --sv-dropdown-active-bg: #553d3d;
        }
    }
</style>
