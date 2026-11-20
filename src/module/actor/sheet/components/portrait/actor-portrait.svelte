<script lang="ts">
    import InlineIconButton from "@module/sheet/components/inline-icon-button.svelte";

    interface ActorPortraitProps {
        img: string;
        name: string;
        /** The portrait becomes a button that picks a new image (base `editImage` action) */
        editable: boolean;
    }

    const { img, name, editable }: ActorPortraitProps = $props();
</script>

<div class="actor-portrait">
    {#if editable}
        <button
            type="button"
            class="flat edit"
            aria-label={_loc("PF2E.Actor.EditImage")}
            data-tooltip="PF2E.Actor.EditImage"
            data-action="editImage"
        >
            <img src={img} alt="" />
        </button>
    {:else}
        <img src={img} alt={name} />
    {/if}
    <InlineIconButton
        icon="fa-solid fa-image"
        class="show"
        aria-label={_loc("SIDEBAR.CharArt")}
        data-tooltip="SIDEBAR.CharArt"
        data-action="showPortraitArtwork"
    />
</div>

<style>
    .actor-portrait {
        position: relative;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        overflow: hidden;

        img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            border: none;
        }

        button.edit {
            display: block;
            width: 100%;
            height: 100%;
            padding: 0;

            /* Inset, since the rounded frame clips anything drawn outside the button */
            &:focus-visible {
                outline: 2px solid var(--button-focus-outline-color);
                outline-offset: -2px;
                box-shadow: none;
            }
        }

        :global(.show) {
            position: absolute;
            inset-block-start: var(--space-4);
            inset-inline-end: var(--space-4);
            opacity: 0;
            background: var(--color-cool-5, rgb(0 0 0 / 0.6));
            color: var(--color-light-1);
            border-radius: 4px;
        }

        &:hover :global(.show),
        :global(.show:focus-visible) {
            opacity: 1;
        }
    }
</style>
