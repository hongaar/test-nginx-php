@echo off

echo Starting PHP...
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19500
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19501
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19502
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19503
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19504
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19505
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19506
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19507
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19508
START c:\tools\php74\php-cgi.exe -b 127.0.0.1:19509

echo Starting NGINX...
START /D c:\tools\nginx-1.21.3 c:\tools\nginx-1.21.3\nginx.exe
