import websocket
import json
import time

SERVER_URL = "ws://localhost:3000"
ADMIN_PASSWORD = "admin123"

def connect_admin():
    """Tries to establish an admin connection and retries every 3 seconds if unsuccessful."""
    while True:
        try:
            ws = websocket.create_connection(SERVER_URL)

            # Send identify request
            ws.send(json.dumps({"type": "identify", "role": "admin", "password": ADMIN_PASSWORD}))
            
            # Wait for response
            response = json.loads(ws.recv())
            print(response)
            print(response.get("type"))
            print(response.get("message"))

            if response.get("type") == "info" and response.get("message") == "You are now identified as admin.":
                print("✅ Successfully connected as an admin.")
                return ws  # Return the active WebSocket connection

            print("⚠️ Admin authentication failed. Retrying in 3 seconds...")
            ws.close()

        except (websocket.WebSocketException, ConnectionRefusedError) as e:
            print(f"🔴 Connection error: {e}. Retrying in 3 seconds...")

        time.sleep(3)  # Wait before retrying

def send_command(ws, command, value=None):
    """Sends a command to the WebSocket server once connected."""
    data = {
        "type": "command",
        "password": ADMIN_PASSWORD,
        "command": command
    }
    
    if value is not None:
        data["value"] = value

    ws.send(json.dumps(data))
    
    # Receive response from server
    response = json.loads(ws.recv())
    print("Server response:", response.get("message", "No response"))

if __name__ == "__main__":
    ws = connect_admin()  # Ensure admin connection before proceeding

    while True:
        cmd = input("Enter command (setbpm <number> / show / exit): ").strip()
        if cmd == "exit":
            ws.close()
            break
        elif cmd.startswith("setbpm"):
            parts = cmd.split()
            if len(parts) == 2 and parts[1].isdigit():
                send_command(ws, "setbpm", int(parts[1]))
            else:
                print("Usage: setbpm <number>")
        elif cmd == "show":
            send_command(ws, "show")
        else:
            print("Unknown command.")
