#!/usr/bin/env bash
# --------------------------------------------------------
# Restructure Trygghand project into clean monorepo layout
# Author: ChatGPT
# --------------------------------------------------------

set -e

echo "🚀 Starting project restructure..."

# Create new monorepo structure
mkdir -p apps/frontend apps/backend shared supabase scripts

# --------------------------------------------------------
# FRONTEND
# --------------------------------------------------------
echo "📦 Moving frontend (Vite + React)..."
if [ -d "app/src" ]; then
  mv app apps/frontend
elif [ -d "src" ] && [ -f "vite.config.ts" ]; then
  mkdir -p apps/frontend
  mv src apps/frontend/
  mv vite.config.ts tsconfig.app.json tsconfig.node.json index.html apps/frontend/ 2>/dev/null || true
fi

# Common frontend configs
mv tailwind.config.ts postcss.config.* eslint.config.js components.json apps/frontend/ 2>/dev/null || true
mv public apps/frontend/ 2>/dev/null || true

# --------------------------------------------------------
# BACKEND
# --------------------------------------------------------
echo "⚙️ Moving backend (Node/Supabase)..."
mkdir -p apps/backend/src

# Move backend source
if [ -d "backend" ]; then
  mv backend/api apps/backend/src/api 2>/dev/null || true
  mv backend/lib apps/backend/src/lib 2>/dev/null || true
  mv backend/routes apps/backend/src/routes 2>/dev/null || true
  mv backend/server.js apps/backend/src/server.js 2>/dev/null || true
  mv backend/package*.json apps/backend/ 2>/dev/null || true
  rm -rf backend/node_modules 2>/dev/null || true
fi

# Move stray server or lib files
[ -d "server" ] && mv server apps/backend/src/server_legacy
[ -d "lib" ] && mv lib apps/backend/src/lib_extra

# --------------------------------------------------------
# SHARED (types, utils)
# --------------------------------------------------------
echo "🔗 Moving shared code..."
mkdir -p shared/types
mv apps/frontend/src/types/* shared/types/ 2>/dev/null || true
mv apps/backend/src/lib/utils.ts shared/ 2>/dev/null || true

# --------------------------------------------------------
# SUPABASE
# --------------------------------------------------------
echo "🗄 Moving Supabase config..."
[ -d "supabase" ] && mv supabase supabase_backup_$(date +%s)
mkdir -p supabase/functions
mv apps/backend/src/lib/supabase*.ts supabase/ 2>/dev/null || true
mv .env .env.local supabase/ 2>/dev/null || true

# --------------------------------------------------------
# SCRIPTS
# --------------------------------------------------------
echo "📜 Moving scripts..."
mv restructure_project.sh scripts/ 2>/dev/null || true
mv apps/frontend/src/scripts/setup-database.sql scripts/ 2>/dev/null || true

# --------------------------------------------------------
# CLEANUP
# --------------------------------------------------------
echo "🧹 Cleaning up..."
rm -rf node_modules
rm -rf server.log server.pid Console 2>/dev/null || true

# --------------------------------------------------------
# ROOT FILES
# --------------------------------------------------------
echo "🪣 Setting up root files..."
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "apps/*"
  - "shared"
  - "supabase"
EOF

echo "✅ pnpm workspaces configured."

# --------------------------------------------------------
# DONE
# --------------------------------------------------------
echo ""
echo "✅ Restructure complete!"
echo "📁 New structure:"
tree -L 3 || ls -R
