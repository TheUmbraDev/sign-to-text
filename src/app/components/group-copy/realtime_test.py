import cv2
import mediapipe as mp
import numpy as np
import tensorflow as tf
import joblib
import time
from collections import deque
import os

# -----------------------------
# LOAD CNN MODEL + LABELS
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "asl_sign_model.h5")
LABEL_PATH = os.path.join(BASE_DIR, "label_encoder.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}. Run the script from any directory; it now resolves relative to the script.")
if not os.path.exists(LABEL_PATH):
    raise FileNotFoundError(f"Label encoder not found: {LABEL_PATH}.")

model = tf.keras.models.load_model(MODEL_PATH)
le = joblib.load(LABEL_PATH)

# -----------------------------
# MEDIAPIPE SETUP
# -----------------------------
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6
)

# -----------------------------
# SMOOTH PREDICTIONS
# -----------------------------
smooth_queue = deque(maxlen=10)

# -----------------------------
# CAMERA
# -----------------------------
cap = cv2.VideoCapture(0)
prev_time = time.time()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)

    # FPS calc
    curr_time = time.time()
    fps = 1 / (curr_time - prev_time)
    prev_time = curr_time

    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(img_rgb)

    if result.multi_hand_landmarks:
        hand = result.multi_hand_landmarks[0]

        # Extract raw 21×3
        raw = np.array([[lm.x, lm.y, lm.z] for lm in hand.landmark], dtype=np.float32)

        # -----------------------------
        # NORMALIZATION (same as training)
        # -----------------------------
        wrist = raw[0]
        norm = raw - wrist  # subtract wrist

        # reshape to model input shape
        model_input = norm.reshape(1, 21, 3)

        # -----------------------------
        # PREDICT SIGN
        # -----------------------------
        pred = model.predict(model_input, verbose=0)[0]
        class_id = np.argmax(pred)
        confidence = pred[class_id]
        label = le.inverse_transform([class_id])[0]

        smooth_queue.append(label)
        final_label = max(set(smooth_queue), key=smooth_queue.count)

        # Draw label
        cv2.putText(
            frame,
            f"{final_label} ({confidence*100:.1f}%)",
            (30, 70),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.8,
            (0,255,0),
            3
        )

        mp_draw.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)

    # Draw FPS
    cv2.putText(frame, f"FPS: {int(fps)}", (10, 450),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,0), 2)

    cv2.imshow("ASL Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
