# api.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import base64
import joblib
import tensorflow as tf

# Optimize TensorFlow for inference
tf.config.optimizer.set_jit(True)  # Enable XLA JIT compilation
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TF logging

import mediapipe as mp

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "asl_sign_model.h5")
LABEL_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")

print(f"Loading model from: {MODEL_PATH}")
print(f"Loading labels from: {LABEL_PATH}")

model = None
predict_fn = None  # Optimized prediction function
le = None
if os.path.exists(MODEL_PATH) and os.path.exists(LABEL_PATH):
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        le = joblib.load(LABEL_PATH)
        
        # Create an optimized prediction function using tf.function
        @tf.function(reduce_retracing=True)
        def _predict(x):
            return model(x, training=False)
        
        predict_fn = _predict
        
        # Warm up the model with a dummy prediction
        dummy_input = np.zeros((1, 21, 3), dtype=np.float32)
        _ = predict_fn(dummy_input)
        print("Model warmed up and ready for fast inference.")
        print("Model and label encoder loaded successfully.")
    except Exception as e:
        print(f"Error loading model/labels: {e}")
else:
    print("Model or label encoder missing; prediction will fail until both are present.")

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.5,  # Slightly lower for faster processing
    min_tracking_confidence=0.5,
    model_complexity=0  # Use lite model (0) for faster inference
)

@app.route('/', methods=['GET'])
def index():
    return jsonify({'status': 'running', 'message': 'ASL Prediction API is up and running!'})

@app.route('/predict', methods=['POST'])
def predict():
    # print("Received prediction request")
    if predict_fn is None or le is None:
        print("Error: Model or labels not loaded")
        return jsonify({'error': 'Model/labels not loaded on server'}), 500

    try:
        data = request.get_json(force=True)
        landmarks_input = data.get('landmarks')
        image_data = data.get('image')
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return jsonify({'error': 'Invalid JSON body'}), 400

    raw = None
    landmarks_list = []

    if landmarks_input:
        # Client-side tracking provided landmarks
        try:
            # landmarks_input should be list of {x, y, z}
            raw = np.array([[lm['x'], lm['y'], lm['z']] for lm in landmarks_input], dtype=np.float32)
            landmarks_list = [{'x': lm['x'], 'y': lm['y']} for lm in landmarks_input]
        except Exception as e:
            print(f"Error parsing landmarks: {e}")
            return jsonify({'error': 'Invalid landmarks format'}), 400
    elif image_data:
        # Fallback to server-side tracking
        # Strip header if exists
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        try:
            img_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Error decoding image: {e}")
            return jsonify({'error': f'Failed to decode image: {str(e)}'}), 400

        if frame is None:
            print("Error: Decoded frame is None")
            return jsonify({'error': 'Decoded frame is empty'}), 400

        # Flip horizontally to match training/realtime_test behavior
        frame = cv2.flip(frame, 1)

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(img_rgb)

        if not result.multi_hand_landmarks:
            # print("No hand detected in frame")
            return jsonify({
                'letter': '',
                'confidence': 0,
                'landmarks': [],
                'message': 'No hand detected'
            })

        # print("Hand detected, processing landmarks...")
        hand = result.multi_hand_landmarks[0]

        # Extract raw 21x3
        raw = np.array([[lm.x, lm.y, lm.z] for lm in hand.landmark], dtype=np.float32)
        landmarks_list = [{'x': float(lm.x), 'y': float(lm.y)} for lm in hand.landmark]
    else:
        print("Error: No image or landmarks provided")
        return jsonify({'error': 'No input provided'}), 400

    # Normalization (subtract wrist)
    wrist = raw[0].copy()
    norm = raw - wrist
    # Prepare model input exactly like realtime_test.py -> shape (1, 21, 3)
    model_input = norm.reshape(1, 21, 3)

    try:
        pred = predict_fn(model_input).numpy()[0]  # Use optimized prediction function
        class_id = int(np.argmax(pred))
        confidence = float(pred[class_id]) * 100.0
        label = le.inverse_transform([class_id])[0]
        # print(f"Prediction: {label} ({confidence:.2f}%)")
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

    return jsonify({
        'letter': str(label),
        'confidence': round(confidence, 2),
        'landmarks': landmarks_list
    })

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
