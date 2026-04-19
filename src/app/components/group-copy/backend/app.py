from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import base64
from keras.models import load_model
import os

app = Flask(__name__)
CORS(app)

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "..", "asl_sign_model.h5")
model = load_model(model_path)

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False, max_num_hands=1)
mp_draw = mp.solutions.drawing_utils

LABELS = ['A','B','C','D','E','F','G','H','I','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y']

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    
    features = None
    landmarks_list = []

    if "landmarks" in data:
        # Use provided landmarks from frontend
        lms = data["landmarks"]
        if not lms:
             return jsonify({"letter": "", "confidence": 0, "landmarks": []})
        
        # The model was trained on FLIPPED images (cv2.flip(frame, 1))
        # So we need to flip x coordinates: x = 1 - x
        features_list = []
        for lm in lms:
            x = 1.0 - float(lm['x'])
            y = float(lm['y'])
            features_list.extend([x, y])
            landmarks_list.append({"x": x, "y": y})
            
        features = np.array(features_list).reshape(1, 42)

    elif "image" in data:
        # Decode Base64 → Image
        img_data = base64.b64decode(data["image"].split(",")[1])
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"error": "Invalid image"}), 400

        # Flip frame because frontend also flips
        frame = cv2.flip(frame, 1)

        # Detect hand
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        if not result.multi_hand_landmarks:
            return jsonify({
                "letter": "",
                "confidence": 0,
                "landmarks": []
            })

        hand_landmarks = result.multi_hand_landmarks[0]

        # Collect normalized coordinates
        for lm in hand_landmarks.landmark:
            landmarks_list.append({
                "x": float(lm.x),
                "y": float(lm.y)
            })

        # Prepare 21 landmark × 2 = 42 features
        features = np.array([(lm.x, lm.y) for lm in hand_landmarks.landmark]).flatten()
        features = features.reshape(1, 42)
    else:
        return jsonify({"error": "Image or landmarks missing"}), 400

    # Predict
    preds = model.predict(features)
    idx = int(np.argmax(preds))
    confidence = float(np.max(preds) * 100)
    letter = LABELS[idx]

    return jsonify({
        "letter": letter,
        "confidence": round(confidence, 2),
        "landmarks": landmarks_list
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
