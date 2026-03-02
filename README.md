# SaatSaheli

A book management platform built with Spring Boot and React, using Google Sheets as the database and Google Drive for file storage.

## Prerequisites

- Java 17+
- Node.js 18+
- A Google Cloud project with Sheets API and Drive API enabled
- A Google service account credentials JSON file
- A Hugging Face API token (for AI image generation)

## Project Structure

```
SaatSaheliMain/
  SSMainApp/       # Parent build + run script
  SaatSaheli/      # Spring Boot backend (port 8081)
  FrontEnd/        # React frontend (port 3000)
```

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/SaatSaheliMain.git
cd SaatSaheliMain
```

### 2. Configure backend environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CREDENTIALS_FILE` | Path to your Google service account JSON file |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID of the Google Sheets spreadsheet |
| `GOOGLE_DRIVE_FOLDER_ID` | ID of the Google Drive folder for uploads |
| `HUGGINGFACE_API_TOKEN` | Your Hugging Face API token |

### 3. Configure frontend environment

```bash
cp FrontEnd/.env.example FrontEnd/.env
```

Edit `FrontEnd/.env` and fill in your Google OAuth Client ID.

### 4. Run the application

```bash
cd SSMainApp
./run.sh
```

This will:
1. Load environment variables from `.env`
2. Build the frontend and backend
3. Start the backend on port 8081

To run the frontend dev server separately:

```bash
cd FrontEnd
npm install
npm start
```

The frontend dev server runs on port 3000.
