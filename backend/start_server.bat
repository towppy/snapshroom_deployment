@echo off
echo ========================================
echo SnapShroom Backend Server
echo ========================================
echo.
echo Finding your IP address...
ipconfig | findstr /i "IPv4"
echo.
echo ========================================
echo Starting Flask server...
echo ========================================
echo.
echo Server will be available at:
echo   - http://localhost:5000 (same computer)
echo   - http://YOUR_IP:5000 (from phone - use IP shown above)
echo.
echo Press Ctrl+C to stop the server
echo.
python app.py
pause