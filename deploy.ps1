<#
.SYNOPSIS
  Deploys GitHub Wrapped to Vercel.

.DESCRIPTION
  Run this in YOUR OWN terminal (not through an assistant), because it needs to
  open a browser to sign you in to Vercel.

  It runs in two phases, because the production OAuth app cannot exist until the
  live URL does:

    Phase 1   vercel login -> create/link the project -> deploy
              Then it prints the URL you need for the OAuth callback.
    Phase 2   push the production secrets -> redeploy

  Usage:
    .\deploy.ps1                # phase 1
    .\deploy.ps1 -Finish        # phase 2, after creating the OAuth app

  If PowerShell refuses to run the script:
    powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#>
param(
  [string]$ProjectName = "github-wrapped",
  [string]$Domain = "https://my-year-in-code.vercel.app",
  [string]$GitHubClientId,
  [string]$GitHubClientSecret,
  [string]$PublicToken,
  [string]$DatabaseUrl,
  [switch]$Finish
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Write-Step($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "  + $text" -ForegroundColor Green }
function Write-Skip($text) { Write-Host "  - $text" -ForegroundColor DarkGray }
function Write-Warn2($text){ Write-Host "  ! $text" -ForegroundColor Yellow }

function Get-EnvValue([string]$name) {
  if (-not (Test-Path ".env")) { return "" }
  $hit = Select-String -Path ".env" -Pattern "^$name=(.*)$" | Select-Object -First 1
  if ($hit) { return $hit.Matches[0].Groups[1].Value.Trim() }
  return ""
}

function Set-VercelEnv([string]$name, [string]$value, [string]$target = "production") {
  if ([string]::IsNullOrWhiteSpace($value)) { Write-Skip "$name (left empty)"; return }
  & vercel env add $name $target --value $value --force --yes *> $null
  if ($LASTEXITCODE -eq 0) { Write-Ok $name } else { Write-Warn2 "$name FAILED - set it in the Vercel dashboard instead" }
}

<#
  `vercel deploy` on Windows routinely exits non-zero even when the deployment
  succeeded, so $LASTEXITCODE is not a reliable signal. Deploy, then poll the
  deployment list until production reports Ready.
#>
function Invoke-VercelDeploy([string]$project) {
  $log = (& vercel deploy --prod --yes 2>&1 | Out-String)
  $url = ""
  $m = [regex]::Match($log, 'https://[a-z0-9][a-z0-9\-]*\.vercel\.app')
  if ($m.Success) { $url = $m.Value }

  $ready = $false
  for ($attempt = 1; $attempt -le 8 -and -not $ready; $attempt++) {
    Start-Sleep -Seconds 5
    $list = (& vercel ls $project 2>&1 | Out-String)
    if ($list -match 'Ready\s+Production') { $ready = $true }
  }

  if ($ready) {
    if ($url) { Write-Ok "production is Ready: $url" } else { Write-Ok "production is Ready" }
    return $true
  }
  Write-Warn2 "could not confirm the deployment went Ready - check the Vercel dashboard"
  return $false
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw "Vercel CLI not found. Install it with: npm install -g vercel"
}

# ---------------------------------------------------------------------------
# Phase 1: sign in, link the project, deploy once.
# ---------------------------------------------------------------------------
if (-not $Finish) {
  Write-Step "Phase 1 - sign in and deploy"

  & vercel whoami *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  Opening your browser to sign in to Vercel..." -ForegroundColor Yellow
    & vercel login
    if ($LASTEXITCODE -ne 0) { throw "vercel login did not complete." }
  } else {
    Write-Ok "already signed in"
  }

  Write-Step "Creating / linking the project '$ProjectName'"
  & vercel link --yes --project $ProjectName
  if ($LASTEXITCODE -ne 0) {
    throw "Could not link '$ProjectName'. The name is probably taken - try: .\deploy.ps1 -ProjectName github-wrapped-<yourname>"
  }
  Write-Ok "linked"

  Write-Step "Deploying (this takes a minute)"
  Invoke-VercelDeploy $ProjectName | Out-Null

  Write-Host ""
  Write-Host "  NEXT STEP - point GitHub at the production URL:" -ForegroundColor Yellow
  Write-Host "   1. Open https://github.com/settings/developers"
  Write-Host "   2. Open your OAuth app (or create one) for: $Domain"
  Write-Host "   3. Homepage URL               : $Domain"
  Write-Host "   4. Authorization callback URL : $Domain/api/auth/callback/github"
  Write-Host "      (GitHub allows up to 10 callback URLs, so you can keep the"
  Write-Host "       localhost one and just click 'Add callback URL'.)"
  Write-Host ""
  Write-Host "  Then push the production secrets:" -ForegroundColor Yellow
  Write-Host "     .\deploy.ps1 -Finish"
  return
}

# ---------------------------------------------------------------------------
# Phase 2: push the production environment variables, then redeploy.
# ---------------------------------------------------------------------------
Write-Step "Phase 2 - production environment variables"

$Domain = $Domain.Trim().TrimEnd("/")
if ($Domain -notmatch "^https?://") { $Domain = "https://$Domain" }
Write-Ok "domain: $Domain"

if (-not $GitHubClientId)     { $GitHubClientId     = Read-Host "  Production OAuth app Client ID" }
if (-not $GitHubClientSecret) { $GitHubClientSecret = Read-Host "  Production OAuth app Client Secret" }
if (-not $PublicToken)        { $PublicToken        = Read-Host "  GITHUB_PUBLIC_TOKEN (read-only token, or leave blank to skip)" }
if (-not $DatabaseUrl)        { $DatabaseUrl        = Read-Host "  DATABASE_URL (Postgres connection string, or leave blank to skip)" }

$authSecret = Get-EnvValue "AUTH_SECRET"
$cronSecret = Get-EnvValue "CRON_SECRET"
if (-not $authSecret) { $authSecret = Read-Host "  AUTH_SECRET (not found in .env) - paste one, or run: npx auth secret" }
if (-not $cronSecret) { $cronSecret = Read-Host "  CRON_SECRET (not found in .env) - press Enter to skip" }

Write-Host ""
Write-Host "  Pushing variables to production:" -ForegroundColor Cyan
Set-VercelEnv "AUTH_SECRET"          $authSecret
Set-VercelEnv "CRON_SECRET"          $cronSecret
Set-VercelEnv "AUTH_GITHUB_ID"       $GitHubClientId
Set-VercelEnv "AUTH_GITHUB_SECRET"   $GitHubClientSecret
Set-VercelEnv "NEXT_PUBLIC_APP_URL"  $Domain
Set-VercelEnv "GITHUB_PUBLIC_TOKEN"  $PublicToken
Set-VercelEnv "DATABASE_URL"         $DatabaseUrl

Write-Step "Redeploying with the production secrets"
Invoke-VercelDeploy $ProjectName | Out-Null

Write-Host ""
Write-Ok "Done. Your wrapped should be live at $Domain"
Write-Host ""
Write-Host "  Try it signed out (private window) - you should be able to sign in" -ForegroundColor Yellow
Write-Host "  with GitHub and view a profile. Reminder: without GITHUB_PUBLIC_TOKEN" -ForegroundColor Yellow
Write-Host "  set, only signed-in users can view a wrapped." -ForegroundColor Yellow