<script lang="ts">
    import { ErrorPF2e } from "@util";
    import type { TradeQueryData, TradeDialogRenderContext, TradeItemData } from "./app.ts";

    const { state: data, foundryApp: dialog, traderUser, searchEngine, localize }: TradeDialogRenderContext = $props();
    const { self, trader } = data;
    const portraitAlt = {
        self: localize("ImgAlt.Actor", { actor: self.actor.name, user: localize("You") }),
        trader: localize("ImgAlt.Actor", { actor: trader.actor.name, user: traderUser.name }),
    };

    // Item lists and summaries
    const listFormatter = game.i18n.getListFormatter({ style: "narrow" });
    const selfItems = $derived(
        self.items
            .filter((i) => i.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name, game.i18n.lang)),
    );
    const withQuantity = (i: { quantity: number; marked: number; name: string }) =>
        i.quantity > 1 ? `${i.marked}x ${i.name}` : i.name;
    const itemsToSend = $derived.by(() => {
        const list = listFormatter.format(selfItems.filter((i) => i.marked > 0).map((i) => withQuantity(i)));
        return list.length > 0 ? localize("Sending", { list }) : "";
    });

    const traderItems = $derived(
        trader.items
            .filter((i) => i.visible || i.marked)
            .sort((a, b) => Number(b.marked > 0) - Number(a.marked > 0) || a.name.localeCompare(b.name)),
    );
    const itemsToReceive = $derived.by(() => {
        const list = listFormatter.format(traderItems.filter((i) => i.marked > 0).map((i) => withQuantity(i)));
        return list.length > 0 ? localize("Receiving", { list }) : "";
    });

    const pendingQueries: Set<Promise<unknown>> = new Set();
    async function sendQuery(data: TradeQueryData): Promise<void> {
        await Promise.allSettled(pendingQueries);
        const promise = traderUser.query("pf2e.trade", data, { timeout: 15_000 });
        pendingQueries.add(promise);
        promise
            .then((data) => {
                if (data?.ok === false) dialog.abortTrade(data.message);
            })
            .catch(() => dialog.abortTrade(localize("Error.Timeout", { user: traderUser.name, timeout: 15 })))
            .finally(() => pendingQueries.delete(promise));
    }

    function toggleAccepted(): void {
        self.accepted = !self.accepted;
        const marked = Object.fromEntries(
            self.items
                .values()
                .filter((i) => i.marked > 0)
                .map((i) => [i.id, i.marked]),
        );
        if (self.accepted && trader.accepted) dialog.close({ success: true });
        sendQuery({ action: "update", marked, accepted: self.accepted });
    }

    function search(event: Event): void {
        if (!(event.target instanceof HTMLInputElement)) throw ErrorPF2e("Unexpected event received during search");
        const searchText = event.target.value.trim();
        const results = new Map(searchEngine.search(searchText).map((r) => [r.id, r.score]));
        const fallbackScore = results.size > 0 ? 0 : 1;
        for (const item of self.items) {
            item.matchScore = results.get(item.id) ?? fallbackScore;
        }
    }

    function showQuantityInput(event: Event & { currentTarget: HTMLButtonElement }): void {
        const button = event.currentTarget;
        button.hidden = true;
        const input = button.nextElementSibling;
        if (input instanceof HTMLInputElement) {
            input.hidden = false;
            if (event instanceof FocusEvent) input.focus();
        }
    }

    function focusQuantityInput(event: PointerEvent & { currentTarget: HTMLSpanElement }): void {
        const input = event.currentTarget.querySelector("input");
        input?.focus();
    }

    function hideQuantityInput(event: FocusEvent & { currentTarget: HTMLInputElement }): void {
        const input = event.currentTarget;
        input.hidden = true;
        const button = input.previousElementSibling;
        if (button instanceof HTMLButtonElement) button.hidden = false;
    }

    function editQuantity(item: TradeItemData, event: Event): void {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        const quantity = Math.clamp(Number(input.value) || 0, 0, item.quantity);
        if (quantity !== item.marked) {
            item.marked = quantity;
            const newMarks = Object.fromEntries(
                self.items
                    .values()
                    .filter((i) => i.marked > 0)
                    .map((i) => [i.id, i.marked]),
            );
            const queryData: TradeQueryData = { action: "update", marked: newMarks };
            sendQuery(queryData);
        }
    }

    function updateTradeQuantity(item: TradeItemData, event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
        if (!traderUser.active) {
            dialog.abortTrade(localize("Error.LoggedOut", { user: traderUser.name }));
            return;
        }
        const button = event.currentTarget;
        const ctrlKey = fh.interaction.KeyboardManager.CONTROL_KEY_STRING === "Control" ? "ctrlKey" : "metaKey";
        const multiplier = event[ctrlKey] && event.shiftKey ? 50 : event.shiftKey ? 10 : event[ctrlKey] ? 5 : 1;
        item.marked = Math.clamp(item.marked + Number(button.value) * multiplier, 0, item.quantity);
        const newMarks = Object.fromEntries(
            self.items
                .values()
                .filter((i) => i.marked > 0)
                .map((i) => [i.id, i.marked]),
        );
        const queryData: TradeQueryData = { action: "update", marked: newMarks };
        sendQuery(queryData);
    }
</script>

<div class="content standard-form" data-tooltip-class="pf2e">
    <section class="panel self flexcol">
        <header class="flexrow">
            <img src={self.actor.img} alt={portraitAlt.self} />
            <div class="name flexcol">
                <span class="actor">{self.actor.name}</span>
                <span class="user">({localize("You")})</span>
            </div>
            <button
                type="button"
                id="{dialog.id}-self-accepted"
                class="toggle-accepted"
                class:accepted={self.accepted}
                data-tooltip
                aria-label={self.accepted ? localize("Acceptance.Rescind") : localize("Acceptance.Accept")}
                onclick={toggleAccepted}
            >
                <i class="fa-solid fa-{self.accepted ? 'check' : 'xmark'}"></i>
            </button>
        </header>
        <div class="flexrow search">
            <input type="search" id="{dialog.id}-search" placeholder="&#xf002;" aria-label="Search" oninput={search} />
        </div>
        <ul class="flexcol scrollable">
            {#each selfItems as item (item.id)}
                <li class="flexrow" class:marked={item.marked}>
                    <img src={item.img} alt={localize("ImgAlt.Item", { item: item.name })} />
                    <span class="name">{item.name}</span>
                    <span class="quantity flexrow" role="button" onpointerup={focusQuantityInput}>
                        <button
                            type="button"
                            id="{dialog.id}-{item.id}-decrement"
                            class="icon fa-solid fa-left"
                            value="-1"
                            tabindex="-1"
                            disabled={item.marked === 0 || trader.accepted}
                            onclick={(e) => updateTradeQuantity(item, e)}
                            aria-label={localize("Quantity.Decrement", { item: item.name })}
                        ></button>
                        <button
                            type="button"
                            class="ratio plain"
                            aria-label={localize("Quantity.Label", { item: item.name })}
                            onfocus={showQuantityInput}
                            onpointerdown={showQuantityInput}
                        >
                            {item.marked} / {item.quantity}
                        </button>
                        <input
                            type="number"
                            id="{dialog.id}-{item.id}-edit"
                            value={item.marked}
                            hidden
                            oninput={(e) => editQuantity(item, e)}
                            onblur={hideQuantityInput}
                        />
                        <button
                            type="button"
                            id="{dialog.id}-{item.id}-increment"
                            class="icon fa-solid fa-right"
                            value="1"
                            tabindex="-1"
                            disabled={item.marked === item.quantity || trader.accepted}
                            onclick={(e) => updateTradeQuantity(item, e)}
                            aria-label={localize("Quantity.Increment", { item: item.name })}
                        ></button>
                    </span>
                </li>
            {/each}
        </ul>
        <footer class="flexrow">
            <p>{itemsToSend}</p>
        </footer>
    </section>

    <section class="panel trader flexcol">
        <header class="flexrow">
            <div
                class="toggle-accepted"
                class:accepted={trader.accepted}
                data-tooltip
                aria-label={localize(`Acceptance.${trader.accepted ? "" : "Not"}Accepted`, { user: traderUser.name })}
            >
                <i class="fa-solid fa-{trader.accepted ? 'check accepted' : 'xmark'}"></i>
            </div>
            <div class="name flexcol">
                <span class="actor">{trader.actor.name}</span>
                <span class="user">({traderUser.name})</span>
            </div>
            <img src={trader.actor.img} alt={portraitAlt.trader} />
        </header>
        <ul class="scrollable" tabindex="-1">
            {#each traderItems as item (item.id)}
                {#if item.visible}
                    <li class="flexrow" class:marked={item.marked > 0} data-item-id={item.id}>
                        <img src={item.img} alt={localize("ImgAlt.Item", { item: item.name })} />
                        <span class="name">{item.name}</span>
                        <span class="quantity flexrow">
                            {#if item.marked > 0}
                                <i class="fa-solid fa-left" inert></i>
                                <span class="ratio">{item.marked} / {item.quantity}</span>
                            {:else}
                                {item.quantity}
                            {/if}
                        </span>
                    </li>
                {/if}
            {/each}
        </ul>
        <footer class="flexrow">
            <p>{itemsToReceive}</p>
        </footer>
    </section>
</div>

<style>
    :global {
        #trade-dialog {
            max-height: 67vh;
            &:not(.maximizing, .minimizing, .minimized) {
                min-height: 400px;
            }
            .window-content {
                flex-direction: row;
            }
        }
    }

    .content {
        align-items: start;
        flex: 1 0 100%;
        flex-direction: row;
        justify-content: center;
    }

    .panel {
        --scroll-margin: var(--space-8);
        flex: 1 0 calc(50% - var(--scroll-margin));
        gap: var(--space-8);
        height: 100%;

        header {
            align-items: center;
            border-bottom: 1px solid var(--color-border);
            flex-wrap: nowrap;
            height: calc(4rem + var(--space-4));
            justify-content: space-between;
            padding: 0 var(--scroll-margin);

            img {
                flex: 0 0 4rem;
                height: 4rem;
                left: 1rem;
                object-fit: contain;
            }

            .name {
                align-items: center;
                text-align: center;
                white-space: nowrap;

                .actor {
                    font-family: var(--serif);
                    font-size: var(--font-size-24);
                    font-weight: 500;
                }

                .user {
                    color: var(--color-text-subtle);
                    font-size: var(--font-size-12);
                }
            }

            .toggle-accepted {
                color: var(--color-text-subtle);
                flex: 0 0 2rem;
                font-size: var(--font-size-22);
                height: 2rem;
                margin-right: 1.5rem;
                text-align: center;
                width: 0;

                &.accepted {
                    > i {
                        color: var(--color-text-secondary);
                        opacity: 1;
                    }
                }

                > i {
                    opacity: 0.5;
                }
            }
        }

        input[type="search"] {
            padding-right: 0;
            margin-right: var(--scroll-margin);
            &::placeholder {
                font-family: var(--fa6);
                font-weight: 900;
                padding-left: 0.25em;
            }
        }

        ul {
            --scroll-margin: inherit;
            color: var(--color-text-secondary);
            flex: 1;
            height: auto;
            list-style: none;
            margin-bottom: 0;
            margin-top: 0;
            padding: 0 var(--scroll-margin) 0 0;
        }

        footer {
            border-top: 1px solid var(--color-border);
            color: var(--color-text-secondary);
            font-size: var(--font-size-12);
            font-style: italic;
            padding-right: var(--scroll-margin);

            p {
                margin-bottom: 0;
                min-height: 1.5rem;
            }
        }
    }

    li {
        --color-marked: var(--color-warm-1);
        border: solid transparent;
        border-width: 1px 1px 0;
        flex: 0 0 2rem;
        gap: var(--space-8);
        margin-bottom: 0;
        padding: var(--space-4) var(--space-8) var(--space-4) var(--space-4);

        &:last-child {
            border-bottom-width: 1px;
        }

        &.marked {
            border-color: var(--color-marked);
            + .marked {
                border-top-color: transparent;
            }
            + :not(.marked) {
                border-top-color: var(--color-marked);
            }

            .quantity,
            .name {
                color: var(--color-text-emphatic);
            }
        }

        &:nth-child(odd) {
            background: var(--sidebar-entry-hover-bg);
        }

        img {
            flex: 0 0 2rem;
            min-width: 0;
            object-fit: contain;
        }

        .quantity {
            color: var(--color-text-tertiary);
            flex: 0 0 8rem;
            flex-wrap: nowrap;
            font-size: var(--font-size-12);
            justify-content: space-around;
            white-space: nowrap collapse;

            button {
                --button-size: var(--font-size-24);
                font-size: var(--font-size-12);
            }

            input {
                flex: 0 0 50%;
                text-align: center;
            }

            .ratio {
                cursor: var(--cursor-text);
                flex: 0 0 4rem;
                height: 2rem;
                line-height: 2rem;
                &.ratio {
                    --button-hover-border-color: var(--color-text-subtle);
                }
            }
        }
    }

    .panel.trader {
        header {
            .toggle-accepted {
                align-items: center;
                display: flex;
                margin: 0 0 0 1rem;

                i {
                    flex: 0 0 2rem;
                }
            }
            img {
                left: unset;
                right: 1rem;
            }
        }

        li {
            .quantity {
                justify-content: end;

                i {
                    color: var(--color-text-primary);
                    flex: none;
                }

                .ratio {
                    text-align: end;
                }
            }
        }
    }
</style>
