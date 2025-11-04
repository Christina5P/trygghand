#!/bin/bash
set -e

echo "🔧 Startar omstrukturering av projektmapp..."
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_name="project_backup_$timestamp.tar.gz"

# ------------------------------------
# 🔒 Steg 1: Backup
# ------------------------------------
echo "🧭 Skapar säkerhetsbackup av hela projektet..."
tar --exclude='./frontend' --exclude='./backend' --exclude='./node_modules' -czf "$backup_name" .
echo "✅ Backup skapad: $backup_name"
echo "-----------------------------------------"

# ------------------------------------
# 🏗️ Steg 2: Förbered mappar
# ------------------------------------
mkdir -p frontend backend

echo "📦 Flyttar backend-filer..."
# Backend-filer
if [ -f "server.js" ]; then mv server.js backend/; fi
if [ -d "routes" ]; then mv routes backend/; fi

# Flytta package.json om det innehåller Express (backend)
if [ -f "package.json" ] && grep -q "express" package.json; then
  mv package*.json backend/ 2>/dev/null || true
fi

# Flytta backend.env
if [ -f "backend/.env" ]; then mv backend/.env backend/.env.backup; fi

# ------------------------------------
# 🎨 Steg 3: Flytta frontend-filer
# ------------------------------------
mkdir -p frontend/src frontend/public frontend/dist

echo "🎨 Flyttar frontend-filer..."
for f in vite.config.ts tailwind.config.ts tsconfig*.json postcss.config.* index.html App.tsx package.json package-lock.json pnpm-lock.yaml; do
  if [ -f "$f" ]; then
    mv "$f" frontend/ 2>/dev/null || true
  fi
done

# Flytta kataloger
for dir in app src public dist; do
  if [ -d "$dir" ]; then
    mv "$dir" frontend/ 2>/dev/null || true
  fi
done

# Rensa dubbel-nesting om det händer (t.ex. frontend/frontend)
if [ -d "frontend/frontend" ]; then
  mv frontend/frontend/* frontend/ && rmdir frontend/frontend
fi

# ------------------------------------
# 🧹 Steg 4: Städning
# ------------------------------------
echo "🧹 Städar upp temporära/loggfiler..."
rm -f npm-install.log server.log server.pid 2>/dev/null || true

# ------------------------------------
# 🏁 Steg 5: Slutrapport
# ------------------------------------
echo "⚙️ Behåller root-filer..."
keep_files=(".env" ".env.local" ".gitignore" "README.md" "CNAME" ".github" "supabase")
for item in "${keep_files[@]}"; do
  echo " - $item kvar i root"
done

echo "✅ Omstrukturering klar!"
echo "-----------------------------------------"
echo "Ny struktur:"
if command -v tree >/dev/null 2>&1; then
  tree -L 2 .
else
  ls -R .
fi
echo "-----------------------------------------"
echo "💾 Backup finns sparad som: $backup_name"
echo "💡 Tips: Kör 'cd frontend && npm install' för att installera frontend-dependencies igen."
