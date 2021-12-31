import { MigrationBase } from "./base";
import { MigrationRunner } from "./runner";
import * as Migrations from "./migrations";
export { MigrationRunner } from "./runner";

export class MigrationList {
    private static list = Object.values(Migrations);

    static get latestVersion(): number {
        return Math.max(...this.list.map((Migration) => Migration.version));
    }

    static constructAll(): MigrationBase[] {
        return this.list.map((Migration) => new Migration());
    }

    static constructFromVersion(version: number = MigrationRunner.RECOMMENDED_SAFE_VERSION): MigrationBase[] {
        return this.list.filter((Migration) => Migration.version > version).map((Migration) => new Migration());
    }

    static constructRange(min: number, max = Infinity): MigrationBase[] {
        return this.list
            .filter((Migration) => Migration.version >= min && Migration.version <= max)
            .map((Migration) => new Migration());
    }
}
