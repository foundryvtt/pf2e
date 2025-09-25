<script lang="ts">
    import { CANTRIP_DECK_UUID } from "@item/consumable/spell-consumables.ts";
    import { localizer, objectHasKey, ordinalString } from "@util";
    import { UUIDUtils } from "@util/uuid.ts";
    import * as R from "remeda";
    import type { CreateSpellConsumableContext } from "./app.ts";
    const localize = localizer("PF2E.SpellcastingItemCreator");

    const { foundryApp, state: data }: CreateSpellConsumableContext = $props();
    const { name, isCantrip, minimumRank, initialMystified } = $derived(data);
    let type = $state();
    let rank = $state();

    const itemTypeData = $derived(
        objectHasKey(CONFIG.PF2E.spellcastingItems, type) ? CONFIG.PF2E.spellcastingItems[type] : null,
    );
    const itemTypeOptions = $derived(
        isCantrip
            ? { cantripDeck5: localize("CantripDeck5") }
            : R.mapValues(CONFIG.PF2E.spellcastingItems, (c) => game.i18n.localize(c.name)),
    );
    const compendiumUuids: Record<number, string | null> | null = $derived(itemTypeData?.compendiumUuids ?? null);
    const ranks = $derived(
        Object.keys(compendiumUuids ?? {})
            .map((k) => Number(k))
            .filter((r) => r >= minimumRank && !!compendiumUuids?.[r]),
    );
    const noValidRanks = $derived(!isCantrip && ranks.length === 0);
    const resolvedItem = $derived(type === "cantripDeck5" ? CANTRIP_DECK_UUID : compendiumUuids?.[Number(rank)]);

    async function viewItem(selection: unknown) {
        if (!UUIDUtils.isItemUUID(selection)) return;
        const item = await fromUuid(selection);
        item?.sheet.render(true);
    }
</script>

<header>{localize("Label", { name })}</header>
<div class="form-group">
    <label for={`${foundryApp.id}.itemType`}>{localize("ItemType")}</label>
    <div class="form-fields">
        <select id={`${foundryApp.id}.itemType`} name="type" data-dtype="String" bind:value={type}>
            {#each Object.entries(itemTypeOptions) as [value, option]}
                <option {value}>{option}</option>
            {/each}
        </select>
        <button
            type="button"
            class="item-info icon fa-solid fa-info-circle"
            disabled={!resolvedItem}
            data-tooltip
            aria-label={game.i18n.localize(localize(resolvedItem ? "ViewItem" : "NoValidRanks"))}
            onclick={() => viewItem(resolvedItem)}
        ></button>
    </div>
</div>
{#if type !== "cantripDeck5"}
    <div class="form-group">
        <label for={`${foundryApp.id}.rank`}>{game.i18n.localize("PF2E.Item.Spell.Rank.Label")}</label>
        <div class="form-fields">
            {#if noValidRanks}
                {localize("NoValidRanks")}
            {:else}
                <select id={`${foundryApp.id}.rank`} name="rank" data-dtype="Number" bind:value={rank}>
                    {#each ranks as rank}
                        <option value={rank}>{ordinalString(rank)}</option>
                    {/each}
                </select>
            {/if}
        </div>
    </div>
{/if}
<div class="form-group">
    <label for={`${foundryApp.id}.mystified`}>{game.i18n.localize("PF2E.identification.Mystify")}</label>
    <input id={`${foundryApp.id}.mystified`} type="checkbox" name="mystified" checked={initialMystified} />
</div>
<button type="submit" disabled={noValidRanks}>
    <i class="fa-regular fa-floppy-disk"></i>
    {game.i18n.localize("PF2E.CreateItemTitle")}
</button>

<style lang="scss">
    .item-info {
        --button-size: var(--font-size-24);
        border: 1px solid var(--sub);
        min-width: 120px;
        justify-content: center;
        width: var(--font-size-24);
        min-width: unset;
    }
</style>
