# ESPWR

ESP32 Power management unit for front-panel ports. Read this whole README for the full picture, you can't install this blindly.

> ![NOTE]
> If you like what you see, consider [becoming a sponsor!](https://github.com/sponsors/404oops)

## Programming the ESP32

You have to open the `esp/esp.ino` file to be able to flash your ESP32. You're hit with 4 variables:
- PWR GPIO pin
- RST GPIO pin
- WiFi SSID
- WiFi Password

> [!TIP]
> Upon startup, the device displays the IP address and the MAC address. You can safely use that MAC address and put it in a static DHCP host, so you'll have an easier time using it with other hosts.

> [!CAUTION]
> *I'm not responsible if you break your ESP32.* The code written has no hidden logic to brick your device. Use with caution.

## Wiring everything up

Once you set your PWR GPIO pin and RST GPIO pin, you need to grab some sort of system that bridges a gap when power is supplied through it.

*I'm being vague here*, because I made the mistake of getting optocouplers that are rated for 5V, higher than what the ESP32 can output, but they're in the tolerable resistance range so that the front panel can recognize a HIGH as a "short".

You can grab anything like a low-power relay or a MOSFET. Just make sure you're getting something that gets Power through 2 pins and bridges 2 pins together.

It's as simple as that.

## API
> [!IMPORTANT]
> **The whole system runs on HTTP.** The code at `esp/esp.ino` is visible, readable, and even a layman can decipher it. But in case you want to stay on the README, let me explain what's what:

You have 2 API "routes":
- `/pwr`
- `/rst`

Both of them **REQUIRE** arguments, which are:
- `set=`; which can either be:
  - `set=high` or
  - `set=low`
- `hold`, which requires an argument that's time the GPIO header is held high. If your pin was already high, it will still wait and set it to low.
  - `hold=200` is enough to turn a machine on
  - `hold=6000` is universally accepted to force a machine to turn off
> [!CAUTION]
> **Do NOT hold RST with an interval more than 200ms, even though the logic is implemented, there's genuinely no need to do that. Holding it for 200ms is enough to simulate a human press.**

## Running the slave

The slave is a server that's gonna do the dirty work. It's made with Bootstrap 2 (why not).

> [!IMPORTANT]
> **I built a Watchdog into the slave.** That's the whole reason why I made the project. You have to run the program on a host that has `ping` installed, and it will check if the host is online every 15 seconds. If it's not, it will power-cycle it through the API. You can choose to disengage the watchdog.

> [!CAUTION]
> **YOU HAVE TO EDIT THE `index.js` FILE.** In it are variables and all settings that you have to change and fill in with your own information to make everything work. **If you disengage the watchdog, you can keep the settings as-is, but you still have to change the IP of the ESP32.**

Upon cloning/downloading, you have to have something that runs JS

```sh
# If you have Bun
bun install
# If you have Deno
deno install
# if you have Node
npm install
```

To run

```sh
# If you have Bun
bun run serve
# If you have Deno
deno run serve
# if you have Node
npm run serve
```

Make sure to put this into the autostart of whichever container/machine you're running this on.

> [!TIP]
> I intended this to run on an LXC container on a server that doesn't have the issues I'm running into. YMMV. I'm not including a Dockerfile or a GitHub actions workflow to make a GitHub container that makes this all wired into a container. The point is to get something like a Raspberry Pi Zero or anything lesser than that and run the slave on **that** so that there's somewhat of a solution that doesn't hang or crash.