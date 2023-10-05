import { calculateDC, calculateSimpleDC } from "@module/dc.ts";
import { ProficiencyRank } from "@item/data/index.ts";
import { proficiencyRanksHtml } from "./helpers.ts";

export async function dcTools(): Promise<void> {
    const dcDialog = new Dialog(
        {
            title: "Set DC Simple or By Level",
            content: `
                <form>
                    <div class="form-group">
                        <label for="simple-dc">Simple DC</label>
                        <select id="simple-dc" name="simple-dc">
                            <option></option>
                            ${proficiencyRanksHtml()}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="level-dc">Level-Based DC</label>
                        <input id="level-dc" name="level-dc" type="text" />
                    </div>
                </form>
            `,
            buttons: {
                ok: {
                    label: "Set DC",
                    callback: setDC,
                },
                cancel: {
                    label: "Cancel",
                },
            },
            default: "ok",
        },
        {
            id: "skill-save-prompt-dc-dialog",
            height: 150,
            width: 300,
        }
    );

    dcDialog.render(true);
}

function setDC($html: HTMLElement | JQuery): void {
    const pwlSetting = game.settings.get("pf2e", "proficiencyVariant");
    const proficiencyWithoutLevel = pwlSetting === "ProficiencyWithoutLevel";

    const html = (<JQuery>$html)[0];
    const simpleDC = (<HTMLInputElement>html.querySelector("select#simple-dc")).value as ProficiencyRank;
    const levelDC = (<HTMLInputElement>html.querySelector("input#level-dc")).value;

    let dc = null;
    if (simpleDC) {
        dc = calculateSimpleDC(simpleDC, { proficiencyWithoutLevel });
    } else if (levelDC) {
        dc = calculateDC(+levelDC, { proficiencyWithoutLevel });
    }

    if (dc) {
        const dcEl = document.querySelector("form.skill-save-prompt input#dc");
        if (dcEl instanceof HTMLInputElement) {
            dcEl.value = dc.toString();
        }
    }
}
