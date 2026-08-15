# Exercise Library

A GitHub Pages exercise library driven by a public Yandex spreadsheet.

## What is already configured

- Yandex public table URL: `https://disk.yandex.ru/i/_4z0HyWTVhk57w`
- Sections: Listening, Reading 1, Reading 2, Writing, Speaking 1, Speaking 2, Speaking 3
- 40 cards per section
- Image and audio support
- Student completion names stored in the browser
- `All done` status stored in the browser
- Automatic Yandex sync every 10 minutes
- Manual sync via **Actions → Sync Yandex Table and Deploy → Run workflow**

## Required Yandex spreadsheet columns

Each section sheet must have row 1 exactly like this:

`No | Title | Link | Image | Audio | Level | Notes | Active`

Rows 2–41 are cards 1–40.

### Media

For `Image` and `Audio`, paste a public Yandex Disk link or a direct public URL. During GitHub Actions sync, public Yandex media is downloaded into the deployed site so images and audio players can load normally.

### Active

- `YES` = normal card
- `NO` = keep the slot but mark its data as inactive

## Deploy on GitHub

1. Create a new repository.
2. Upload the contents of this folder, including `.github`.
3. Open **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. Open **Actions → Sync Yandex Table and Deploy → Run workflow** for the first sync.
6. After that the workflow runs automatically every 10 minutes.

## Important about Done / student names

The site is static GitHub Pages. Student names and `All done` status are saved with `localStorage`, so they survive refreshes and data syncs on the same browser/device. They are not shared between different computers. A cloud database such as Supabase/Firebase can be added later if cross-device progress is needed.

## Refresh button

The `Refresh` button reloads the latest deployed `data/exercises.json`. It does not trigger GitHub Actions itself; the scheduled workflow or Run workflow performs the Yandex sync.
