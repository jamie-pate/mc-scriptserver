import { ScriptServer } from 'https://esm.sh/@scriptserver/core?dev';
//import { zip } from 'https://esm.sh/zip-a-folder';

export async function useResourcePacks(server: ScriptServer, serverProperties: Record<string, string> | null) {
    const EXPECTED_SERVER_PROPERTIES = new Map([
        ['enableRcon', 'true'],
        ['functionPermissionLevel', '3']
    ]);
    if (serverProperties) {
        for (const [key, value] of EXPECTED_SERVER_PROPERTIES) {
            if (serverProperties[key] !== value) {
                throw new Error(`Expected Server properties ${key}=${value} (found ${serverProperties[key]})`);
            }
        }
    }
    // https://www.ibm.com/docs/en/db2/11.5?topic=task-unix-cron-format
    const UNBAN_SCHEDULE = "* * * * *"
    const WB_SIZE = 20000;
    // maybe we need to zip a clientdatapack later?
    // const dataPackDir = 'server/world/datapacks';
    // const dataPacks = [
    //     'combatlogging',
    //     'lm-lifesteal'
    // ];
    // for (const pack of dataPacks) {
    //     await zip(`${dataPackDir}/${pack}`, `${dataPackDir}/${pack}.zip`)
    // }

    server.rconConnection.on('connected', async () => {
        await server.rconConnection.send(`worldborder set ${WB_SIZE}`);
        await server.rconConnection.send('function lm_lifesteal:load');
        //await server.rconConnection.send('function combatlogging:load');
        console.log(`Starting unban chron job with the following schedule: ${UNBAN_SCHEDULE}`);
        Deno.cron('Unban banned users', UNBAN_SCHEDULE, async () => {
            const response = await server.rconConnection.send('banlist');
            const matches = response.matchAll(/\b([\w]+) was banned by [\w]+: "([^"]+)"/g);
            for (const [, player, reason] of matches) {
                // max0verdrive was banned by Server: "lost at lifesteal"
                if (player && reason === "lost at lifesteal") {
                    const objectives = [
                        'Hearts',
                        'Deaths',
                        'Kills',
                        'Other'
                    ];
                    for (const o of objectives) {
                        await server.rconConnection.send(`scoreboard players set ${player} ${o} 0`);
                    }
                    await server.rconConnection.send('gamemode survival @s');
                    await server.rconConnection.send(`pardon ${player}`);
                }
            }
        });
    });
}
