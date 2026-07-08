<script lang="ts">
    import type { TraitChatData } from "@item/base/data/index.ts";
    import type { Rarity } from "@module/data.ts";

    interface ItemTraitsProps {
        rarity?: Rarity | null;
        traits?: TraitChatData[];
        properties?: string[];
    }

    const { rarity, traits = [], properties = [] }: ItemTraitsProps = $props();
</script>

<div class="tags paizo-style">
    {#if rarity && rarity !== "common"}
        <span class={`tag rarity ${rarity}`}>{_loc(CONFIG.PF2E.rarityTraits[rarity])}</span>
    {/if}
    {#each traits.filter((t) => !t.mystified) as trait (trait.value)}
        <span class="tag" data-trait={trait.value}>{trait.label}</span>
    {/each}
    {#each properties as property (property)}
        <span class="tag light property">{_loc(property)}</span>
    {/each}
</div>
