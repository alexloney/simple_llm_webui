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
