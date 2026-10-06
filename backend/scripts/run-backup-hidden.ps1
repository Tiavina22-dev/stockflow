param([Parameter(Mandatory)][string]$NodePath,[Parameter(Mandatory)][string]$BackendPath)
$ErrorActionPreference = 'Stop'
$info = New-Object Diagnostics.ProcessStartInfo
$info.FileName = $NodePath
$info.Arguments = '"' + (Join-Path $BackendPath 'scripts/backup.mjs') + '" --due'
$info.WorkingDirectory = $BackendPath
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$process = [Diagnostics.Process]::Start($info)
$process.WaitForExit()
exit $process.ExitCode
