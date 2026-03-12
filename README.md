# DupLens AI

A full-stack web application for detecting and managing duplicate images using perceptual hashing and AI-powered similarity detection.

## Features

- **Image Upload**: Upload multiple images or ZIP archives containing images
- **Perceptual Hashing**: Generate and compare image hashes using multiple algorithms (pHash, dHash, aHash)
- **Duplicate Detection**: Automatically find similar images based on configurable threshold
- **Side-by-Side Review**: Review potential duplicates with an intuitive comparison UI
- **Batch Processing**: Efficient processing of large image collections with caching

## Tech Stack

### Frontend
- Next.js 14
- React 18
- Tailwind CSS
- Axios for API calls

### Backend
- Python 3.10+
- FastAPI
- Pillow (PIL)
- imagehash
- OpenCV (cv2)

## Project Structure

```
duplens-ai/
├── frontend/               # Next.js frontend application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   │   ├── upload-ui/    # Upload interface components
│   │   └── compare-ui/   # Duplicate comparison components
│   └── lib/              # Utility functions
├── backend/               # FastAPI backend
│   ├── main.py           # FastAPI application entry
│   ├── duplicate_detector.py  # Duplicate detection logic
│   ├── hashing.py        # Image hashing utilities
│   └── image_utils.py    # Image processing utilities
├── sample-images/         # Sample images for testing
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Navigate to the project root:
   ```bash
   cd duplens-ai
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`
   
   API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-images` | Upload images (multipart/form-data) |
| GET | `/find-duplicates` | Get list of potential duplicate pairs |
| POST | `/confirm-duplicate` | Confirm or reject a duplicate pair |
| GET | `/images/{image_id}` | Get image by ID |
| DELETE | `/images/{image_id}` | Delete an image |
| GET | `/stats` | Get processing statistics |

## Configuration

### Duplicate Detection Threshold

The default hash difference threshold is **8**. Images with a hash difference below this value are considered potential duplicates.

You can adjust this in `backend/duplicate_detector.py`:

```python
HASH_THRESHOLD = 8  # Lower = stricter matching
```

## Usage

1. **Upload Images**: Use the upload interface to drag & drop images or select files
2. **Scan for Duplicates**: Click "Scan Images" to analyze uploaded images
3. **Review Duplicates**: Review potential duplicates side-by-side
4. **Take Action**: Mark as duplicate, dismiss, or delete images
5. **Export Clean Images**: Click "Export Clean ZIP" to download remaining images

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub

2. Import the project in [Vercel](https://vercel.com):
   - Select the `frontend` folder as the root directory
   - Framework: Next.js (auto-detected)

3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

4. Deploy!

### Backend (Railway/Render/Fly.io)

The backend can be deployed to any platform that supports Docker or Python.

#### Using Docker:

```bash
cd backend
docker build -t duplens-api .
docker run -p 8000:8000 -e ALLOWED_ORIGINS=https://your-app.vercel.app duplens-api
```

#### Environment Variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `PORT` | Server port | `8000` |

#### Deploy to Railway:

1. Connect your GitHub repo
2. Select the `backend` folder
3. Add environment variable: `ALLOWED_ORIGINS=https://your-app.vercel.app`
4. Railway will auto-detect the Dockerfile

#### Deploy to Render:

1. Create a new Web Service
2. Connect your repo, set root to `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

## License

MIT License
