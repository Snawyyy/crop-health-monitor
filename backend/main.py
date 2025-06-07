# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORSMiddleware
from datetime import datetime # <--- ADD THIS LINE if it's missing

# Create an instance of the FastAPI class
app = FastAPI()

# --- Configure CORS ---
# This is important to allow your React app (running on a different port)
# to make requests to this FastAPI backend.
origins = [
    "http://localhost:5173",  # Your React app's default development URL (Vite)
    "http://localhost:3000",  # A common port for create-react-app if you used that
    # Add other origins if needed (e.g., your deployed frontend URL later)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows requests from these origins
    allow_credentials=True, # Allows cookies (not strictly needed for this simple GET)
    allow_methods=["*"],    # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],    # Allows all headers
)
# --- End CORS Configuration ---


# Your existing root endpoint
@app.get("/")
async def read_root():
    return {"message": "Hello from your GIS Dashboard Backend!"}

# Your existing items endpoint
@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}

# --- NEW ENDPOINT ---
@app.get("/api/info")
async def get_api_info():
    return {
        "dashboard_version": "0.1.0-mvp",
        "status": "API is healthy and connected!",
        "timestamp": datetime.utcnow().isoformat() + "Z" # Import datetime for this
    }