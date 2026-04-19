    # Runs the ASL Flask backend using the local Python venv
    param(
    [int]$Port = 5001
    )

    $ErrorActionPreference = 'Stop'

    $SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
    $VENV = Join-Path $SCRIPT_DIR 'py310env'
    $PY = Join-Path $VENV 'Scripts/python.exe'
    $API = Join-Path $SCRIPT_DIR 'api.py'
    $REQ = Join-Path $SCRIPT_DIR 'requirements.txt'

    if (!(Test-Path $PY)) { Write-Error "Python venv not found: $PY" }
    if (!(Test-Path $API)) { Write-Error "api.py not found: $API" }

    Write-Host "Using Python: $PY"

    # Check if port is in use
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Warning "Port $Port is already in use. Attempting to kill the process..."
        try {
            Stop-Process -Id $portInUse.OwningProcess -Force -ErrorAction Stop
            Write-Host "Process killed."
        } catch {
            Write-Error "Could not kill process on port $Port. Please manually stop it."
            exit 1
        }
    }

    # Ensure deps are installed
    & $PY -m pip install --upgrade pip | Out-Host
    & $PY -m pip install -r $REQ | Out-Host

    $env:PORT = "$Port"

    Write-Host "Starting Flask server on http://127.0.0.1:$Port ..."
    & $PY $API
