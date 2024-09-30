import { JavaServer, ScriptServer } from 'https://esm.sh/@scriptserver/core?dev';
// this is supposed to add the 'json' property to ScriptServer but doesn't?
import 'https://esm.sh/@scriptserver/json';
import 'https://esm.sh/@scriptserver/command'
import { CommandCallback, CommandEvent } from 'https://esm.sh/@scriptserver/command';

const TEST_MODE = false;

const MS_PER_SECOND = 1000;


const MODULE_KEY = 'combat_tp';

export interface CombatTpConfig {
  /**
   * Stand still for this many seconds to teleport
   */
  tpCountdown?: number
}

export const DEFAULT_COMBAT_TP_CONFIG: Required<CombatTpConfig> = {
  tpCountdown: 5
}

let saving: Promise<void> | null = null;
export function useCombatTp(server: ScriptServer) {
  const config = (server.config as unknown as {combatTp: CombatTpConfig}).combatTp as Required<CombatTpConfig>;
  const onlinePlayers = new Set<string>();
  for (const [key, value] of Object.entries(DEFAULT_COMBAT_TP_CONFIG)) {
    if (!(key in config)) {
      (config as Record<string, unknown>)[key] = value;
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

  function send(command: string) {
    console.log(`Send command: ${command}`);
    server.javaServer.send(command);
  }

  async function rconSend(command: string) {
    console.log(`Rcon send: ${command}`);
    return await server.rconConnection.send(command);
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
