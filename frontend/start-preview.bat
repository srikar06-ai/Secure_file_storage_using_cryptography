@echo off
title SecureVault Preview
echo Starting SecureVault preview...
start "" "http://localhost:3000"
node serve.js
pause
