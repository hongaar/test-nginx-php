import axios from "axios"
import child_process from "child_process"
import fs from "fs"
import Mustache from "mustache"
import { throttle } from "throttle-debounce"

const DEBUG = false

function wait(seconds) {
  DEBUG && console.log(`Sleeping for ${seconds} seconds...`)
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

function applyTemplate(src, dest, view) {
  const template = fs.readFileSync(src, "utf8")
  fs.writeFileSync(dest, Mustache.render(template, view))
  DEBUG && console.log(`Applied template ${src} to ${dest}`)
}

function makeView(config) {
  return {
    ...config,
    php_farm: new Array(config.php_farm_size).fill(0).map((v, i) => ({
      port: 19500 + i,
    })),
  }
}

async function applyTemplates(config) {
  const view = makeView(config)
  applyTemplate(
    "C:/app/templates/php.ini.template",
    "C:/tools/php74/php.ini",
    view
  )
  applyTemplate(
    "C:/app/templates/nginx.conf.template",
    "C:/tools/nginx-1.21.3/conf/nginx.conf",
    view
  )
}

async function startServers(config) {
  DEBUG && console.log(`Starting servers...`)
  child_process.exec("start-servers.bat", {
    cwd: "c:/app/test",
    encoding: "utf8",
    env: {
      PHP_FCGI_CHILDREN: config.php_fcgi_children,
      PHP_FCGI_MAX_REQUESTS: config.php_fcgi_max_requests,
    },
  })
}

async function cleanLogs() {
  const files = fs.readdirSync("C:/tools/nginx-1.21.3/logs")
  for (const file of files) {
    fs.unlinkSync(`C:/tools/nginx-1.21.3/logs/${file}`)
  }
}

async function stopServers() {
  try {
    child_process.execSync("stop-servers.bat", {
      cwd: "c:/app/test",
      encoding: "utf8",
      stdio: "ignore",
    })
  } catch (err) {}
  DEBUG && console.log(`Stopped servers`)
}

async function makeRequests(method = "GET", config) {
  console.log(`Starting ${config.reqs_total} ${method} requests...`)

  let lastStatus = null
  let requests = []

  function write(icon, status) {
    process.stdout.write(icon)
    if (lastStatus !== status) {
      process.stdout.write(` ${status} `)
      lastStatus = status
    }
  }

  async function makeRequest() {
    process.stdout.write(`.`)
    let delay = config.response_delay
    delay = Array.isArray(delay)
      ? delay[Math.floor(Math.random() * delay.length)]
      : delay
    requests.push(
      axios
        .get(`http://127.0.0.1/?delay=${delay}`, { responseType: "text" })
        .then((response) => {
          write("✅", `${response.status} ${response.statusText}`)
        })
        .catch((error) => {
          if (error.response) {
            write("❌", `${error.response.status} ${error.response.statusText}`)
          } else if (error.request) {
            write("❌", "no response")
          } else {
            write("❌", "error")
          }
        })
    )
  }

  const makeThrottledRequest = throttle(1000 / config.reqs_rps, makeRequest)

  while (requests.length < config.reqs_total) {
    makeThrottledRequest()
    await wait(0.00001)
  }

  await Promise.all(requests)

  process.stdout.write(`\n`)
}

async function runTests(name, configOverride = {}) {
  const config = {
    ...defaultConfig,
    ...configOverride,
  }

  console.log("")
  console.log("█".repeat(process.stdout.columns))
  console.log(name.toUpperCase())
  console.log("▒".repeat(process.stdout.columns))
  console.log(JSON.stringify(config, undefined, 2))
  console.log("▒".repeat(process.stdout.columns))

  await applyTemplates(config)
  await startServers(config)
  await wait(2)
  await makeRequests("GET", config)
  await wait(2)
  await makeRequests("POST", config)
  await wait(2)
  await stopServers()
}

const defaultConfig = {
  // requests per second
  reqs_rps: 100,

  // total requests
  reqs_total: 100,

  // seconds
  response_delay: 0,

  // requests per second
  nginx_limit_rps: 1000,

  // requests
  nginx_limit_burst: 10,

  // seconds
  nginx_fastcgi_read_timeout: 600,

  // seconds
  php_max_execution_time: 600,

  // php-cgi servers
  php_farm_size: 1,

  // children per php-cgi server
  php_fcgi_children: 1,

  // requests until child is restarted
  php_fcgi_max_requests: 128,
}

async function run() {
  await cleanLogs()
  await stopServers()

  // await runTests("baseline")

  // await runTests("nginx rate limiter (1)", {
  //   nginx_limit_rps: 1,
  //   nginx_limit_burst: 10,
  // })

  // await runTests("nginx rate limiter (2)", {
  //   nginx_limit_rps: 5,
  //   nginx_limit_burst: 50,
  // })

  // await runTests("1 php-cgi, 1 child", {
  //   response_delay: 1,
  //   php_farm_size: 1,
  //   php_fcgi_children: 1,
  // })

  // await runTests("10 php-cgi, 1 child", {
  //   response_delay: 1,
  //   php_farm_size: 10,
  //   php_fcgi_children: 1,
  // })

  // await runTests("1 php-cgi, 10 children", {
  //   response_delay: 1,
  //   php_farm_size: 1,
  //   php_fcgi_children: 10,
  // })

  // await runTests("10 php-cgi, 10 children", {
  //   response_delay: 1,
  //   php_farm_size: 10,
  //   php_fcgi_children: 10,
  // })

  // await runTests("slow response time", {
  //   response_delay: 10,
  //   nginx_fastcgi_read_timeout: 5,
  //   php_max_execution_time: 5,
  //   php_farm_size: 10,
  //   php_fcgi_children: 1,
  // })

  await runTests("mixed response time", {
    response_delay: [0, 0, 10],
    nginx_fastcgi_read_timeout: 5,
    php_max_execution_time: 5,
    php_farm_size: 10,
    php_fcgi_children: 1,
  })
}

await run()
