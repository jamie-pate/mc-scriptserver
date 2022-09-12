@echo off
for /f "usebackq tokens=*" %%a in (`powershell get-date -format "dd-MMM-yyyy_HH-mm"`) do set TS=%%a

"C:\Program Files\7-Zip\7z.exe" a server\thouse_%TS%_world.7z server\world
call run.bat
pause