# Local AI Chat Interface

A lightweight, Python-based web interface for chatting with local LLMs (Large Language Models) running via **LM Studio**. This project features a clean, responsive UI with real-time text streaming, persona customization, and Markdown rendering.

## Features

* **Real-time Streaming:** Watch the AI's response type out instantly (like ChatGPT) instead of waiting for the full block of text.
* **Persona Customization:** Set a custom system prompt (e.g., "You are a pirate") to define the AI's personality for the session.
* **Markdown Support:** Automatically renders code blocks, lists, and bold text using [Marked.js](https://marked.js.org/).
* **Network Access:** Hosting configuration allows access from other devices on your local network (e.g., test on your phone).
* **Session Memory:** Maintains conversation history within the active session.

## Prerequisites

1.  **Python 3.x** installed on your machine.
2.  **LM Studio** installed and running a local model.
3.  **Local Network:** (Optional) If you want to access the chat from other devices.

## Installation

1.  **Clone or Create Project Directory**
    Create a folder for your project (e.g., `my-local-chat`) and organize your files as follows:

    ```text
    /my-local-chat
    ├── app.py              # The Flask backend
    ├── README.md           # This file
    └── /templates
        └── index.html      # The frontend HTML
    ```

2.  **Install Dependencies**
    Open your terminal in the project folder and run:

    ```bash
    pip install flask openai
    ```

## Usage

### 1. Start LM Studio
1.  Open **LM Studio**.
2.  Go to the **Local Server** tab (the `<->` icon).
3.  Select a model to load.
4.  Ensure the **Port** is set to `1234`.
5.  Click **Start Server**.

### 2. Run the Application
In your project terminal, run:

```bash
python app.py
```

You should see output indicating the server is running on `http://0.0.0.0:5000`.

### 3. Access the Chat
* **On the same computer:** Open your browser and go to `http://localhost:5000`.
* **On another device (Phone/Laptop):
  1.  Find your computer's local IP address (Run `ipconfig` on Windows or `ifconfig` on Mac/Linux).
  2.  On the other device, browse to `http://<YOUR_IP_ADDRESS>:5000` (e.g. `http://192.168.1.15:6000`).

## Configuration
* **Changing the Port:** Edit the `app.run` line in `app.py`:
  ```
  app.run(debug=True, port=8080, host='0.0.0.0')
  ```
* **Adjusting AI Creativity:** Modify the `temperature` parameter in the `client.chat.completions.create` call inside `app.py`.(0.7 is balanced; 0.2 is precise; 1.0 is creative).

## Dependencies
* Flask - Web framework
* OpenAI Python Library - To communicate with LM Studio's API.
* Marked.js - (Frontend) Used via CDN to render Markdown.

## Troubleshooting
* **"Connection Refused":** Ensure LM Studio server is actually started and running on port `1234`.
* **"No module named flask":** Ensure you ran `pip install flask`.
* **Cannot connect from phone:** Ensure your computer's firewall allows incoming connections on port 5000, and that both devices are on the same Wi-Fi.

## License
This project is open-source and free to use.
  
