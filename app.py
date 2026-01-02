from flask import Flask, render_template, request, Response, stream_with_context, jsonify
from openai import OpenAI
import json

app = Flask(__name__)

# Point to LM Studio's local server
client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio"
)

# CONFIGURATION
TOKEN_THRESHOLD = 3000 

def estimate_tokens(messages):
    """Roughly estimate token count (1 token ~= 4 chars)."""
    if not messages: return 0
    total_chars = sum(len(str(m.get('content', ''))) for m in messages)
    return total_chars // 4

def summarize_history(history_chunk):
    """Asks the LLM to summarize a slice of the conversation."""
    try:
        summary_prompt = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": f"Summarize this conversation efficiently:\n\n{json.dumps(history_chunk)}"}
        ]
        
        response = client.chat.completions.create(
            model="local-model",
            messages=summary_prompt,
            temperature=0.3,
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Summarization failed: {e}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message')
    # Frontend now sends the whole history
    incoming_history = data.get('history', [])
    persona = data.get('persona', "You are a helpful AI assistant.")
    
    if not user_input:
        return "No message provided", 400

    # Prepare the list for processing
    # If history is empty, add persona. 
    # Note: Frontend sends [ {role, content}... ]
    processing_history = list(incoming_history)
    
    if not processing_history or processing_history[0].get('role') != 'system':
        processing_history.insert(0, {"role": "system", "content": persona})

    # Append the NEW user message for context
    processing_history.append({"role": "user", "content": user_input})

    # --- MEMORY OPTIMIZATION (Server Side) ---
    # We optimize what we send to the LLM, but we don't delete the user's browser history
    current_tokens = estimate_tokens(processing_history)
    
    if current_tokens > TOKEN_THRESHOLD:
        if len(processing_history) > 4: 
            print(f"Compressing context... (Current: {current_tokens} tokens)")
            persona_msg = processing_history[0]
            # Keep last 2 exchanges (4 messages) + current user prompt
            recent_msgs = processing_history[-5:] 
            middle_msgs = processing_history[1:-5]

            summary_text = summarize_history(middle_msgs)
            
            if summary_text:
                summary_msg = {"role": "system", "content": f"Previous summary: {summary_text}"}
                processing_history = [persona_msg, summary_msg] + recent_msgs

    def generate():
        try:
            stream = client.chat.completions.create(
                model="local-model",
                messages=processing_history,
                temperature=0.7,
                stream=True
            )

            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content

        except Exception as e:
            yield f"Error: {str(e)}"

    return Response(stream_with_context(generate()), mimetype='text/plain')

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')