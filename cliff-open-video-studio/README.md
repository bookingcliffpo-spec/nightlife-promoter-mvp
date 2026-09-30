# Cliff Open Video Studio

Free, open-source Next.js AI video studio with a Higgsfield Seedance 2.5 adapter.

## Features
- Seedance 2.5 text-to-video
- Seedance 2.5 image-to-video + optional end frame
- 4–30 second duration
- 480p / 720p
- 16:9, 4:3, 1:1, 3:4, 9:16, 21:9
- MP4 / MOV
- Audio toggle
- Generation history in localStorage
- Server-side API key handling
- Real provider errors returned as JSON instead of masked React Server Action errors

## Cost
The app is MIT-licensed and free. Higgsfield API generation itself is a third-party paid inference service and can consume provider credits. A truly $0 inference path requires running an open-source video model on your own GPU/hardware.

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

You can either set `HF_CREDENTIALS=KEY_ID:KEY_SECRET` server-side or save a BYO key from the in-app key dialog. Do not commit real keys.

## Security
The provider key is never placed in client JavaScript. BYO credentials are stored in an httpOnly cookie. Rotate any key that has been pasted into chat or another exposed location.

## API
The app calls the official Higgsfield API at `https://api.higgsfield.ai` using `Authorization: Key KEY_ID:KEY_SECRET`.

## License
MIT.
