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
        /** Optional element id, for aria-controls wiring from the disclosure trigger */
        id?: string;
        /** A value that changes when the item does (e.g. `_stats.modifiedTime`), refreshing the summary */
        version?: number;
    }

    interface SummaryData {
        chatData: RawItemChatData;
        identified: boolean;
        itemLevel: number | null;
        priceString: string;
    }

    const { open, uuid, exclude = [], id, version }: ItemSummaryProps = $props();

    async function loadItemData(uuid: ItemUUID): Promise<SummaryData | null> {
        const document = await fromUuid<ItemPF2e>(uuid);
        const chatData = (await document?.getChatData()) ?? null;
        if (!document || !chatData) return null;
        const isEffect = document instanceof AbstractEffectPF2e;
        const price = document.isOfType("physical") ? document.price : null;
        return {
            chatData,
            identified: game.user.isGM || !(document.isOfType("physical") || isEffect) || document.isIdentified,
            itemLevel: "level" in document && typeof document.level === "number" ? document.level : null,
            priceString: price?.value.toString() ?? "",
        };
    }

    // The fetch is keyed on the item's version, or on each expand when no version is provided.
    // Deriveds are lazy, so nothing loads until the summary is first expanded.
    const summary = $derived.by(() => {
        if (version === undefined) void open;
        return loadItemData(uuid);
    });
</script>

{#if open}
    {#await summary then data}
        {#if data}
            <!-- global: the transition must also play when the outer open/data blocks are created or destroyed -->
            <div class="item-summary" {id} transition:slide|global={{ duration: 500 }}>
                {#if data.identified}
                    {#if !exclude.includes("traits")}
                        <ItemTraits
                            rarity={data.chatData.rarity?.slug}
                            traits={data.chatData.traits ?? []}
                            properties={data.chatData.properties}
                        />
                    {:else if data.chatData.properties?.length}
                        <div class="tags">
                            {#each data.chatData.properties as property (property)}
                                <span class="tag light property">{_loc(property)}</span>
                            {/each}
                        </div>
                    {/if}
                    {#if data.chatData.levelLabel}
                        <div class="level">{data.chatData.levelLabel}</div>
                    {/if}
                    {#if data.priceString && !exclude.includes("price")}
                        <section>
                            <div>{_loc("PF2E.Item.Physical.LevelLabel", { level: data.itemLevel })}</div>
                            <div>{_loc("PF2E.Item.Physical.PriceLabel", { price: data.priceString })}</div>
                        </section>
                    {/if}
                {/if}

                {#if data.chatData.description.gm}
                    <section class="description gm-notes">
                        {@html data.chatData.description.gm}
                    </section>
                {/if}

                <!-- TODO: the legacy summary (item-summary.hbs) also renders cast/attack/damage buttons for spells -->
                <div class="description">
                    {@html data.chatData.description.value}
                </div>
            </div>
        {/if}
    {:catch}
        <!-- render nothing -->
    {/await}
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
