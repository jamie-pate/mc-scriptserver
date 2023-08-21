export type ServerProperties = Record<string, string>;
export async function readServerProperties(dir: string) {
  console.log('reading server.properties');
  return (await Deno.readTextFile(`${dir}/server.properties`))
    .split(/\r?\n/g)
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
    })
    .filter(
      (v): v is [string, string] =>
        !!v && typeof v[0] === 'string' && typeof v[1] === 'string',
    )
    .reduce((r, [key, value]) => {
      r[key] = value;
      return r;
    }, {} as ServerProperties);
}
