<script lang="ts">
    import ItemTraits from "@module/sheet/components/item-traits.svelte";
    import type { ReloadWeaponContext } from "./app.ts";
    import ItemSummary from "@module/sheet/components/item-summary.svelte";
    import HeavyBullets from "./heavy-bullets.svelte";
    const { state: data, foundryApp }: ReloadWeaponContext = $props();
    const openStates: Record<string, boolean> = $state({});
</script>

<div class="choices" class:empty={data.compatible.length === 0}>
    {#if data.compatible.length === 0}
        {game.i18n.localize("PF2E.Item.Weapon.Reloader.EmptyMessage")}
    {/if}
    {#each data.compatible as ammo}
        <div class="choice">
            <button
                type="button"
                class="icon fa-solid fa-check select"
                aria-label={game.i18n.localize("PF2E.Item.Weapon.Reloader.Reload1")}
                data-tooltip
                onclick={() => foundryApp.reloadWeapon(ammo.id)}
            ></button>
            {#if data.loaded.max > 1}
                <button
                    type="button"
                    class="select"
                    aria-label={game.i18n.localize("PF2E.Item.Weapon.Reloader.ReloadAll")}
                    data-tooltip
                    onclick={() => foundryApp.reloadWeapon(ammo.id, true)}
                >
                    <HeavyBullets />
                </button>
            {/if}
            <img src={ammo.img} alt="item" />
            <button
                class="name flat"
                data-rarity={ammo.rarity}
                onclick={() => (openStates[ammo.uuid] = !openStates[ammo.uuid])}
            >
                <span>
                    {ammo.name}
                    {#if ammo.uses}
                        <span>
                            <span class="icon">
                                <HeavyBullets />
                            </span>
                            {ammo.uses.value}
                        </span>
                    {/if}
                    <span class="quantity">x{ammo.quantity}</span>
                </span>
                {#if ammo.traits.length}
                    <ItemTraits traits={ammo.traits} rarity={ammo.rarity} />
                {/if}
            </button>
            <ItemSummary uuid={ammo.uuid} open={!!openStates[ammo.uuid]} exclude={["traits"]} />
        </div>
    {/each}
</div>

<style>
    .empty {
        display: flex;
        align-items: center;
        padding: 1rem var(--space-8);
        font-size: var(--font-size-16);
    }

    .choice {
        align-items: top;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--space-8);
        padding: var(--space-4) var(--space-8);
        width: 100%;

        /* Make Icon White */
        button,
        .icon {
            :global(path) {
                fill: white;
            }
        }

        > button.select {
            --button-size: 1.75rem;
            width: 1.75rem;
            margin-top: var(--space-4);
            transition: all 0.25s ease-in-out;
            :global(svg) {
                width: 30px;
                height: 30px;
            }
        }

        > img {
            width: 2rem;
            height: 2rem;
            margin-top: var(--space-1); /* align with name */
        }

        > .name {
            display: flex;
            flex-direction: column;
            align-items: start;
            gap: 0;
            flex: 1;
            justify-content: center;

            .icon {
                display: inline-block;
                width: 0.75rem;
                height: 0.75rem;
                :global(svg) {
                    width: 100%;
                    height: 100%;
                }
            }

            .quantity {
                margin-left: var(--space-4);
            }

            :global {
                .tags {
                    padding: 0;
                    margin: 0;
                    .tag {
                        height: var(--space-17);
                        line-height: 95%;
                    }
                }
            }
        }
    }
</style>
