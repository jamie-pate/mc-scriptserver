// This example reads commands from stdin and sends them on enter key press.
// You need to run `npm install keypress` for this example to work.

import { readServerProperties } from './server-properties.ts';
import { RconConnection } from 'https://esm.sh/@scriptserver/core?dev';
import { readKeypress } from 'https://deno.land/x/keypress@0.0.11/mod.ts';

main().catch((err: Error) => {
  console.error(err.stack);
  Deno.exit(1);
});

async function main() {
  const serverProperties = await readServerProperties('server');
  const connection = new RconConnection({
    host: 'localhost',
    port: serverProperties.rconPort,
    password: serverProperties.rconPassword,
  });

  connection.connect();
  connection.connection.on(
    'data',
    (buffer: {}) => console.log(buffer.toString()),
  );
  const process = Deno;

  let buffer = '';
  const options = {};

  for await (
    const { key, sequence, ctrlKey } of readKeypress(Deno.stdin, options)
  ) {
    if (ctrlKey && (key == 'c' || key == 'd')) {
      console.log(`^${key} pressed`);
      connection.disconnect();
      return;
    }
    process.stdout.write(new TextEncoder().encode(sequence));

    if (key && (key === 'enter' || key === 'return')) {
      connection.send(buffer);
      buffer = '';
      process.stdout.write(new TextEncoder().encode('\n'));
    } else if (key === 'backspace') {
      buffer = buffer.slice(0, -1);
      process.stdout.write(new TextEncoder().encode('\u001b[K')); // Clear to end of line
    } else {
      buffer += sequence;
    }
  }
}
