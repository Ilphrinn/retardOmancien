$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$message = "chore: trigger railway redeploy ($timestamp)"

git commit --allow-empty -m $message
if ($LASTEXITCODE -ne 0) {
  Write-Error "Impossible de créer le commit vide."
  exit 1
}

git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Error "Impossible de push vers origin/main."
  exit 1
}

Write-Host "Redeploy déclenché via push GitHub."
