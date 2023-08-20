# Custom Minecraft Script Server

Requirements:
* [deno](https://deno.land/#getting-started)
* [Minecraft Server](https://www.minecraft.net/en-us/download/server) in ./server
* Java:
    * [Windows](https://learn.microsoft.com/en-us/java/openjdk/install#install-on-windows-with-the-windows-package-manager-winget): `winget install Microsoft.OpenJDK.17 --custom ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome`
    * Ubuntu: `sudo apt install openjdk-17-jre`
    * `java` or `java.exe` must be available in the path, you might have to log out and back in.

Usage: `run.sh` or `run.cmd` (windows)

Then set `eula=true` in `server/eula.txt` and the following in
`server/server.properties` and run again.

```
enable-rcon=true
rcon.port=25575
rcon.password=password
broadcast-rcon-to-ops=false
```

# Attribution:

Tree icon: CC Attribution-Noncommercial-No Derivate 4.0
https://iconarchive.com/show/minecraft-icons-by-chrisl21/3D-Tree-icon.html
