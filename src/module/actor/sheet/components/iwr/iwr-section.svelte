<script lang="ts">
    import InlineIconButton from "@module/sheet/components/inline-icon-button.svelte";
    import { SMALL_CONTROL_SIZE } from "@module/sheet/components/row-controls.ts";
    import SheetSection from "../layout/sheet-section.svelte";
    import type { IWRCategory } from "../../v2/base.svelte.ts";

    interface IWRListData {
        category: IWRCategory;
        label: string;
        /** Display labels, already sorted */
        entries: string[];
    }

    interface IWRSectionProps {
        lists: IWRListData[];
        /** Renders edit buttons (base `openIWREditor` action) */
        editable: boolean;
    }

    const { lists, editable }: IWRSectionProps = $props();
</script>

{#each lists as list (list.category)}
    <SheetSection label={_loc(list.label)} class="iwr">
        {#snippet controls()}
            {#if editable}
                <InlineIconButton
                    icon="fa-solid fa-pen-to-square"
                    aria-label="{_loc('PF2E.Edit')}: {_loc(list.label)}"
                    data-tooltip="PF2E.Edit"
                    data-action="openIWREditor"
                    data-category={list.category}
                    class="edit"
                    style="--pf2e-inline-button-size: {SMALL_CONTROL_SIZE}"
                />
            {/if}
        {/snippet}
        {#if list.entries.length > 0}
            <ul class="tags">
                <!-- Keyed by position: two entries can share a label -->
                {#each list.entries as entry, index (index)}
                    <li class="tag">{entry}</li>
                {/each}
            </ul>
        {/if}
    </SheetSection>
{/each}

<style>
    :global(.sheet-section.iwr .inline-control.edit) {
        font-size: var(--font-size-12);
    }

    ul.tags {
        margin: 0;
        margin-block-start: var(--space-2);
    }

    /* Core gives every li but the last a bottom margin, which offsets the last centered tag */
    li.tag {
        margin: 0;
    }
</style>
