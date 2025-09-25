# Video Call App - Local Network Setup

This guide helps you run the app on your laptop and mobile device for real-time video calls.

## Prerequisites

- Node.js and npm installed
- Both devices (laptop & mobile) connected to the same Wi-Fi network

## 1. Find Your Local IP Address

- On your laptop, run:
  ```
  ipconfig
  ```
- Look for `IPv4 Address` (e.g., `192.168.227.171`).

## 2. Configure host addresses (recommended)

```powershell
ipconfig
```

```
npm install
node server.js
```

- The server runs on `http://192.168.227.171:9001`

## 4. Start the Frontend (React Client)

- In `video-client` folder, run:
  ```
  npm install
  npm start
  ```
- The app runs on `http://192.168.227.171:3000`

## 5. Access the App

- On your laptop: open `http://192.168.227.171:3000` in your browser.
- On your mobile: open the same URL in your mobile browser (must be on same Wi-Fi).

## 6. Test Video Calls

- Log in as different users on each device.
- You should see each other online and be able to call.

## Troubleshooting

- If you can't connect from mobile:
  - Make sure firewall allows ports 3000 and 9001.
  - Double-check your local IP address.
  - Both devices must be on the same Wi-Fi network.

---

Enjoy testing your video call app on multiple devices!

If your IP changed, regenerate the certs with mkcert (Windows PowerShell):

```powershell
# From the repo root (note the `./` prefix in PowerShell)
./mkcert.exe -install

# Replace the last IP with your current IPv4 (from ipconfig)
./mkcert.exe -cert-file .\video-client\cert.pem -key-file .\video-client\key.pem localhost 127.0.0.1 10.82.20.72
```

Notes:

- On Windows PowerShell you must prefix with `./` or `.\` to execute from the current folder.
- The signaling server reads certs from `video-client/cert.pem` and `video-client/key.pem`, so you do not need to copy them elsewhere.
