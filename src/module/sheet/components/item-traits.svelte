<script lang="ts">
    import type { TraitChatData } from "@item/base/data/index.ts";
    import type { Rarity } from "@module/data.ts";

    interface ItemTraitsProps {
        rarity?: Rarity | null;
        traits?: TraitChatData[];
        properties?: string[];
    }

    const { rarity, traits = [], properties = [] }: ItemTraitsProps = $props();
    const rarityLabel = rarity ? CONFIG.PF2E.rarityTraits[rarity] : null;
</script>

<div class="tags paizo-style">
    {#if rarity && rarity !== "common" && rarityLabel}
        <span class={["tag", "rarity", rarity].join(" ")}>{game.i18n.localize(rarityLabel)}</span>
    {/if}
    {#each traits.filter((t) => !t.mystified) as trait (trait.value)}
        <span class="tag" data-trait={trait.value}>{trait.label}</span>
    {/each}
    {#each properties as property (property)}
        <span class="tag light property">{game.i18n.localize(property)}</span>
    {/each}
</div>
