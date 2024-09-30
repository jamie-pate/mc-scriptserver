execute if score @s confirm_reset matches 1 run scoreboard players set @a Hearts 0
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 0 run attribute @s minecraft:generic.max_health base set 20
execute if score @s confirm_reset matches 1 run scoreboard objectives remove withdraw
execute if score @s confirm_reset matches 1 run scoreboard objectives remove Hearts
execute if score @s confirm_reset matches 1 run scoreboard objectives remove Deaths
execute if score @s confirm_reset matches 1 run scoreboard objectives remove Kills
execute if score @s confirm_reset matches 1 run scoreboard objectives remove TempHearts
execute if score @s confirm_reset matches 1 run scoreboard objectives remove Other
execute if score @s confirm_reset matches 1 run tellraw @s "Enter this to the chat to enable again the datapack: /reload"
execute if score @s confirm_reset matches 1 run scoreboard players set @s confirm_reset 0
execute if score @s confirm_reset matches 1 run advancement revoke @s only lm_lifesteal:heart
scoreboard objectives remove confirm_reset
effect give @a regeneration 5 255 true
effect give @a saturation 5 255 true