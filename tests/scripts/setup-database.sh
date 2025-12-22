#!/bin/bash

# ==========================================
# TEST DATABASE SETUP HELPER
# ==========================================
# Detta script hjälper dig att sätta upp test-databasen
# 
# Användning:
#   ./tests/scripts/setup-database.sh
# ==========================================

set -e  # Exit on error

echo "======================================"
echo "🗄️  TryggHand Test Database Setup"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.test exists
if [ ! -f "tests/.env.test" ]; then
    echo -e "${RED}❌ Fel: tests/.env.test saknas!${NC}"
    echo ""
    echo "Skapa filen först:"
    echo "  cp tests/.env.test.example tests/.env.test"
    echo ""
    echo "Sedan redigera med dina Supabase credentials."
    exit 1
fi

# Load environment variables
set -a
source tests/.env.test
set +a

echo -e "${BLUE}📋 Verifierar konfiguration...${NC}"
echo ""

# Check DATABASE_ENV
if [ "$DATABASE_ENV" != "test" ]; then
    echo -e "${RED}❌ FEL: DATABASE_ENV är inte 'test'!${NC}"
    echo "   Nuvarande värde: $DATABASE_ENV"
    echo ""
    echo "   Detta är en säkerhetsfunktion för att förhindra"
    echo "   körning mot produktion. Sätt DATABASE_ENV=test i .env.test"
    exit 1
fi

echo -e "${GREEN}✅ DATABASE_ENV = test${NC}"

# Check SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ FEL: SUPABASE_URL saknas i .env.test${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SUPABASE_URL = $SUPABASE_URL${NC}"

# Check if URL contains test project ID
if [[ ! "$SUPABASE_URL" =~ "fujeyujbchgrtaxodvcz" ]]; then
    echo -e "${YELLOW}⚠️  VARNING: URL verkar inte peka på test-projektet${NC}"
    echo "   Förväntat: https://fujeyujbchgrtaxodvcz.supabase.co"
    echo "   Hittade: $SUPABASE_URL"
    echo ""
    read -p "   Fortsätta ändå? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check SUPABASE_ANON_KEY
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ FEL: SUPABASE_ANON_KEY saknas i .env.test${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SUPABASE_ANON_KEY finns${NC}"

echo ""
echo -e "${BLUE}📊 Konfiguration OK!${NC}"
echo ""
echo "======================================"
echo "📁 SQL Script Files"
echo "======================================"
echo ""
echo "Setup script:    tests/setup-test-database.sql"
echo "Verify script:   tests/verify-test-database.sql"
echo ""

# Ask if user wants to see SQL file content
echo -e "${YELLOW}Nästa steg:${NC}"
echo ""
echo "1. Öppna Supabase Dashboard:"
echo "   ${BLUE}https://supabase.com/dashboard${NC}"
echo ""
echo "2. Välj ditt TEST-projekt (fujeyujbchgrtaxodvcz)"
echo ""
echo "3. Gå till SQL Editor (vänster-menyn)"
echo ""
echo "4. Klicka 'New query'"
echo ""
echo "5. Kopiera innehållet från:"
echo "   ${GREEN}tests/setup-test-database.sql${NC}"
echo ""
echo "6. Klistra in i SQL Editor"
echo ""
echo "7. Klicka 'Run' (eller CMD/CTRL + Enter)"
echo ""
echo "8. Verifiera att allt fungerade genom att köra:"
echo "   ${GREEN}tests/verify-test-database.sql${NC}"
echo ""

# Ask if user wants to view the SQL file
echo ""
read -p "Vill du visa setup-scriptet nu? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "======================================"
    echo "📄 tests/setup-test-database.sql"
    echo "======================================"
    cat tests/setup-test-database.sql | head -100
    echo ""
    echo "... (visa resten med: cat tests/setup-test-database.sql)"
    echo ""
fi

echo ""
echo "======================================"
echo "✅ Setup-guide klar!"
echo "======================================"
echo ""
echo "Nästa steg:"
echo "  1. Kör SQL-scriptet i Supabase Dashboard"
echo "  2. Verifiera med verify-test-database.sql"
echo "  3. Testa uppkopplingen: npm run test"
echo ""
echo "📖 För fullständig guide, läs: tests/DATABASE_SETUP.md"
echo ""
