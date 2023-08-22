import { ScriptServer } from 'https://esm.sh/@scriptserver/core?dev';
import 'https://esm.sh/@scriptserver/json?dev';

const TEST_MODE = false;

const MS_PER_SECOND = 1000;
const MS_PER_HOUR = MS_PER_SECOND * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

const MAX_HEARTS = 25;
const INITIAL_HEARTS = 10;
const ONE_HEART = 2;
const BAN_LENGTH = TEST_MODE ? 10 * MS_PER_SECOND : 0.5 * MS_PER_DAY;
const INTERVAL = 10 * MS_PER_SECOND;

const KEY = 'lifeSteal';
const HEARTS_KEY = 'hearts';
const BANS_KEY = 'bans';
const HP_OBJECTIVE = 'lifesteal_hp';

let saving: Promise<void> | null = null;
export function useLifeSteal(server: ScriptServer) {
  const onlinePlayers = new Set<string>();
  const hearts = new Map<string, number>();
  const bans = new Map<string, string>();
  load(HEARTS_KEY, hearts);
  load(BANS_KEY, bans);
  server.javaServer.on('start', () => {
    send(`scoreboard objectives add ${HP_OBJECTIVE} health`);
  });

  setInterval(() => {
    for (const [player, playerHearts] of hearts) {
      if (onlinePlayers.has(player)) {
        setPlayerHearts(player, playerHearts);
        send(`scoreboard players get ${player} ${HP_OBJECTIVE}`);
      }
    }
    for (const [player, banEndTime] of bans) {
      if (new Date(banEndTime).getTime() <= Date.now()) {
        send(`pardon ${player}`);
        bans.delete(player);
        setPlayerHearts(player, INITIAL_HEARTS);
        save(BANS_KEY, bans);
      }
    }
  }, INTERVAL);

  server.javaServer.on('console', (line: string) => {
    line = line.trim();
    const slain = line.match(
      /^\[[^\]]+] \[[^\]]+]: ([\w]+) was (?:slain|shot) by ([\w]+)$/,
    ) || TEST_MODE && line.match(/([\w]+) was (?:slain|shot) by ([\w]+)$/);
    const isTest = TEST_MODE && slain && Array.from(slain).includes('test');
    if (slain || isTest) {
      const loser = slain[1];
      const winner = slain[2];
      if (hearts.has(winner) && hearts.has(loser) || isTest) {
        let winnerHearts = getPlayerHearts(winner);
        let loserHearts = getPlayerHearts(loser);

        if (winnerHearts < MAX_HEARTS) {
          winnerHearts = winnerHearts + 1;
        }
        loserHearts = loserHearts - 1;
        if (loserHearts < 1) {
          send(
            `ban ${loser} You lost all your hearts, come back in ${
              BAN_LENGTH / MS_PER_HOUR
            } hours`,
          );
          bans.set(loser, new Date(Date.now() + BAN_LENGTH).toISOString());
          save(BANS_KEY, bans);
        }

        setPlayerHearts(winner, winnerHearts);
        setPlayerHearts(loser, loserHearts);
      }
    }
    const healthMonitor =
      /^\[[^\]]+] \[[^\]]+]: ([\w]+) has (\d+) \[lifesteal_hp]$/.exec(line);
    if (healthMonitor) {
      const player = healthMonitor[1];
      const hp = parseInt(healthMonitor[2] || '', 10);
      if (hp && player) {
        const currentHearts = hp / ONE_HEART;
        const playerHearts = getPlayerHearts(player);
        if (currentHearts > playerHearts) {
          send(`effect give ${player} minecraft:poison 1 1 true`);
        }
      }
    }
    const joined = /^\[[^\]]+] \[[^\]]+]: ([\w]+) joined the game$/.exec(line);
    if (joined) {
      if (!hearts.has(joined[1])) {
        hearts.set(joined[1], INITIAL_HEARTS);
      }
      onlinePlayers.add(joined[1]);
    }
    const left = /^\[[^\]]+] \[[^\]]+]: ([\w]+) left the game$/.exec(line);
    if (left) {
      onlinePlayers.delete(left[1]);
    }
  });

  function getPlayerHearts(player: string) {
    return hearts.has(player) ? hearts.get(player)! : INITIAL_HEARTS;
  }

  function setPlayerHearts(player: string, playerHearts: number) {
    hearts.set(player, playerHearts);
    send(
      `attribute ${player} minecraft:generic.max_health base set ${
        playerHearts * ONE_HEART
      }`,
    );
    save(HEARTS_KEY, hearts);
  }

  function send(command: string) {
    console.log(`Send command: ${command}`);
    server.javaServer.send(command);
  }

  // eventually save values from a map
  function save<K, V>(prop_key: string, map: Map<K, V>): Promise<void> {
    if (saving) {
      return saving.then(() => save(prop_key, map));
    } else {
      return saving = server.json.set(KEY, prop_key, Array.from(map))
        .then(() => {
          saving = null;
        }).catch((err: Error) => {
          console.error('Error saving state', err);
        });
    }
  }

  // eventually load values into a map
  function load<K, V>(prop_key: string, map: Map<K, V>) {
    return server.json.get(KEY, prop_key).then((saved: [K, V][]) => {
      if (saved && Array.isArray(saved)) {
        for (const [key, value] of saved) {
          map.set(key, value);
        }
      }
    }).catch(console.error);
  }
}
