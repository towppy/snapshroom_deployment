
start ngrok:
ngrok http 5000

change ip and forwarding
.env - both backend and frontend

run the system:
cd frontend/
npx expo start --clear

cd backend/
python app.py

make_admin.py
Usage: python make_admin.py <email>

dataset location:
backend/datasets/

train model:
train_detection.py  ---> run this first
train_classification.py

defaults: you can change this
epoch:5
batch:10
image size:400 nalang boi or pwede 255



