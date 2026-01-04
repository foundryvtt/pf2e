<script lang="ts">
    import ItemTraits from "@module/sheet/components/item-traits.svelte";
    import type { ReloadWeaponContext } from "./app.ts";
    import ItemSummary from "@module/sheet/components/item-summary.svelte";
    import HeavyBullets from "../../../../../../static/assets/icons/heavy-bullets.svg?raw";
    const { state: data, foundryApp }: ReloadWeaponContext = $props();
    const openStates: Record<string, boolean> = $state({});
</script>

<div class="choices flexcol" class:empty={!data.compatible.length}>
    {#if !data.compatible.length}
        {game.i18n.localize("PF2E.Item.Weapon.Reloader.EmptyMessage")}
    {/if}
    {#each data.compatible as ammo}
        <div class="choice" class:depleted={ammo.depleted}>
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
                    data-tooltip
                    aria-label={game.i18n.localize("PF2E.Item.Weapon.Reloader.ReloadAll")}
                    onclick={() => foundryApp.reloadWeapon(ammo.id, true)}
                >
                    {@html HeavyBullets}
                </button>
            {/if}
            <img src={ammo.img} alt="Item" class:svg={ammo.img.endsWith(".svg")} />
            <button
                type="button"
                class="name flat"
                data-rarity={ammo.rarity}
                onclick={() => (openStates[ammo.uuid] = !openStates[ammo.uuid])}
            >
                <span>
                    {ammo.name}
                    {#if ammo.isTemporary}
                        <i class="fa-solid fa-stopwatch" inert></i>
                    {/if}
                    {#if ammo.uses}
                        <span class="uses">
                            {@html HeavyBullets}
                            {ammo.uses.value}
                        </span>
                    {/if}
                    <span class="quantity">x{ammo.quantity}</span>
                </span>
                {#if ammo.traits.length || ammo.rarity !== "common"}
                    <ItemTraits traits={ammo.traits} rarity={ammo.rarity} />
                {/if}
            </button>
            <ItemSummary uuid={ammo.uuid} open={!!openStates[ammo.uuid]} exclude={["traits"]} />
        </div>
    {/each}
</div>

<style>
    .choices {
        gap: var(--space-8);
        padding: var(--space-8);
        &.empty {
            align-items: center;
            display: flex;
            font-size: var(--font-size-16);
            justify-content: center;
            flex: 1;
        }
    }

    .choice {
        align-items: start;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--space-8);
        width: 100%;

        :global(svg.heavy-bullets) {
            display: inline-block;
            width: 0.75rem;
            height: 0.75rem;

            :global(path) {
                fill: var(--color-text-secondary);
            }
        }

        &.depleted {
            opacity: 0.8;
            filter: grayscale(0.85);
        }

        > button.select {
            --button-size: 1.75rem;
            width: var(--button-size);
        }

        > img {
            width: 2rem;
            &.svg {
                outline: 1px solid var(--color-border);
            }
        }

        > .name {
            display: flex;
            flex-direction: column;
            align-items: start;
            gap: 0;
            flex: 1;
            justify-content: start;

            .uses,
            .quantity {
                color: var(--color-text-tertiary);
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
