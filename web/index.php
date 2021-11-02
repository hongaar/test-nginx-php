<?php

$delay = $_GET["delay"];
echo "received {$_SERVER['REQUEST_METHOD']} request";
echo "sleeping for $delay seconds";
sleep($delay);
echo "done";
