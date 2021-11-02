# test-nginx-php

## how to use

### build

```
docker build --rm -t testnginxphp .
```

### develop

```
docker run --rm -it --mount src=c:/Users/honga/Code/exivity/test-nginx-php,target=c:/app,type=bind testnginxphp
```

_replace `c:/Users/honga/Code/exivity/test-nginx-php` with `pwd`_

### run

```
docker run --rm testnginxphp node test
```
