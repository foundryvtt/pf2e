<script lang="ts">
    import type { PartySheetContext } from "./index.ts";
    import OverviewTab from "./overview-tab.svelte";
    import ExplorationTab from "./exploration-tab.svelte";
    import StashTab from "./stash-tab.svelte";
    import SubNavigation from "./sub-navigation.svelte";

    const { state: data, foundryApp }: PartySheetContext = $props();
    const actor = data.actor;
    const playerRestricted = data.playerRestricted;
    const restricted = data.restricted;

    // Get the tab. This variable is not responsive, and we're relying on foundry for future changes
    const tab = $derived(data.tabGroups.main === "overview" && restricted ? "exploration" : data.tabGroups.main);
</script>

<div class="party-sheet">
    <header class="sheet-header">
        <div class="frame-container">
            <div class="frame">
                <img class="player-image" alt={actor.name} src={actor.img} data-tooltip={actor.name} data-edit="img" />
            </div>
        </div>
        <div class="details">
            <input
                name="name"
                class="name"
                id="{actor.uuid}-name"
                type="text"
                disabled={!data.editable}
                value={actor.name}
                placeholder={game.i18n.localize("PF2E.CharacterNamePlaceholder")}
            />
            <label class="actor-type" for="{actor.uuid}-name">{game.i18n.localize("TYPES.Actor.party")}</label>
            {#if data.user.isGM}
                <a class="visibility" class:restricted={playerRestricted} data-action="open-meta-setting">
                    {#if playerRestricted}
                        <i class="fa-solid fa-eye-slash"></i>
                        {game.i18n.localize("PF2E.Actor.Party.Visibility.Restricted")}
                    {:else}
                        <i class="fa-solid fa-eye"></i>
                        {game.i18n.localize("PF2E.Actor.Party.Visibility.Unrestricted")}
                    {/if}
                </a>
            {/if}
        </div>
    </header>

    <SubNavigation>
        {#if !restricted}
            <a class:active={tab === "overview"} data-action="tab" data-group="main" data-tab="overview">
                {game.i18n.localize("PF2E.Actor.Party.Tabs.Overview")}
            </a>
        {/if}
        <a class:active={tab === "exploration"} data-action="tab" data-group="main" data-tab="exploration">
            {game.i18n.localize("PF2E.Actor.Party.Tabs.Exploration")}
        </a>
        <a class:active={tab === "inventory"} data-action="tab" data-group="main" data-tab="inventory">
            {game.i18n.localize("PF2E.Actor.Party.Tabs.Stash")}
        </a>
        {#if data.orphaned.length > 0}
            <a class:active={tab === "orphaned"} data-action="tab" data-group="main" data-tab="orphaned">
                {game.i18n.localize("PF2E.Actor.Party.Tabs.Orphaned")}
            </a>
        {/if}
    </SubNavigation>

    <section class="container">
        <div class="tab fade" data-group="main" data-tab="overview" class:active={tab === "overview"}>
            <OverviewTab state={data} document={actor} />
        </div>

        <div class="tab fade" data-group="main" data-tab="exploration" class:active={tab === "exploration"}>
            <ExplorationTab state={data} />
        </div>

        <div class="tab fade" data-group="main" data-tab="inventory" class:active={tab === "inventory"}>
            <StashTab state={data} />
        </div>

        {#if data.orphaned.length}
            <div class="tab fade" data-group="main" data-tab="orphaned" class:active={tab === "exploration"}>
                <ol class="item-list directory-list">
                    {#each data.orphaned as item}
                        {#if item.isIdentified || data.user.isGM}
                            <li class="item" data-item-type={item.type} data-item-id={item.id}>
                                <div class="item-name">
                                    <a
                                        class="item-image"
                                        data-action="item-to-chat"
                                        style="background-image: url({item.img})"
                                    >
                                        <i class="fa-solid fa-message"></i>
                                    </a>
                                    <h4 class="action-name">{item.name}</h4>
                                </div>
                                <div class="item-controls">
                                    {#if data.editable}
                                        <a data-action="delete-item" data-tooltip="PF2E.DeleteItemTitle">
                                            <i class="fa-solid fa-fw fa-trash"></i>
                                        </a>
                                    {/if}
                                </div>
                            </li>
                        {/if}
                    {/each}
                </ol>
            </div>
        {/if}
    </section>
</div>

<style lang="scss">
    @use "src/styles/mixins/_frames.scss" as frames;
    @use "src/styles//mixins/effects-list";

    .party-sheet {
        --color-border: rgba(0, 0, 0, 0.28);
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;

        background: url("/assets/sheet/background.webp");
        background-repeat: no-repeat;
        background-size: cover;
        background-attachment: local;

        /** Top level properties and reusable classes for the sheet */
        :global {
            .tab.fade {
                transition: opacity 0.2s ease-in-out;
                flex: 1;

                &:not(.active) {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    opacity: 0;
                    pointer-events: none;
                }

                &.active {
                    opacity: 1;
                }
            }

            .actor-link {
                cursor: pointer;
            }

            .readonly {
                pointer-events: none;
                a,
                button {
                    pointer-events: none;
                }
            }

            .elegant-frame {
                border-image-repeat: repeat;
                border-image-slice: 11;
                border-image-source: url("/assets/sheet/frame-elegant.svg");
                border-image-width: 14px;
                border-style: double;
            }

            .tag.light {
                --tag-color: var(--color-proficiency-untrained);
                font: 700 var(--font-size-13) / 1.25rem var(--sans-serif);
                font-variant: all-small-caps;
                &[data-rank="1"] {
                    --tag-color: var(--color-proficiency-trained);
                }
                &[data-rank="2"] {
                    --tag-color: var(--color-proficiency-expert);
                }
                &[data-rank="3"] {
                    --tag-color: var(--color-proficiency-master);
                }
                &[data-rank="4"] {
                    --tag-color: var(--color-proficiency-legendary);
                }
            }

            header.content-header {
                align-items: center;
                background-color: var(--sub);
                color: var(--text-light);
                display: flex;
                font-weight: 600;
                margin-bottom: 0.5rem;
                padding: 0 0.5rem;
                line-height: 2.375rem;

                .buttons {
                    align-items: center;
                    display: flex;
                    margin-left: auto;
                }

                button {
                    background-color: var(--tertiary);
                    border: 1px solid var(--alt-dark);
                    border-radius: 0;
                    color: var(--alt-dark);
                    min-width: 2.375rem;
                    height: 1.875rem;
                    margin: 0;
                    & + button {
                        margin-left: -1px;
                    }
                }

                button:hover {
                    z-index: 1;
                }
            }

            .sidebar {
                overflow: hidden scroll;
                border-right: 1px solid #888;
                box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                gap: 8px;
                height: 100%;
                padding: 0.5rem;
                width: 13.5rem;
            }

            .box-list {
                display: flex;
                color: var(--alt-dark);
                flex-direction: column;
                font-family: var(--sans-serif);
                gap: 0.5rem;
                list-style-type: none;
                padding: 0;
                margin: 0;
            }

            .box {
                border: 1px solid var(--color-border);
                box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.18);
                font-family: var(--sans-serif);
                border-radius: 3px;
                font-size: var(--font-size-12);

                .summary-data > div {
                    align-items: center;
                    display: flex;
                    margin: 0 0.5rem;
                    line-height: 1.375rem;
                    .label {
                        flex: 1;
                        font-weight: 600;
                    }
                }

                hr {
                    /* compensate for border to maintain vertical rhythm */
                    margin: -1px 0;
                }

                .actor-link {
                    img {
                        border: none;
                        width: 2rem;
                        height: 2rem;
                        object-fit: contain;
                    }
                }

                .name {
                    font-weight: 700;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                header,
                footer {
                    position: relative;
                    margin: -1px; /* ensure border radius lines up */
                    padding: 0 0 0 calc(0.5rem + 1px);
                }

                header {
                    background-color: var(--sub);
                    border-radius: 3px 3px 0 0;
                    color: var(--text-light);
                    font-weight: 700;
                    height: 1.375rem;
                    line-height: 1.375rem;
                    margin-bottom: 0;
                }

                footer {
                    background-color: var(--bg-dark);
                    border-radius: 0 0 3px 3px;
                    border: 1px solid var(--color-border);
                    border-top: none;
                    color: var(--sub);
                    font-weight: 500;
                    height: 1.125rem;
                    line-height: 1.125rem;
                    margin-top: 0;
                }
            }
        }
    }

    header.sheet-header {
        background: url("/assets/sheet/header-bw.webp"), url("/assets/sheet/background.webp");
        background-repeat: repeat-x, no-repeat;
        background-size: cover;
        background-color: #2f9d50;
        background-blend-mode: multiply;
        color: var(--text-light);

        width: 100%;
        font-family: var(--sans-serif);
        text-transform: uppercase;
        font-weight: 600;

        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 0.75rem;
        gap: 8px;

        box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);

        .frame-container {
            flex: 0 0 60px;
            padding: 4px; /* frames use shadows to create the border, so we need to offset it */
            margin: 0.75rem 0;

            .frame {
                position: relative;
                width: 2.5rem;
                height: 2.5rem;
            }

            .player-image {
                object-fit: cover;
                object-position: top;
                border: none;
                border-radius: 0;
                width: 100%;
                cursor: pointer;
                border: none;
                box-shadow:
                    0 0 0 1px #918c88,
                    0 0 0 2px #e1d8cf,
                    0 0 0 3px #a98f39,
                    inset 0 0 8px rgba(0, 0, 0, 0.5),
                    0 0 8px black;
            }
        }

        input[type="text"] {
            color: var(--text-light);
            border: none;
            border-bottom: 1px solid transparent;
            &:not(:disabled):hover,
            &:focus {
                border: none;
                border-bottom: 1px solid var(--text-light);
                box-shadow: none;
            }
        }

        .details {
            margin: 4px 0;
            flex: 1;
        }

        .details {
            display: grid;
            grid:
                "name type" 1fr
                "name visibility" auto
                / 1fr auto;
            align-items: center;
            gap: 0 0.5rem;

            font-family: var(--serif-condensed);
            font-size: var(--font-size-28);
            font-weight: 700;

            .name {
                grid-area: name;
                flex: 1;
                font-size: var(--font-size-32);
            }

            .actor-type {
                grid-area: type;
                text-align: end;
            }

            .visibility {
                grid-area: visibility;
                font-size: var(--font-size-14);
                opacity: 0.8;

                i {
                    font-size: 0.9em;
                    margin-right: 0.125rem;
                }
            }
        }
    }

    .container {
        height: 100%;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;

        > .tab {
            display: flex;
            width: 100%;
            flex: 1;
            overflow: hidden;
        }
    }

    .item-list.directory-list {
        @include effects-list;
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 0;
        margin: 0;

        .item {
            margin: 2px 0;
            border: solid transparent;
            border-width: 0 0 1px;
            border-image: linear-gradient(90deg, #f1edea, #d5cac1) 1 repeat;
            .item-summary {
                margin-top: 8px;
            }
        }
    }
</style>
