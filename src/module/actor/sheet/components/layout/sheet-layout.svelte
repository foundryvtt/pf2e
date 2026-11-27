<script lang="ts">
    import type { Snippet } from "svelte";
    import type { SheetTabData } from "../../v2/base.svelte.ts";
    import TabGroup from "../tabs/tab-group.svelte";

    interface SheetLayoutProps {
        /** Prefix for element ids, unique per window */
        idPrefix: string;
        /** Primary tabs. Without them the content scrolls on its own. */
        tabs?: { list: SheetTabData[]; active: string; onSelect: (id: string) => void; controls?: Snippet };
        /** Omitted for sheets without a sidebar */
        sidebar?: Snippet;
        header: Snippet;
        /** "top" spans the header above the sidebar, "main" keeps it beside the sidebar */
        headerPlacement?: "main" | "top";
        /** The active tab's content, or the whole body without tabs */
        children: Snippet;
        /** CSS length */
        sidebarWidth?: string;
    }

    const {
        idPrefix,
        tabs,
        sidebar,
        header,
        headerPlacement = "main",
        children,
        sidebarWidth = "13rem",
    }: SheetLayoutProps = $props();
</script>

<div
    class="sheet-layout"
    class:with-sidebar={!!sidebar}
    class:header-top={headerPlacement === "top"}
    style:--sidebar-width={sidebarWidth}
    data-tooltip-class="pf2e"
>
    {#if headerPlacement === "top"}
        <div class="header">{@render header()}</div>
    {/if}
    {#if sidebar}
        <aside>
            {@render sidebar()}
        </aside>
    {/if}
    <div class="main">
        {#if headerPlacement === "main"}
            {@render header()}
        {/if}
        {#if tabs}
            <TabGroup
                tabs={tabs.list}
                active={tabs.active}
                onSelect={tabs.onSelect}
                controls={tabs.controls}
                idPrefix="{idPrefix}-primary"
                label={_loc("PF2E.SheetTabsLabel")}
            >
                {@render children()}
            </TabGroup>
        {:else}
            <div class="content">{@render children()}</div>
        {/if}
    </div>
</div>

<style>
    .sheet-layout {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        height: 100%;
        min-height: 0;

        &.with-sidebar {
            grid-template-columns: var(--sidebar-width) 1fr;
        }

        &.header-top {
            grid-template-rows: auto 1fr;

            > .header {
                grid-column: 1 / -1;
            }
        }
    }

    aside {
        display: flex;
        flex-direction: column;
        gap: var(--spacer-10);
        min-height: 0;
        border-inline-end: 1px solid var(--color-border);
        /* Outer edges come from core's window-content padding. The start side reaches 4px into it so focus
           rings at the edge aren't clipped by the scroll box. */
        margin-inline-start: calc(-1 * var(--spacer-4));
        padding-inline: var(--spacer-4) var(--spacer-8);
        overflow-y: auto;

        /* The label sits just above the divider whether or not a taller button shares the header */
        :global(.sheet-section > header) {
            align-items: end;
            padding-block-end: var(--spacer-2);
        }

        /* Section headings in the narrow sidebar are small uppercase labels, not the main area's serif headings */
        :global(.sheet-section > header > h2) {
            font-family: var(--font-body);
            font-size: var(--font-size-11);
            font-weight: 700;
            text-transform: uppercase;
        }
    }

    .main {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
    }

    aside + .main {
        margin-inline-start: var(--spacer-8);
    }

    .content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow-y: auto;
    }
</style>
