<script lang="ts">
    import { tupleHasValue } from "@util";
    import BrowserTab from "./browser-tab.svelte";
    import { compendiumBrowserContext as context } from "../browser.svelte.ts";

    const browser = game.pf2e.compendiumBrowser;
    const tabs = $derived(browser.tabsArray.filter((t) => t.visible));

    async function onClickNav(event: MouseEvent & { currentTarget: EventTarget }): Promise<void> {
        if (!(event.target instanceof HTMLElement)) return;
        const clickedTab = event.target.dataset.tabName;
        if (tupleHasValue(browser.dataTabsList, clickedTab)) {
            browser.activeTab = browser.tabs[clickedTab];
            await browser.activeTab.init();
            context.activeFilter = browser.activeTab.filterData;
            context.activeTabName = clickedTab;
        }
    }
</script>

{#if tabs.length > 1}
    <nav class="tabs">
        {#each tabs as tab}
            <button
                type="button"
                onclick={onClickNav}
                class:active={context.activeTabName === tab.tabName}
                data-tab-name={tab.tabName}
            >
                {tab.label}
            </button>
        {/each}
    </nav>
{/if}
{#if !context.activeTabName}
    <div class="browser-tab" data-tooltip-class="pf2e">
        <div class="landing-page">{game.i18n.localize("PF2E.CompendiumBrowser.Hint")}</div>
    </div>
{:else}
    {#key context.activeTabName}
        <BrowserTab activeTabName={context.activeTabName} />
    {/key}
{/if}

<style lang="scss">
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
