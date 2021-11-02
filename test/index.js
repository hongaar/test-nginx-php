import axios from "axios"
import child_process from "child_process"
import fs from "fs"
import Mustache from "mustache"
import { throttle } from "throttle-debounce"

const DEBUG = false

function delay(seconds) {
  DEBUG && console.log(`Sleeping for ${seconds} seconds...`)
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

function applyTemplate(src, dest, data) {
  const template = fs.readFileSync(src, "utf8")
  fs.writeFileSync(dest, Mustache.render(template, data))
  DEBUG && console.log(`Applied template ${src} to ${dest}`)
}

function makeView(data) {
  return {
    ...data,
    php_farm: new Array(data.php_farm_size).fill(0).map((v, i) => ({
      port: 19500 + i,
    })),
  }
}

async function applyTemplates(data) {
  const view = makeView(data)
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

async function startServers(data) {
  DEBUG && console.log(`Starting servers...`)
  child_process.exec("start-servers.bat", {
    cwd: "c:/app/test",
    encoding: "utf8",
    env: {
      PHP_FCGI_CHILDREN: data.php_fcgi_children,
      PHP_FCGI_MAX_REQUESTS: data.php_fcgi_max_requests,
      RESPONSE_DELAY_SECONDS: data.response_delay_seconds,
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

async function makeRequests(method = "GET", data) {
  console.log(`Starting ${data.reqs_total} ${method} requests...`)

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
    requests.push(
      axios
        .get("http://127.0.0.1", { responseType: "text" })
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

  const makeThrottledRequest = throttle(1000 / data.reqs_rps, makeRequest)

  while (requests.length < data.reqs_total) {
    makeThrottledRequest()
    await delay(0.00001)
  }

  await Promise.all(requests)

  process.stdout.write(`\n`)
}

async function runTests(name, testData) {
  const data = {
    ...defaultOptions,
    ...testData,
  }

  console.log("")
  console.log("█".repeat(process.stdout.columns))
  console.log(name.toUpperCase())
  console.log("▒".repeat(process.stdout.columns))
  console.log(JSON.stringify(data, undefined, 2))
  console.log("▒".repeat(process.stdout.columns))

  await applyTemplates(data)
  await startServers(data)
  await delay(2)
  await makeRequests("GET", data)
  await delay(2)
  await makeRequests("POST", data)
  await delay(2)
  await stopServers()
}

const defaultOptions = {
  reqs_rps: 100,
  reqs_total: 100,
  response_delay_seconds: 0,
  nginx_limit_rps: 1000,
  nginx_limit_burst: 10,
  nginx_fastcgi_read_timeout: 600,
  php_max_execution_time: 600,
  php_farm_size: 1,
  php_fcgi_children: 1,
  php_fcgi_max_requests: 128,
}

async function run() {
  await cleanLogs()
  await stopServers()

  // await runTests("baseline", {})

  // await runTests("nginx rate limiter (1)", {
  //   nginx_limit_rps: 1,
  //   nginx_limit_burst: 10,
  // })

  // await runTests("nginx rate limiter (2)", {
  //   nginx_limit_rps: 5,
  //   nginx_limit_burst: 50,
  // })

  // await runTests("1 php-cgi, 1 child", {
  //   response_delay_seconds: 1,
  //   php_farm_size: 1,
  //   php_fcgi_children: 1,
  // })

  await runTests("10 php-cgi, 1 child", {
    response_delay_seconds: 1,
    php_farm_size: 10,
    php_fcgi_children: 1,
  })

  await runTests("1 php-cgi, 10 children", {
    response_delay_seconds: 1,
    php_farm_size: 1,
    php_fcgi_children: 10,
  })

  await runTests("10 php-cgi, 10 children", {
    response_delay_seconds: 1,
    php_farm_size: 10,
    php_fcgi_children: 10,
  })
}

await run()
