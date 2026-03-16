# ============================================
# 烟融小镇 - Cloudflare Workers 快速部署脚本
# ============================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  烟融小镇 Cloudflare 部署脚本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查 Node.js
Write-Host "[步骤 1/6] 检查 Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 未安装 Node.js，请先安装 Node.js 18+" -ForegroundColor Red
    Write-Host "   下载地址: https://nodejs.org/" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green

# 步骤 2: 检查 Wrangler
Write-Host ""
Write-Host "[步骤 2/6] 检查 Wrangler CLI..." -ForegroundColor Yellow
$wranglerVersion = wrangler --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Wrangler 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g wrangler
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Wrangler 安装失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Wrangler 安装成功" -ForegroundColor Green
} else {
    Write-Host "✅ Wrangler 已安装: $wranglerVersion" -ForegroundColor Green
}

# 步骤 3: 登录 Cloudflare
Write-Host ""
Write-Host "[步骤 3/6] 登录 Cloudflare..." -ForegroundColor Yellow
Write-Host "   将打开浏览器进行授权，请完成授权后继续..." -ForegroundColor Gray
wrangler login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 登录失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 登录成功" -ForegroundColor Green

# 步骤 4: 创建 D1 数据库
Write-Host ""
Write-Host "[步骤 4/6] 创建 D1 数据库..." -ForegroundColor Yellow
$dbResult = wrangler d1 create yanrong-users 2>&1
if ($dbResult -match "already exists") {
    Write-Host "⚠️  数据库已存在，跳过创建" -ForegroundColor Yellow
} elseif ($dbResult -match "Successfully") {
    Write-Host "✅ 数据库创建成功" -ForegroundColor Green
    
    # 提取 database_id
    if ($dbResult -match "database_id = ([a-f0-9-]+)") {
        $databaseId = $matches[1]
        Write-Host "   数据库 ID: $databaseId" -ForegroundColor Cyan
        
        # 更新 wrangler.toml
        $tomlContent = Get-Content "wrangler.toml" -Raw
        $tomlContent = $tomlContent -replace 'database_id = "你的数据库ID"', "database_id = `"$databaseId`""
        Set-Content "wrangler.toml" -Value $tomlContent -NoNewline
        Write-Host "   已自动更新 wrangler.toml" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ 数据库创建失败" -ForegroundColor Red
    Write-Host $dbResult
    exit 1
}

# 步骤 5: 初始化数据库表
Write-Host ""
Write-Host "[步骤 5/6] 初始化数据库表..." -ForegroundColor Yellow
wrangler d1 execute yanrong-users --remote --file=api/schema.sql
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 数据库表初始化失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 数据库表初始化成功" -ForegroundColor Green

# 步骤 6: 部署 Worker
Write-Host ""
Write-Host "[步骤 6/6] 部署 Worker..." -ForegroundColor Yellow
$deployResult = wrangler deploy 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 部署失败" -ForegroundColor Red
    Write-Host $deployResult
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  🎉 部署成功！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# 提取部署 URL
if ($deployResult -match "https://[^\s]+\.workers\.dev") {
    $workerUrl = $matches[0]
    Write-Host ""
    Write-Host "你的 API 地址: " -NoNewline
    Write-Host $workerUrl -ForegroundColor Cyan
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Yellow
    Write-Host "1. 修改 api/config.js 中的 BASE_URL 为: $workerUrl" -ForegroundColor White
    Write-Host "2. 测试 API: 访问 ${workerUrl}/api/health" -ForegroundColor White
    Write-Host ""
}

Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
