import type { ProgressNotification } from "@client/applications/ui/notifications.d.mts";

/**
 * An alternative API for Notification loading bars
 * @category Other
 */
class Progress {
    value = 0;

    readonly max: number;

    label: string;

    notification: ProgressNotification;

    constructor({ max, label = "" }: { max: number; label?: string }) {
        this.max = max;
        this.label = label;
        this.notification = ui.notifications.info(this.label, { progress: true });
    }

    advance({ by = 1, label = this.label }: { by?: number; label?: string } = {}): void {
        if (this.value === this.max) return;
        this.value += Math.abs(by);
        this.notification.update({ message: label, pct: this.value / this.max });
    }

    close({ label = "" } = {}): void {
        this.notification.update({ message: label, pct: 1 });
    }
}

export { Progress };
