# Crea en el Escritorio los accesos directos de impresion automatica de la pizzeria,
# igual que los de La Reina Helados. Cada pantalla usa su propio perfil de navegador
# (para no mezclar sesion ni impresora con la heladeria).
#
# Uso: clic derecho > "Ejecutar con PowerShell", o bien:
#   .\crear-accesos-directos.ps1 -Url https://mi-dominio.com
param(
  [string]$Url,
  [string]$Destino = (Join-Path ([Environment]::GetFolderPath("Desktop")) "acceso directo Pizzeria Sergio")
)

if (-not $Url) { $Url = Read-Host "URL del sistema (ej. https://mi-dominio.com)" }
$Url = $Url.Trim().TrimEnd("/")
if ($Url -notmatch "^https?://") { throw "La URL tiene que empezar con http:// o https://" }

$navegadores = @{
  Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
  Edge   = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}
$pantallas = @(
  @{ Nombre = "Mostrador"; Ruta = "/mostrador";     Navegadores = @("Chrome", "Edge") }
  @{ Nombre = "Pedidos";   Ruta = "/admin/pedidos"; Navegadores = @("Chrome", "Edge") }
  @{ Nombre = "Ventas";    Ruta = "/admin/ventas";  Navegadores = @("Chrome") }
)

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$shell = New-Object -ComObject WScript.Shell

function New-Acceso($archivo, $exe, $argumentos) {
  $lnk = $shell.CreateShortcut((Join-Path $Destino "$archivo.lnk"))
  $lnk.TargetPath = $exe
  $lnk.Arguments = $argumentos
  $lnk.IconLocation = "$exe,0"
  $lnk.Save()
}

foreach ($p in $pantallas) {
  foreach ($n in $p.Navegadores) {
    $exe = $navegadores[$n]
    $perfil = Join-Path $env:LOCALAPPDATA "Pizzeria$($p.Nombre)Kiosk$n"
    $base = "--new-window --user-data-dir=`"$perfil`" $Url$($p.Ruta)"
    # SETUP: sin kiosk, para iniciar sesion y elegir la impresora una sola vez.
    New-Acceso "$($p.Nombre) SETUP $n (una vez)" $exe $base
    # Uso diario: --kiosk-printing imprime sin mostrar la ventana de impresion.
    New-Acceso "$($p.Nombre) ($n)" $exe "--kiosk-printing $base"
  }
}

Write-Host "Accesos directos creados en: $Destino"
