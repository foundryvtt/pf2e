<script lang="ts">
    import Svelecte from "svelecte";
    import type { SvelecteI18n, TraitsProps } from "./types.ts";

    const props: TraitsProps = $props();
    const i18n: Partial<SvelecteI18n> = {
        empty: game.i18n.localize("PF2E.CompendiumBrowser.TraitsComponent.Empty"),
        nomatch: game.i18n.localize("PF2E.CompendiumBrowser.TraitsComponent.NoMatch"),
    };
</script>

<div class="pf2e-traits">
    <Svelecte class="pf2e-traits" {...props} {i18n} />
</div>

<style lang="scss">
    .pf2e-traits {
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
                padding: 0 0.1em;

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
