import { relative } from 'https://deno.land/std@0.155.0/path/posix.ts';

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
import { source } from 'https://esm.sh/common-tags';

type ServerProperties = Record<string, string>;

main(`${Deno.cwd()}/server`).catch((ex) => {
  console.error(ex.stack);
  Deno.exit(1);
});

async function main(serverDir: string) {
  const serverProperties: ServerProperties = await readServerProperties(
    serverDir,
  );
  //const server =
  await startServer(serverDir, serverProperties.rconPassword);
}

async function readServerProperties(dir: string) {
  const SERVER_FIRST_RUN_DELAY = 60000; // 5 seconds
  try {
    console.log('reading server.properties');
    return (await Deno.readTextFile(`${dir}/server.properties`)).split(/\r?\n/g)
      .map((line) => {
        const match = /^([^=]+)=(.*)$/.exec(line);
        if (line.trimStart().startsWith('#') || !match) {
          return null;
        }
        const key = String(match[1]).replace(
          /[-.]([a-z])/g,
          (m) => m[1].toUpperCase(),
        );
        return [key, match[2]] as [string, string];
      }).filter((v): v is [string, string] =>
        !!v && typeof v[0] === 'string' && typeof v[1] === 'string'
      )
      .reduce((r, [key, value]) => {
        r[key] = value;
        return r;
      }, {} as ServerProperties);
  } catch (ex) {
    console.dir(ex);
    if (ex.code === 'ENOENT') {
      const server = await startServer(dir);
      server.javaServer.on('console', (msg) => {
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

function startServer(serverDir: string, rconPassword: string | null = null) {
  const commands = source`
    ~sethome [name], ~delhome [name], ~home [name] (tp tp home),
    ~spawn (tp to spawn),
    ~setwarp <name>, ~delwarp <name>, ~warp <name>,
    ~tpa <username> (tp to user),
    ~tpahere <username> (tp user here),
    ~tpaccept, ~tpdeny,
    ~back (teleport back), ~day, ~night, ~weather`;
  const config: DeepPartial<
    Config & { event: EventConfig; essentials: EssentialsConfig }
  > = {
    javaServer: {
      // path doesn't work in deno child_process
      path: relative(Deno.cwd(), serverDir),
      jar: `server.jar`,
      args: ['-Xmx1024M', '-Xms1024M'],
    },
    rconConnection: {
      port: 25575,
      password: rconPassword || '',
    },
    essentials: {
      motd: {
        firstTime:
          `Welcome to the server, \${player}! Commands are:\n${commands}`,
        text: `Welcome back \${player}! Commands are:\n${commands}`,
      },
      warp: {
        opOnly: false,
      },
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
  const server = new ScriptServer(config);
  useEssentials(server);
  const oldDir = Deno.cwd();
  Deno.chdir(serverDir);
  server.start();
  Deno.chdir(oldDir);

  return server as ScriptServer;
}
