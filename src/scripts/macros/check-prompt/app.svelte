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
    <section class="form-group title">
        <label for="check-prompt-title">{localize("PF2E.Actor.Party.CheckPrompt.PromptTitle")}</label>
        <input id="check-prompt-title" name="title" type="text"/>
    </section>
    <hr>
    <nav class="dc tabs">
        {#each dcTabs as tab}
            <button
                class:active={state.dc===tab.name}
                onclick={() => state.dc = tab.name}
                data-tab-name={tab.name}
            >
                {tab.label}
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
    <hr>
    <nav class="skill-save tabs">
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
                <input id="check-prompt-skills" type="text" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseSkills")}" />
            </div>
            <div class="form-group lores">
                <input id="check-prompt-lores" type="text" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseLores")}" />
            </div>
            <div class="form-group">
                <div class="add-roll-options-group">
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
                        <input id="check-prompt-actions" type="text" placeholder="{localize("PF2E.ActionActionsLabel")}" />
                    </div>
                    <div class="form-group">
                        <input id="check-prompt-traits" type="text" placeholder="{localize("PF2E.ChatRollDetails.RollOptions")}" />
                    </div>
                </div>
            {/if}
        {:else if state.skillSave=="save"}
            <div class="form-group">
                <input id="check-prompt-saves" type="text" placeholder="{localize("PF2E.Actor.Party.CheckPrompt.ChooseSaves")}" />
            </div>
            <div class="form-group">
                <label for="check-prompt-basic-save">{localize("PF2E.Item.Spell.Defense.BasicSave")}</label>
                <input id="check-prompt-basic-save" name="basic-save" type="checkbox" />
            </div>
        {/if}
    </section>
    <hr>
</div>

<style>
    .form-group {
        clear: both;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: 3px 0;
        align-items: center;

        .secret {
            text-align: right;
        }

        .add-roll-options-group {

            text-align: left;
        }
    }

    button {
        display: flex;
        justify-content: center;
        height: var(--button-size);
        min-height: var(--button-size);
        gap: 0.25rem;
        padding: 0 0.5rem;
        background: var(--button-background-color);
        border: 1px solid var(--button-border-color);
        border-radius: 4px;
        color: var(--button-text-color);
        font-family: var(--font-sans);
        font-size: var(--font-size-14);
        line-height: normal;
        text-decoration: none;
        cursor: var(--cursor-pointer);
        transition: 0.5s;
    }

    .tabs {
        align-items: center;
        display: flex;
        flex-flow: row nowrap;
        gap: 0;
        line-height: unset;
        justify-content: space-around;
        border-top: unset;
        border-bottom: unset;
    }
</style>