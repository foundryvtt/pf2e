<script lang="ts">
    import SheetLayout from "@actor/sheet/components/layout/sheet-layout.svelte";
    import type { SvelteAppProps } from "@module/sheet/mixin.svelte.ts";
    import Header from "./header.svelte";
    import type { VehicleSheetContext } from "./sheet.ts";
    import Sidebar from "./sidebar.svelte";
    import Description from "./tabs/description.svelte";
    import Details from "./tabs/details.svelte";

    const { foundryApp, getState }: SvelteAppProps<VehicleSheetContext> = $props();
    const data = $derived(getState());
    const activeTab = $derived(data.activeTab);
</script>

<SheetLayout
    idPrefix={foundryApp.id}
    tabs={{ list: data.tabs, active: activeTab, onSelect: (id) => foundryApp.changeTab(id, "primary") }}
>
    {#snippet sidebar()}
        <Sidebar sheet={foundryApp} {data} />
    {/snippet}
    {#snippet header()}
        <Header sheet={foundryApp} {data} />
    {/snippet}
    {#if activeTab === "details"}
        <Details sheet={foundryApp} {data} />
    {:else if activeTab === "description"}
        <Description sheet={foundryApp} {data} />
    {/if}
</SheetLayout>

<style>
    /* The narrowest the sheet can lay out. Core clamps resizing to it. Not while minimized. */
    :global(.application.sheet.actor.vehicle:not(.minimized, .minimizing, .maximizing)) {
        min-width: 40rem;
    }
</style>
