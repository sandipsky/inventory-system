Set-Location -Path $PSScriptRoot
& .\mvnw.cmd spring-boot:run
exit $LASTEXITCODE
