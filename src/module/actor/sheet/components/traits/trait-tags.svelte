<script lang="ts">
    import InlineIconButton from "@module/sheet/components/inline-icon-button.svelte";

    interface TraitTagData {
        value: string;
        label: string;
        description?: string | null;
    }

    interface TraitTagsProps {
        /** Labels are localized */
        traits: TraitTagData[];
        /** Localized name of what's edited, completing the edit button's label */
        subject: string;
        /** The sheet's click action that opens the trait selector (renders an edit button when provided) */
        editAction?: string;
    }

    const { traits, subject, editAction }: TraitTagsProps = $props();
</script>

<div class="trait-tags">
    <ul class="tags">
        {#each traits as trait (trait.value)}
            <li class="tag" data-tooltip={trait.description || null}>{trait.label}</li>
        {/each}
    </ul>
    {#if editAction}
        <InlineIconButton
            icon="fa-solid fa-pen-to-square"
            aria-label="{_loc('PF2E.Edit')}: {subject}"
            data-tooltip="PF2E.Edit"
            data-action={editAction}
        />
    {/if}
</div>

<style>
    .trait-tags {
        display: flex;
        align-items: center;
        gap: var(--space-4);
    }

    ul.tags {
        margin: 0;
    }

    /* Core gives every li but the last a bottom margin, which offsets the last centered tag */
    li.tag {
        margin: 0;
    }
</style>
