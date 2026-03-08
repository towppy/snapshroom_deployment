"""
Initialize species database with default mushroom data including Wood Ear
Run this script to populate the species collection
"""
import requests
import sys

def initialize_species():
    """Call the backend API to initialize species data"""
    url = "http://127.0.0.1:5000/api/species/initialize"
    
    print("🌱 Initializing species database...")
    print(f"📡 Calling: {url}")
    
    try:
        response = requests.post(url)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Initialized {data.get('count', 0)} species")
            print(f"📋 Message: {data.get('message')}")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend at http://127.0.0.1:5000")
        print("⚠️  Make sure Flask backend is running (python app.py)")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = initialize_species()
    sys.exit(0 if success else 1)
