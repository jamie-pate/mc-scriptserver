import { accessSync } from 'node:fs';

import { sync as whichSync } from 'https://esm.sh/which';
import {
  Config,
  DeepPartial,
  ScriptServer,
} from 'https://esm.sh/@scriptserver/core?dev';
import {
  EssentialsConfig,
  useEssentials,
} from 'https://esm.sh/@scriptserver/essentials?dev';
import { EventConfig } from 'https://esm.sh/@scriptserver/event?dev';
import { JsonConfig } from 'https://esm.sh/@scriptserver/json?dev';
import { source } from 'https://esm.sh/common-tags';
import NatApi from 'https://esm.sh/@silentbot1/nat-api@0.4.7?dev';
import { useCombatTp } from './combat-tp.ts';
//import { useLifeSteal } from './lifesteal.ts';
import { readServerProperties, ServerProperties } from './server-properties.ts';
import { CombatTpConfig } from './combat-tp.ts';
import { useResourcePacks } from './resource-packs.ts';

async function tryReadServerProperties(dir: string) {
  const SERVER_FIRST_RUN_DELAY = 60000; // 5 seconds
  try {
    return await readServerProperties(dir);
  } catch (ex) {
    console.dir(ex);
    if (ex.code === 'ENOENT') {
      const server = await startServer(dir, null);
      server.javaServer.on('console', (msg: string) => {
        if (msg.startsWith('You need to agree to the EULA')) {
          Deno.exit(1);
        }
      });
      await new Promise<never>(() =>
        setTimeout(() => {
          console.error(
            `Tried to run the server to create ${dir}/server.properties, please edit to accept the EULA?`,
          );
          Deno.exit(1);
        }, SERVER_FIRST_RUN_DELAY)
      );
      // never happens
      throw ex;
    } else {
      throw ex;
    }
  }
}

addEventListener('error', (err: ErrorEvent) => {
  console.error('Uncaught exception: ', err);
});
main(`${Deno.cwd()}/server`).catch((ex) => {
  console.error(ex.stack);
  Deno.exit(1);
});

async function main(serverDir: string) {
  const serverProperties: ServerProperties = await tryReadServerProperties(
    serverDir,
  );
  //const server =
  await startServer(
    serverDir,
    serverProperties,
    serverProperties.rconPassword,
    serverProperties.rconPort,
    serverProperties.serverPort
  );
}

type ServerConfig = DeepPartial<
  Config & {
    event: EventConfig;
    essentials: EssentialsConfig;
    json: JsonConfig;
    combatTp: CombatTpConfig;
  }
>;

function startServer(
  serverDir: string,
  serverProperties: Record<string, string> | null,
  rconPassword: string | null = null,
  rconPort: string | null = null,
  port: string | null = null,
) {
  const commands = source`
    /trigger withdraw to withdraw a heart. You have to stand still for teleports!
    ~sethome [name], ~delhome [name], ~home [name] (tp home),
    ~spawn (tp to spawn),
    ~setwarp <name>, ~delwarp <name>, ~warp <name>,
    ~tpa <username> (tp to user),
    ~tpahere <username> (tp user here),
    ~tpaccept, ~tpdeny,
    ~back (teleport back), ~day, ~night, ~weather`;
  const config: ServerConfig = {
    javaServer: {
      // path doesn't work in deno child_process
      path: serverDir,
      jar: `server.jar`,
      args: ['-Xmx2048M'],
    },
    rconConnection: {
      port: rconPort ? parseInt(rconPort) : 25575,
      password: rconPassword || '',
    },
    essentials: {
      motd: {
        firstTime:
          `Welcome to the server, \${player}! Commands are:\n${commands}`,
        text: `Welcome back \${player}! Commands are:\n${commands}`,
      },
      warp: {
        opOnly: false
      },

      starterKit: {
        enabled: false,
      },
    },
    json: { path: `${serverDir}/json` },
    combatTp: {
    },
    event: {
      flavorSpecific: {
        default: {
          // Doesn't match online-mode=false servers!
          parseChatEvent(consoleOutput: string) {
            const parsed = consoleOutput.match(
              /^\[.+?\]:(?: \[Not Secure\])? <(\w+)> (.*)/i,
            );
            if (parsed) {
              return {
                player: parsed[1] as string,
                message: parsed[2] as string,
              };
            }
          },
        },
      },
    },
  };
  const natClient = new NatApi({ enablePMP: true, enableUPNP: true });
  const server = new ScriptServer(config);
  useResourcePacks(server, serverProperties);
  useEssentials(server);
  useCombatTp(server);
  //useLifeSteal(server);
  const oldDir = Deno.cwd();
  Deno.chdir(serverDir);
  checkEnv(config);
  try {
    server.start();
    console.log(`Launched ${server.javaServer.process.spawnargs.join(' ')}`);
    server.javaServer.on(
      'error',
      (err: Error) =>
        `Error with ${server.javaServer.process.spawnargs}: ${
          err.stack || err
        }`,
    );
    const portNum = port ? parseInt(port, 10) : 0;
    if (portNum) {
      natClient.map(portNum)
        .then(() => console.log(`upnp port mapped: ${port}`))
        .catch((err: Error) =>
          console.log(`upnp port failed: ${err.message || err}`)
        );
    }
  } catch (ex) {
    if (server.javaServer.process && !server.javaServer.pid) {
      console.warn(
        `Error launching ${server.javaServer.process.spawnargs.join(' ')}`,
      );
    }
    throw ex;
  }
  Deno.chdir(oldDir);

  return server as ScriptServer;
}

function checkEnv(config: ServerConfig) {
  const exe = Deno.build.os === 'windows' ? '.exe' : '';
  accessSync(whichSync(`java${exe}`));
  try {
    accessSync('server.jar');
  } catch (ex) {
    (ex as Error).message += `: in ${Deno.cwd()}`;
    throw ex;
  }
}
