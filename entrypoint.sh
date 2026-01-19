#!/bin/sh

# Start API in background
./main &

# Start SMTP Server in background
./smtp_server &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
