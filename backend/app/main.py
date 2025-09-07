import os
import json
import asyncio
import redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
from pydantic import BaseModel
from loguru import logger

app = FastAPI(title="Server Shepherd API", description="Backend API for the Server Shepherd log monitoring dashboard")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
            
        message_json = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending message to WebSocket: {e}")

manager = ConnectionManager()

# Pydantic models
class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    source: str
    metadata: dict = {}

# WebSocket endpoint
@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(10)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# API endpoint to receive logs from agents
@app.post("/api/logs")
async def receive_logs(log_entry: LogEntry):
    try:
        # Store log in Redis (optional)
        log_data = log_entry.dict()
        redis_client.lpush("recent_logs", json.dumps(log_data))
        redis_client.ltrim("recent_logs", 0, 99)  # Keep only the 100 most recent logs
        
        # Broadcast to all connected WebSocket clients
        await manager.broadcast({
            "type": "log",
            "data": log_data
        })
        
        return {"status": "success", "message": "Log received and broadcasted"}
    except Exception as e:
        logger.error(f"Error processing log: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "server-shepherd-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
