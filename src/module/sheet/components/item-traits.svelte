<script lang="ts">
    import type { TraitChatData } from "@item/base/data/index.ts";
    import type { Rarity } from "@module/data.ts";

    interface ItemTraitsProps {
        rarity?: Rarity | null;
        traits?: TraitChatData[];
        properties?: string[];
    }

    const { rarity, traits = [], properties = [] }: ItemTraitsProps = $props();
    const shownRarity = $derived(rarity && rarity !== "common" ? rarity : null);
    const shownTraits = $derived(traits.filter((t) => !t.mystified));
    // An empty tag row would still take its margins
    const empty = $derived(!shownRarity && shownTraits.length === 0 && properties.length === 0);
</script>

{#if !empty}
    <div class="tags paizo-style" class:has-properties={properties.length > 0}>
        {#if shownRarity}
            <span class={`tag rarity ${shownRarity}`} data-tooltip={CONFIG.PF2E.traitsDescriptions[shownRarity]}>
                {_loc(CONFIG.PF2E.rarityTraits[shownRarity])}
            </span>
        {/if}
        {#each shownTraits as trait (trait.value)}
            <span class="tag" data-trait={trait.value} data-tooltip={trait.description}>{trait.label}</span>
        {/each}
        {#each properties as property (property)}
            <span class="tag light property">{_loc(property)}</span>
        {/each}
    </div>
{/if}
