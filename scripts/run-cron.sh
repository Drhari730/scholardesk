#!/bin/bash
# Railway cron jobs — create 3 Cron services pointing at these URLs with:
#   Authorization: Bearer $CRON_SECRET
#
# Daily 6 AM UTC:  curl -s -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/send-reminders"
# Monday 6 AM UTC: curl -s -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly-digest"
# Sunday 6 AM UTC: curl -s -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/weekly-backup"

APP_URL="${NEXT_PUBLIC_APP_URL:-https://scholardesk-production-55cf.up.railway.app}"
SECRET="${CRON_SECRET:?Set CRON_SECRET}"

case "${1:-all}" in
  reminders) curl -s -H "Authorization: Bearer $SECRET" "$APP_URL/api/cron/send-reminders" ;;
  digest)    curl -s -H "Authorization: Bearer $SECRET" "$APP_URL/api/cron/weekly-digest" ;;
  backup)    curl -s -H "Authorization: Bearer $SECRET" "$APP_URL/api/cron/weekly-backup" ;;
  all)
    curl -s -H "Authorization: Bearer $SECRET" "$APP_URL/api/cron/send-reminders"
    curl -s -H "Authorization: Bearer $SECRET" "$APP_URL/api/cron/weekly-digest"
    curl -s -H "Authorization: Bearer $SECRET" "$APP_URL/api/cron/weekly-backup"
    ;;
  *) echo "Usage: $0 [reminders|digest|backup|all]" ;;
esac
