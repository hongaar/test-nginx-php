<?php

$delay = (int) getenv('RESPONSE_DELAY_SECONDS');
echo "received {$_SERVER['REQUEST_METHOD']} request";
echo "sleeping for $delay seconds";
sleep($delay);
echo "done";
