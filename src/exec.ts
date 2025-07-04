/**
 * @File   : index.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 10/28/2019, 11:23:14 AM
 */

import * as process from 'process';
import { program } from 'commander';
import { gEnv } from './lib/env';
import { Init } from './commands/init';
import { Package } from './commands/package';
import { Publish } from './commands/publish';
import { Build } from './commands/build';
import { Emmy } from './commands/emmy';
import { Config } from './commands/config';
import { Locale } from './commands/locale';
import { Update } from './commands/update';
import { Global } from './commands/global';
import { NgaPublish } from './commands/nga';
import { ChangeLog } from './commands/changelog';

class App {
    optBuilds(args: string[]) {
        const builds = args.map((x) => gEnv.toBuildId(x)).filter((x) => x);
        return builds.length > 0 ? builds : undefined;
    }

    run() {
        program
            .command('init')
            .description('Init your addon project.')
            .action(async () => {
                await new Init().run();
            });

        program
            .command('package')
            .arguments('[builds...]')
            .description('Package your addon.')
            .action(async (args: string[]) => {
                await new Package().run(this.optBuilds(args));
            });

        program
            .command('publish')
            .option('-T, --token <token>', 'Your curse API token')
            .arguments('[builds...]')
            .description('Publish your addon.')
            .action(async (args: string[], opts) => {
                await new Publish().run({ token: opts.token, builds: this.optBuilds(args) });
            });

        program
            .command('nga')
            .option('-C, --cookie <cookie>', 'Your NGA cookie')
            .arguments('[builds...]')
            .description('Publish your addon to NGA.')
            .action(async (args: string[], opts) => {
                await new NgaPublish().run({ cookie: opts.cookie, builds: this.optBuilds(args) });
            });

        program
            .command('build')
            .arguments('[build]')
            .option('-O --output <output>')
            .description('watch the addon')
            .action(async (buildKey: string, opts) => {
                const buildId = gEnv.toBuildId(buildKey);
                if (!buildId) {
                    console.error(`Invalid build id: ${buildKey}`);
                    return;
                }
                await new Build().run(opts.output, buildId);
            });

        program
            .command('watch')
            .arguments('[build]')
            .option('-O --output <output>')
            .description('watch the addon')
            .action(async (buildKey: string, opts: { output?: string }) => {
                const buildId = gEnv.toBuildId(buildKey);
                if (!buildId) {
                    console.error(`Invalid build id: ${buildKey}`);
                    return;
                }
                await new Build(true).run(opts.output, buildId);
            });

        program
            .command('emmyui')
            .alias('emmylua')
            .alias('emmy')
            .option('--blizzard')
            .description('gen ui')
            .action(async (opts: { blizzard?: boolean }) => {
                await new Emmy(opts.blizzard).run();
            });

        program
            .command('config')
            .description('config wct')
            .action(async () => {
                await new Config().run();
            });

        program
            .command('update')
            .description('Update your code')
            .action(async () => {
                await new Update().run();
            });

        program
            .command('global')
            .option('-O, --output <output>', 'Output file')
            .description('scan _G')
            .action(async (opts) => {
                await new Global().run(opts.output);
            });

        program.command('changelog')
            .description('generate changelog')
            .action(async () => {
                await new ChangeLog().run();
            });

        {
            const locale = program.command('locale');

            locale
                .command('export')
                .description('export locale')
                .option('-T, --token <token>', 'Your curse API token')
                .action(async (opts) => {
                    await new Locale(opts.token || process.env.CURSE_TOKEN).export();
                });

            locale
                .command('import')
                .description('import locale')
                .option('-T, --token <token>', 'Your curse API token')
                .action(async (opts) => {
                    await new Locale(opts.token || process.env.CURSE_TOKEN).import();
                });

            locale
                .command('scan')
                .description('scan locale')
                .action(async () => {
                    await new Locale('').scan();
                });
        }

        program.parse(process.argv);
    }
}

new App().run();
