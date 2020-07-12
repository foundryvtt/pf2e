export default function registerHandlebarsHelpers() {
    Handlebars.registerHelper('add', function(a, b) {
        return a + b;
    });

    Handlebars.registerHelper('if_all', function () {
        const args = [].slice.apply(arguments);
        const opts = args.pop();

        let { fn } = opts;
        for (let i = 0; i < args.length; ++i) {
            if (args[i]) continue;
            fn = opts.inverse;
            break;
        }
        return fn(this);
    });

    Handlebars.registerHelper('if_stamina', function(options) {
        if(game.settings.get('pf2e', 'staminaVariant') > 0) {
            return options.fn(this);
        }
        return ''

    });

    Handlebars.registerHelper('lower', function(str) {
        return String.prototype.toLowerCase.call(str ?? '');
    });

    Handlebars.registerHelper('multiply', function(a, b) {
        return a * b;
    });

    Handlebars.registerHelper('strip_tags', (value, options) => {
        function strip_tags(input, allowed?) { // eslint-disable-line camelcase
            const _phpCastString = function (value) {
                const type = typeof value;
                switch (type) {
                    case 'boolean':
                        return value ? '1' : '';
                    case 'string':
                        return value;
                    case 'number':
                        if (isNaN(value)) {
                            return 'NAN';
                        }

                        if (!isFinite(value)) {
                            return `${value < 0 ? '-' : ''}INF`;
                        }

                        return `${value}`;
                    case 'undefined':
                        return '';
                    case 'object':
                        if (Array.isArray(value)) {
                            return 'Array';
                        }

                        if (value !== null) {
                            return 'Object';
                        }

                        return '';
                    case 'function':
                        // fall through
                    default:
                        throw new Error('Unsupported value type');
                }
            };

            // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
            allowed = ((`${allowed || ''}`).toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');

            const tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi;
            const commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

            let after = _phpCastString(input);
            // removes tha '<' char at the end of the string to replicate PHP's behaviour
            after = (after.substring(after.length - 1) === '<') ? after.substring(0, after.length - 1) : after;

            // recursively remove tags to ensure that the returned string doesn't contain forbidden tags after previous passes (e.g. '<<bait/>switch/>')
            while (true) {
                const before = after;
                after = before.replace(commentsAndPhpTags, '').replace(tags, ($0, $1) => (allowed.indexOf(`<${$1.toLowerCase()}>`) > -1 ? $0 : ''));

                // return once no more tags are removed
                if (before === after) {
                    return after;
                }
            }
        }

        return strip_tags(String(value));
    });
}
