scoreboard players add @s confirm_reset 1
tellraw @s ["","Are you sure to ",{"text":"RESET ","bold":true,"color":"blue"},"everyone's data? "]
tellraw @s {"text":"Confirm","bold":true,"color":"red","clickEvent":{"action":"run_command","value":"scoreboard players add @s confirm_reset 1"},"hoverEvent":{"action":"show_text","contents":["Click to confirm."]}}
tellraw @s "Then enter to the chat: /function lm_lifesteal:confirm_reset"