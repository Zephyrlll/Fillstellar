#!/bin/bash

# WebSocket Load Test Script
# Artillery.js を使用した負荷テスト

set -e

echo "=== Cosmic Gardener WebSocket Load Test ==="

# 必要なツールのチェック
command -v artillery >/dev/null 2>&1 || { echo "artillery is required but not installed. Run: npm install -g artillery"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed."; exit 1; }

# 設定
SERVER_URL="ws://localhost:8080"
WS_ENDPOINT="/api/ws"
RESULTS_DIR="./load_test_results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 結果ディレクトリを作成
mkdir -p "$RESULTS_DIR"

# テスト用JWTトークンを生成（実際の実装では認証APIを使用）
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2NDE5OTcyMDAsImV4cCI6MTY0MjAwMDgwMH0.test_signature"

# Artillery設定ファイルを生成
cat > "$RESULTS_DIR/artillery-config.yml" << EOF
config:
  target: '$SERVER_URL'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Ramp up load"
    - duration: 60
      arrivalRate: 15
      name: "Steady load"
  ws:
    connect:
      url: "${WS_ENDPOINT}?token=${JWT_TOKEN}"
    subprotocols:
      - "echo-protocol"
  processor: "./websocket-processor.js"

scenarios:
  - name: "Basic WebSocket Flow"
    weight: 100
    engine: ws
    flow:
      - connect:
          url: "${WS_ENDPOINT}?token=${JWT_TOKEN}"
      - think: 1
      - send:
          payload: '{"type": "GetState"}'
      - think: 2
      - send:
          payload: '{"type": "Heartbeat"}'
      - think: 3
      - send:
          payload: '{"type": "CreateCelestialBody", "data": {"body_type": "Planet", "position": {"x": 100, "y": 200, "z": 0}}}'
      - think: 2
      - send:
          payload: '{"type": "SaveGame", "data": {"state": {"resources": {"cosmicDust": 1000}}}}'
      - think: 5
EOF

# WebSocketプロセッサスクリプトを生成
cat > "$RESULTS_DIR/websocket-processor.js" << 'EOF'
module.exports = {
  // メッセージを処理する関数
  processMessage: function(message, context, ee, next) {
    try {
      const data = JSON.parse(message);
      
      // メッセージタイプごとの処理
      switch(data.type) {
        case 'StateUpdate':
          ee.emit('counter', 'websocket.state_update', 1);
          break;
        case 'ActionResult':
          if (data.data.success) {
            ee.emit('counter', 'websocket.action_success', 1);
          } else {
            ee.emit('counter', 'websocket.action_failure', 1);
          }
          break;
        case 'Error':
          ee.emit('counter', 'websocket.error', 1);
          console.error('WebSocket error:', data.data);
          break;
        case 'Heartbeat':
          ee.emit('counter', 'websocket.heartbeat', 1);
          break;
      }
    } catch (error) {
      ee.emit('counter', 'websocket.parse_error', 1);
      console.error('Message parse error:', error);
    }
    
    return next();
  }
};
EOF

echo "Starting load test..."
echo "Results will be saved in: $RESULTS_DIR"

# 基本的な負荷テスト
echo "=== Basic Load Test ==="
artillery run "$RESULTS_DIR/artillery-config.yml" \
  --output "$RESULTS_DIR/basic-load-$TIMESTAMP.json" \
  > "$RESULTS_DIR/basic-load-$TIMESTAMP.log" 2>&1

# 結果レポートを生成
echo "=== Generating Report ==="
artillery report "$RESULTS_DIR/basic-load-$TIMESTAMP.json" \
  --output "$RESULTS_DIR/basic-load-report-$TIMESTAMP.html"

# 高負荷テスト
echo "=== High Load Test ==="
cat > "$RESULTS_DIR/high-load-config.yml" << EOF
config:
  target: '$SERVER_URL'
  phases:
    - duration: 30
      arrivalRate: 20
      name: "High load test"
  ws:
    connect:
      url: "${WS_ENDPOINT}?token=${JWT_TOKEN}"

scenarios:
  - name: "High Load WebSocket"
    weight: 100
    engine: ws
    flow:
      - connect:
          url: "${WS_ENDPOINT}?token=${JWT_TOKEN}"
      - loop:
        - send:
            payload: '{"type": "Heartbeat"}'
        - think: 1
        count: 10
EOF

artillery run "$RESULTS_DIR/high-load-config.yml" \
  --output "$RESULTS_DIR/high-load-$TIMESTAMP.json" \
  > "$RESULTS_DIR/high-load-$TIMESTAMP.log" 2>&1

artillery report "$RESULTS_DIR/high-load-$TIMESTAMP.json" \
  --output "$RESULTS_DIR/high-load-report-$TIMESTAMP.html"

# 同時接続数テスト
echo "=== Concurrent Connection Test ==="
concurrent_users=(50 100 200)

for users in "${concurrent_users[@]}"; do
  echo "Testing with $users concurrent users..."
  
  cat > "$RESULTS_DIR/concurrent-$users-config.yml" << EOF
config:
  target: '$SERVER_URL'
  phases:
    - duration: 60
      arrivalRate: $users
      name: "Concurrent test with $users users"
  ws:
    connect:
      url: "${WS_ENDPOINT}?token=${JWT_TOKEN}"

scenarios:
  - name: "Concurrent WebSocket"
    weight: 100
    engine: ws
    flow:
      - connect:
          url: "${WS_ENDPOINT}?token=${JWT_TOKEN}"
      - send:
          payload: '{"type": "GetState"}'
      - think: 5
      - send:
          payload: '{"type": "Heartbeat"}'
      - think: 10
EOF

  artillery run "$RESULTS_DIR/concurrent-$users-config.yml" \
    --output "$RESULTS_DIR/concurrent-$users-$TIMESTAMP.json" \
    > "$RESULTS_DIR/concurrent-$users-$TIMESTAMP.log" 2>&1
done

# 結果の集計
echo "=== Test Results Summary ==="
echo "Timestamp: $TIMESTAMP"
echo "Results directory: $RESULTS_DIR"

# JSON結果からメトリクスを抽出
extract_metrics() {
  local file=$1
  if [[ -f "$file" ]]; then
    echo "=== $(basename $file) ==="
    echo "Total requests: $(jq '.aggregate.counters["websocket.messages"] // 0' "$file")"
    echo "Successful actions: $(jq '.aggregate.counters["websocket.action_success"] // 0' "$file")"
    echo "Failed actions: $(jq '.aggregate.counters["websocket.action_failure"] // 0' "$file")"
    echo "Errors: $(jq '.aggregate.counters["websocket.error"] // 0' "$file")"
    echo "Average response time: $(jq '.aggregate.latency.mean // 0' "$file")ms"
    echo "Max response time: $(jq '.aggregate.latency.max // 0' "$file")ms"
    echo "---"
  fi
}

for result_file in "$RESULTS_DIR"/*.json; do
  if [[ -f "$result_file" ]]; then
    extract_metrics "$result_file"
  fi
done

# システムリソース使用量をチェック
echo "=== System Resource Usage ==="
echo "CPU Usage:"
top -l 1 | grep "CPU usage" || echo "CPU info not available"

echo "Memory Usage:"
free -h 2>/dev/null || vm_stat | head -10

echo "Network Connections:"
netstat -an | grep :8080 | wc -l

# クリーンアップ
echo "=== Cleanup ==="
rm -f "$RESULTS_DIR/artillery-config.yml"
rm -f "$RESULTS_DIR/websocket-processor.js"
rm -f "$RESULTS_DIR/high-load-config.yml"
rm -f "$RESULTS_DIR/concurrent-"*"-config.yml"

echo "Load test completed!"
echo "Check the HTML reports in: $RESULTS_DIR"
echo "Log files are also available in: $RESULTS_DIR"

# 結果の評価
echo "=== Performance Evaluation ==="
echo "Please review the following metrics:"
echo "1. Connection success rate should be > 95%"
echo "2. Average response time should be < 100ms"
echo "3. Error rate should be < 5%"
echo "4. Memory usage should be reasonable"
echo "5. CPU usage should be < 80%"