# Cosmic Gardener Complete Setup & Test Script
param(
    [switch]$UseWinget,
    [switch]$UseChocolatey,
    [switch]$SkipInstall,
    [switch]$OnlyTest,
    [switch]$Verbose
)

# Color output functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Header { Write-ColorOutput Magenta $args }

# Header display
Clear-Host
Write-Header "=============================================="
Write-Header "Cosmic Gardener Complete Auto Setup"
Write-Header "=============================================="
Write-Host ""

# Administrator rights check
function Test-AdminRights {
    return ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
}

if (-not $OnlyTest -and -not (Test-AdminRights)) {
    Write-Error "Administrator privileges required"
    Write-Warning "Right-click PowerShell -> 'Run as administrator'"
    Write-Host ""
    Write-Info "Or run this command with admin privileges:"
    Write-Info "Start-Process PowerShell -Verb RunAs -ArgumentList '-File `"$PSCommandPath`"'"
    Read-Host "Press Enter to exit..."
    exit 1
}

# Software check function
function Test-Software {
    param($Name, $Command, $MinVersion = $null)
    
    Write-Host "Checking $Name..." -NoNewline
    
    try {
        $output = & $Command 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success " Installed"
            if ($Verbose) { Write-Host "   $output" }
            return $true
        }
    } catch {
        # Command not found
    }
    
    Write-Error " Not installed"
    return $false
}

# Installation status check
function Test-AllSoftware {
    Write-Header "Installation Status Check"
    
    $checks = @{
        "Visual Studio Build Tools" = { where.exe link.exe >$null 2>&1; $LASTEXITCODE -eq 0 }
        "Rust" = { Test-Software "Rust" "rustc --version" }
        "Cargo" = { Test-Software "Cargo" "cargo --version" }
        "PostgreSQL" = { Test-Software "PostgreSQL" "psql --version" }
        "Git" = { Test-Software "Git" "git --version" }
    }
    
    $allInstalled = $true
    foreach ($check in $checks.GetEnumerator()) {
        $result = & $check.Value
        if (-not $result) {
            $allInstalled = $false
        }
    }
    
    Write-Host ""
    return $allInstalled
}

# Software installation
function Install-CosmicGardenerDependencies {
    param($UseWinget, $UseChocolatey)
    
    Write-Header "Installing required software..."
    
    if ($UseWinget) {
        Write-Info "Using winget for installation..."
        
        # Check winget availability
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
            Write-Error "winget not found. Please update to latest Windows 10/11"
            return $false
        }
        
        $packages = @(
            @{Name="Visual Studio Build Tools"; Id="Microsoft.VisualStudio.2022.BuildTools"},
            @{Name="Rust"; Id="Rustlang.Rust.MSVC"},
            @{Name="PostgreSQL"; Id="PostgreSQL.PostgreSQL.15"},
            @{Name="Git"; Id="Git.Git"}
        )
        
        foreach ($package in $packages) {
            Write-Host "Installing $($package.Name)..." -NoNewline
            try {
                $result = winget install $package.Id --silent --accept-package-agreements --accept-source-agreements 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Success " Complete"
                } else {
                    Write-Warning " Skipped (already installed or error)"
                }
            } catch {
                Write-Error " Failed: $($_.Exception.Message)"
            }
        }
        
    } elseif ($UseChocolatey) {
        Write-Info "Using Chocolatey for installation..."
        
        # Check/Install Chocolatey
        if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
            Write-Host "Installing Chocolatey..."
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            try {
                iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
                Write-Success "Chocolatey installation complete"
            } catch {
                Write-Error "Chocolatey installation failed: $($_.Exception.Message)"
                return $false
            }
        }
        
        $packages = @(
            @{Name="Visual Studio Build Tools"; Package="visualstudio2022buildtools"; Args="--package-parameters `"--add Microsoft.VisualStudio.Workload.VCTools`""},
            @{Name="Rust"; Package="rust"; Args=""},
            @{Name="PostgreSQL"; Package="postgresql15"; Args="--params '/Password:postgres'"},
            @{Name="Git"; Package="git"; Args=""}
        )
        
        foreach ($package in $packages) {
            Write-Host "Installing $($package.Name)..." -NoNewline
            try {
                if ($package.Args) {
                    $result = choco install $package.Package $package.Args -y 2>$null
                } else {
                    $result = choco install $package.Package -y 2>$null
                }
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Success " Complete"
                } else {
                    Write-Warning " Skipped (already installed or error)"
                }
            } catch {
                Write-Error " Failed: $($_.Exception.Message)"
            }
        }
    }
    
    # Update environment variables
    Write-Host "Updating environment variables..."
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    
    return $true
}

# PostgreSQL setup
function Setup-PostgreSQL {
    Write-Header "Setting up PostgreSQL..."
    
    # Start PostgreSQL service
    Write-Host "Starting PostgreSQL service..." -NoNewline
    try {
        $service = Get-Service postgresql-x64-15 -ErrorAction SilentlyContinue
        if ($service) {
            if ($service.Status -ne "Running") {
                Start-Service postgresql-x64-15
                Start-Sleep -Seconds 3
            }
            Write-Success " Running"
        } else {
            Write-Warning " Service not found"
        }
    } catch {
        Write-Error " Failed to start: $($_.Exception.Message)"
    }
    
    # Create database and user
    Write-Host "Creating test database..." -NoNewline
    Start-Sleep -Seconds 2
    
    try {
        $env:PGPASSWORD = "postgres"
        
        # Create database
        $null = psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE cosmic_gardener_test;" 2>$null
        $null = psql -U postgres -h localhost -p 5432 -c "CREATE USER cosmic_gardener_app WITH PASSWORD 'password';" 2>$null
        $null = psql -U postgres -h localhost -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE cosmic_gardener_test TO cosmic_gardener_app;" 2>$null
        
        # Test connection
        $null = psql -U cosmic_gardener_app -h localhost -p 5432 -d cosmic_gardener_test -c "SELECT 1;" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success " Created"
        } else {
            Write-Warning " Already exists or error"
        }
    } catch {
        Write-Warning " Database creation skipped: $($_.Exception.Message)"
    }
    
    # Set environment variables
    Write-Host "Setting environment variables..." -NoNewline
    try {
        $dbUrl = "postgresql://cosmic_gardener_app:password@localhost/cosmic_gardener_test"
        [Environment]::SetEnvironmentVariable("DATABASE_URL", $dbUrl, "User")
        [Environment]::SetEnvironmentVariable("TEST_DATABASE_URL", $dbUrl, "User")
        $env:DATABASE_URL = $dbUrl
        $env:TEST_DATABASE_URL = $dbUrl
        Write-Success " Set"
    } catch {
        Write-Error " Environment variable setup failed: $($_.Exception.Message)"
    }
}

# Project build
function Build-Project {
    Write-Header "Building project..."
    
    $projectPath = Split-Path -Parent $PSScriptRoot
    if ($PSScriptRoot -match "backend") {
        $projectPath = $PSScriptRoot
    } else {
        $projectPath = Join-Path $PSScriptRoot "cosmic-gardener\backend"
    }
    
    if (-not (Test-Path $projectPath)) {
        Write-Error "Project directory not found: $projectPath"
        return $false
    }
    
    Write-Info "Project directory: $projectPath"
    Set-Location $projectPath
    
    # Check for Cargo.toml
    if (-not (Test-Path "Cargo.toml")) {
        Write-Error "Cargo.toml not found"
        return $false
    }
    
    Write-Host "Installing dependencies..."
    if ($Verbose) {
        cargo build --verbose
    } else {
        cargo build
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build complete"
        return $true
    } else {
        Write-Error "Build failed"
        Write-Info "Use -Verbose flag for detailed error information"
        return $false
    }
}

# Test execution
function Run-Tests {
    Write-Header "Running tests..."
    
    $tests = @(
        @{Name="Compile Check"; Command="cargo check"},
        @{Name="Unit Tests"; Command="cargo test --lib"},
        @{Name="Integration Tests"; Command="cargo test --test game_system_tests"}
    )
    
    $allPassed = $true
    $results = @()
    
    foreach ($test in $tests) {
        Write-Host "Running $($test.Name)..." -NoNewline
        
        $startTime = Get-Date
        try {
            if ($Verbose) {
                Invoke-Expression "$($test.Command) --verbose"
            } else {
                $output = Invoke-Expression "$($test.Command) 2>&1"
            }
            
            $duration = (Get-Date) - $startTime
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success " Passed ($($duration.TotalSeconds.ToString('F1'))s)"
                $results += @{Name=$test.Name; Status="Passed"; Duration=$duration}
            } else {
                Write-Error " Failed ($($duration.TotalSeconds.ToString('F1'))s)"
                $results += @{Name=$test.Name; Status="Failed"; Duration=$duration}
                $allPassed = $false
                
                if (-not $Verbose) {
                    Write-Host "Error output:" -ForegroundColor Red
                    Write-Host $output -ForegroundColor Gray
                }
            }
        } catch {
            $duration = (Get-Date) - $startTime
            Write-Error " Error: $($_.Exception.Message)"
            $results += @{Name=$test.Name; Status="Error"; Duration=$duration}
            $allPassed = $false
        }
    }
    
    # Results summary
    Write-Header "Test Results Summary"
    foreach ($result in $results) {
        $status = switch ($result.Status) {
            "Passed" { Write-Success "Passed" }
            "Failed" { Write-Error "Failed" }
            "Error" { Write-Error "Error" }
        }
        Write-Host "$($result.Name): " -NoNewline
        $status
    }
    
    return $allPassed
}

# System information display
function Show-SystemInfo {
    Write-Header "System Information"
    
    try {
        Write-Host "OS: " -NoNewline
        Write-Info (Get-CimInstance Win32_OperatingSystem).Caption
        
        Write-Host "PowerShell: " -NoNewline
        Write-Info $PSVersionTable.PSVersion
        
        Write-Host "CPU: " -NoNewline
        Write-Info (Get-CimInstance Win32_Processor).Name
        
        Write-Host "Memory: " -NoNewline
        $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
        Write-Info "$ram GB"
        
        Write-Host ""
    } catch {
        Write-Warning "Failed to retrieve system information"
    }
}

# Issue diagnosis
function Diagnose-Issues {
    Write-Header "Diagnosing Issues"
    
    $issues = @()
    
    # Visual Studio Build Tools check
    if (-not (where.exe link.exe 2>$null)) {
        $issues += "Visual Studio Build Tools (C++ compiler) not found"
    }
    
    # PostgreSQL service check
    try {
        $pgService = Get-Service postgresql-x64-15 -ErrorAction SilentlyContinue
        if (-not $pgService) {
            $issues += "PostgreSQL service not found"
        } elseif ($pgService.Status -ne "Running") {
            $issues += "PostgreSQL service is stopped"
        }
    } catch {
        $issues += "Cannot check PostgreSQL service status"
    }
    
    # Environment variables check
    if (-not $env:DATABASE_URL) {
        $issues += "DATABASE_URL environment variable not set"
    }
    
    # Port 5432 check
    try {
        $portCheck = netstat -an | Select-String "5432"
        if (-not $portCheck) {
            $issues += "PostgreSQL not listening on port 5432"
        }
    } catch {
        $issues += "Cannot check port 5432 status"
    }
    
    if ($issues.Count -eq 0) {
        Write-Success "No issues detected"
    } else {
        Write-Warning "The following issues were detected:"
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Info "Solution steps:"
        Write-Host "  1. Re-run script with -UseWinget or -UseChocolatey"
        Write-Host "  2. Manually install software"
        Write-Host "  3. Restart PowerShell to update environment variables"
    }
}

# Main execution flow
function Main {
    Show-SystemInfo
    
    # Command line argument processing
    if (-not $UseWinget -and -not $UseChocolatey -and -not $SkipInstall -and -not $OnlyTest) {
        Write-Header "Choose execution mode"
        Write-Host "1. Auto-install with winget (Windows 10/11 recommended)"
        Write-Host "2. Auto-install with Chocolatey"
        Write-Host "3. Skip installation and run tests only"
        Write-Host "4. Run diagnostics only"
        Write-Host ""
        
        do {
            $choice = Read-Host "Choice (1-4)"
        } while ($choice -notin @("1", "2", "3", "4"))
        
        switch ($choice) {
            "1" { $UseWinget = $true }
            "2" { $UseChocolatey = $true }
            "3" { $SkipInstall = $true }
            "4" { 
                Diagnose-Issues
                Read-Host "Press Enter to exit..."
                return
            }
        }
    }
    
    # Installation status check
    $allInstalled = Test-AllSoftware
    
    # Run installation
    if (-not $SkipInstall -and -not $OnlyTest -and -not $allInstalled) {
        if (-not (Install-CosmicGardenerDependencies -UseWinget:$UseWinget -UseChocolatey:$UseChocolatey)) {
            Write-Error "Installation failed"
            Diagnose-Issues
            Read-Host "Press Enter to exit..."
            return
        }
        
        # Re-check after installation
        Write-Host ""
        Write-Info "Verifying installation..."
        Start-Sleep -Seconds 2
        $allInstalled = Test-AllSoftware
    }
    
    # PostgreSQL setup
    if (-not $OnlyTest) {
        Setup-PostgreSQL
    }
    
    # Project build
    if (-not $OnlyTest) {
        if (-not (Build-Project)) {
            Write-Error "Build failed"
            Diagnose-Issues
            Read-Host "Press Enter to exit..."
            return
        }
    }
    
    # Run tests
    $testsPassed = Run-Tests
    
    # Final results
    Write-Header "Setup Complete"
    if ($testsPassed) {
        Write-Success "All tests passed!"
        Write-Success "Cosmic Gardener server is ready"
        Write-Host ""
        Write-Info "Next steps:"
        Write-Host "  - Frontend integration testing"
        Write-Host "  - Load testing (cargo test test_performance_under_load --release)"
        Write-Host "  - Production deployment"
    } else {
        Write-Error "Some tests failed"
        Write-Warning "Check detailed logs to resolve issues"
        Diagnose-Issues
    }
    
    Write-Host ""
    Read-Host "Press Enter to exit..."
}

# Script execution
try {
    Main
} catch {
    Write-Error "Unexpected error occurred: $($_.Exception.Message)"
    Write-Host "Stack trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    Read-Host "Press Enter to exit..."
}