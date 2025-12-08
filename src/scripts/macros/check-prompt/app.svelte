<script lang="ts">

    const localize = game.i18n.localize.bind(game.i18n);
    let state = $state({
		dc: "set-dc",
		skillSave: "skill",
        rollOptions: false,
	});
    const dcTabs = [
        {
            name: "set-dc",
            label: localize("PF2E.Actor.Party.CheckPrompt.SetDC"),
        },
        {
            name: "simple-dc",
            label: localize("PF2E.Actor.Party.CheckPrompt.SimpleDC"),
        },
        {
            name: "level-dc",
            label: localize("PF2E.Actor.Party.CheckPrompt.LevelDC"),
        },
    ]
	const skillSaveTabs =
	[
        {
            name: "skill",
            label: localize("PF2E.Actor.Party.CheckPrompt.SkillsPerception"),
        },
        {
            name: "save",
            label: localize("PF2E.SavesHeader"),
        },
    ]
    const partyLevel = 1;
</script>

<div class="content standard-form">
    <section class="title">
        <label for="check-prompt-title">{localize("PF2E.Actor.Party.CheckPrompt.PromptTitle")}</label>
        <input id="check-prompt-title" name="title" type="text"/>
    </section>
    <nav class="dc-tabs">
        {#each dcTabs as tab}
            <button
                class:active={state.dc===tab.name}
                onclick={() => state.dc = tab.name}
                data-tab-name={tab.name}
            >
                {tab.name}
            </button>
        {/each}
    </nav>
    <section class="dc-content">
        {#if state.dc=="set-dc"}
            <div class="form-group dc">
                <label for="check-prompt-dc">{localize("PF2E.Actor.Party.CheckPrompt.SetDC")}</label>
                <input type="number" id="check-prompt-dc" name="dc" />
            </div>
        {:else if state.dc=="simple-dc"}
            <div class="form-group">
                <label for="check-prompt-simple-dc">{localize("PF2E.Actor.Party.CheckPrompt.SimpleDC")}</label>
                <select id="check-prompt-simple-dc" name="simple-dc">
                    <option></option>
                    <!-- {{#each @root.proficiencyRanks}}
                        <option value="{{this.value}}">{{this.label}}</option>
                    {{/each}} -->
                </select>
            </div>
        {:else}
            <div class="form-group">
                <label for="check-prompt-level-dc">{localize("PF2E.LevelLabel")}</label>
                <input type="number" id="check-prompt-level-dc" name="level-dc" value="{{partyLevel}}" />
            </div>
        {/if}
    </section>
    <div class="form-group">
        <label for="check-prompt-adjust-difficulty">{localize("PF2E.Actor.Party.CheckPrompt.AdjustDifficulty")}</label>
        <select id="check-prompt-adjust-difficulty" name="adjust-difficulty">
            <option></option>
            <!-- {{#each @root.dcAdjustments}}
                <option value="{{this.value}}">{{this.label}}</option>
            {{/each}} -->
        </select>
    </div>
    <nav class="skill-save-tabs">
        {#each skillSaveTabs as tab}
            <button
                class:active={state.skillSave===tab.name}
                onclick={() => state.skillSave = tab.name}
                data-tab-name={tab.name}
            >
                {tab.label}
            </button>
        {/each}
    </nav>
    <section class="check-prompt-content">
        {#if state.skillSave=='skill'}
            <div class="form-group">
                <input id="check-prompt-skills" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseSkills")}" />
            </div>
            <div class="form-group lores">
                <input id="check-prompt-lores" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseLores")}" />
            </div>
            <div class="form-group">
                <div class="form-group add-roll-options-group">
                    <button
                        id="add-roll-options"
                        class="add-roll-options"
                        onclick={() => {
                            state.rollOptions = !state.rollOptions
                        }}
                    >
                        <i hidden={state.rollOptions} class="fa-solid fa-plus"></i><i hidden={!state.rollOptions} class="fa-solid fa-minus"></i>
                        {localize("PF2E.ChatRollDetails.RollOptions")}
                    </button>
                </div>
                <div class="form-group secret">
                    <label for="check-prompt-secret">{localize("PF2E.Actor.Party.CheckPrompt.SecretCheck")}</label>
                    <input id="check-prompt-secret" name="secret" type="checkbox" />
                </div>
            </div>
            {#if state.rollOptions==true}
                <div class="roll-options">
                    <div class="form-group">
                        <input id="check-prompt-actions" placeholder="{localize("PF2E.ActionActionsLabel")}" />
                    </div>
                    <div class="form-group">
                        <input id="check-prompt-traits" placeholder="{localize("PF2E.ChatRollDetails.RollOptions")}" />
                    </div>
                </div>
            {/if}
        {:else if state.skillSave=="save"}
            <div class="form-group">
                <input id="check-prompt-saves" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseSaves")}" />
            </div>
            <div class="form-group">
                <label for="check-prompt-basic-save">{localize("PF2E.Item.Spell.Defense.BasicSave")}</label>
                <input id="check-prompt-basic-save" name="basic-save" type="checkbox" />
            </div>
        {/if}
    </section>
</div>

<style>

		nav {
        flex: 0;
        width: 100%;
        border-style: solid;
        border-width: 9px;
        border-image: url("/assets/sheet/corner-box.webp") 9 repeat;
        background:
            url("/assets/sheet/border-pattern.webp") repeat-x top,
            url("/assets/sheet/border-pattern.webp") repeat-x bottom,
            var(--secondary);


        button {
            border: none;
            color: var(--sidebar-label);
            background: var(--secondary);
            line-height: unset;
            font-family: var(--sans-serif);
            font-size: var(--font-size-12);
            position: relative;
            cursor: pointer;
            max-width: fit-content;
            padding: 0.2em 1.5em 0.2em 1.5em;

            &.active {
                outline: unset;
                box-shadow: unset;

                &::after {
                    bottom: -0.25em;
                    position: absolute;
                    content: "";
                    width: 0;
                    height: 0;
                    border-left: 0.25em solid transparent;
                    border-right: 0.25em solid transparent;
                    border-top: 0.25em solid var(--sidebar-label);
                }
            }
				}
		}
</style>