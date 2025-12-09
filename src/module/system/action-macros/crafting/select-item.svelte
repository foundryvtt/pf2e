<script lang="ts">
    import type { DropCanvasItemData } from "@module/canvas/drop-canvas-data.ts";
    import { ItemPF2e, type PhysicalItemPF2e } from "@item";
    import type { SelectItemRenderContext } from "./select-item.ts";
    import { sluggify } from "@util";

    const { state: data, resolve }: SelectItemRenderContext = $props();

    let selection: PhysicalItemPF2e | null = $state(null);

    const actionKey = $derived(sluggify(data.action, { camel: "bactrian" }));

    const placeholderIcon = $derived(
        data.action === "craft"
            ? "systems/pf2e/icons/actions/craft/unknown-item.webp"
            : "systems/pf2e/icons/actions/repair/unknown-item.webp",
    );

    async function handleDrop(event: DragEvent) {
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData: DropCanvasItemData | undefined = JSON.parse(dataString ?? "");
        const droppedItem = dropData?.type === "Item" ? await ItemPF2e.fromDropData(dropData) : null;

        if (!(droppedItem instanceof ItemPF2e)) {
            ui.notifications.error(game.i18n.localize(`PF2E.Actions.${actionKey}.Error.ItemReferenceMismatch`));
            return;
        }

        if (!droppedItem.isOfType("physical")) {
            const itemName = droppedItem.name ?? "";
            ui.notifications.warn(
                game.i18n.format(`PF2E.Actions.${actionKey}.Warning.NotPhysicalItem`, { item: itemName }),
            );
            return;
        }

        if (data.action === "repair" && !(droppedItem.isEmbedded && droppedItem.isOwner)) {
            ui.notifications.error(game.i18n.localize("DOCUMENT.UsePermissionWarn"));
            return;
        }

        selection = droppedItem;
    }
</script>

<article ondrop={handleDrop}>
    <section class="drop-item-zone">
        {#if selection}
            <img src={selection.img} class="item-icon" alt={selection.name} />
            <span>{selection.name}</span>
        {:else}
            <img src={placeholderIcon} class="item-icon" alt="" />
            <span>{game.i18n.localize(`PF2E.Actions.${actionKey}.SelectItemDialog.DropItemZoneLabel`)}</span>
        {/if}
    </section>
    <section class="button-panel">
        <button type="button" onclick={() => resolve(selection)} disabled={!selection}>
            <i class="fa-solid fa-fw fa-hammer"></i>
            {game.i18n.localize(`PF2E.Actions.${actionKey}.SelectItemDialog.${actionKey}ButtonLabel`)}
        </button>
        <button type="button" onclick={() => resolve(null)}>
            <i class="fa-solid fa-fw fa-times"></i>
            {game.i18n.localize(`PF2E.Actions.${actionKey}.SelectItemDialog.CancelButtonLabel`)}
        </button>
    </section>
</article>

<style lang="scss">
    article {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
    }

    .drop-item-zone {
        display: flex;
        align-items: center;
        gap: var(--space-8);
        margin: 0 2px 5px;
        min-height: 32px;
    }

    .item-icon {
        height: 32px;
        width: 32px;
    }

    .button-panel {
        display: flex;
        gap: var(--space-4);

        button {
            flex: 1;
        }
    }
</style>
