<script lang="ts">
    import { tupleHasValue } from "@util";
    import BrowserTab from "./browser-tab.svelte";
    import type { MouseEventHandler } from "svelte/elements";
    import type { CompendiumBrowserContext } from "../browser.svelte.ts";

    const { foundryApp: browser }: CompendiumBrowserContext = $props();
    const tabs = $derived(browser.tabsArray.filter((t) => t.visible));
    const panelId = $derived(`${browser.id}-panel`);
    const tabId = (tabName: string): string => `${browser.id}-tab-${tabName}`;

    async function onClickNav(event: PointerEvent & { currentTarget: EventTarget }): Promise<void> {
        if (!(event.target instanceof HTMLElement)) return;
        const clickedTab = event.target.dataset.tabName;
        if (tupleHasValue(browser.dataTabsList, clickedTab)) {
            browser.activeTab = browser.tabs[clickedTab];
            await browser.activeTab.init();
            browser.activeTabName = clickedTab;
        }
    }
</script>

{#if tabs.length > 1}
    <!-- ARIA in HTML allows tablist on nav, as core's sidebar does -->
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <nav class="tabs" role="tablist">
        {#each tabs as tab (tab.tabName)}
            <button
                type="button"
                role="tab"
                id={tabId(tab.tabName)}
                aria-selected={browser.activeTabName === tab.tabName}
                aria-controls={panelId}
                onclick={onClickNav as MouseEventHandler<EventTarget>}
                class:active={browser.activeTabName === tab.tabName}
                data-tab-name={tab.tabName}
            >
                {tab.label}
            </button>
        {/each}
    </nav>
{/if}
{#if !browser.activeTabName}
    <div class="browser-tab" id={panelId} data-tooltip-class="pf2e">
        <div class="landing-page">{_loc("PF2E.CompendiumBrowser.Hint")}</div>
    </div>
{:else}
    <BrowserTab foundryApp={browser} {panelId} labelledBy={tabs.length > 1 ? tabId(browser.activeTabName) : null} />
{/if}

<style lang="scss">
    :global {
        .compendium-browser {
            --input-text-color: var(--color-dark-2);

            .window-content {
                padding: 0.5em;
            }
        }

        .theme-dark .compendium-browser {
            --secondary: var(--color-cool-5);
            --color-select-option-bg: var(--color-cool-5);
            --input-text-color: var(--color-light-3);
        }
    }

    nav {
        flex: 0;
        width: 100%;
        border-style: solid;
        border-width: 9px;
        border-image: url("/assets/sheet/corner-box.webp") 9 repeat;
        background:
            url("/assets/sheet/border-pattern.webp") repeat-x top,
            url("/assets/sheet/border-pattern.webp") repeat-x bottom,
            var(--secondary);

        button {
            border: none;
            color: var(--sidebar-label);
            background: var(--secondary);
            line-height: unset;
            font-family: var(--sans-serif);
            font-size: var(--font-size-12);
            position: relative;
            cursor: pointer;
            max-width: fit-content;
            padding: 0.2em 1.5em 0.2em 1.5em;

            &.active {
                outline: unset;
                box-shadow: unset;

                &::after {
                    bottom: -0.25em;
                    position: absolute;
                    content: "";
                    width: 0;
                    height: 0;
                    border-left: 0.25em solid transparent;
                    border-right: 0.25em solid transparent;
                    border-top: 0.25em solid var(--sidebar-label);
                }
            }

            &:focus {
                outline: unset;
                box-shadow: unset;
            }

            &:focus-visible {
                outline: 2px solid var(--button-focus-outline-color);
                outline-offset: -2px;
            }

            &:hover {
                background: unset;
                box-shadow: unset;
            }
        }
    }

    .landing-page {
        width: 100%;
        justify-content: center;
        text-align: center;
        padding: 2em;
        grid-column: span 2;
    }
</style>
