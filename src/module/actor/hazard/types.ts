import { ActionPF2e } from "@item";

interface HazardActionSheetData {
    passive: ActionsDetails;
    free: ActionsDetails;
    reaction: ActionsDetails;
    action: ActionsDetails;
}

interface ActionsDetails {
    label: string;
    actions: ActionPF2e[];
}

export { HazardActionSheetData };
