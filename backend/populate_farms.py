from flask_pymongo import PyMongo
from app import create_app

def populate_farms():
    """Populate farms collection with initial data"""
    app = create_app()
    
    with app.app_context():
        mongo = app.mongo
        db = mongo.db
        
        # Clear existing farms data
        db.farms.delete_many({})
        
        # Farms data
        farms_data = [
            {
                'id': 'farm1',
                'name': 'KABUTIHAN Mushroom Farm (Matatdo Homes)',
                'lat': 14.4881,
                'lng': 121.0153,
                'type': 'farm'
            },
            {
                'id': 'farm2',
                'name': 'JMP Mushroom',
                'lat': 14.7566,
                'lng': 121.0437,
                'type': 'farm'
            },
            {
                'id': 'farm3',
                'name': 'Manila Mushrooms',
                'lat': 14.5373,
                'lng': 120.9996,
                'type': 'farm'
            },
            {
                'id': 'farm4',
                'name': 'Housegem Mushroom Farm',
                'lat': 14.1936,
                'lng': 120.8755,
                'type': 'farm'
            },
            {
                'id': 'farm5',
                'name': 'Crown Mushroom Farm',
                'lat': 14.3467,
                'lng': 121.0560,
                'type': 'farm'
            },
            {
                'id': 'farm6',
                'name': 'Hiyas Urban Mushroom Farm',
                'lat': 14.7278,
                'lng': 121.1536,
                'type': 'farm'
            },
            {
                'id': 'farm7',
                'name': 'HB Mushroom Farm',
                'lat': 14.3339,
                'lng': 121.0605,
                'type': 'farm'
            },
            {
                'id': 'farm8',
                'name': 'What The Farm: Mushroom Gourmet',
                'lat': 14.4659,
                'lng': 121.1919,
                'type': 'farm'
            },
            {
                'id': 'farm9',
                'name': 'SF Mushroom Farm (Sarmiento–Fraginal)',
                'lat': 14.8743,
                'lng': 121.0697,
                'type': 'farm'
            },
            {
                'id': 'farm10',
                'name': 'Metolius Valley Inc.',
                'lat': 14.5764,
                'lng': 121.0656,
                'type': 'farm'
            },
            {
                'id': 'farm11',
                'name': 'JV Mushroom Farm',
                'lat': 14.1195,
                'lng': 120.9379,
                'type': 'farm'
            },
            {
                'id': 'farm12',
                'name': 'La Sierra Mushroom Farm',
                'lat': 16.6471,
                'lng': 120.3454,
                'type': 'farm'
            },
            {
                'id': 'farm13',
                'name': 'Avila Mushroom Farm',
                'lat': 14.8936,
                'lng': 120.9298,
                'type': 'farm'
            },
            {
                'id': 'farm14',
                'name': 'Boomshroom Mushroom Farm',
                'lat': 10.0574,
                'lng': 123.7518,
                'type': 'farm'
            },
            {
                'id': 'farm15',
                'name': 'Mossy Terrain Mushroom Farms',
                'lat': 9.2764,
                'lng': 123.2750,
                'type': 'farm'
            },
            {
                'id': 'farm16',
                'name': 'Usita Mushroom Farm',
                'lat': 18.1971,
                'lng': 120.5905,
                'type': 'farm'
            },
            {
                'id': 'farm17',
                'name': 'Mushroom Man Farm',
                'lat': 16.1489,
                'lng': 121.1511,
                'type': 'farm'
            },
            {
                'id': 'farm18',
                'name': "Adong & Minting's Agri Farm",
                'lat': 14.1178,
                'lng': 120.9396,
                'type': 'farm'
            },
            {
                'id': 'farm19',
                'name': 'E & B Oyster Mushroom Farm',
                'lat': 13.3398,
                'lng': 121.4276,
                'type': 'farm'
            },
            {
                'id': 'farm20',
                'name': 'RuRu Mushrooms',
                'lat': 6.9214,
                'lng': 122.0790,
                'type': 'farm'
            },
            {
                'id': 'farm21',
                'name': 'Green Haven Mushroom (Kadingilan, Bukidnon)',
                'lat': 7.8923,
                'lng': 124.9142,
                'type': 'farm'
            },
            {
                'id': 'farm22',
                'name': 'Midnight Mushroom Farm (Bukidnon)',
                'lat': 7.8923,
                'lng': 124.9142,
                'type': 'farm'
            },
            {
                'id': 'farm23',
                'name': 'Hobbest Mushroom Farm (Toril, Davao City)',
                'lat': 6.9920,
                'lng': 125.3879,
                'type': 'farm'
            },
            {
                'id': 'farm24',
                'name': '3JM Mushroom Farm (Sta. Cruz, Agusan del Sur)',
                'lat': 8.9521,
                'lng': 125.6249,
                'type': 'farm'
            },
            {
                'id': 'farm25',
                'name': 'IKRAM Mushroom Farm (General Santos City)',
                'lat': 6.1164,
                'lng': 125.1712,
                'type': 'farm'
            },
            {
                'id': 'farm26',
                'name': 'Tarah Mushroom Farm (Marawi City, Lanao del Sur)',
                'lat': 8.0011,
                'lng': 124.2966,
                'type': 'farm'
            },
            {
                'id': 'farm27',
                'name': 'Tarah Mushroom Farm (Sultan Kudarat, Maguindanao del Norte)',
                'lat': 6.7164,
                'lng': 124.4831,
                'type': 'farm'
            },
            {
                'id': 'farm28',
                'name': 'F&P Livestock and Mushroom Farm (Salay, Misamis Oriental)',
                'lat': 8.5835,
                'lng': 124.8285,
                'type': 'farm'
            }
        ]
        
        # Insert farms data
        result = db.farms.insert_many(farms_data)
        
        print(f"[OK] Inserted {len(result.inserted_ids)} farms into database")
        
        # Verify insertion
        count = db.farms.count_documents({})
        print(f"[OK] Total farms in database: {count}")

if __name__ == "__main__":
    populate_farms()
