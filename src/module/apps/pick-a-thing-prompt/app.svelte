<script lang="ts">
    import SvelectePf2e from "@module/sheet/components/svelecte-pf2e.svelte";
    import type { PickableThing, PickAThingRenderContext } from "./app.ts";
    import { UUIDUtils } from "@util/uuid.ts";
    import { ItemPF2e } from "@item";
    import type { DropCanvasItemData } from "@module/canvas/drop-canvas-data.ts";
    import { sluggify } from "@util/misc.ts";

    const { state: data, updateSelection, resolve, testAllowedDrop }: PickAThingRenderContext = $props();
    const { containsItems, selectMenu, allowNoSelection, includeDropZone } = $derived(data);
    let droppedOption: PickableThing | null = $state(null);

    // Select specific options, unused for buttons
    let selectedIndex: string | number | null = $state(null);
    const selectedChoice = $derived(
        selectedIndex === null ? null : selectedIndex === "bonus" ? droppedOption : data.choices[Number(selectedIndex)],
    );

    // The select cannot handle complex value objects, so we use index or bonus instead
    const selectChoices = $derived.by(() => {
        if (!selectMenu) return [];
        type SelectOption = { value: number | "bonus"; label: string };
        const options = data.choices.map((c, index): SelectOption => ({ value: index, label: c.label }));
        if (droppedOption) options.push({ value: "bonus", label: droppedOption.label });
        return options;
    });

    // Reflect selection to main window in case its closed early
    $effect(() => updateSelection(selectedChoice));

    async function viewItem(selection: unknown) {
        if (!UUIDUtils.isItemUUID(selection)) return;
        const item = await fromUuid(selection);
        item?.sheet.render(true);
    }

    async function handleDrop(event: DragEvent) {
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData: DropCanvasItemData | undefined = JSON.parse(dataString ?? "");
        if (dropData?.type !== "Item") {
            ui.notifications.error("Only an item can be dropped here.");
            return;
        }
        const droppedItem = await ItemPF2e.fromDropData(dropData);
        if (!droppedItem || !testAllowedDrop(droppedItem)) return;

        // Drop accepted: Add to button list or select menu
        const slugsAsValues =
            containsItems && data.choices.length > 0 && data.choices.every((c) => !UUIDUtils.isItemUUID(c.value));

        droppedOption = {
            value: slugsAsValues ? (droppedItem.slug ?? sluggify(droppedItem.id)) : droppedItem.uuid,
            label: droppedItem.name,
        };
    }
</script>

<div class="standard-form" ondrop={includeDropZone ? handleDrop : null} role="form">
    <header>{data.prompt}</header>
    <section class="contents">
        {#if selectMenu}
            <div class="choice choice-select">
                <SvelectePf2e options={selectChoices} labelField="label" bind:value={selectedIndex} />
                {#if containsItems}
                    <button
                        type="button"
                        class="item-info icon fa-solid fa-info-circle"
                        disabled={!selectedIndex}
                        data-tooltip
                        aria-label={game.i18n.localize(
                            `PF2E.UI.RuleElements.ChoiceSet.ViewItem.${selectedIndex ? "Tooltip" : "Disabled"}`,
                        )}
                        onclick={() => viewItem(selectedChoice?.value)}
                    ></button>
                {/if}
            </div>
        {:else}
            <section class="choice-buttons">
                {#each data.choices as choice}
                    {@render choiceButton(choice)}
                {/each}
                {#if droppedOption}
                    {@render choiceButton(droppedOption)}
                {/if}
            </section>
        {/if}
        {#if includeDropZone && !droppedOption}
            <div class="drop-zone with-image">
                <i
                    class="fa-solid fa-fw fa-info-circle"
                    inert
                    data-tooltip
                    aria-label={game.i18n.localize("PF2E.UI.RuleElements.ChoiceSet.DragHomebrewItem")}
                ></i>
                <span>{game.i18n.localize("PF2E.UI.RuleElements.ChoiceSet.HomebrewItem")}</span>
            </div>
        {/if}
    </section>

    {#if selectMenu}
        <button type="button" onclick={() => resolve(selectedChoice)}>
            {game.i18n.localize("PF2E.UI.RuleElements.ChoiceSet.SaveLabel")}
        </button>
    {:else if allowNoSelection}
        <button type="button" data-action="close">
            <span>{game.i18n.localize("PF2E.UI.RuleElements.ChoiceSet.Decline")}</span>
        </button>
    {/if}
</div>

{#snippet choiceButton(choice: PickableThing)}
    {@const value = choice.value}
    <div class="choice">
        <button class="select-button" type="button" onclick={() => resolve(choice)}>
            {#if choice.img}<img src={choice.img} alt="" />{/if}
            <span>{choice.label}</span>
        </button>
        {#if UUIDUtils.isItemUUID(value)}
            <button
                type="button"
                class="item-info icon fa-solid fa-info-circle"
                data-tooltip
                aria-label={game.i18n.localize("PF2E.UI.RuleElements.ChoiceSet.ViewItem.Tooltip")}
                onclick={() => viewItem(value)}
            ></button>
        {/if}
    </div>
{/snippet}

<style>
    .standard-form {
        --border-color: var(--sub);

        header {
            border-bottom: 1px solid var(--color-tabs-border);
            text-align: center;
            font-size: var(--font-size-18);
        }

        .choice-select {
            min-width: 16rem;
        }

        .contents {
            display: flex;
            flex-direction: column;
            gap: var(--space-8);
        }

        .choice {
            align-items: center;
            display: flex;
            gap: var(--space-8);
            width: 100%;
        }

        .choice-buttons {
            align-items: center;
            display: flex;
            flex-direction: column;
            gap: var(--space-8);

            .select-button {
                display: flex;
                justify-content: flex-start;
                width: 100%;
                img {
                    border: 1px solid #444;
                    height: 1.6em;
                    margin-right: 0.5em;
                }
            }
        }

        .item-info {
            --button-size: var(--font-size-24);
            border: 1px solid var(--border-color);
            min-width: 120px;
            justify-content: center;
            width: var(--font-size-24);
            min-width: unset;
        }

        .drop-zone {
            align-items: center;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            color: var(--color-text-secondary);
            cursor: default;
            display: flex;
            line-height: 1.75rem;
            padding: var(--space-1) var(--space-6);

            i {
                align-items: center;
                border: 1px solid var(--border-color);
                border-radius: 2px;
                display: flex;
                height: 1.6em;
                justify-content: center;
                margin-right: 0.5em;
                width: 1.6em;

                &:after {
                    font-size: var(--font-size-20);
                }
            }

            span {
                flex: 1;
            }
        }
    }
</style>
