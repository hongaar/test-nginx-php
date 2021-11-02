FROM mcr.microsoft.com/windows/server:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# choco
RUN Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# deps
RUN choco install -y php --version=7.4.23
RUN choco install -y nginx --version=1.21.3 --params '"/noService"'
RUN choco install -y curl
RUN choco install -y nodejs

# php is in C:\tools\php74
# nginx is in C:\tools\nginx-1.21.3
# node is in C:\Program Files\nodejs

# set path env var
RUN setx /M PATH $($Env:PATH + ';C:\tools\php74;C:\tools\nginx-1.21.3;C:\Program Files\nodejs')

# copy web app
COPY web c:/tools/nginx-1.21.3/html

# copy templates
COPY templates c:/app/templates

# setup tests
WORKDIR c:/app
COPY package.json c:/app
RUN npm install
COPY test c:/app/test
