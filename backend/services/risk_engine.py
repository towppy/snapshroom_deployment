from typing import Dict, List, Optional
import pandas as pd
import numpy as np
import os
from datetime import datetime

class RiskEngine:
    """
    Comprehensive risk assessment engine that combines species identification,
    toxicity analysis, and habitat suitability to provide safety recommendations.
    """

    def __init__(self, csv_path: str = None):
        # Database service for species data
        from services.species_service import SpeciesService
        self.species_db = SpeciesService()



    def assess_overall_risk(self,
                           species_result: Dict,
                           toxicity_result: Dict,
                           habitat_result: Optional[Dict] = None,
                           user_context: Optional[Dict] = None) -> Dict:
        """
        Assess overall risk by combining all analysis results.

        Args:
            species_result: Results from species classification
            toxicity_result: Results from toxicity detection
            habitat_result: Results from habitat analysis (optional)
            user_context: Additional user context (experience level, location, etc.)

        Returns:
            dict: Comprehensive risk assessment
        """
        risk_factors = []
        risk_score = 0
        max_score = 100

        # 1. Toxicity Risk (40% weight)
        toxicity_risk = self._assess_toxicity_risk(toxicity_result)
        risk_score += toxicity_risk['score'] * 0.4
        risk_factors.extend(toxicity_risk['factors'])

        # 2. Identification Confidence Risk (30% weight)
        confidence_risk = self._assess_identification_risk(species_result)
        risk_score += confidence_risk['score'] * 0.3
        risk_factors.extend(confidence_risk['factors'])

        # 3. Habitat Suitability Risk (20% weight)
        if habitat_result:
            habitat_risk = self._assess_habitat_risk(habitat_result)
            risk_score += habitat_risk['score'] * 0.2
            risk_factors.extend(habitat_risk['factors'])
        else:
            risk_score += 50 * 0.2  # Neutral score when habitat unknown

        # 4. User Context Risk (10% weight)
        if user_context:
            context_risk = self._assess_user_context_risk(user_context)
            risk_score += context_risk['score'] * 0.1
            risk_factors.extend(context_risk['factors'])
        else:
            risk_score += 30 * 0.1  # Assume novice user

        # Determine risk level
        risk_level = self._calculate_risk_level(risk_score)

        # Generate recommendations
        recommendations = self._generate_risk_recommendations(
            risk_level, toxicity_result, species_result, habitat_result, user_context
        )

        # Safety actions
        safety_actions = self._get_safety_actions(risk_level, toxicity_result)

        return {
            "overall_risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommendations": recommendations,
            "safety_actions": safety_actions,
            "confidence_assessment": self._assess_overall_confidence(
                species_result, toxicity_result, habitat_result
            ),
            "last_updated": datetime.now().isoformat()
        }

    def _assess_toxicity_risk(self, toxicity_result: Dict) -> Dict:
        """Assess risk based on toxicity analysis."""
        factors = []
        score = 0

        if toxicity_result.get('toxicity_status') == 'poisonous':
            score = 100
            factors.append("Species detected as poisonous")
            if toxicity_result.get('confidence', 0) > 0.8:
                factors.append("High confidence in toxicity detection")
        elif toxicity_result.get('toxicity_status') == 'edible':
            score = 10  # Low risk for confirmed edible
            factors.append("Species detected as edible")
        else:
            score = 60  # Medium risk when uncertain
            factors.append("Toxicity status uncertain")

        # Risk level modifier
        risk_level = toxicity_result.get('risk_level', 'medium')
        if risk_level == 'extreme':
            score = max(score, 95)
        elif risk_level == 'high':
            score = max(score, 80)
        elif risk_level == 'low':
            score = min(score, 20)

        return {"score": score, "factors": factors}

    def _assess_identification_risk(self, species_result: Dict) -> Dict:
        """Assess risk based on species identification confidence."""
        factors = []
        score = 0

        confidence = species_result.get('confidence', 0)

        if confidence < 0.3:
            score = 90
            factors.append("Very low identification confidence - high misidentification risk")
        elif confidence < 0.5:
            score = 70
            factors.append("Low identification confidence")
        elif confidence < 0.7:
            score = 40
            factors.append("Moderate identification confidence")
        elif confidence < 0.9:
            score = 20
            factors.append("Good identification confidence")
        else:
            score = 5
            factors.append("High identification confidence")

        # Check if species is known to be variable/lookalike
        species_name = species_result.get('scientific_name', '')
        if self._is_high_risk_species(species_name):
            score += 20
            factors.append("Species known to have dangerous lookalikes")

        return {"score": score, "factors": factors}

    def _assess_habitat_risk(self, habitat_result: Dict) -> Dict:
        """Assess risk based on habitat analysis."""
        factors = []
        score = 0

        suitability = habitat_result.get('suitability_score', 50)

        if suitability < 30:
            score = 80
            factors.append("Habitat conditions don't match species preferences")
        elif suitability < 50:
            score = 60
            factors.append("Suboptimal habitat conditions")
        elif suitability < 70:
            score = 30
            factors.append("Reasonable habitat match")
        else:
            score = 10
            factors.append("Good habitat suitability")

        # Habitat risk assessment
        habitat_risk = habitat_result.get('risk_assessment', {})
        if habitat_risk.get('level') == 'extreme':
            score += 25
            factors.extend(habitat_risk.get('factors', []))
        elif habitat_risk.get('level') == 'high':
            score += 15
            factors.extend(habitat_risk.get('factors', []))

        return {"score": score, "factors": factors}

    def _assess_user_context_risk(self, user_context: Dict) -> Dict:
        """Assess risk based on user context."""
        factors = []
        score = 0

        experience = user_context.get('experience_level', 'novice')

        if experience == 'novice':
            score = 40
            factors.append("Novice forager - higher risk of misidentification")
        elif experience == 'intermediate':
            score = 20
            factors.append("Intermediate experience level")
        elif experience == 'expert':
            score = 5
            factors.append("Expert forager - lower risk")
        else:
            score = 30
            factors.append("Unknown experience level")

        # Location familiarity
        location_familiar = user_context.get('location_familiar', False)
        if not location_familiar:
            score += 10
            factors.append("Unfamiliar with local mushroom species")

        # Collection purpose
        purpose = user_context.get('purpose', 'consumption')
        if purpose == 'commercial':
            score += 15
            factors.append("Commercial collection - higher liability risk")

        return {"score": score, "factors": factors}

    def _calculate_risk_level(self, risk_score: float) -> str:
        """Calculate risk level from score."""
        if risk_score >= 80:
            return "extreme"
        elif risk_score >= 60:
            return "high"
        elif risk_score >= 40:
            return "medium"
        elif risk_score >= 20:
            return "low"
        else:
            return "very_low"

    def _generate_risk_recommendations(self, risk_level: str,
                                     toxicity_result: Dict,
                                     species_result: Dict,
                                     habitat_result: Optional[Dict],
                                     user_context: Optional[Dict]) -> List[str]:
        """Generate risk-based recommendations."""
        recommendations = []

        if risk_level == "extreme":
            recommendations.extend([
                "🚫 DO NOT CONSUME UNDER ANY CIRCUMSTANCES",
                "Destroy the specimen safely",
                "Consult a professional mycologist for identification",
                "Report findings to local health authorities if suspicious"
            ])
        elif risk_level == "high":
            recommendations.extend([
                "🚫 Do not consume this mushroom",
                "Get a second opinion from an expert before any use",
                "Document the find with photos and location for future reference",
                "Consider the ecological impact before removal"
            ])
        elif risk_level == "medium":
            recommendations.extend([
                "⚠️ Exercise extreme caution",
                "Compare with multiple field guides",
                "Consider cooking a small test sample (not recommended for novices)",
                "Store specimens properly if keeping for study"
            ])
        elif risk_level == "low":
            recommendations.extend([
                "✅ Generally safe for consumption with proper preparation",
                "Follow standard mushroom cooking guidelines",
                "Start with small portions when trying new species",
                "Document your finds for future reference"
            ])
        else:  # very_low
            recommendations.extend([
                "✅ Safe for consumption",
                "Good candidate for culinary use",
                "Consider cultivating this species if appropriate"
            ])

        # Add specific recommendations based on results
        if toxicity_result.get('toxicity_status') == 'poisonous':
            recommendations.insert(0, "⚠️ CONFIRMED POISONOUS SPECIES")

        if species_result.get('confidence', 0) < 0.5:
            recommendations.append("Low identification confidence - consider expert consultation")

        if habitat_result and habitat_result.get('suitability_score', 0) < 50:
            recommendations.append("Habitat analysis suggests possible misidentification")

        return recommendations

    def _get_safety_actions(self, risk_level: str, toxicity_result: Dict) -> List[str]:
        """Get immediate safety actions."""
        actions = []

        if risk_level in ["extreme", "high"]:
            actions.extend([
                "Do not touch mushroom with bare hands",
                "Do not inhale spores",
                "Keep children and pets away",
                "Wash hands thoroughly after handling"
            ])

        if toxicity_result.get('toxicity_status') == 'poisonous':
            actions.extend([
                "Do not prepare food near this specimen",
                "Clean all tools that touched the mushroom",
                "Monitor for allergic reactions even from handling"
            ])

        if risk_level == "medium":
            actions.extend([
                "Handle with clean gloves",
                "Avoid spore inhalation",
                "Do not consume without expert verification"
            ])

        return actions

    def _assess_overall_confidence(self, species_result: Dict,
                                 toxicity_result: Dict,
                                 habitat_result: Optional[Dict]) -> Dict:
        """Assess overall confidence in the analysis."""
        confidences = []

        # Species identification confidence
        species_conf = species_result.get('confidence', 0)
        confidences.append(species_conf)

        # Toxicity detection confidence
        toxicity_conf = toxicity_result.get('confidence', 0)
        confidences.append(toxicity_conf)

        # Habitat suitability as confidence modifier
        if habitat_result:
            habitat_suitability = habitat_result.get('suitability_score', 50) / 100
            confidences.append(habitat_suitability)

        avg_confidence = sum(confidences) / len(confidences)

        if avg_confidence > 0.8:
            level = "high"
            description = "High confidence in analysis results"
        elif avg_confidence > 0.6:
            level = "moderate"
            description = "Moderate confidence - results should be verified"
        elif avg_confidence > 0.4:
            level = "low"
            description = "Low confidence - expert consultation recommended"
        else:
            level = "very_low"
            description = "Very low confidence - do not rely on these results"

        return {
            "level": level,
            "score": round(avg_confidence, 3),
            "description": description
        }

    def _is_high_risk_species(self, species_name: str) -> bool:
        """Check if species is known to be high-risk."""
        if self.csv_data is None:
            return False

        # Check for poisonous species or those with warnings in notes
        species_data = self.csv_data[
            self.csv_data['scientific_name'].str.lower() == species_name.lower()
        ]

        if len(species_data) > 0:
            row = species_data.iloc[0]
            if row.get('poisonous', False):
                return True
            notes = str(row.get('notes', '')).lower()
            if any(word in notes for word in ['dangerous', 'deadly', 'toxic', 'poison']):
                return True

        return False

    def get_risk_statistics(self) -> Dict:
        """Get risk assessment statistics."""
        if self.csv_data is None:
            return {"error": "No data available"}

        total_species = int(len(self.csv_data))
        poisonous_species = int(len(self.csv_data[self.csv_data['poisonous'] == True]))
        edible_species = int(len(self.csv_data[self.csv_data['edible'] == True]))

        return {
            "total_species": total_species,
            "poisonous_species": poisonous_species,
            "edible_species": edible_species,
            "poisonous_percentage": float(round((poisonous_species / total_species) * 100, 1)),
            "edible_percentage": float(round((edible_species / total_species) * 100, 1))
        }


# Global instance
risk_engine = RiskEngine()

def assess_risk(species_result: Dict, toxicity_result: Dict, habitat_result: Optional[Dict] = None):
    """
    Legacy function for backward compatibility.
    """
    return risk_engine.assess_overall_risk(species_result, toxicity_result, habitat_result)
