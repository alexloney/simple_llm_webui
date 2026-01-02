from flask import Flask, render_template, request, Response, stream_with_context, jsonify
from openai import OpenAI
import json

app = Flask(__name__)

# Point to LM Studio's local server
client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio"
)

# Global list to store chat history
chat_history = []

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/reset', methods=['POST'])
def reset_chat():
    global chat_history
    chat_history = []
    return jsonify({"status": "Chat history cleared"})

@app.route('/chat', methods=['POST'])
def chat():
    global chat_history
    
    # Get JSON data from the request
    data = request.json
    user_input = data.get('message')
    persona = data.get('persona', "You are a helpful AI assistant.")
    
    if not user_input:
        return "No message provided", 400

    # Initialize history if empty
    if len(chat_history) == 0:
        chat_history.append({"role": "system", "content": persona})

    # Append user message
    chat_history.append({"role": "user", "content": user_input})

    def generate():
        """Generator function to stream chunks of data."""
        collected_response = ""
        
        try:
            # call OpenAI with stream=True
            stream = client.chat.completions.create(
                model="local-model",
                messages=chat_history,
                temperature=0.7,
                stream=True  # ENABLE STREAMING
            )

            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    collected_response += content
                    yield content  # Send this chunk to the browser immediately

            # Once streaming is done, save the full response to history
            chat_history.append({"role": "assistant", "content": collected_response})

        except Exception as e:
            yield f"Error: {str(e)}"

    # Return a stream response
    return Response(stream_with_context(generate()), mimetype='text/plain')

if __name__ == '__main__':
    # host='0.0.0.0' allows access from other devices on the network
    app.run(debug=True, port=5000, host='0.0.0.0')