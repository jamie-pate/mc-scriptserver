import { JavaServer, ScriptServer } from 'https://esm.sh/@scriptserver/core?dev';
// this is supposed to add the 'json' property to ScriptServer but doesn't?
import 'https://esm.sh/@scriptserver/json';
import 'https://esm.sh/@scriptserver/command'
import { CommandCallback, CommandEvent } from 'https://esm.sh/@scriptserver/command';

const TEST_MODE = false;

const MS_PER_SECOND = 1000;

const INTERVAL = 10 * MS_PER_SECOND;

export interface CombatTpConfig {
  /**
   * Stand still for this many seconds to teleport
   */
  tpDelay?: number
}

export const DEFAULT_COMBAT_TP_CONFIG: Required<CombatTpConfig> = {
  tpDelay: 5,
}

export interface McLocation {x: number; y: number; z: number; dimension: string}

let saving: Promise<void> | null = null;
export function useCombatTp(server: ScriptServer) {
  const config = (server.config as unknown as {combatTp: CombatTpConfig}).combatTp as Required<CombatTpConfig>;
  const onlinePlayers = new Set<string>();
  for (const [key, value] of Object.entries(DEFAULT_COMBAT_TP_CONFIG)) {
    if (!(key in config)) {
      (config as Record<string, unknown>)[key] = value;
    }
  }

  const protectedCommandList = [
    'home',
    'spawn',
    'warp',
    'tpa',
    'tpahere',
    'tpaccept',
    'back'
  ]
  type Timeout = ReturnType<typeof setTimeout>;
  const playerCmdPos: Record<string, {timeout: Timeout, pos: McLocation, command: string, player: string}> = {};
  const playerAcceptPos: Record<string, {
    targetPos: McLocation,
    sourcePos: McLocation,
    command: string,
    target: string,
    source: string
  }> = {};

  for (const [cmd, callbacks] of Object.entries(server.javaServer.config.command.commands as Record<string, CommandCallback[]>)) {
    if (protectedCommandList.includes(cmd)) {
      for (let i = 0; i < callbacks.length; ++i) {
        callbacks[i] = wrapCallback(callbacks[i])
      }
    }
  }

  server.javaServer.on('console', (line: string) => {
    line = line.trim();
    const joined = /^\[[^\]]+] \[[^\]]+]: ([\w]+) joined the game$/.exec(line);
    if (joined) {
      onlinePlayers.add(joined[1]);
    }
    const left = /^\[[^\]]+] \[[^\]]+]: ([\w]+) left the game$/.exec(line);
    if (left) {
      onlinePlayers.delete(left[1]);
    }
  });

  function wrapCallback(cb: CommandCallback): CommandCallback {
    return async function (event: CommandEvent) {
      if (['tpa', 'tpahere'].includes(event.command)) {
        const targetPlayer = event.args[0];
        if (playerAcceptPos[targetPlayer]) {
          const ap = playerAcceptPos[targetPlayer];
          denyTp(ap.source, `Cancelled ${ap}`, 'blue');
        }
        playerAcceptPos[targetPlayer] = {
          targetPos: await getLocation(targetPlayer),
          sourcePos: await getLocation(event.player),
          command: event.command,
          source: event.player,
          target: event.args[0]
        };
        cb(event);
      } else {
        server.rconConnection.util.tellRaw(`${event.command} in ${config.tpDelay}s. Please stand still.`, event.player);
      }
      if (playerCmdPos[event.player]) {
        const cp = playerCmdPos[event.player];
        clearTimeout(cp.timeout)
        denyTp(event.player, `Cancelled ${cp.command}`, 'blue');
      }

      playerCmdPos[event.player] = {
        timeout: setTimeout(checkStationaryCb, config.tpDelay * MS_PER_SECOND),
        pos: await server.rconConnection.util.getLocation(event.player),
        command: event.command,
        player: event.player
      };
      if (event.command === 'tpaccept') {
        const ap = playerAcceptPos[event.player];
        if (ap.command === 'tpa') {
            //teleport to another player, you need to stand still until tpaccept+5s
            ap.sourcePos = await getLocation(ap.source);
        } else if (ap.command === 'tpahere') {
            ap.targetPos = await getLocation(ap.target);
            // teleport another player to you, they need to stand still for 5s after tpaccept
        }
      }

      async function checkStationaryCb() {
        // this happens after the timeout
        const ap = event.command == 'tpaccept' ? playerAcceptPos[event.player] : null;
        const cp = playerCmdPos[event.player];
        delete playerAcceptPos[event.player];
        delete playerCmdPos[event.player];

        let cmd = event.command;
        let pos = await getLocation(event.player);
        let refPos = cp.pos;
        let stationaryPlayer = event.player;
        if (ap) {
          cmd = `${cmd} (${ap.command})`;
          if (ap.command === 'tpa') {
            //teleport to another player, you need to stand still until tpaccept+5s
            stationaryPlayer = ap.source;
            pos = await getLocation(ap.source);
            refPos = ap.sourcePos;
          } else if (ap.command === 'tpahere') {
            stationaryPlayer = ap.target;
            // teleport another player to you, they need to stand still for 5s after tpaccept
            refPos = ap.targetPos;
          }
        }
        if (posClose(pos, refPos)) {
          cb(event);
        } else {
          if (ap) {
            denyTp(ap.source, `Cancelled ${cmd} because ${stationaryPlayer} moved!`);
          }
          denyTp(event.player, `Cancelled ${cmd} because ${stationaryPlayer} moved!`);
        }
        function posClose(a: McLocation, b: McLocation) {
          for (const [k, v] of Object.entries(a) as [keyof McLocation, number|string][]) {
            const bv = b[k];
            if (typeof v === 'number' && typeof bv === 'number') {
              if (Math.abs(v - bv) > 1.0) {
                return false
              }
            } else if (v != bv) {
              return false;
            }
          }
          return true;
        }
      }
    }
  }

  function denyTp(player: string, reason: string, color = 'red') {
    server.rconConnection.util.tellRaw(`Unable to teleport, ${reason}`, player, {color});
  }

  function send(command: string) {
    console.log(`Send command: ${command}`);
    server.javaServer.send(command);
  }

  async function rconSend(command: string) {
    console.log(`Rcon send: ${command}`);
    return await server.rconConnection.send(command);
  }

  async function getLocation(player: string) {
    return await server.rconConnection.util.getLocation(player) as McLocation;
  }

  // eventually save values from a map
  function save<K, V>(prop_key: string, map: Map<K, V>): Promise<void> {
    if (saving) {
      return saving.then(() => save(prop_key, map));
    } else {
      return saving = server.json.set(MODULE_KEY, prop_key, Array.from(map))
        .then(() => {
          saving = null;
        }).catch((err: Error) => {
          console.error('Error saving state', err);
        });
    }
  }

  // eventually load values into a map
  function load<K, V>(prop_key: string, map: Map<K, V>) {
    return server.json.get(MODULE_KEY, prop_key).then((saved: [K, V][]) => {
      if (saved && Array.isArray(saved)) {
        for (const [key, value] of saved) {
          map.set(key, value);
        }
      }
    }).catch(console.error);
  }
}
