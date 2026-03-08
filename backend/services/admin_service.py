"""
Admin Service - Analytics and User Management
"""
from datetime import datetime, timedelta
from bson import ObjectId
from collections import Counter


class AdminService:
    def __init__(self, mongo):
        self.mongo = mongo
    
    def get_user_analytics(self):
        """Get comprehensive user analytics."""
        try:
            # Total users
            total_users = self.mongo.db.users.count_documents({})
            active_users = self.mongo.db.users.count_documents({"is_active": True})
            inactive_users = self.mongo.db.users.count_documents({"is_active": False})
            
            # Admin count
            admin_count = self.mongo.db.users.count_documents({"is_admin": 1, "is_active": True})
            
            # Recent registrations (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_registrations = self.mongo.db.users.count_documents({
                "created_at": {"$gte": thirty_days_ago}
            })
            
            # Recent logins (last 7 days)
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            recent_logins = self.mongo.db.users.count_documents({
                "last_login": {"$gte": seven_days_ago}
            })
            
            return {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": inactive_users,
                "admin_count": admin_count,
                "recent_registrations_30d": recent_registrations,
                "recent_logins_7d": recent_logins
            }
        except Exception as e:
            raise Exception(f"Error getting user analytics: {str(e)}")
    
    def get_mushroom_analytics(self):
        """Get comprehensive mushroom scan analytics."""
        try:
            # Check if scans collection exists
            if "mushroom_scans" not in self.mongo.db.list_collection_names():
                return {
                    "total_scans": 0,
                    "scans_last_30d": 0,
                    "most_scanned_mushrooms": [],
                    "top_locations": [],
                    "detection_success_rate": 0,
                    "edible_vs_toxic": {"edible": 0, "toxic": 0, "unknown": 0}
                }
            
            # Total scans
            total_scans = self.mongo.db.mushroom_scans.count_documents({})
            
            # Scans in last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            scans_last_30d = self.mongo.db.mushroom_scans.count_documents({
                "created_at": {"$gte": thirty_days_ago}
            })
            
            # Most scanned mushrooms
            scans = list(self.mongo.db.mushroom_scans.find({
                "mushroom_detected": True,
                "mushroom_type": {"$exists": True, "$ne": None}
            }))
            
            mushroom_counts = Counter([
                scan.get("mushroom_type") for scan in scans 
                if scan.get("mushroom_type")
            ])
            
            most_scanned_mushrooms = [
                {"name": name, "count": count} 
                for name, count in mushroom_counts.most_common(10)
            ]
            
            # Top locations
            location_counts = Counter([
                scan.get("location", {}).get("region") or scan.get("location", {}).get("province")
                for scan in scans 
                if scan.get("location") and (scan.get("location", {}).get("region") or scan.get("location", {}).get("province"))
            ])
            
            top_locations = [
                {"location": loc, "count": count} 
                for loc, count in location_counts.most_common(10)
            ]
            
            # Detection success rate
            all_scans = list(self.mongo.db.mushroom_scans.find({}))
            detected_scans = [s for s in all_scans if s.get("mushroom_detected", False)]
            detection_success_rate = (len(detected_scans) / len(all_scans) * 100) if all_scans else 0
            
            # Edible vs Toxic
            edible_count = self.mongo.db.mushroom_scans.count_documents({
                "edibility": "edible"
            })
            toxic_count = self.mongo.db.mushroom_scans.count_documents({
                "edibility": {"$in": ["toxic", "poisonous"]}
            })
            unknown_count = self.mongo.db.mushroom_scans.count_documents({
                "$or": [
                    {"edibility": {"$exists": False}},
                    {"edibility": None},
                    {"edibility": "unknown"}
                ]
            })
            
            return {
                "total_scans": total_scans,
                "scans_last_30d": scans_last_30d,
                "most_scanned_mushrooms": most_scanned_mushrooms,
                "top_locations": top_locations,
                "detection_success_rate": round(detection_success_rate, 2),
                "edible_vs_toxic": {
                    "edible": edible_count,
                    "toxic": toxic_count,
                    "unknown": unknown_count
                }
            }
        except Exception as e:
            raise Exception(f"Error getting mushroom analytics: {str(e)}")
    
    def get_scan_timeline(self, days=30):
        """Get scan activity timeline for the last N days."""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Aggregate scans by date
            pipeline = [
                {
                    "$match": {
                        "created_at": {"$gte": start_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        },
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            
            if "mushroom_scans" not in self.mongo.db.list_collection_names():
                return []
            
            results = list(self.mongo.db.mushroom_scans.aggregate(pipeline))
            
            return [
                {"date": result["_id"], "scans": result["count"]}
                for result in results
            ]
        except Exception as e:
            raise Exception(f"Error getting scan timeline: {str(e)}")
    
    def get_all_users_detailed(self, page=1, per_page=20, filter_active=None):
        """Get all users with pagination and filtering."""
        try:
            skip = (page - 1) * per_page
            
            # Build query
            query = {}
            if filter_active is not None:
                query["is_active"] = filter_active
            
            # Get total count
            total = self.mongo.db.users.count_documents(query)
            
            # Get users
            users = list(
                self.mongo.db.users.find(query)
                .sort("created_at", -1)
                .skip(skip)
                .limit(per_page)
            )
            
            users_data = []
            for user in users:
                users_data.append({
                    "id": str(user["_id"]),
                    "email": user.get("email"),
                    "username": user.get("username"),
                    "name": user.get("name"),
                    "role": "admin" if user.get("is_admin") == 1 else "user",
                    "is_admin": user.get("is_admin", 0),
                    "is_active": user.get("is_active", True),
                    "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
                    "last_login": user.get("last_login").isoformat() if user.get("last_login") else None,
                    "avatar": user.get("avatar")
                })
            
            return {
                "users": users_data,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
        except Exception as e:
            raise Exception(f"Error getting users: {str(e)}")
    
    def update_user_role(self, user_id, new_is_admin):
        """Update user admin status."""
        try:
            if new_is_admin not in [0, 1]:
                raise ValueError("Invalid value. is_admin must be 0 or 1")
            
            result = self.mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_admin": new_is_admin}}
            )
            
            if result.modified_count == 0:
                raise Exception("User not found or role not changed")
            
            return True
        except Exception as e:
            raise Exception(f"Error updating user role: {str(e)}")
    
    def toggle_user_status(self, user_id, is_active):
        """Activate or deactivate a user."""
        try:
            result = self.mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_active": is_active}}
            )
            
            if result.modified_count == 0:
                raise Exception("User not found or status not changed")
            
            return True
        except Exception as e:
            raise Exception(f"Error toggling user status: {str(e)}")
    
    def delete_user(self, user_id, admin_id):
        """Permanently delete a user (soft delete by default)."""
        try:
            # Prevent self-deletion
            if str(user_id) == str(admin_id):
                raise ValueError("Cannot delete your own account")
            
            # Soft delete - just deactivate
            result = self.mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
            )
            
            if result.modified_count == 0:
                raise Exception("User not found")
            
            return True
        except Exception as e:
            raise Exception(f"Error deleting user: {str(e)}")
