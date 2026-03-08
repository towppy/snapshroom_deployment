#!/usr/bin/env python
"""
Test script to verify email configuration and send a test email
"""
import os
from dotenv import load_dotenv
from flask import Flask
from flask_mail import Mail, Message

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Configure email
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'sandbox.smtp.mailtrap.io')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 2525))
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'a1dd469610546c')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '51dd58d7a290f5')
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@snapshroom.app')

# Initialize mail
mail = Mail(app)

# Test email sending
def test_email():
    print("=" * 60)
    print("SNAPSHROOM EMAIL TEST")
    print("=" * 60)
    
    print("\n📧 Email Configuration:")
    print(f"  Server: {app.config['MAIL_SERVER']}")
    print(f"  Port: {app.config['MAIL_PORT']}")
    print(f"  Username: {app.config['MAIL_USERNAME']}")
    print(f"  TLS: {app.config['MAIL_USE_TLS']}")
    print(f"  SSL: {app.config['MAIL_USE_SSL']}")
    print(f"  Default Sender: {app.config['MAIL_DEFAULT_SENDER']}")
    
    try:
        with app.app_context():
            # Create test email
            msg = Message(
                subject="🍄 SnapShroom Email Test",
                recipients=["test@example.com"],
                html="""
                <html>
                    <body>
                        <h1>SnapShroom Email Configuration Test</h1>
                        <p>If you received this email, your Mailtrap configuration is working correctly!</p>
                        <p>✅ Email sending is functional</p>
                    </body>
                </html>
                """
            )
            
            # Send email
            print("\n⏳ Sending test email...")
            mail.send(msg)
            print("✅ Email sent successfully!")
            print("\n📨 Check your Mailtrap inbox at: https://mailtrap.io")
            print("\nTest email details:")
            print(f"  To: test@example.com")
            print(f"  Subject: 🍄 SnapShroom Email Test")
            print(f"  Status: SENT")
            
    except Exception as e:
        print(f"\n❌ Error sending email: {str(e)}")
        print(f"\nError Type: {type(e).__name__}")
        import traceback
        print("\nFull Traceback:")
        traceback.print_exc()
        
    print("\n" + "=" * 60)

if __name__ == '__main__':
    test_email()
