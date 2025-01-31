<script lang="ts">
    import type { PartySheetState } from "./index.ts";
    import Coinage from "@module/sheet/components/coinage.svelte";

    interface StashProps {
        state: PartySheetState;
    }
    const { state: data }: StashProps = $props();
    const restricted = data.restricted;
    const inventorySummary = data.inventorySummary;
    const localize = game.i18n.localize.bind(game.i18n);
</script>

<section class="stash">
    <aside class="sidebar">
        {#if data.members}
            <ol class="box-list inventory-members">
                {#if !restricted}
                    <li class="box summary">
                        <header>{localize("PF2E.Actor.Party.Total")}</header>
                        <div class="summary-data">
                            <div>
                                <span class="label">
                                    <i class="fa-solid fa-coins fa-fw"></i>
                                    {localize("PF2E.Actor.Party.Coin")}
                                </span>
                                <span class="value">
                                    {inventorySummary.totalCoins.toFixed(2)}
                                    {localize("PF2E.CurrencyAbbreviations.gp")}
                                </span>
                            </div>
                            <div>
                                <span class="label">
                                    <i class="fa-solid fa-scale-unbalanced fa-fw"></i>
                                    {localize("PF2E.Actor.Party.Wealth")}
                                </span>
                                <span class="value">
                                    {inventorySummary.totalWealth.toFixed(2)}
                                    {localize("PF2E.CurrencyAbbreviations.gp")}
                                </span>
                            </div>
                        </div>
                        <footer>
                            <i class="fa-solid fa-weight-hanging"></i>
                            {localize("PF2E.Item.Physical.Bulk.Label")}
                            {inventorySummary.totalBulk}
                        </footer>
                    </li>
                {/if}
                {#each data.members as member}
                    <li class="box" class:readonly={!member.limited}>
                        <div
                            class="actor-link content"
                            data-actor-uuid={member.actor.uuid}
                            data-action="open-sheet"
                            data-tab="inventory"
                        >
                            <img src={member.actor.img} alt={member.actor.name} />
                            <div class="sub-data">
                                <div class="name">{member.actor.name}</div>
                                {#if !member.restricted}
                                    <div class="value">
                                        <i class="fa-solid fa-scale-unbalanced"></i>
                                        {member.totalWealth.toFixed(2)}
                                        {game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}
                                    </div>
                                {/if}
                            </div>
                        </div>
                        {#if !member.restricted}
                            <footer>
                                <i class="fa-solid fa-weight-hanging"></i>
                                {game.i18n.localize("PF2E.Item.Physical.Bulk.Label")}
                                {member.bulk}
                            </footer>
                        {/if}
                    </li>
                {/each}
            </ol>
        {:else}
            {game.i18n.localize("PF2E.Actor.Party.BlankSlate")}
        {/if}
    </aside>

    <section class="inventory">
        <Coinage
            editable={data.editable}
            coinage={data.inventory.coinage}
            canDistribute={data.inventory.canDistributeCoins}
        />
        <!-- {> "systems/pf2e/templates/actors/partials/coinage.hbs" owner=data.owner}
        {> "systems/pf2e/templates/actors/partials/inventory.hbs"}
        {> "systems/pf2e/templates/actors/partials/total-bulk.hbs"} -->
    </section>
</section>

<style>
    .stash {
        display: flex;
    }

    .inventory-members {
        .box {
            .content {
                align-items: center;
                display: flex;
                padding: 0.5rem;
                overflow: hidden;

                img {
                    grid-area: image;
                    margin-right: 0.4rem;
                }

                .sub-data {
                    display: flex;
                    flex-direction: column;
                    gap: 0.125rem;
                }
            }

            footer {
                align-items: baseline;
                display: flex;
                gap: 0.25rem;
                i {
                    align-self: center;
                    font-size: 0.85em;
                }
            }

            .inventory-data {
                display: flex;
                gap: 0.25rem;
                padding: 2px 3px;
                font-size: var(--font-size-12);
            }
        }
    }
</style>
