#!/bin/bash

echo "=============================================="
echo "   Apple App Store Connect Webhook Monitor"
echo "=============================================="
echo "Monitoring webhook events in real-time..."
echo "Press Ctrl+C to stop"
echo "=============================================="
echo ""

# Monitor webhook service logs with filtering and colors
sudo journalctl -u webhook-receiver -f --since "now" | \
    grep --line-buffered --color=always -E "(Received webhook|Processing event|Webhook ping|Apple test event|eventType)" | \
    while read line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
    done 