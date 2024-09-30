scoreboard players set @a OneHeart 1
scoreboard players set @a HundHearts 100
execute as @a at @s run scoreboard players set @s TempHearts 100
execute as @a at @s run scoreboard players operation @s TempHearts += @s Kills
execute as @a at @s run scoreboard players operation @s TempHearts -= @s Deaths
execute as @a at @s run scoreboard players operation @s TempHearts += @s Other
execute as @a at @s run scoreboard players operation @s TempHearts -= @s HundHearts
execute as @a at @s run scoreboard players operation @s Hearts = @s TempHearts
execute as @a at @s run scoreboard players operation @s OldHearts = @s Hearts


execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -9 run attribute @s minecraft:generic.max_health base set 2
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -8 run attribute @s minecraft:generic.max_health base set 4
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -7 run attribute @s minecraft:generic.max_health base set 6
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -6 run attribute @s minecraft:generic.max_health base set 8
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -5 run attribute @s minecraft:generic.max_health base set 10
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -4 run attribute @s minecraft:generic.max_health base set 12
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -3 run attribute @s minecraft:generic.max_health base set 14
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -2 run attribute @s minecraft:generic.max_health base set 16
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches -1 run attribute @s minecraft:generic.max_health base set 18
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 0 run attribute @s minecraft:generic.max_health base set 20
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 1 run attribute @s minecraft:generic.max_health base set 22
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 2 run attribute @s minecraft:generic.max_health base set 24
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 3 run attribute @s minecraft:generic.max_health base set 26
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 4 run attribute @s minecraft:generic.max_health base set 28
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 5 run attribute @s minecraft:generic.max_health base set 30
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 6 run attribute @s minecraft:generic.max_health base set 32
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 7 run attribute @s minecraft:generic.max_health base set 34
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 8 run attribute @s minecraft:generic.max_health base set 36
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 9 run attribute @s minecraft:generic.max_health base set 38
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches 10 run attribute @s minecraft:generic.max_health base set 40

execute as @e[limit=1,sort=random,type=player] at @s if score @s Hearts matches 11.. run title @s actionbar "§4You reached the limit..."
execute as @e[limit=1,sort=random,type=player] at @s if score @s Hearts matches 11.. run give @s nether_star[custom_name='{"color":"red","italic":false,"text":"Heart"}',food={nutrition:0,saturation:0,can_always_eat:true,eat_seconds:1000000}]

execute as @e[limit=1,sort=random,type=player] at @s if score @s Hearts matches 11.. run scoreboard players operation @s Other -= @s OneHeart

#execute as @a[limit=1,sort=random] at @s if score @s Hearts matches ..-10 run scoreboard players operation @s Other += @s OneHeart
#execute as @a at @s if score @s Hearts matches ..-10 run gamemode spectator @s
execute as @a at @s if score @s Hearts matches ..-10 run title @s actionbar "§4You Lose"
execute as @a[limit=1,sort=random] at @s if score @s Hearts matches ..-10 run ban @p "lost at lifesteal"


scoreboard players add @a Hearts 0
scoreboard players add @a Deaths 0
scoreboard players add @a Kills 0
scoreboard players add @a TempHearts 0
scoreboard players add @a Other 0


#execute as @a[limit=1,sort=random] at @s run scoreboard players operation @s Hearts -= @s Hearts
#execute as @a[scores={Hearts=1},limit=1,sort=random] at @s run scoreboard players set @s Hearts 0


scoreboard players enable @a withdraw
execute as @a[scores={Hearts=-9..},limit=1,sort=random] run scoreboard players operation @a[scores={withdraw=1..},limit=1,sort=random] Other -= @s OneHeart
execute as @a[scores={Hearts=-9..},limit=1,sort=random] run give @a[scores={withdraw=1..}] nether_star[custom_name='{"color":"red","italic":false,"text":"Heart"}',food={nutrition:0,saturation:0,can_always_eat:true,eat_seconds:1000000}]
scoreboard players reset @a[scores={withdraw=1..}] withdraw
