import { MigrationBase } from './base';

export class Migration573ActorLanguages extends MigrationBase {
    static version = 0.573;
    async updateActor(actor: any) {
        if (actor.data?.traits?.languages?.value) {
            const languages = actor.data.traits.languages.value.map((language: any) => {
                const l = language.toString().toLowerCase();
                if (l === 'dwarvish') {
                    return 'dwarven';
                }
                return l;
            });

            actor.data.traits.languages.value = languages;
        }
    }
}
