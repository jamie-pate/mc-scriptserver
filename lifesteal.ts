import { ScriptServer } from 'https://esm.sh/@scriptserver/core?dev';

const INITIAL_HEARTS = 20;
const ONE_HEART = 2;

export function useLifeSteal(server: ScriptServer) {
  const hearts = new Map<string, number>();

  server.javaServer.on('console', (line: string) => {
    const result = line.match(
      /^\[[^\]]+] \[[^\]]+]: ([\w]+) was slain by ([\w]+)/,
    );
    if (result) {
      const loser = result[1];
      const winner = result[2];
      let winnerHearts = hearts.has(winner)
        ? hearts.get(winner)!
        : INITIAL_HEARTS;
      let loserHearts = hearts.has(loser) ? hearts.get(loser)! : INITIAL_HEARTS;

      winnerHearts = winnerHearts + ONE_HEART;
      loserHearts = loserHearts - ONE_HEART;

      hearts.set(winner, winnerHearts);
      hearts.set(loser, loserHearts);

      send(
        `attribute ${winner} minecraft:generic.max_health base set ${winnerHearts}`,
      );
      send(
        `attribute ${loser} minecraft:generic.max_health base set ${loserHearts}`,
      );
    }
  });

  function send(command: string) {
    console.log(`Send command: ${command}`);
    server.javaServer.send(command);
  }
}
