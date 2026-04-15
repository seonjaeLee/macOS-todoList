#!/bin/bash
# Desktop Todo 실행 스크립트
# 이 파일을 더블클릭하면 터미널 없이 앱이 실행됩니다

cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
npx electron . > /tmp/desktop-todo.log 2>&1 &
