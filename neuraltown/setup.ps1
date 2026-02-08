# 🏙️ NEURALTOWN - Complete Setup Script

Write-Host ""
Write-Host "🏙️  NEURALTOWN SETUP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file. Please fill in your API keys before continuing!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You need to set:" -ForegroundColor Yellow
    Write-Host "  - GEMINI_API_KEY" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    Write-Host "  - UPSTASH_REDIS_URL" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter once you've filled in the .env file"
}

Write-Host "📦 Installing root dependencies..." -ForegroundColor Blue
npm install

Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
Set-Location frontend
npm install

Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
Set-Location ..\backend
npm install

Set-Location ..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Make sure you've set up Supabase (run supabase-schema.sql in SQL Editor)" -ForegroundColor White
Write-Host "2. Verify your .env file has all required keys" -ForegroundColor White
Write-Host "3. Run 'npm run dev' to start both servers" -ForegroundColor White
Write-Host ""
Write-Host "Or run separately:" -ForegroundColor Cyan
Write-Host "  Backend:  cd backend && npm run dev" -ForegroundColor White
Write-Host "  Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
