This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ASL Model Integration

This app integrates a Python Flask server that performs ASL hand landmark detection and letter prediction. The frontend captures webcam frames, proxies them to the Python server, and renders the returned hand skeleton and prediction.

### Start the Python model server

From the project root:

```powershell
# Run once per session (uses local venv and installs deps)
PowerShell -ExecutionPolicy Bypass -File .\src\app\components\group-copy\run_backend.ps1 -Port 5001
```

This starts a Flask server at `http://127.0.0.1:5001/predict`.

If you prefer manual steps:

```powershell
$py = "C:\Users\<YOUR_USERNAME>\OneDrive\PS\my-app\src\app\components\group-copy\py310env\Scripts\python.exe"
Set-Location .\src\app\components\group-copy
& $py -m pip install -r requirements.txt
& $py .\api.py
```

### Configure Next.js API proxy (optional)

The Next.js route `src/app/api/predict/route.ts` forwards requests to the Python server. It uses `PREDICT_URL` if provided:

```env
PREDICT_URL=http://127.0.0.1:5001/predict
```

Create `.env.local` in the project root, or copy `.env.local.example` and adjust as needed.

### Run the Next.js app

For camera access, use HTTPS or `http://localhost`. You can start the default dev server:

```powershell
npm run dev
```

Or start the HTTPS dev server (requires mkcert certs in the project root as `cert.pem` and `cert-key.pem`):

```powershell
npm run dev:https
```

### Usage

- Open `/start` in the app.
- Start the camera and recognition.
- The green skeleton overlays your hand; the current letter and confidence show in the sidebar. When confidence is high, letters append to the recognized text.

### Troubleshooting

- If no skeleton appears: ensure the Python server is running and reachable at `PREDICT_URL` and that your browser granted camera permission.
- If the Next.js API shows 502 errors: check the Python server console for stack traces (missing `asl_sign_model.h5`/`label_encoder.pkl`, or missing packages).
- If the camera is blocked: use HTTPS (`npm run dev:https`) or run on `http://localhost`.
