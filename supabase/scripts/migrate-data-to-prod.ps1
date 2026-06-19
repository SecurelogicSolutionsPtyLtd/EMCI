# Migrate EMCI data from legacy Singapore dev -> existing Australia prod.
# Supabase "Restore to new project" cannot target an existing project or change region.
#
# Prerequisites:
# - Database passwords for BOTH projects (Dashboard -> Project Settings -> Database)
# - Supabase CLI logged in: npx supabase login
#
# Usage (PowerShell, from repo root):
#   $env:OLD_DB_PASSWORD = 'your-old-project-db-password'
#   $env:NEW_DB_PASSWORD = 'your-au-prod-db-password'
#   .\supabase\scripts\migrate-data-to-prod.ps1

$ErrorActionPreference = 'Stop'

$OldRef = 'yfvvroesornchrxufwut'   # legacy dev (ap-southeast-1)
$NewRef = 'vklwppadgogepkeaizow'   # AU prod (ap-southeast-2)

if (-not $env:OLD_DB_PASSWORD) { throw 'Set OLD_DB_PASSWORD' }
if (-not $env:NEW_DB_PASSWORD) { throw 'Set NEW_DB_PASSWORD' }

$dumpDir = Join-Path $PSScriptRoot '..\.temp-migration'
New-Item -ItemType Directory -Force -Path $dumpDir | Out-Null
$dumpFile = Join-Path $dumpDir 'emci-data.sql'

# Session pooler URLs (IPv4-friendly). Adjust region prefix if your dashboard differs.
$oldUrl = "postgresql://postgres.${OldRef}:$($env:OLD_DB_PASSWORD)@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
$newUrl = "postgresql://postgres.${NewRef}:$($env:NEW_DB_PASSWORD)@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

Write-Host 'Dumping auth + public DATA from legacy project...'
npx --yes supabase@latest db dump `
  --db-url $oldUrl `
  --data-only `
  --use-copy `
  -s public `
  -s auth `
  -f $dumpFile

Write-Host 'Restoring into AU prod (ignore "already exists" errors on empty tables)...'
# psql must be installed (PostgreSQL client). Supabase CLI bundle may not include it on Windows.
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host ''
  Write-Host 'psql not found. Install PostgreSQL client tools, then run:'
  Write-Host "  psql `"$newUrl`" -f `"$dumpFile`""
  exit 1
}

psql $newUrl -f $dumpFile

Write-Host ''
Write-Host 'Done. Next: copy Auth settings in Dashboard, update Vercel VITE_SUPABASE_* env vars, smoke-test login.'
