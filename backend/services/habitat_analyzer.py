import pandas as pd
import numpy as np
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import re

class HabitatAnalyzer:
    """
    Service for analyzing mushroom habitat suitability based on location, season, and environmental factors.
    """

    def __init__(self, csv_path: str = None):
        self.csv_path = csv_path or "mushrooms.csv"
        self.csv_data = None
        self._load_csv_data()

    def _load_csv_data(self):
        """Load mushroom habitat data from CSV."""
        try:
            if os.path.exists(self.csv_path):
                self.csv_data = pd.read_csv(self.csv_path)
                print(f"Loaded habitat data with {len(self.csv_data)} entries")
        except Exception as e:
            print(f"Error loading CSV data: {e}")

    def analyze_habitat_suitability(self,
                                  species_name: str,
                                  location: Optional[Dict] = None,
                                  current_date: Optional[str] = None) -> Dict:
        """
        Analyze habitat suitability for a mushroom species.

        Args:
            species_name: Scientific name of the mushroom species
            location: Dict with 'region' and 'province' keys
            current_date: Date string (YYYY-MM-DD) or month name

        Returns:
            dict: Habitat suitability analysis
        """
        if self.csv_data is None:
            return {
                "suitability_score": 0,
                "factors": {},
                "recommendations": ["No habitat data available"]
            }

        # Find species data
        species_data = self._get_species_habitat_data(species_name)
        if not species_data:
            return {
                "suitability_score": 0,
                "factors": {},
                "recommendations": ["Species not found in database"]
            }

        # Analyze different factors
        location_score = self._analyze_location_suitability(species_data, location)
        season_score = self._analyze_season_suitability(species_data, current_date)
        habitat_score = self._analyze_habitat_type(species_data)

        # Calculate overall suitability score (0-100)
        overall_score = (location_score + season_score + habitat_score) / 3

        # Generate recommendations
        recommendations = self._generate_recommendations(
            species_data, location_score, season_score, habitat_score
        )

        return {
            "suitability_score": round(overall_score, 1),
            "factors": {
                "location": location_score,
                "season": season_score,
                "habitat": habitat_score
            },
            "species_data": species_data,
            "recommendations": recommendations,
            "risk_assessment": self._assess_collection_risk(overall_score, species_data)
        }

    def _get_species_habitat_data(self, species_name: str) -> Optional[Dict]:
        """Get habitat data for a specific species."""
        if self.csv_data is None:
            return None

        # Try exact match first
        matching_rows = self.csv_data[
            self.csv_data['scientific_name'].str.lower() == species_name.lower()
        ]

        if len(matching_rows) == 0:
            # Try partial match
            matching_rows = self.csv_data[
                self.csv_data['scientific_name'].str.lower().str.contains(species_name.lower())
            ]

        if len(matching_rows) > 0:
            row = matching_rows.iloc[0]
            # Convert pandas types to native Python types
            def safe_get(key, default=None):
                val = row.get(key, default)
                if pd.isna(val):
                    return default
                if isinstance(val, (np.integer, np.int64, np.int32)):
                    return int(val)
                if isinstance(val, (np.floating, np.float64, np.float32)):
                    return float(val)
                return val
            
            return {
                "scientific_name": str(safe_get("scientific_name", "")),
                "english_name": str(safe_get("english_name", "")),
                "local_name": str(safe_get("local_name", "")),
                "location_region": str(safe_get("location_region", "")),
                "location_province": str(safe_get("location_province", "")),
                "habitat": str(safe_get("habitat", "")),
                "season_month": str(safe_get("season_month", "")),
                "cultivated": bool(safe_get("cultivated", False)),
                "wild": bool(safe_get("wild", False)),
                "poisonous": bool(safe_get("poisonous", False))
            }

        return None

    def _analyze_location_suitability(self, species_data: Dict, user_location: Optional[Dict]) -> float:
        """Analyze location suitability (0-100)."""
        if not user_location or not species_data.get("location_region"):
            return 50.0  # Neutral score when location unknown

        species_region = str(species_data.get("location_region", "")).lower()
        species_province = str(species_data.get("location_province", "")).lower()

        user_region = str(user_location.get("region", "")).lower()
        user_province = str(user_location.get("province", "")).lower()

        score = 0

        # Exact province match = high score
        if user_province and species_province and user_province in species_province:
            score += 50

        # Region match = medium score
        if user_region and species_region and user_region in species_region:
            score += 30

        # Philippines-wide species
        if "all" in species_region or "philippines" in species_region:
            score += 20

        return min(100, score)

    def _analyze_season_suitability(self, species_data: Dict, current_date: Optional[str]) -> float:
        """Analyze seasonal suitability (0-100)."""
        season_info = species_data.get("season_month", "")
        if not season_info or not current_date:
            return 50.0  # Neutral when season unknown

        # Parse current month
        try:
            if len(current_date) <= 2:  # Month number
                current_month = int(current_date)
            else:
                # Try to parse date or month name
                current_month = self._parse_month(current_date)
        except:
            current_month = datetime.now().month

        # Parse season info
        season_months = self._parse_season_months(season_info)

        if current_month in season_months:
            return 100.0  # Perfect season match
        elif len(season_months) > 0:
            # Check proximity to season
            min_distance = min(abs(current_month - m) for m in season_months)
            if min_distance <= 1:
                return 75.0  # Close to season
            elif min_distance <= 2:
                return 50.0  # Somewhat close
            else:
                return 25.0  # Not in season
        else:
            return 50.0  # Year-round or unknown

    def _parse_month(self, date_str: str) -> int:
        """Parse month from date string or month name."""
        date_str = date_str.lower().strip()

        # Month name mapping
        month_names = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }

        # Try month name first
        for name, num in month_names.items():
            if name in date_str:
                return num

        # Try to parse as date
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return dt.month
        except:
            pass

        # Try just month number
        try:
            return int(date_str)
        except:
            return datetime.now().month

    def _parse_season_months(self, season_str: str) -> List[int]:
        """Parse season months from string like 'June-September'."""
        season_str = season_str.lower().strip()
        months = []

        if 'all' in season_str or 'year' in season_str:
            return list(range(1, 13))  # All months

        # Handle ranges like "June-September"
        range_match = re.search(r'(\w+)-(\w+)', season_str)
        if range_match:
            start_month = self._month_name_to_number(range_match.group(1))
            end_month = self._month_name_to_number(range_match.group(2))

            if start_month and end_month:
                if start_month <= end_month:
                    months.extend(range(start_month, end_month + 1))
                else:  # Handle wrap-around (e.g., November-February)
                    months.extend(range(start_month, 13))
                    months.extend(range(1, end_month + 1))

        # Handle individual months
        month_names = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december']

        for i, month_name in enumerate(month_names, 1):
            if month_name in season_str or month_name[:3] in season_str:
                months.append(i)

        return list(set(months))  # Remove duplicates

    def _month_name_to_number(self, month_name: str) -> Optional[int]:
        """Convert month name to number."""
        month_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8,
            'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        return month_map.get(month_name.lower())

    def _analyze_habitat_type(self, species_data: Dict) -> float:
        """Analyze habitat type suitability (0-100)."""
        habitat = str(species_data.get("habitat", "")).lower()

        # Basic habitat scoring - this could be enhanced with user input
        habitat_scores = {
            'wood': 70,    # Common forest habitat
            'soil': 60,    # Common ground habitat
            'compost': 80, # Managed habitat
            'straw': 75,   # Agricultural waste
            'forest': 65,  # Natural forest
        }

        for habitat_type, score in habitat_scores.items():
            if habitat_type in habitat:
                return score

        return 50.0  # Default neutral score

    def _generate_recommendations(self, species_data: Dict,
                                location_score: float,
                                season_score: float,
                                habitat_score: float) -> List[str]:
        """Generate habitat recommendations."""
        recommendations = []

        if location_score < 60:
            recommendations.append("This species is not commonly found in your region. Double-check identification.")

        if season_score < 60:
            season_info = species_data.get("season_month", "unknown season")
            recommendations.append(f"This species typically grows during {season_info}. Current timing may not be optimal.")

        if habitat_score < 60:
            habitat_info = species_data.get("habitat", "unknown habitat")
            recommendations.append(f"Look for this species in {habitat_info} environments.")

        if species_data.get("cultivated", False):
            recommendations.append("This species can often be found in cultivated settings like farms or gardens.")

        if species_data.get("poisonous", False):
            recommendations.append("⚠️ WARNING: This species is known to be poisonous. Do not consume!")

        if len(recommendations) == 0:
            recommendations.append("Habitat conditions appear suitable for this species.")

        return recommendations

    def _assess_collection_risk(self, suitability_score: float, species_data: Dict) -> Dict:
        """Assess collection risk based on habitat and species characteristics."""
        risk_level = "medium"
        risk_factors = []

        if suitability_score < 30:
            risk_level = "high"
            risk_factors.append("Low habitat suitability increases misidentification risk")
        elif suitability_score > 70:
            risk_level = "low"
            risk_factors.append("Good habitat match reduces identification uncertainty")

        if species_data.get("poisonous", False):
            risk_level = "extreme" if risk_level == "high" else "high"
            risk_factors.append("Species is known to be poisonous")

        if not species_data.get("wild", True):
            risk_factors.append("Species is typically cultivated, may be treated with chemicals")

    return {
            "level": risk_level,
            "factors": risk_factors
        }

    def get_species_by_location(self, region: str, province: Optional[str] = None) -> List[Dict]:
        """Get species commonly found in a specific location."""
        try:
            # Search by location in database
            species_list = self.species_db.get_species_by_location(region)
            
            # Filter by province if specified
            if province and species_list:
                species_list = [
                    s for s in species_list 
                    if province.lower() in s.get('location', '').lower()
                ]
            
            # Return relevant fields only
            return [
                {
                    'scientific_name': s.get('scientific_name'),
                    'english_name': s.get('english_name'),
                    'local_name': s.get('local_name'),
                    'habitat': s.get('habitat'),
                    'season': s.get('season')
                }
                for s in species_list
            ]
        except Exception as e:
            print(f"Error fetching species by location: {e}")
            return []


# Global instance
habitat_analyzer = HabitatAnalyzer()

def analyze_habitat(species_name: str, location: Optional[Dict] = None, current_date: Optional[str] = None):
    """
    Legacy function for backward compatibility.
    """
    return habitat_analyzer.analyze_habitat_suitability(species_name, location, current_date)
