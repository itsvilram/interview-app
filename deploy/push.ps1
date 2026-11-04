# Creates the GitHub repo (first run) and pushes the code.
# Usage:  npm run push
#    or:  powershell -ExecutionPolicy Bypass -File deploy\push.ps1 -RepoName interview-app -Visibility public
param(
  [string]$RepoName = "interview-app",
  [ValidateSet("public", "private")][string]$Visibility = "public",
  [string]$Message = "Update"
)

Set-Location (Split-Path $PSScriptRoot -Parent)

function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# 1. Safety check: never push secrets
if (git ls-files .env) { Fail ".env is tracked by git. Run: git rm --cached .env" }

# 2. Use 'main' as the branch name (the EC2 script expects it)
git branch -M main

# 3. Commit any pending changes
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m $Message
  if ($LASTEXITCODE -ne 0) { Fail "git commit failed" }
}

# 4. Create the repo on first run, otherwise just push
$hasOrigin = (git remote) -contains "origin"
if (-not $hasOrigin) {
  gh repo create $RepoName "--$Visibility" --source . --remote origin --push
  if ($LASTEXITCODE -ne 0) { Fail "gh repo create failed (does the repo name already exist?)" }
} else {
  git push -u origin main
  if ($LASTEXITCODE -ne 0) { Fail "git push failed" }
}

# 5. Print what to paste into EC2
$url = gh repo view --json url -q .url
$path = $url -replace '^https://github.com/', ''
Write-Host ""
Write-Host "Pushed: $url" -ForegroundColor Green
Write-Host ""
Write-Host "Paste this into EC2 Instance Connect:" -ForegroundColor Yellow
Write-Host "curl -fsSL https://raw.githubusercontent.com/$path/main/deploy/ec2-setup.sh | bash -s -- $url.git"
