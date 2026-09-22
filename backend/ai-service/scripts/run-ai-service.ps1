$ErrorActionPreference = 'Stop'

function ConvertFrom-SecureStringToPlainText {
    param(
        [Parameter(Mandatory = $true)]
        [Security.SecureString]$SecureValue
    )

    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
    }
}

function Assert-NonEmptySecret {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Name cannot be empty."
    }

    Write-Host "$Name length: $($Value.Length)"
}

$geminiApiKey = $null
$dbPassword = $null

try {
    $geminiSecureString = Read-Host 'Enter Gemini API key' -AsSecureString
    $geminiApiKey = ConvertFrom-SecureStringToPlainText $geminiSecureString
    Assert-NonEmptySecret -Name 'GEMINI_API_KEY' -Value $geminiApiKey

    $dbUserInput = Read-Host 'Enter DB user [ticket_admin]'
    $dbUser = if ([string]::IsNullOrWhiteSpace($dbUserInput)) { 'ticket_admin' } else { $dbUserInput.Trim() }
    $env:DB_USER = $dbUser
    Write-Host "DB_USER: $dbUser"

    $dbSecureString = Read-Host 'Enter database password' -AsSecureString
    $dbPassword = ConvertFrom-SecureStringToPlainText $dbSecureString
    Assert-NonEmptySecret -Name 'DB_PASSWORD' -Value $dbPassword

    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        throw 'Java was not found on PATH. Install Java 17+ or update PATH.'
    }

    if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
        throw 'Maven (mvn) was not found on PATH. Install Maven or update PATH.'
    }

    $listeners = @(Get-NetTCPConnection -LocalPort 8085 -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -gt 0) {
        $owners = $listeners | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            $process = Get-Process -Id $_ -ErrorAction SilentlyContinue
            if ($process) {
                "$($process.ProcessName) (PID $($_))"
            }
            else {
                "PID $($_)"
            }
        }
        throw "Port 8085 is already in use by $($owners -join ', '). Stop that process before starting ai-service."
    }

    $env:GEMINI_API_KEY = $geminiApiKey
    $env:DB_PASSWORD = $dbPassword

    Push-Location (Join-Path $PSScriptRoot '..')
    try {
        Write-Host 'Starting ai-service on port 8085...'
        & mvn spring-boot:run
        if ($LASTEXITCODE -ne 0) {
            throw "ai-service stopped with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:GEMINI_API_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:DB_USER -ErrorAction SilentlyContinue
    $geminiApiKey = $null
    $dbPassword = $null
}
