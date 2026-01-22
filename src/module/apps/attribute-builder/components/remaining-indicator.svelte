<script lang="ts">
    interface Props {
        count: number;
    }

    const { count }: Props = $props();
</script>

{#if count}
    <div class="remaining extra" aria-live="polite" aria-atomic="true">
        <span class="sr-only">
            {game.i18n.format("PF2E.Actor.Character.AttributeBuilder.Aria.Remaining", { count })}
        </span>
        <span aria-hidden="true">{count}</span>
    </div>
{/if}

<style lang="scss">
    .remaining {
        grid-area: remaining;
        display: flex;
        margin-right: var(--space-10);
        width: var(--font-size-20);
        height: var(--font-size-20);
        border-radius: 50%;
        background: var(--table-header-bg-color);
        align-items: center;
        justify-content: center;

        &.extra {
            animation: glow 0.75s infinite alternate;
        }
    }

    @keyframes glow {
        from {
            box-shadow: 0 0 var(--space-1) var(--space-1) var(--color-shadow-highlight);
        }
        to {
            box-shadow: 0 0 var(--space-3) var(--space-3) var(--color-shadow-highlight);
        }
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
</style>
