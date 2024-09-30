#LEGACY


scoreboard objectives remove lalimatyusLife
scoreboard objectives remove lalimatyusDeath
kill @e[name=lalimatyusv2,type=interaction]

#MAIN

kill @e[tag=1,type=interaction]
kill @e[tag=100,type=interaction]
scoreboard objectives remove withdraw


scoreboard objectives add withdraw trigger
scoreboard objectives add confirm_reset dummy


scoreboard objectives add Kills playerKillCount
scoreboard objectives add Deaths deathCount
scoreboard objectives add TempHearts dummy
scoreboard objectives add Hearts dummy
scoreboard objectives add Other dummy
scoreboard objectives add OneHeart dummy
scoreboard objectives add HundHearts dummy
scoreboard objectives add OldHearts dummy

scoreboard players set @a OneHeart 1
scoreboard players set @a HundHearts 100
advancement revoke @s only lm_lifesteal:using_heart


tellraw @a "\u00A7a\u00A7lSuccesfully loaded \u00A7r\u00A76\u00A7llalimatyus's \u00A7r\u00A7c\u00A7lLifeSteal \u00A7r\u00A7a\u00A7lpack! (modified)"