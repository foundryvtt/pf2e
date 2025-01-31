<script lang="ts">
    import type { CoinageSheetData } from "@actor/party/sheet-new.ts";

    /** AHHHH */
    interface CoinageProps {
        editable?: boolean;
        coinage: CoinageSheetData;
        canDistribute?: boolean;
    }

    const { editable, coinage, canDistribute }: CoinageProps = $props();
</script>

<div class="coinage">
    <div class="currency">
        <li class="label">{game.i18n.localize("PF2E.StackGroupCoins")}</li>
        {#each Object.entries(coinage.coins) as [denomination, value]}
            <li class="denomination {{ denomination }}">
                <div class="currency-image" data-tooltip={game.i18n.localize(value.label)}></div>
                <span>{value.value}</span>
            </li>
        {/each}
        {#if editable}
            <li>
                <button
                    type="button"
                    data-action="add-coins"
                    data-tooltip={game.i18n.localize("PF2E.AddCoinsTitle")}
                    aria-labelledby="tooltip"
                >
                    <i class="fa-solid fa-plus fa-fw"></i>
                </button>
            </li>
            <li>
                <button
                    type="button"
                    data-action="remove-coins"
                    data-tooltip={game.i18n.localize("PF2E.RemoveCoinsTitle")}
                    aria-labelledby="tooltip"
                >
                    <i class="fa-solid fa-minus fa-fw"></i>
                </button>
            </li>
            {#if canDistribute}
                <li>
                    <button
                        type="button"
                        data-action="distribute-coins"
                        data-tooltip={game.i18n.localize("PF2E.Actor.Inventory.DistributeCoins")}
                        disabled={!canDistribute}
                        aria-labelledby="tooltip"
                    >
                        <i class="fa-solid fa-share-all fa-fw"></i>
                    </button>
                </li>
            {/if}
        {/if}
    </div>
    <div class="wealth">
        <h3 class="item-name">
            <i class="fa-solid fa-coins fa-fw"></i>
            {game.i18n.localize("PF2E.TotalCoinage")}
            <span>{coinage.totalCoins} {game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}</span>
        </h3>
        <h3 class="item-name">
            <i class="fa-solid fa-scale-unbalanced fa-fw"></i>
            {game.i18n.localize("PF2E.TotalWealth")}
            <span>{coinage.totalWealth} {game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}</span>
        </h3>
    </div>
</div>

<style lang="scss">
    .currency {
        align-items: center;
        background-color: var(--sub);
        box-shadow:
            inset 0 0 0 1px rgba(0, 0, 0, 0.3),
            inset 0 0 0 2px rgba(255, 255, 255, 0.2);
        display: flex;
        font-size: var(--font-size-13);
        list-style: none;
        margin: 0;
        padding: 3px;

        .label {
            color: var(--color-text-light-0);
            font-weight: 500;
            margin: 0 0.5rem 0 0.25rem;
        }

        .denomination {
            align-items: center;
            background-color: transparent;
            border-left: 1px solid rgba(black, 0.2);
            border-right: 1px solid rgba(white, 0.1);
            color: var(--color-text-light-0);
            display: flex;
            flex-wrap: nowrap;
            flex: 0 1 auto;
            justify-content: start;
            text-shadow: 0 0 3px rgba(black, 0.75);
            width: 100%;

            &:first-child {
                border-left: none;
            }

            &:last-child {
                border-right: none;
                margin-right: 8px;
            }

            label {
                color: #ffe8d1;
                text-shadow:
                    1px 1px 1px rgba(white, 0.2),
                    -1px -1px 1px rgba(black, 0.2);
                font-family: var(--sans-serif);
                font-size: var(--font-size-10);
                text-transform: uppercase;
            }

            span {
                padding-left: 8px;
                padding-right: 12px;
            }

            &.pp {
                .currency-image {
                    background: url("/icons/equipment/treasure/currency/platinum-pieces.webp") no-repeat;
                }
            }
            &.gp {
                .currency-image {
                    background: url("/icons/equipment/treasure/currency/gold-pieces.webp") no-repeat;
                }
            }
            &.sp {
                .currency-image {
                    background: url("/icons/equipment/treasure/currency/silver-pieces.webp") no-repeat;
                }
            }
            &.cp {
                .currency-image {
                    background: url("/icons/equipment/treasure/currency/copper-pieces.webp") no-repeat;
                }
            }

            .currency-image {
                @include gold-border;
                height: 1.5rem;
                width: 1.5rem;
                background-size: cover !important;
            }
        }

        li > button {
            @include flex-center;
            @include p-reset;
            background-color: var(--tertiary);
            border-radius: 1px;
            border: none;
            box-shadow:
                0 0 0 1px rgba(black, 0.25),
                inset 0 0 0 1px rgba(white, 0.25),
                0 0 3px rgba(black, 0.5);
            color: rgba(black, 0.75);
            font-size: var(--font-size-13);
            font-weight: 600;
            height: 1.5rem;
            line-height: 1;
            margin-left: 2px;
            width: 1.875rem;

            > i {
                @include p-reset;
            }

            &:disabled {
                opacity: 0.6;
            }

            &:hover:not(:disabled) {
                background-color: var(--primary);
                color: var(--color-text-light-0);
                cursor: pointer;
            }
        }
    }

    .wealth {
        @include micro;
        @include button;
        align-items: center;
        background-color: var(--alt);
        display: flex;
        margin-bottom: 0.5rem;
        min-height: 1.5rem;
        justify-content: flex-end;
        padding: 0 0.25rem;

        h3 {
            font-size: var(--font-size-13);
            text-transform: capitalize;
            text-shadow: 0 0 2px rgba(black, 0.75);
            margin: 2px;
            margin-left: 0.25rem;
            cursor: default;
            &:hover {
                color: var(--color-text-light-0);
            }
        }

        h3.item-name {
            flex-grow: 1;
            color: var(--color-text-light-0);
            margin-bottom: 0;
            font-weight: bold;

            span {
                margin-left: 0.25rem;
                font-weight: normal;
                text-transform: uppercase;
            }
        }

        ol {
            padding-right: 0;
            padding-bottom: 0;
            margin-bottom: 0;
            margin-right: 0;
        }
    }
</style>
