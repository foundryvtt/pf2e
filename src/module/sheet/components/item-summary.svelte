<script lang="ts">
    import { AbstractEffectPF2e, ItemPF2e } from "@item";
    import type { RawItemChatData } from "@item/base/data/index.ts";
    import { untrack } from "svelte";
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
        /** An in-memory item (e.g. a derived condition), which the uuid can't resolve to */
        item?: ItemPF2e | null;
    }

    interface SummaryData {
        chatData: RawItemChatData;
        identified: boolean;
        itemLevel: number | null;
        priceString: string;
    }

    const { open, uuid, exclude = [], id, version, item }: ItemSummaryProps = $props();

    async function loadItemData(uuid: ItemUUID, item?: ItemPF2e | null): Promise<SummaryData | null> {
        const document = item ?? (await fromUuid<ItemPF2e>(uuid));
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

    // Props are getters, so these hold the values: a re-render that passes the same ones doesn't refetch
    const itemUuid = $derived(uuid);
    const itemVersion = $derived(version);

    // The fetch is keyed on the item's version, or on each expand when no version is provided.
    // Deriveds are lazy, so nothing loads until the summary is first expanded.
    const summary = $derived.by(() => {
        if (itemVersion === undefined) void open;
        // An in-memory item is a new instance after every actor prep, so it mustn't trigger a refetch
        return loadItemData(
            itemUuid,
            untrack(() => item),
        );
    });

    // The last loaded data stays shown while a refetch is pending, so the summary updates in place
    // instead of being torn down and sliding open again
    let data = $state<SummaryData | null>(null);
    $effect(() => {
        if (!open) return;
        let current = true;
        summary.then(
            (loaded) => {
                if (current) data = loaded;
            },
            () => {
                if (current) data = null;
            },
        );
        return () => {
            current = false;
        };
    });
</script>

<!-- A local transition: it slides on expand and collapse, but not when a tab switch or row removal tears it down -->
{#if open && data}
    <div class="item-summary" {id} transition:slide={{ duration: 500 }}>
        {#if data.identified}
            {#if !exclude.includes("traits")}
                <ItemTraits
                    rarity={data.chatData.rarity?.slug}
                    traits={data.chatData.traits ?? []}
                    properties={data.chatData.properties}
                />
            {:else if data.chatData.properties?.length}
                <div class="tags has-properties">
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

        <!-- TODO: cast/attack/damage buttons for spells -->
        {#if data.chatData.description.value}
            <div class="description">
                {@html data.chatData.description.value}
            </div>
        {/if}
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

            > * + * {
                margin-block-start: var(--space-6);
            }

            > .tags {
                margin-block-end: 0;
                margin-inline: calc(-1 * var(--space-2)) 0;
                padding: 0;

                &.has-properties {
                    row-gap: var(--space-3);
                }

                /* Outlined property tags (e.g. "Martial Weapon") sit apart from each other and from the traits, at
                   the traits' height */
                .tag.property {
                    align-self: stretch;
                    margin-inline-start: var(--space-2);
                    border-width: 1px;
                    height: auto;
                    min-height: var(--spacer-20);
                }

                .tag:not(.property) + .tag.property {
                    margin-inline-start: var(--space-4);
                }
            }

            .description {
                p {
                    margin-block: var(--space-6);
                }

                > :first-child {
                    margin-block-start: 0;
                }

                > :last-child {
                    margin-block-end: 0;
                }

                hr {
                    background-color: var(--color-border);
                    background-image: none;
                    margin: unset;
                    height: var(--space-1);
                }
            }
        }
    }
</style>
