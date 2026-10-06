$ErrorActionPreference = 'Stop'
$backendPath = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node).Source
$runnerPath = Join-Path $PSScriptRoot 'run-backup-hidden.ps1'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$sha = [Security.Cryptography.SHA256]::Create()
$hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($backendPath)))).Replace('-','').Substring(0,12)
$sha.Dispose()
$taskName = "StockFlow-Backup-$hash"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -NodePath "{1}" -BackendPath "{2}"' -f $runnerPath,$nodePath,$backendPath) -WorkingDirectory $backendPath
$trigger = New-ScheduledTaskTrigger -Daily -At '02:00'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -notlike "*$runnerPath*") { throw 'Une tâche différente utilise ce nom.' }
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Select-Object TaskName,State
