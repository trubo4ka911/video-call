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

### Locating and Sending the Root CA (for iPad trust)

To allow an iPad (or other device) to trust your locally generated HTTPS certificates, you must install the mkcert root CA on that device. Do NOT send `key.pem` or `cert.pem` – only the root CA file.

1. Locate the root CA directory (PowerShell from repo root):

```powershell
./mkcert.exe -CAROOT
```

This prints a path like: `C:\Users\<You>\AppData\Local\mkcert`. Inside it you will find `rootCA.pem` (and `rootCA-key.pem` – never share the key file).

1. Prepare the file for transfer (optional rename to `.cer` for iOS):

```powershell
Copy-Item (./mkcert.exe -CAROOT)\rootCA.pem .\video-client\video-call-root.cer
```

Renaming to `.cer` helps iOS open it; content unchanged.

1. Send the `.cer` (or original `rootCA.pem`) to the iPad via email, cloud drive, or a simple local share. Do not send any private key file.

1. Install & trust on iPad:

- Tap the file, install the profile.
- Go to Settings > General > About > Certificate Trust Settings.
- Enable full trust for the newly installed root.

1. Use the app over HTTPS:

- Start signaling server and React client as usual (they use `cert.pem` / `key.pem`).
- Access `https://<your-ip>:3000` and `https://<your-ip>:9001` from the iPad browser. The connection should be trusted.

If `./mkcert.exe -CAROOT` fails, ensure you are in the repo root and using the `./` prefix; the plain `mkcert` command requires it to be in your PATH.
