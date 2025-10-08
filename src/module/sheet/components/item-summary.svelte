<script lang="ts">
    import { AbstractEffectPF2e, ItemPF2e } from "@item";
    import type { RawItemChatData } from "@item/base/data/index.ts";
    import { slide } from "svelte/transition";
    import ItemTraits from "./item-traits.svelte";
    import type { ItemUUID } from "@common/documents/_module.mjs";

    interface ItemSummaryProps {
        open: boolean;
        uuid: ItemUUID;
        exclude?: ("traits" | "price")[];
    }

    const { open, uuid, exclude = [] }: ItemSummaryProps = $props();
    let chatData = $state<RawItemChatData | null>(null);
    let identified = $state(false);
    let itemLevel = $state<number | null>(null);
    let priceString = $state("");

    async function loadItemData(): Promise<void> {
        const document = await fromUuid<ItemPF2e>(uuid);
        const isEffect = document instanceof AbstractEffectPF2e;
        const price = document?.isOfType("physical") ? document.price : null;

        // Load and assign to state
        chatData = (await document?.getChatData()) ?? null;
        if (chatData && document) {
            identified = game.user.isGM || !(document.isOfType("physical") || isEffect) || document.isIdentified;
            itemLevel = "level" in document && typeof document.level === "number" ? document.level : null;
            priceString = price?.value.toString() ?? "";
        }
    }

    $effect(() => {
        if (!open) return;
        loadItemData();
    });
</script>

{#if open && chatData}
    <div class="item-summary" transition:slide={{ duration: 500 }}>
        {#if identified}
            {#if !exclude.includes("traits")}
                <ItemTraits
                    rarity={chatData.rarity?.slug}
                    traits={chatData.traits ?? []}
                    properties={chatData.properties}
                />
            {:else if chatData.properties?.length}
                <div class="tags">
                    {#each chatData.properties as property (property)}
                        <span class="tag light property">{game.i18n.localize(property)}</span>
                    {/each}
                </div>
            {/if}
            {#if chatData.levelLabel}
                <div class="level">{chatData.levelLabel}</div>
            {/if}
            {#if priceString && !exclude.includes("price")}
                <section>
                    <div>{game.i18n.format("PF2E.Item.Physical.LevelLabel", { level: itemLevel })}</div>
                    <div>{game.i18n.format("PF2E.Item.Physical.PriceLabel", { price: priceString })}</div>
                </section>
            {/if}
        {/if}

        {#if chatData.description.gm}
            <section class="description gm-notes">
                {@html chatData.description.gm}
            </section>
        {/if}

        <div class="description">
            {@html chatData.description.value}
        </div>
    </div>
{/if}

<style lang="scss">
    @use "src/styles/mixins/_typography.scss" as mixins;

    .item-summary {
        flex: 0 0 100%;
        line-height: normal;
        overflow: hidden;
        padding: var(--space-4);
        white-space: unset;

        .gm-notes {
            background-color: var(--visibility-gm-bg);
            color: var(--color-text-dark-0);
            border: 1px dotted rgba(75, 74, 68, 0.5);
            padding: 0 0.25em;
            flex: 0 0 auto;
        }

        :global {
            @include mixins.journal-styling;
            > .tags {
                margin: 0.5em 0.05em 0.2em calc(-1 * var(--space-2));
                padding: 0;
            }

            /* Override AppV2 hr with something that fits item descriptions better */
            .description hr {
                background-color: var(--color-border);
                background-image: none;
                margin: unset;
                height: var(--space-1);
            }
        }
    }
</style>
