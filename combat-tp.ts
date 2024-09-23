import { JavaServer, ScriptServer } from 'https://esm.sh/@scriptserver/core?dev';
// this is supposed to add the 'json' property to ScriptServer but doesn't?
import 'https://esm.sh/@scriptserver/json';
import 'https://esm.sh/@scriptserver/command'
import { CommandCallback, CommandEvent } from 'https://esm.sh/@scriptserver/command';

const TEST_MODE = false;

const MS_PER_SECOND = 1000;

const INTERVAL = 10 * MS_PER_SECOND;

const MODULE_KEY = 'combat_tp';
const DMG_KEY = 'combat_dmg';
const COOLDOWN_KEY = 'tp_cooldowns';
const IN_COMBAT_KEY = 'in_combat';
const DMG_OBJECTIVE = 'combat_dmg';
const DMG_EXPR = /^(?:\[[^\]]+] \[[^\]]+]: )?([\w]+) has (\d+) \[In Combat]$/;

export interface CombatTpConfig {
  /**
   * Combat duration in seconds
   */
  combatDuration?: number
  /**
   * Teleport Cooldown in seconds
   */
  tpCooldown?: number
}

export const DEFAULT_COMBAT_TP_CONFIG: Required<CombatTpConfig> = {
  combatDuration: 30,
  tpCooldown: 120
}

let saving: Promise<void> | null = null;
export function useCombatTp(server: ScriptServer) {
  const config = (server.config as unknown as {combatTp: CombatTpConfig}).combatTp as Required<CombatTpConfig>;
  const onlinePlayers = new Set<string>();
  const dmg = new Map<string, number>();
  const inCombat = new Map<string, number>();
  const tpCooldowns = new Map<string, number>();
  let nextTimeout: ReturnType<typeof setTimeout> | null = null;
  let handlingInCombatTimeout = false;
  for (const [key, value] of Object.entries(DEFAULT_COMBAT_TP_CONFIG)) {
    if (!(key in config)) {
      (config as Record<string, unknown>)[key] = value;
    }
  }
  load(IN_COMBAT_KEY, inCombat);
  load(DMG_KEY, dmg);
  load(COOLDOWN_KEY, tpCooldowns);
  handleInCombatTimeout()
  server.javaServer.on('start', async () => {
    await new Promise(r => setTimeout(r, 1000));
    send(`scoreboard objectives add ${DMG_OBJECTIVE} minecraft.custom:minecraft.damage_taken`);
    await new Promise(r => setTimeout(r, 1000));
    send(`scoreboard objectives modify ${DMG_OBJECTIVE} displayname "In Combat"`);
    await new Promise(r => setTimeout(r, 1000));
    send(`scoreboard objectives modify ${DMG_OBJECTIVE} numberformat blank`);
  });

  setInterval(() => {
    for (const player of onlinePlayers.keys())  {
      send(`scoreboard players get ${player} ${DMG_OBJECTIVE}`);
    }
  }, INTERVAL);

  const protectedCommandList = [
    'home',
    'spawn',
    'warp',
    'tpa',
    'tpahere',
    'tpaccept',
    'back'
  ]

  for (const [cmd, callbacks] of Object.entries(server.javaServer.config.command.commands as Record<string, CommandCallback[]>)) {
    if (protectedCommandList.includes(cmd)) {
      for (let i = 0; i < callbacks.length; ++i) {
        callbacks[i] = protectCallback(callbacks[i])
      }
    }
  }

  server.javaServer.on('console', (line: string) => {
    line = line.trim();
    updateInCombat(line);
    const joined = /^\[[^\]]+] \[[^\]]+]: ([\w]+) joined the game$/.exec(line);
    if (joined) {
      onlinePlayers.add(joined[1]);
      handleInCombatTimeout();
    }
    const left = /^\[[^\]]+] \[[^\]]+]: ([\w]+) left the game$/.exec(line);
    if (left) {
      onlinePlayers.delete(left[1]);
    }
  });

  async function handleInCombatTimeout() {
    try {
      handlingInCombatTimeout = true;
      if (nextTimeout) {
        clearTimeout(nextTimeout);
        nextTimeout = null;
      }
      let nextTimeoutTime = 0;
      for (const [player, expiry] of inCombat.entries()) {
        if (!await checkInCombat(player)) {
          setInCombat(player, 0);
        } else {
          nextTimeoutTime = Math.max(nextTimeoutTime, expiry);
        }
      }
      if (nextTimeoutTime > 0) {
        const delay = nextTimeoutTime - Date.now();
        nextTimeout = setTimeout(handleInCombatTimeout, delay);
      }
    } finally {
      handlingInCombatTimeout = false;
    }
  }

  function protectCallback(cb: CommandCallback): CommandCallback {
    return async function (event: CommandEvent) {
      const cooldownMs = getCooldown(event.player)
      if (cooldownMs > Date.now()) {
        const cooldownSeconds = (cooldownMs - Date.now()) / MS_PER_SECOND;
        denyTp(event.player, `Cooldown for ${cooldownSeconds.toFixed(0)} seconds`, 'blue');
      } else if (await checkInCombat(event.player)) {
        denyTp(event.player, 'You are in combat');
      } else {
        setCooldown(event.player, Date.now() + config.tpCooldown * MS_PER_SECOND);
        return cb(event);
      }
    }
  }

  function updateInCombat(line: string) {
    const combatMonitor = (DMG_EXPR.exec(line));
    if (combatMonitor) {
      const player = combatMonitor[1] || '';
      const dmg = parseInt(combatMonitor[2] || '', 10) | 0
      if (player && dmg) {
        const playerDmg = getPlayerDmg(player);
        if (playerDmg !== dmg) {
          setPlayerDmg(player, dmg);
        }
      }
    }
  }

  async function checkInCombat(player: string) {
    const result = await rconSend(`scoreboard players get ${player} ${DMG_OBJECTIVE}`);
    updateInCombat(result);
    return getInCombat(player);
  }

  function denyTp(player: string, reason: string, color = 'red') {
    server.rconConnection.util.tellRaw(`Unable to teleport, ${reason}`, player, {color});
  }

  function getCooldown(player: string) {
    return tpCooldowns.get(player) || 0;
  }

  function setCooldown(player: string, value: number) {
    tpCooldowns.set(player, value);
    save(COOLDOWN_KEY, tpCooldowns);
  }

  function getPlayerDmg(player: string) {
    return dmg.has(player) ? dmg.get(player)! : -1;
  }

  function setPlayerDmg(player: string, playerDmg: number) {
    if (dmg.has(player) && dmg.get(player) !== playerDmg) {
      setInCombat(player, Date.now() + config.combatDuration * MS_PER_SECOND);
    }
    dmg.set(player, playerDmg);
    save(DMG_KEY, dmg);
  }

  function getInCombat(player: string) {
    return (inCombat.get(player) || 0) > Date.now();
  }

  function setInCombat(player: string, value: number) {
    if (value > 0) {
      inCombat.set(player, value);
    } else {
      send(`scoreboard players reset ${player} ${DMG_OBJECTIVE}`);
      inCombat.delete(player);
      dmg.set(player, 0);
    }
    send(`scoreboard objectives setdisplay sidebar${inCombat.size ? ` ${DMG_OBJECTIVE}` : ''}`);
    const msg = Date.now() < value ? 'In combat' : 'Out of combat';
    console.log(`Player ${player} is ${msg}`);
    if (TEST_MODE) {
      server.rconConnection.util.tellRaw(msg, player, {color: 'red'});
    }
    save(IN_COMBAT_KEY, inCombat);
    if (value > 0 && nextTimeout === null && !handlingInCombatTimeout) {
      handleInCombatTimeout();
    }
  }


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
