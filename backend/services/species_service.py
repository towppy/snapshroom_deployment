from pymongo import MongoClient
from bson import ObjectId
from config import Config
import re

class SpeciesService:
    def __init__(self):
        self.client = MongoClient(Config.MONGO_URI)
        self.db = self.client[Config.DB_NAME]
        self.species_collection = self.db['species']
    
    def get_all_species(self):
        """Get all mushroom species"""
        species_list = list(self.species_collection.find())
        for species in species_list:
            species['_id'] = str(species['_id'])
        return species_list
    
    def get_species_by_id(self, species_id):
        """Get a specific species by ID"""
        try:
            species = self.species_collection.find_one({'_id': ObjectId(species_id)})
            if species:
                species['_id'] = str(species['_id'])
            return species
        except:
            return None
    
    def search_species(self, query):
        """Search species by name (English, local, or scientific)"""
        # Case-insensitive search using regex
        regex = re.compile(query, re.IGNORECASE)
        species_list = list(self.species_collection.find({
            '$or': [
                {'english_name': regex},
                {'local_name': regex},
                {'scientific_name': regex}
            ]
        }))
        for species in species_list:
            species['_id'] = str(species['_id'])
        return species_list
    
    def get_species_by_edibility(self, is_edible):
        """Get species by edibility status"""
        species_list = list(self.species_collection.find({'edible': is_edible}))
        for species in species_list:
            species['_id'] = str(species['_id'])
        return species_list
    
    def get_species_by_location(self, location):
        """Get species by location"""
        regex = re.compile(location, re.IGNORECASE)
        species_list = list(self.species_collection.find({'location': regex}))
        for species in species_list:
            species['_id'] = str(species['_id'])
        return species_list
    
    def add_species(self, species_data):
        """Add a new species"""
        result = self.species_collection.insert_one(species_data)
        return str(result.inserted_id)
    
    def update_species(self, species_id, species_data):
        """Update a species"""
        try:
            result = self.species_collection.update_one(
                {'_id': ObjectId(species_id)},
                {'$set': species_data}
            )
            return result.modified_count > 0
        except:
            return False
    
    def delete_species(self, species_id):
        """Delete a species"""
        try:
            result = self.species_collection.delete_one({'_id': ObjectId(species_id)})
            return result.deleted_count > 0
        except:
            return False
    
    def initialize_default_species(self):
        """Initialize the database with the 10 default mushroom species"""
        # Check if data already exists
        if self.species_collection.count_documents({}) > 0:
            return 0  # Data already exists
        
        default_species = [
            {
                'english_name': 'Wood Ear Mushroom',
                'local_name': 'Tainga ng Daga',
                'scientific_name': 'Auricularia polytricha',
                'description': 'Dark brown, ear-shaped mushroom with gelatinous, rubbery texture. Common in Asian cuisine and absorbs flavors well.',
                'edible': True,
                'location': 'Region 1 – Pangasinan',
                'habitat': 'Dead wood, logs, tree branches',
                'cap': 'Dark brown, ear-shaped, ~6 cm',
                'gills': 'None',
                'stem': 'Brown, very short (~1 cm)',
                'spore_print': 'White',
                'texture': 'Gelatinous, rubbery',
                'season': 'July–October',
                'cultivated_wild': 'Both cultivated and wild',
                'notes': 'Common in Asian cuisine; absorbs flavors well; used in soups and stir-fries',
                'image_url': ''
            },
            {
                'english_name': 'White Oyster Mushroom',
                'local_name': 'Kabute',
                'scientific_name': 'Pleurotus ostreatus',
                'description': 'White, oyster-shaped mushroom with smooth, tender texture. Most widely cultivated mushroom in the Philippines.',
                'edible': True,
                'location': 'NCR – Manila',
                'habitat': 'Hardwood logs, decaying trees',
                'cap': 'White, oyster-shaped, ~10 cm',
                'gills': 'Present, white, decurrent (run down stem)',
                'stem': 'White, short (~3 cm), off-center',
                'spore_print': 'White to pale lilac',
                'texture': 'Smooth, tender',
                'season': 'All year',
                'cultivated_wild': 'Both',
                'notes': 'Most widely cultivated mushroom in the Philippines; rich in protein',
                'image_url': ''
            },
            {
                'english_name': 'Enoki Mushroom',
                'local_name': 'Enoki',
                'scientific_name': 'Flammulina velutipes',
                'description': 'Small white mushroom with long, thin stems. Popular in hotpot and ramen dishes.',
                'edible': True,
                'location': 'Region 2 – Isabela',
                'habitat': 'Dead hardwood trees',
                'cap': 'White (cultivated), small (~2 cm)',
                'gills': 'Present, white',
                'stem': 'Long, thin, white (~10 cm)',
                'spore_print': 'White',
                'texture': 'Smooth, crisp',
                'season': 'All year (cultivated); winter in wild',
                'cultivated_wild': 'Mostly cultivated',
                'notes': 'Popular in hotpot and ramen; wild form is darker',
                'image_url': ''
            },
            {
                'english_name': 'Shiitake',
                'local_name': 'Shiitake',
                'scientific_name': 'Lentinula edodes',
                'description': 'Brown mushroom with white scales and strong umami flavor. Known for medicinal benefits.',
                'edible': True,
                'location': 'Region 4A – Cavite',
                'habitat': 'Hardwood logs',
                'cap': 'Brown with white scales, ~7 cm',
                'gills': 'Present, cream',
                'stem': 'Brown, fibrous (~4 cm)',
                'spore_print': 'White',
                'texture': 'Smooth, slightly chewy',
                'season': 'All year (cultivated)',
                'cultivated_wild': 'Mostly cultivated',
                'notes': 'Known for medicinal benefits; strong umami flavor',
                'image_url': ''
            },
            {
                'english_name': 'Death Cap',
                'local_name': 'Kabuting Nakamamatay',
                'scientific_name': 'Amanita phalloides',
                'description': 'DEADLY POISONOUS. Greenish-white cap with white gills and characteristic ring and cup (volva) on stem.',
                'edible': False,
                'location': 'Region 4A – Cavite',
                'habitat': 'Forests, near trees',
                'cap': 'Greenish-white, smooth, ~10 cm',
                'gills': 'Present, white',
                'stem': 'White, ~12 cm, with ring and cup (volva)',
                'spore_print': 'White',
                'texture': 'Smooth',
                'season': 'June–November',
                'cultivated_wild': 'Wild only',
                'notes': 'Contains amatoxins causing liver failure; often mistaken for edible species',
                'image_url': ''
            },
            {
                'english_name': 'False Morel',
                'local_name': 'Kabuting Utak',
                'scientific_name': 'Gyromitra esculenta',
                'description': 'POISONOUS. Reddish-brown cap with brain-like wrinkled appearance. Contains gyromitrin toxin.',
                'edible': False,
                'location': 'CAR – Benguet',
                'habitat': 'Pine forests, forest floor',
                'cap': 'Reddish-brown, brain-like, wrinkled (~8 cm)',
                'gills': 'None',
                'stem': 'White (~5 cm)',
                'spore_print': 'White',
                'texture': 'Wrinkled, irregular',
                'season': 'March–May',
                'cultivated_wild': 'Wild',
                'notes': 'Contains gyromitrin toxin; can be fatal even when cooked',
                'image_url': ''
            },
            {
                'english_name': "Jack O' Lantern Mushroom",
                'local_name': 'Kabuting Nagniningning',
                'scientific_name': 'Omphalotus olearius',
                'description': 'POISONOUS. Bright orange mushroom with bioluminescent gills that glow in the dark.',
                'edible': False,
                'location': 'Region 4B – Quezon',
                'habitat': 'Decaying wood, tree stumps',
                'cap': 'Bright orange, ~12 cm',
                'gills': 'Present, orange, bioluminescent',
                'stem': 'Orange (~8 cm)',
                'spore_print': 'Cream',
                'texture': 'Smooth',
                'season': 'June–November',
                'cultivated_wild': 'Wild',
                'notes': 'Gills glow in the dark; often confused with chanterelles',
                'image_url': ''
            },
            {
                'english_name': 'Funeral Bell',
                'local_name': 'Kabuting Libing',
                'scientific_name': 'Galerina marginata',
                'description': 'DEADLY POISONOUS. Small brown mushroom containing amatoxins. Easily mistaken for edible species.',
                'edible': False,
                'location': 'Region 2 – Isabela',
                'habitat': 'Rotting wood',
                'cap': 'Brown, small (~4 cm)',
                'gills': 'Present, brown',
                'stem': 'Brown (~6 cm)',
                'spore_print': 'Rusty brown',
                'texture': 'Smooth',
                'season': 'All year',
                'cultivated_wild': 'Wild',
                'notes': 'Contains amatoxins; easily mistaken for edible mushrooms',
                'image_url': ''
            },
            {
                'english_name': 'Red Cage Fungus',
                'local_name': 'Kabuting Kulungan',
                'scientific_name': 'Clathrus ruber',
                'description': 'INEDIBLE. Red lattice-structured fungus with foul odor. Not poisonous but not edible.',
                'edible': False,
                'location': 'Region 6 – Iloilo',
                'habitat': 'Soil, gardens, mulch',
                'cap': 'Red lattice structure (~8 cm)',
                'gills': 'None',
                'stem': 'Red (~5 cm)',
                'spore_print': 'None',
                'texture': 'Latticed, spongy',
                'season': 'May–October',
                'cultivated_wild': 'Wild',
                'notes': 'Emits foul odor to attract flies for spore dispersal',
                'image_url': ''
            },
            {
                'english_name': 'Button Mushroom',
                'local_name': 'Kabuting Paris',
                'scientific_name': 'Agaricus bisporus',
                'description': 'White to light brown mushroom with smooth, firm texture. Same species as cremini and portobello at different growth stages.',
                'edible': True,
                'location': 'Northern Luzon – Rizal',
                'habitat': 'Farms, compost-rich soil',
                'cap': 'White to light brown, 3–10 cm',
                'gills': 'Present; pink (young) → brown (mature)',
                'stem': 'White (~5 cm)',
                'spore_print': 'Dark brown',
                'texture': 'Smooth, firm',
                'season': 'All year (cultivated)',
                'cultivated_wild': 'Mostly cultivated',
                'notes': 'Same species as cremini and portobello at different growth stages',
                'image_url': ''
            }
        ]
        
        result = self.species_collection.insert_many(default_species)
        return len(result.inserted_ids)
