/*
  Below this is the toggle to turn on the watchdog functionality
  The watchdog will ping the monitored host every 15 seconds, and
  if it doesn't respond, it will cycle the power. Below are all
  of the settings for it. There's also the toggle to turn it off.
  Read all the variables below the imports. READ THE DAMN CODE.
*/

const express = require('express');
const { execFile } = require('node:child_process');
const http = require('node:http');
const { promisify } = require('node:util');

const app = express();
const port = 3000;
const watchdog = true;
const proxyTargetHost = '10.0.2.210';
const monitoredHost = '10.0.2.10';
const watchdogIntervalMs = 15000;
const pingTimeoutMs = 3000;
const powerControllerBaseUrl = `http://${proxyTargetHost}`;
const execFileAsync = promisify(execFile);
let restartInProgress = false;

app.use(express.static('operator'));

app.use('/api', proxyApiRequest);

function proxyApiRequest(req, res) {
  const proxyRequest = http.request(
    {
      hostname: powerControllerBaseUrl,
      port: 80,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: powerControllerBaseUrl,
      },
    },
    (proxyResponse) => {
      res.status(proxyResponse.statusCode || 502);

      for (const [headerName, headerValue] of Object.entries(proxyResponse.headers)) {
        if (headerValue !== undefined) {
          res.setHeader(headerName, headerValue);
        }
      }

      proxyResponse.pipe(res);
    }
  );

  proxyRequest.on('error', (error) => {
    res.status(502).json({
      error: `Failed to proxy request to ${proxyTargetHost}`,
      message: error.message,
    });
  });

  req.pipe(proxyRequest);
}

async function isHostReachable(hostname) {
  try {
    await execFileAsync('ping', ['-c', '1', hostname], { timeout: pingTimeoutMs });
    return true;
  } catch {
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function holdPower(milliseconds) {
  const response = await fetch(`${powerControllerBaseUrl}/pwr?hold=${milliseconds}`);

  if (!response.ok) {
    throw new Error(`Power hold request failed with ${response.status}`);
  }
}

async function restartMonitoredServer() {
  if (restartInProgress) {
    return;
  }

  restartInProgress = true;

  try {
    await holdPower(6000);
    await sleep(2000);
    await holdPower(200);
  } finally {
    restartInProgress = false;
    waitForHostToComeBack();
  }
}

function waitForHostToComeBack() {
  const checkIntervalMs = 1000;

  const checkHost = async () => {
    const reachable = await isHostReachable(monitoredHost);

    if (reachable) {
      console.log(`Host ${monitoredHost} is back online.`);
    } else {
      setTimeout(checkHost, checkIntervalMs);
    }
  };

  setTimeout(checkHost, checkIntervalMs);
}

async function watchdogTick() {
  if (restartInProgress) {
    return;
  }

  const reachable = await isHostReachable(monitoredHost);

  if (!reachable) {
    console.log(`Host ${monitoredHost} did not respond to ping; cycling power.`);
    await restartMonitoredServer();
  }
}

function startWatchdog() {
  const runCheck = () => {
    watchdogTick().catch((error) => {
      console.error('Watchdog error:', error);
    });
  };

  setInterval(runCheck, watchdogIntervalMs);
  runCheck();
}

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}\nProxying API requests to http://${proxyTargetHost}`);
  if (watchdog) { startWatchdog(); }
});