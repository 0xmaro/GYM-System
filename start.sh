#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GymOS — Full Project Runner
# يشغّل كل خدمات المشروع معاً:
#   - Laravel API & Web Server   (http://localhost:8000)
#   - Vite React Frontend        (http://localhost:5173)
#   - Laravel Reverb WebSockets  (ws://localhost:8080)
#   - Laravel Queue Worker
#   - Laravel Scheduler
#   - WhatsApp Bot               (http://localhost:5004)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

RUN_WHATSAPP=true
RUN_SCHEDULER=true

show_help() {
    cat <<EOF
Usage: ./start.sh [OPTIONS]

Options:
  --no-whatsapp    تشغيل المشروع بدون بوت الواتساب (whatsapp-bot)
  --no-scheduler   تشغيل المشروع بدون Laravel Scheduler
  -h, --help       عرض هذه الرسالة

Services & Ports:
  - Laravel Server : http://localhost:8000
  - Vite Frontend  : http://localhost:5173
  - Reverb WS      : ws://localhost:8080
  - WhatsApp Bot   : http://localhost:5004
EOF
}

for arg in "$@"; do
    case "$arg" in
        --no-whatsapp)  RUN_WHATSAPP=false ;;
        --no-scheduler) RUN_SCHEDULER=false ;;
        -h|--help)      show_help; exit 0 ;;
        *)
            echo -e "${RED}خيار غير معروف: $arg${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Helper: check if a TCP port is listening locally
is_port_open() {
    local host="$1"
    local port="$2"
    (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1
}

# Track any redis-server we spawn ourselves so we can stop it on exit
LOCAL_REDIS_PID=""
cleanup() {
    if [[ -n "$LOCAL_REDIS_PID" ]] && kill -0 "$LOCAL_REDIS_PID" 2>/dev/null; then
        echo -e "\n${YELLOW}إيقاف Redis المحلي...${NC}"
        kill "$LOCAL_REDIS_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

echo -e "${CYAN}${BOLD}==============================================${NC}"
echo -e "${CYAN}${BOLD}          🚀 Starting GymOS Project           ${NC}"
echo -e "${CYAN}${BOLD}==============================================${NC}"

# 1. Check .env & dependencies
if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    echo -e "${YELLOW}ملف .env غير موجود، سيتم نسخه من .env.example...${NC}"
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    php artisan key:generate
fi

if [[ ! -d "$SCRIPT_DIR/vendor" ]]; then
    echo -e "${YELLOW}تثبيت حزم Composer...${NC}"
    composer install
fi

if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
    echo -e "${YELLOW}تثبيت حزم npm للواجهة الأمامية...${NC}"
    npm install
fi

if [[ "$RUN_WHATSAPP" == true && ! -d "$SCRIPT_DIR/whatsapp-bot/node_modules" ]]; then
    echo -e "${YELLOW}تثبيت حزم npm لبوت الواتساب...${NC}"
    (cd "$SCRIPT_DIR/whatsapp-bot" && npm install)
fi

# 2. Check MySQL / MariaDB (port 3306)
if is_port_open 127.0.0.1 3306; then
    echo -e "${GREEN}✔ MySQL/MariaDB يعمل على المنفذ 3306${NC}"
else
    echo -e "${YELLOW}⚠ MySQL/MariaDB لا يعمل على المنفذ 3306.${NC}"
    echo -e "${YELLOW}  شغّله بالأمر: sudo systemctl start mariadb${NC}"
fi

# 3. Check Redis (port 6379) — auto-start locally if not running
if is_port_open 127.0.0.1 6379; then
    echo -e "${GREEN}✔ Redis يعمل على المنفذ 6379${NC}"
else
    if command -v redis-server >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Redis لا يعمل — جاري تشغيل redis-server محلياً...${NC}"
        redis-server --port 6379 --save "" --appendonly no >/dev/null 2>&1 &
        LOCAL_REDIS_PID=$!
        sleep 1
        if is_port_open 127.0.0.1 6379; then
            echo -e "${GREEN}✔ تم تشغيل Redis محلياً (PID: $LOCAL_REDIS_PID)${NC}"
        else
            echo -e "${RED}✖ تعذر تشغيل Redis. شغّله يدوياً: sudo systemctl start redis${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Redis غير متاح على المنفذ 6379. شغّله بالأمر: sudo systemctl start redis${NC}"
    fi
fi

# 4. Build service list
NAMES=("server" "vite" "reverb" "queue")
COLORS=("#93c5fd" "#fdba74" "#c4b5fd" "#86efac")
COMMANDS=(
    "php artisan serve --host=127.0.0.1 --port=8000"
    "npm run dev"
    "php artisan reverb:start"
    "php artisan queue:listen --tries=1 --timeout=0"
)

if [[ "$RUN_SCHEDULER" == true ]]; then
    NAMES+=("schedule")
    COLORS+=("#fde047")
    COMMANDS+=("php artisan schedule:work")
fi

if [[ "$RUN_WHATSAPP" == true ]]; then
    NAMES+=("whatsapp")
    COLORS+=("#67e8f9")
    COMMANDS+=("cd \"$SCRIPT_DIR/whatsapp-bot\" && node server.js")
fi

echo ""
echo -e "${BLUE}الروابط:${NC}"
echo -e "  • الموقع / API : ${BOLD}http://localhost:8000${NC}"
echo -e "  • Vite Dev     : ${BOLD}http://localhost:5173${NC}"
echo -e "  • Reverb WS    : ${BOLD}ws://localhost:8080${NC}"
if [[ "$RUN_WHATSAPP" == true ]]; then
    echo -e "  • WhatsApp Bot : ${BOLD}http://localhost:5004${NC}"
fi
echo ""
echo -e "${YELLOW}اضغط Ctrl+C لإيقاف جميع الخدمات معاً.${NC}"
echo ""

# Join arrays with commas for concurrently
IFS=','; NAMES_CSV="${NAMES[*]}"; COLORS_CSV="${COLORS[*]}"; unset IFS

# 5. Launch all services together
if [[ -x "$SCRIPT_DIR/node_modules/.bin/concurrently" ]]; then
    "$SCRIPT_DIR/node_modules/.bin/concurrently" \
        --kill-others-on-fail=false \
        -c "$COLORS_CSV" \
        --names "$NAMES_CSV" \
        "${COMMANDS[@]}"
else
    npx concurrently \
        --kill-others-on-fail=false \
        -c "$COLORS_CSV" \
        --names "$NAMES_CSV" \
        "${COMMANDS[@]}"
fi
